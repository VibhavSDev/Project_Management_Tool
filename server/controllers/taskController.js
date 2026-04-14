import Task from '../models/Task.js';
import Notification from '../models/Notification.js';
import { logAudit } from '../utils/logAudit.js';
import { logActivity } from '../utils/logActivity.js'
import { sendEmail } from '../utils/sendEmail.js';
import User from '../models/User.js';
import File from '../models/File.js';

const getIO = (req) => req.app.get("io");

export const createTask = async (req, res) => {
  const { title, description, status, project, assignedTo, priority, dueDate, watchers = [] } = req.body;
  const createdBy = req.user.id;
  
  const task = new Task({ title, description, status, project, assignedTo, priority, createdBy, dueDate, watchers });
  
  if (req.file) {
    const fileRecord = await File.create({
      filename: req.file.filename,
      uploader: createdBy,
      task: task._id,
      originalname: req.file.originalname,
      size: req.file.size,
    });
    task.files.push(fileRecord._id);
  }
  await task.save();

  const io = getIO(req);

  if (assignedTo && assignedTo !== req.user?.id) {
    const notification = new Notification({
      user: assignedTo,
      type: 'task',
      message: `You've been assigned a new task: ${title}`,
      link: `/projects/${project}/tasks/${task._id}`
    });
    await notification.save();
    io.to(assignedTo.toString()).emit('newNotification', notification);
  }

  const populatedTask = await Task.findById(task._id)
  .populate('assignedTo', 'username')
  .populate('watchers', 'username')
  .populate('createdBy', 'username')
  .populate('project', 'name');
  
  io.to(project).emit('taskCreated', populatedTask);

  await logAudit({
    user: req.user._id,
    action: 'created_task',
    targetType: 'Task',
    targetId: task._id,
    metadata: { title: task.title }
  });

  await logActivity({
    io,
    project: task.project,
    user: req.user._id,
    action: 'created task',
    meta: { taskId: task._id, title: task.title }
  });

  // Email notification
  if (assignedTo) {
    const assignedUser = await User.findById(assignedTo);
    if (assignedUser) {
      await sendEmail({
        to: assignedUser.email,
        subject: `You've been assigned a new task`,
        html: `<p>Hi ${assignedUser.name},</p>
               <p>You have been assigned a new task: <strong>${title}</strong></p>
               <p>Due date: ${dueDate ? new Date(dueDate).toDateString() : 'N/A'}</p>
               <a href="http://localhost:5173/project/${project}/task/${task._id}">View Task</a>`
      });
    }
  }

  res.status(201).json(populatedTask);
};

export const getMyTasks = async (req, res) => {
  const userId = req.user._id;
  
  const tasks = await Task.find({
    assignedTo: userId,
    isDeleted: false
  })
    .populate('project', 'name')
    .populate('assignedTo', 'username email avatar')
    .sort({ updatedAt: -1 });

  res.json(tasks);
}


export const getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'username email')
      .populate('watchers', 'username email avatar')
      .populate('createdBy', 'username')
      .populate('project', 'name')
      .populate('files');;

    if (!task) return res.status(404).json({ message: 'Task not found' });

    res.status(200).json(task);
  } catch (err) {
    console.error('Get Task Error:', err);
    res.status(500).json({ message: 'Failed to fetch task' });
  }
};

export const getTasksByProject = async (req, res) => {
  const { projectId } = req.params;
  const tasks = await Task.find({ project: projectId })
    .populate('assignedTo', 'username')
    .populate('watchers', 'username avatar') 
    .populate('createdBy', 'username')
    .populate('project', 'name')
    .sort({ createdAt: -1 });

  res.status(200).json(tasks.filter(t => !t.isDeleted));
};

export const updateTask = async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task || task.isDeleted) return res.status(404).json({ message: 'Task not found' });

  const { title, description, assignedTo, status, priority, dueDate, watchers } = req.body;

  if (title) task.title = title;
  if (description) task.description = description;
  if (assignedTo) task.assignedTo = assignedTo;
  if (status) task.status = status;
  if (priority) task.priority = priority;
  if (dueDate) task.dueDate = dueDate;
  if (watchers) task.watchers = [].concat(watchers);

  if (req.file) {
    const fileRecord = await File.create({
      filename: req.file.filename,
      uploader: req.user.id,
      task: task._id,
      originalname: req.file.originalname,
      size: req.file.size,
    });
    task.files.push(fileRecord._id);
  }
  await task.save();

  const updatedTask = await Task.findById(task._id)
    .populate('assignedTo watchers createdBy project files');

  const io = getIO(req);
  io.to(task.project.toString()).emit('taskUpdated', updatedTask);

  await logAudit({
    user: req.user._id,
    action: 'updated_task',
    targetType: 'Task',
    targetId: updatedTask._id,
    metadata: { title: updatedTask.title, assignedTo: updatedTask.assignedTo?._id, status: updatedTask.status }
  });

  await logActivity({
    io,
    project: updatedTask.project,
    user: req.user._id,
    action: 'updated task',
    meta: { taskId: updatedTask._id, title: updatedTask.title }
  });

  if (assignedTo) {
    const assignedUser = await User.findById(assignedTo);
    if (assignedUser) {
      await sendEmail({
        to: assignedUser.email,
        subject: `You've been assigned a new task`,
        html: `<p>Hi ${assignedUser.name},</p>
               <p>You have been assigned a new task: <strong>${title}</strong></p>
               <a href="http://localhost:5173/project/${task.project}/task/${task._id}">View Task</a>`
      });
    }
  }

  res.status(200).json(updatedTask);
};

export const updateTaskStatus = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const oldStatus = task.status;
    const newStatus = req.body.status;

    if (oldStatus === newStatus) {
      return res.status(200).json(task);
    }

    task.status = newStatus;
    await task.save({ validateModifiedOnly: true });

    await User.findById(req.user.id).select('username');
    const io = getIO(req);

    io.to(task.project.toString()).emit('taskStatusChanged', task);
    io.to(task._id.toString()).emit('taskStatusChanged', task);

    await task.populate('watchers', 'username');

    for (const watcher of task.watchers) {
      if (watcher._id.toString() !== req.user.id.toString()) {
        const notif = await Notification.create({
          user: watcher._id,
          type: 'task',
          message: `Status changed on task "${task.title}"`,
          link: `/tasks/${task._id}`,
        });

        io.to(watcher._id.toString()).emit('newNotification', notif);
      }
    }

    await logAudit({
      user: req.user.id,
      action: 'updated_task_status',
      targetType: 'Task',
      targetId: task._id,
      metadata: { from: oldStatus, to: newStatus }
    });

    await logActivity({
      io,
      project: task.project,
      user: req.user._id,
      action: 'updated task status',
      meta: {
        taskId: task._id,
        from: oldStatus,
        to: newStatus
      }
    });

    res.status(200).json(task);
  } catch (err) {
    console.error('Update task status error:', err);
    res.status(500).json({ message: 'Failed to update task status' });
  }
};


export const toggleTaskAssignee = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const task = await Task.findById(taskId)
      .populate("project")
      .populate("assignedTo", "username");

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const isMember = task.project.members.some(
      m => m.user.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const targetUser = await User.findById(userId, "username");
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const alreadyAssigned = task.assignedTo.some(
      u => u._id.toString() === userId
    );

    let action;
    let meta = { taskId: task._id };

    if (alreadyAssigned) {
      task.assignedTo = task.assignedTo.filter(
        u => u._id.toString() !== userId
      );

      action = "unassigned";
      meta.from = targetUser.username;
      meta.to = null;
    } else {
      task.assignedTo.push(targetUser._id);

      action = "assigned";
      meta.from = null;
      meta.to = targetUser.username;
    }

    await task.save();
    await task.populate("assignedTo", "username email avatar");

    const io = getIO(req);
    io.to(task.project._id.toString()).emit("taskUpdated", task);

    await logAudit({
      user: req.user._id,
      action: `${action}_task_assignee`,
      targetType: "Task",
      targetId: task._id,
      metadata: meta,
    });

    await logActivity({
      io,
      project: task.project._id,
      user: req.user._id,
      action: action === "assigned" ? "assigned task" : "unassigned task",
      meta,
    });

    res.status(200).json(task);
  } catch (err) {
    console.error("Toggle assignee error:", err);
    res.status(500).json({ message: "Failed to update assignees" });
  }
};


export const deleteTask = async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ message: 'Task not found' });

  await File.deleteMany({ task: task._id });
  await task.remove();

  const io = getIO(req);
  io.to(task.project.toString()).emit('taskDeleted', req.params.id);

  await logAudit({
    user: req.user.id,
    action: 'deleted_task',
    targetType: 'Task',
    targetId: task._id,
    metadata: { title: task.title }
  });

  await logActivity({
    io,
    project: task.project,
    user: req.user._id,
    action: 'deleted task',
    meta: { taskId: task._id, title: task.title }
  });

  res.status(200).json({ message: 'Task deleted' });
};

export const watchTask = async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ message: 'Task not found' });

  if (!task.watchers.includes(req.user.id)) {
    task.watchers.push(req.user.id);
    await task.save({ validateModifiedOnly: true });
  }

  const io = getIO(req);

  await logActivity({
    io,
    project: task.project,
    user: req.user.id,
    action: 'watched task',
    meta: { taskId: task._id }
  });

  res.status(200).json({ message: 'You are now watching this task.' });
};

export const unwatchTask = async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ message: 'Task not found' });

  task.watchers = task.watchers.filter(u => u.toString() !== req.user.id.toString());
  await task.save({ validateModifiedOnly: true });

  const io = getIO(req);

  await logActivity({
    io,
    project: task.project,
    user: req.user.id,
    action: 'unwatched task',
    meta: { taskId: task._id }
  });

  res.status(200).json({ message: 'You have unwatched this task.' });
};

export const toggleTaskWatcher = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { userId } = req.body;

    const task = await Task.findById(taskId).populate('project');
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const isMember =
      task.project.owner.toString() === userId ||
      task.project.members.some(m => m.user.toString() === userId);

    if (!isMember) {
      return res.status(403).json({ message: 'User not part of project' });
    }

    const alreadyWatching = task.watchers.some(
      id => id.toString() === userId
    );

    if (alreadyWatching) {
      task.watchers = task.watchers.filter(
        id => id.toString() !== userId
      );
    } else {
      task.watchers.push(userId);
    }

    await task.save();
    await task.populate('watchers', 'username email avatar');

    const io = getIO(req);
    io.to(task._id.toString()).emit('taskUpdated', task);
    io.to(task.project._id.toString()).emit('taskUpdated', task);

    await logAudit({
      user: req.user.id,
      action: watching ? "unwatched_task" : "watched_task",
      targetType: "Task",
      targetId: task._id,
    });

    await logActivity({
      io,
      project: task.project._id,
      user: req.user._id,
      action: alreadyWatching ? 'stopped watching task' : 'started watching task',
      meta: { taskId: task._id, targetUser: userId },
    });

    res.status(200).json(task);
  } catch (err) {
    console.error('Toggle watcher error:', err);
    res.status(500).json({ message: 'Failed to update watchers' });
  }
};

export const softDeleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    if (task.isDeleted) return res.status(400).json({ message: 'Task is already soft-deleted' });

    task.isDeleted = true;
    await task.save();
    await File.updateMany({ task: task._id }, { isDeleted: true });

    const io = getIO(req);
    io.to(task.project.toString()).emit('taskSoftDeleted', task._id);

    await logAudit({
      user: req.user.id,
      action: 'soft_deleted_task',
      targetType: 'Task',
      targetId: task._id,
      metadata: { title: task.title }
    });

    await logActivity({
      io,
      project: task.project,
      user: req.user.id,
      action: 'soft deleted task',
      meta: { taskId: task._id, title: task.title }
    });

    res.status(200).json({ message: 'Task soft-deleted successfully' });
  } catch (err) {
    console.error('Error in softDeleteTask:', err);
    res.status(500).json({ message: 'Server error during soft delete' });
  }
};

export const restoreTask = async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ message: 'Task not found' });

  task.isDeleted = false;
  await task.save();
  await File.updateMany({ task: task._id }, { isDeleted: false });

  const io = getIO(req);
  io.to(task.project.toString()).emit('taskRestored', task);

  await logAudit({
    user: req.user.id,
    action: 'restored_task',
    targetType: 'Task',
    targetId: task._id,
    metadata: { title: task.title }
  });

  await logActivity({
    io,
    project: task.project,
    user: req.user.id,
    action: 'restored task',
    meta: { taskId: task._id, title: task.title }
  });

  res.status(200).json({ message: 'Task restored' });
};


export const searchTasks = async (req, res) => {
  const {
    projectId,
    q,
    status,
    priority,
    assignee,
    page = 1,
    limit = 10,
    dueBefore,
    dueAfter,
  } = req.query;

  const filter = { project: projectId };

  if (q) filter.$text = { $search: q };
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (assignee) filter.assignee = assignee;
  if (dueBefore || dueAfter) {
    filter.dueDate = {};
    if (dueBefore) filter.dueDate.$lte = new Date(dueBefore);
    if (dueAfter) filter.dueDate.$gte = new Date(dueAfter);
  }
  filter.isDeleted = false;

  const tasks = await Task.find(filter)
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

  const total = await Task.countDocuments(filter);

  await logAudit({
    user: req.user.id,
    action: 'searched_tasks',
    targetType: 'Task',
    targetId: null,
    metadata: { query: req.query }
  });


  res.json({
    tasks,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / limit),
  });
};

export const addSubtask = async (req, res) => {
  const { taskId } = req.params;
  const { title } = req.body;

  const task = await Task.findById(taskId);
  if (!task) return res.status(404).json({ message: 'Task not found' });

  const newSubtask = { title, completed: false };
  task.subtasks.push(newSubtask);
  await task.save();

  const io = getIO(req);
  io.to(task.project.toString()).emit('subtaskAdded', { taskId, subtask: newSubtask });

  await logAudit({
    user: req.user.id,
    action: 'subtask_created',
    targetType: 'Task',
    targetId: task._id,
    metadata: { subtask: newSubtask }
  });

  await logActivity({
    io,
    project: task.project,
    user: req.user.id,
    action: `added subtask '${title}'`,
    meta: { taskId, subtask: newSubtask }
  });

  res.status(201).json(newSubtask);
};

export const getSubtasks = async (req, res) => {
  const { taskId } = req.params;

  const task = await Task.findById(taskId).select('subtasks');
  if (!task) {
    res.status(404);
    throw new Error('Task not found');
  }

  res.status(200).json(task.subtasks || []);
};

export const updateSubtask = async (req, res) => {
  const { taskId, subtaskId } = req.params;
  const { title, completed } = req.body;
  
  const task = await Task.findById(taskId);
  if (!task) return res.status(404).json({ message: 'Task not found' });
  
  const subtask = task.subtasks.id(subtaskId);
  if (!subtask) return res.status(404).json({ message: 'Subtask not found' });
  
  if (title !== undefined) subtask.title = title;
  if (completed !== undefined) subtask.completed = completed;
  await task.save();
  
  const io = getIO(req);
  io.to(task.project.toString()).emit('subtaskUpdated', { taskId, subtask });

  await logActivity({
    io,
    project: task.project,
    user: req.user.id,
    action: `updated subtask '${subtask.title}'`,
    meta: { taskId, subtask }
  });

  await logAudit({
    user: req.user.id,
    action: 'subtask_updated',
    targetType: 'Task',
    targetId: task._id,
    metadata: { subtask }
  });

  res.json(subtask);
};

export const toggleSubtask = async (req, res) => {
  const { taskId, subtaskId } = req.params;
  
  const task = await Task.findById(taskId);
  if (!task) return res.status(404).json({ message: 'Task not found' });

  const subtask = task.subtasks.id(subtaskId);
  if (!subtask) return res.status(404).json({ message: 'Subtask not found' });
  
  subtask.completed = !subtask.completed;
  await task.save();
  
  const io = getIO(req);
  io.to(task.project.toString()).emit('subtaskToggled', { taskId, subtask });
  
  await logAudit({
    user: req.user.id,
    action: 'subtask_toggled',
    targetType: 'Task',
    targetId: task._id,
    metadata: { subtask }
  });

  await logActivity({
    io,
    project: task.project,
    user: req.user.id,
    action: `toggled subtask '${subtask.title}'`,
    meta: { taskId, subtask }
  });

  res.json(subtask);
};

export const deleteSubtask = async (req, res) => {
  const { taskId, subtaskId } = req.params;
  
  const task = await Task.findById(taskId);
  if (!task) return res.status(404).json({ message: 'Task not found' });
  
  const subtask = task.subtasks.id(subtaskId);
  if (!subtask) return res.status(404).json({ message: 'Subtask not found' });

  subtask.deleteOne();
  await task.save();
  
  const io = getIO(req);
  io.to(task.project.toString()).emit('subtaskDeleted', { taskId, subtaskId });

  await logAudit({
    user: req.user.id,
    action: 'subtask_deleted',
    targetType: 'Task',
    targetId: task._id,
    metadata: { subtaskId }
  });

  await logActivity({
    io,
    project: task.project,
    user: req.user.id,
    action: `deleted subtask '${subtask.title}'`,
    meta: { taskId, subtaskId }
  });

  res.json({ message: 'Subtask deleted permanently' });
};