import Comment from '../models/Comment.js';
import AuditLog from '../models/AuditLog.js';
import Task from '../models/Task.js';
import File from '../models/File.js';
import Project from '../models/Project.js';
import Activity from '../models/Activity.js';

export const getMyActivity = async (req, res) => {
  try {
    const userId = req.user._id;

    const projects = await Project.find({
      $or: [
        { owner: userId },
        { "members.user": userId },
      ],
    }).select("_id");

    const projectIds = projects.map(p => p._id);

    if (!projectIds.length) {
      return res.status(200).json([]);
    }

    const activity = await Activity.find({
      project: { $in: projectIds },
    })
      .populate("user", "username email avatar")
      .populate("project", "name")
      .sort({ createdAt: -1 })
      .limit(100);

    res.status(200).json(activity);
  } catch (err) {
    console.error("Get My Activity Error:", err);
    res.status(500).json({ message: "Failed to fetch activity" });
  }
};

/**
 * 📌 Enhanced Task Activity Feed (with embedded subtasks)
 */
export const getTaskActivityFeed = async (req, res) => {
  try {
    const { taskId } = req.params;

    // 1️⃣ Validate task exists
    const task = await Task.findById(taskId).populate('assignedTo watchers createdBy project');
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    // 2️⃣ Fetch comments
    const comments = await Comment.find({ task: taskId, isDeleted: false })
      .populate('author', 'username avatar')
      .select('text createdAt author')
      .lean();

    const formattedComments = comments.map(c => ({
      type: 'comment',
      user: c.author.username,
      avatar: c.author.avatar,
      text: c.text,
      meta: null,
      createdAt: c.createdAt,
    }));

    // 3️⃣ Fetch audit logs
    const logs = await AuditLog.find({ targetType: 'Task', targetId: taskId })
      .populate('user', 'username avatar')
      .select('action metadata createdAt user')
      .lean();

    const formattedLogs = logs.map(l => ({
      type: 'log',
      user: l.user.username,
      avatar: l.user.avatar,
      action: l.action,
      meta: l.metadata || null,
      createdAt: l.createdAt,
    }));

    // 4️⃣ Fetch file actions
    const files = await File.find({ task: taskId })
      .populate('uploader', 'username avatar')
      .select('filename originalname isDeleted createdAt uploader')
      .lean();

    const formattedFiles = files.map(f => ({
      type: 'file',
      user: f.uploader.username,
      avatar: f.uploader.avatar,
      action: f.isDeleted ? 'deleted file' : 'uploaded file',
      meta: { filename: f.originalname, size: f.size },
      createdAt: f.createdAt,
    }));

    // 5️⃣ Include embedded subtasks
    const formattedSubtasks = task.subtasks.flatMap(sub => [
      {
        type: 'subtask',
        user: task.assignedTo?.username || 'system',
        avatar: task.assignedTo?.avatar || null,
        action: 'created subtask',
        meta: { title: sub.title },
        createdAt: sub._id.getTimestamp(), // Mongoose ObjectId timestamp
      },
      {
        type: 'subtask',
        user: task.assignedTo?.username || 'system',
        avatar: task.assignedTo?.avatar || null,
        action: sub.completed ? 'completed subtask' : 'updated subtask',
        meta: { title: sub.title, completed: sub.completed },
        createdAt: sub._id.getTimestamp(), // we use _id timestamp as a fallback
      }
    ]);

    // 6️⃣ Combine all items and sort by createdAt descending
    const feed = [
      ...formattedComments,
      ...formattedLogs,
      ...formattedFiles,
      ...formattedSubtasks
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({ success: true, data: feed });
  } catch (err) {
    console.error('Error fetching task activity feed:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * 📌 Project Activity Feed (aggregates all tasks in the project)
 */
export const getProjectActivity = async (req, res) => {
  try {
    const { projectId } = req.params;

    // 1️⃣ Fetch all tasks for the project
    const tasks = await Task.find({ project: projectId }).populate('assignedTo watchers createdBy');

    const taskIds = tasks.map(t => t._id);

    // 2️⃣ Fetch comments for all tasks
    const comments = await Comment.find({ task: { $in: taskIds }, isDeleted: false })
      .populate('author', 'username avatar')
      .select('text createdAt author task')
      .lean();

    const formattedComments = comments.map(c => ({
      type: 'comment',
      taskId: c.task,
      user: c.author.username,
      avatar: c.author.avatar,
      text: c.text,
      meta: null,
      createdAt: c.createdAt,
    }));

    // 3️⃣ Fetch audit logs for tasks and project-level logs
    const logs = await AuditLog.find({
      $or: [
        { targetType: 'Task', targetId: { $in: taskIds } },
        { targetType: 'Project', targetId: projectId }
      ]
    })
      .populate('user', 'username avatar')
      .select('action metadata createdAt user targetType targetId')
      .lean();

    const formattedLogs = logs.map(l => ({
      type: 'log',
      taskId: l.targetType === 'Task' ? l.targetId : null,
      user: l.user.username,
      avatar: l.user.avatar,
      action: l.action,
      meta: l.metadata || null,
      createdAt: l.createdAt,
    }));

    // 4️⃣ Fetch files for all tasks
    const files = await File.find({ task: { $in: taskIds } })
      .populate('uploader', 'username avatar')
      .select('filename originalname isDeleted createdAt task uploader')
      .lean();

    const formattedFiles = files.map(f => ({
      type: 'file',
      taskId: f.task,
      user: f.uploader.username,
      avatar: f.uploader.avatar,
      action: f.isDeleted ? 'deleted file' : 'uploaded file',
      meta: { filename: f.originalname, size: f.size },
      createdAt: f.createdAt,
    }));

    // 5️⃣ Include embedded subtasks for all tasks
    const formattedSubtasks = tasks.flatMap(task =>
      task.subtasks.flatMap(sub => [
        {
          type: 'subtask',
          taskId: task._id,
          user: task.assignedTo?.username || 'system',
          avatar: task.assignedTo?.avatar || null,
          action: 'created subtask',
          meta: { title: sub.title },
          createdAt: sub._id.getTimestamp(),
        },
        {
          type: 'subtask',
          taskId: task._id,
          user: task.assignedTo?.username || 'system',
          avatar: task.assignedTo?.avatar || null,
          action: sub.completed ? 'completed subtask' : 'updated subtask',
          meta: { title: sub.title, completed: sub.completed },
          createdAt: sub._id.getTimestamp(),
        }
      ])
    );

    // 6️⃣ Combine all events and sort by createdAt descending
    const feed = [
      ...formattedComments,
      ...formattedLogs,
      ...formattedFiles,
      ...formattedSubtasks
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({ success: true, data: feed });
  } catch (err) {
    console.error('Error fetching project activity:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};