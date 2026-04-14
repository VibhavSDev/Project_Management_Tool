import Project from '../models/Project.js';
import Task from '../models/Task.js';
import AuditLog from '../models/AuditLog.js';
import { logAudit } from '../utils/logAudit.js';

// ===============================
// GET /admin/projects
// ===============================
export const getAllProjectsAdmin = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      q,
      status
    } = req.query;

    const query = {};

    if (q) {
      query.name = { $regex: q, $options: 'i' };
    }

    if (status === 'archived') query.isArchived = true;
    if (status === 'active') query.isArchived = false;

    const projects = await Project.find(query)
      .populate('owner', 'username email')
      .populate('members.user', 'username email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Project.countDocuments(query);

    res.json({
      projects,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch projects' });
  }
};

// ===============================
// GET /admin/projects/:projectId
// ===============================
export const getProjectDetailsAdmin = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId)
      .populate('owner', 'username email')
      .populate('members.user', 'username email');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const taskStats = await Task.aggregate([
      { $match: { project: project._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    res.json({
      project,
      taskStats,
    });
  } catch {
    res.status(500).json({ message: 'Failed to fetch project details' });
  }
};

// ===============================
// DELETE /admin/projects/:projectId
// ===============================
export const deleteProjectAdmin = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    await project.deleteOne();

    await AuditLog.create({
      user: req.user._id,
      action: 'DELETE_PROJECT',
      targetType: 'Project',
      targetId: project._id,
      metadata: {
        projectName: project.name,
        reason: 'Admin moderation',
      },
    });

    res.json({ message: 'Project deleted by admin' });
  } catch {
    res.status(500).json({ message: 'Failed to delete project' });
  }
};


export const suspendProjectAdmin = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (project.status === "suspended") {
      return res.status(400).json({ message: "Project already suspended" });
    }

    project.status = "suspended";
    await project.save();

    await logAuditEvent({
      userId: req.user._id,
      action: "PROJECT_SUSPENDED",
      entityType: "Project",
      entityId: project._id,
      description: `Project "${project.name}" suspended by admin`,
    });

    res.json({ message: "Project suspended", project });
  } catch (err) {
    next(err);
  }
};

// export const restoreProjectAdmin = async (req, res, next) => {
//   try {
//     const project = await Project.findById(req.params.projectId);
//     if (!project) {
//       return res.status(404).json({ message: "Project not found" });
//     }

//     project.status = "active";
//     await project.save();

//     await logAuditEvent({
//       userId: req.user._id,
//       action: "PROJECT_RESTORED",
//       entityType: "Project",
//       entityId: project._id,
//       description: `Project "${project.name}" restored by admin`,
//     });

//     res.json({ message: "Project restored", project });
//   } catch (err) {
//     next(err);
//   }
// };




// ARCHIVE PROJECT


export const archiveProjectAdmin = async (req, res) => {
  const project = await Project.findById(req.params.projectId);
  if (!project) {
    return res.status(404).json({ message: "Project not found" });
  }

  project.isArchived = true;
  await project.save();

  await logAudit({
    user: req.user._id,
    action: "PROJECT_ARCHIVED",
    targetType: "Project",
    targetId: project._id,
    metadata: { name: project.name },
  });

  res.json({ message: "Project archived" });
};

// RESTORE PROJECT
export const restoreProjectAdmin = async (req, res) => {
  const project = await Project.findById(req.params.projectId);
  if (!project) {
    return res.status(404).json({ message: "Project not found" });
  }

  project.isArchived = false;
  await project.save();

  await logAudit({
    user: req.user._id,
    action: "PROJECT_RESTORED",
    targetType: "Project",
    targetId: project._id,
    metadata: { name: project.name },
  });

  res.json({ message: "Project restored" });
};
