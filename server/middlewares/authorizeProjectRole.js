import Project from '../models/Project.js';
import Task from '../models/Task.js';
import File from '../models/File.js';
import Comment from '../models/Comment.js';

export const authorizeProjectRole = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      let projectId =
        req.params.projectId ||
        req.body?.project ||
        req.body?.projectId ||
        req.query?.projectId;

      const taskId =
        req.params.taskId ||
        req.params.id ||
        req.body?.taskId;

      const fileId = req.params.fileId;
      const commentId = req.params.commentId;

      if (!projectId && taskId) {
        const task = await Task.findById(taskId).select('project');

        if (!task) {
          return res.status(404).json({ message: 'Task not found to resolve project' });
        }
        projectId = task.project.toString();
      }

      if (!projectId && commentId) {
        const comment = await Comment.findById(commentId).populate({
          path: 'task',
          select: 'project',
        });

        if (!comment || !comment.task) {
          return res.status(404).json({
            message: 'Comment or related task not found',
          });
        }

        projectId = comment.task.project.toString();

      }

      if (!projectId && fileId) {
        const file = await File.findById(req.params.fileId).populate({
          path: 'task',
          select: 'title project',
        });
        if (!file || !file.task) {
          return res.status(404).json({ message: 'File or related task not found' });
        }
        projectId = file.task.project.toString();
      }

      if (!projectId) {
        return res.status(400).json({ message: 'Project ID could not be determined' });
      }
      
      if (!req.user || !req.user._id) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      const project = await Project.findById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      if (req.user.role === 'admin') {
        if (req.method === 'GET') {
          req.project = project;
          req.projectRole = 'admin-metadata';
          return next();
        }
      }

      const memberEntry = project.members.find((m) =>
        m.user?.toString() === req.user._id.toString() ||
        m.user?._id?.toString() === req.user._id.toString()
    );
    
    if (!memberEntry) {
      return res.status(403).json({ message: 'You are not a member of this project' });
    }
    
    if (!allowedRoles.includes(memberEntry.projectRole)) {
      return res.status(403).json({ message: 'Access denied. Insufficient project role' });
    }

      req.project = project;
      req.projectRole = memberEntry.projectRole;

      next();
    } catch (err) {
      console.error('authorizeProjectRole error:', err);
      res.status(500).json({ message: 'Server error while checking project role' });
    }
  };
};
