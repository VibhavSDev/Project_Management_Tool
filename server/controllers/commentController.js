import User from '../models/User.js';
import Notification from '../models/Notification.js';
import Comment from '../models/Comment.js';
import Task from '../models/Task.js';
import { logAudit } from '../utils/logAudit.js';
import { logActivity } from '../utils/logActivity.js';

export const createComment = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { text } = req.body;

    if (!text?.trim()) {
      return res.status(400).json({ message: "Comment text is required" });
    }
    
    const task = await Task.findById(taskId)
      .populate("project")
      .populate("watchers", "_id");

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const mentionRegex = /@([a-zA-Z0-9_]+)/g;
    const mentionedUsernames = [...text.matchAll(mentionRegex)].map(
      m => m[1]
    );
    
    let mentionedUsers = [];
    if (mentionedUsernames.length > 0) {
      mentionedUsers = await User.find({
        username: { $in: mentionedUsernames },
        _id: { $ne: req.user.id },
      }).select("_id username");
    }

    // === 3️⃣ Create comment ===
    const comment = await Comment.create({
      task: taskId,
      author: req.user.id,
      text,
      mentions: mentionedUsers.map(u => u._id),
    });

    const populatedComment = await comment.populate(
      "author mentions",
      "username email avatar"
    );

    const io = req.app.get("io");
    io.to(taskId.toString()).emit("commentAdded", populatedComment);
    for (const user of mentionedUsers) {
      const notif = await Notification.create({
        user: user._id,
        type: "mention",
        message: `You were mentioned in a comment`,
        link: `/tasks/${taskId}`,
      });

      io.to(user._id.toString()).emit("notification", notif);
    }

    const mentionedIds = mentionedUsers.map(u => u._id.toString());

    for (const watcher of task.watchers) {
      if (
        watcher._id.toString() !== req.user.id &&
        !mentionedIds.includes(watcher._id.toString())
      ) {
        const notif = await Notification.create({
          user: watcher._id,
          type: "task",
          message: `New comment on task "${task.title}"`,
          link: `/tasks/${task._id}`,
        });

        io.to(watcher._id.toString()).emit("notification", notif);
      }
    }

    await logAudit({
      user: req.user.id,
      action: "commented",
      targetType: "Comment",
      targetId: comment._id,
      metadata: { taskId, text },
    });

    await logActivity({
      io,
      project: task.project._id,
      user: req.user.id,
      action: "added comment",
      meta: {
        taskId,
        commentId: comment._id,
        mentions: mentionedUsers.map(u => u.username),
      },
    });

    res.status(201).json(populatedComment);
  } catch (err) {
    console.error("Create comment error:", err);
    res.status(500).json({ message: "Failed to create comment" });
  }
};

export const getCommentsForTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const comments = await Comment.find({ task: taskId, isDeleted: false })
      .populate('author', 'username email')
      .sort({ createdAt: -1 });
    res.status(200).json(comments);
  } catch (err) {
    console.error('Fetch comments error:', err);
    res.status(500).json({ message: 'Failed to load comments' });
  }
};

export const softDeleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId).populate({ path: 'task', populate: 'project' });
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    console.log('comment', comment);

    const isOwner = comment.author.toString() === req.user.id;
    if (!isOwner && !['owner','editor'].includes(req.user.projectRole))
      return res.status(403).json({ message: 'Not authorized to delete comment' });
    
    comment.isDeleted = true;
    await comment.save();

    const io = req.app.get('io');
    io.to(comment.task._id.toString()).emit('commentSoftDeleted', comment._id);

    await logAudit({
      user: req.user.id,
      action: 'soft_deleted_comment',
      targetType: 'Comment',
      targetId: comment._id,
      metadata: { text: comment.text }
    });

    await logActivity({
      io,
      project: comment.task.project._id,
      user: req.user.id,
      action: 'deleted comment',
      meta: { commentId: comment._id, text: comment.text }
    });

    res.status(200).json({ message: 'Comment soft deleted' });
  } catch (err) {
    console.error('Soft delete comment error:', err);
    res.status(500).json({ message: 'Failed to delete comment' });
  }
};

export const restoreComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId).populate({ path: 'task', populate: 'project' });
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    comment.isDeleted = false;
    await comment.save();

    const io = req.app.get('io');
    io.to(comment.task._id.toString()).emit('commentRestored', comment);

    await logAudit({
      user: req.user.id,
      action: 'restored_comment',
      targetType: 'Comment',
      targetId: comment._id,
      metadata: { text: comment.text }
    });

    await logActivity({
      io,
      project: comment.task.project._id,
      user: req.user.id,
      action: 'restored comment',
      meta: { commentId: comment._id, text: comment.text }
    });

    res.status(200).json({ message: 'Comment restored' });
  } catch (err) {
    console.error('Restore comment error:', err);
    res.status(500).json({ message: 'Failed to restore comment' });
  }
};

export const updateComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId).populate({ path: 'task', populate: 'project' }).populate('author', 'username');
    if (!comment || comment.isDeleted) return res.status(404).json({ message: 'Comment not found' });

    const isOwner = comment.author._id.toString() === req.user.id;
    if (!isOwner && !['owner','editor'].includes(req.user.projectRole))
      return res.status(403).json({ message: 'Not authorized to edit comment' });

    comment.text = req.body.text || comment.text;
    await comment.save();

    const io = req.app.get('io');
    io.to(comment.task._id.toString()).emit('commentUpdated', comment);

    await logAudit({
      user: req.user.id,
      action: 'updated_comment',
      targetType: 'Comment',
      targetId: comment._id,
      metadata: { text: comment.text }
    });

    await logActivity({
      io,
      project: comment.task.project._id,
      user: req.user.id,
      action: 'updated comment',
      meta: { commentId: comment._id, newText: comment.text }
    });

    res.status(200).json({ message: 'Comment updated', comment });
  } catch (err) {
    console.error('Update comment error:', err);
    res.status(500).json({ message: 'Failed to update comment' });
  }
};

export const toggleCommentReaction = async (req, res) => {
  try {
    const { emoji } = req.body;
    const { commentId } = req.params;
    const userId = req.user._id;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    let reaction = comment.reactions.find(r => r.emoji === emoji);

    if (!reaction) {
      comment.reactions.push({
        emoji,
        users: [userId],
      });
    } else {
      const hasReacted = reaction.users.some(
        u => u.toString() === userId.toString()
      );

      if (hasReacted) {
        reaction.users = reaction.users.filter(
          u => u.toString() !== userId.toString()
        );

        if (reaction.users.length === 0) {
          comment.reactions = comment.reactions.filter(
            r => r.emoji !== emoji
          );
        }
      } else {
        reaction.users.push(userId);
      }
    }

    await comment.save();

    const populatedComment = await Comment.findById(commentId)
      .populate("author", "username avatar");

    const io = req.app.get("io");
    io.to(comment.task.toString()).emit("commentReacted", populatedComment);

    res.json(populatedComment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to react" });
  }
};