// controllers/auditController.js
import AuditLog from "../models/AuditLog.js";
import Task from "../models/Task.js";
import File from "../models/File.js";
import Project from "../models/Project.js";

export const logAuditEvent = async ({
  userId,
  action,
  entityType,
  entityId,
  description,
  metadata = {},
}) => {
  try {
    const log = new AuditLog({
      user: userId,
      action,
      entityType,
      entityId,
      description,
      metadata,
    });
    await log.save();
  } catch (err) {
    console.error("Error logging audit event:", err.message);
  }
};

export const getAllAuditLogs = async (req, res, next) => {
  try {
    const logs = await AuditLog.find()
      .populate("user", "name email role")
      .sort({ createdAt: -1 });
    res.json(logs);
  } catch (error) {
    next(error);
  }
};

export const getLogsByUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (req.user.role !== "admin" && req.user._id.toString() !== userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const logs = await AuditLog.find({ user: userId })
      .populate("user", "name email role")
      .sort({ createdAt: -1 });

    res.json(logs);
  } catch (error) {
    next(error);
  }
};

export const getLogsByProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const isMember = project.members.includes(req.user._id);
    if (!isMember && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const logs = await AuditLog.find({
      entityType: "Project",
      entityId: projectId,
    })
      .populate("user", "name email role")
      .sort({ createdAt: -1 });

    res.json(logs);
  } catch (error) {
    next(error);
  }
};

export const getLogsByTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId).populate("project");
    if (!task) return res.status(404).json({ message: "Task not found" });

    const project = await Project.findById(task.project);
    const isMember = project.members.includes(req.user._id);

    if (!isMember && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const logs = await AuditLog.find({
      entityType: "Task",
      entityId: taskId,
    })
      .populate("user", "name email role")
      .sort({ createdAt: -1 });

    res.json(logs);
  } catch (error) {
    next(error);
  }
};

export const getLogsByFile = async (req, res, next) => {
  try {
    const { fileId } = req.params;

    const file = await File.findById(fileId).populate({
      path: "task",
      populate: { path: "project" },
    });
    if (!file) return res.status(404).json({ message: "File not found" });

    const project = file.task.project;
    const isMember = project.members.includes(req.user._id);

    if (!isMember && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const logs = await AuditLog.find({
      entityType: "File",
      entityId: fileId,
    })
      .populate("user", "name email role")
      .sort({ createdAt: -1 });

    res.json(logs);
  } catch (error) {
    next(error);
  }
};

export const clearAllAuditLogs = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }
    await AuditLog.deleteMany({});
    res.json({ message: "All audit logs cleared" });
  } catch (error) {
    next(error);
  }
};
