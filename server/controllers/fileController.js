import File from '../models/File.js';
import path from 'path';
import fs from 'fs';
import { logAudit } from '../utils/logAudit.js';
import { logActivity } from '../utils/logActivity.js';
import Task from '../models/Task.js';

const getIO = (req) => req.app.get("io");

export const uploadTaskFiles = async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId)
      .populate("project")
      .populate("watchers", "_id");

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const filesToSave = req.files.map(file => ({
      task: task._id,
      uploader: req.user._id,
      filename: file.filename,
      originalname: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    }));

    const savedFiles = await File.insertMany(filesToSave);

    const populatedFiles = await File.find({
      _id: { $in: savedFiles.map(f => f._id) },
    }).populate("uploader", "username avatar");

    const io = getIO(req);
    io.to(task._id.toString()).emit("taskFilesUploaded", {
      taskId: task._id,
      files: populatedFiles,
    });
    io.to(task.project._id.toString()).emit("projectFilesUploaded", {
      projectId: task.project._id,
      taskId: task._id,
      files: populatedFiles,
    });

    await logAudit({
      user: req.user._id,
      action: "uploaded_files",
      targetType: "Task",
      targetId: task._id,
      metadata: {
        count: populatedFiles.length,
        filenames: populatedFiles.map(f => f.originalname),
      },
    });

    const activity = await logActivity({
      io,
      project: task.project._id,
      user: req.user._id,
      action: "uploaded file(s)",
      meta: {
        taskId: task._id,
        files: populatedFiles.map(f => ({
          id: f._id,
          name: f.originalname,
        })),
      },
    });

    task.watchers.forEach(watcher => {
      if (watcher._id.toString() !== req.user._id.toString()) {
        io.to(watcher._id.toString()).emit("notification", {
          type: "file_upload",
          title: "New file uploaded",
          message: `${req.user.username} uploaded ${populatedFiles.length} file(s) in ${task.title}`,
          projectId: task.project._id,
          taskId: task._id,
        });
      }
    });

    res.status(201).json({
      message: "Files uploaded successfully",
      files: populatedFiles,
    });
  } catch (err) {
    console.error("Upload file error:", err);
    res.status(500).json({ message: "Failed to upload files" });
  }
};

export const getFilesByProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { includeDeleted } = req.query;

    const fileFilter = {};
    if (!includeDeleted || includeDeleted === 'false') fileFilter.isDeleted = false;

    const files = await File.find(fileFilter)
      .populate({ path: 'task', match: { project: projectId }, select: '_id title' })
      .populate('uploader', 'username');

    const filtered = files.filter(f => f.task);

    await logAudit({
      user: req.user.id,
      action: 'viewed_files',
      targetType: 'Project',
      targetId: projectId,
      metadata: { count: filtered.length, includeDeleted: !!includeDeleted }
    });

    res.status(200).json(filtered);
  } catch (err) {
    console.error('Error fetching files by project:', err);
    res.status(500).json({ message: 'Failed to fetch files' });
  }
};

export const getFilesByTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const includeDeleted = req.query.includeDeleted === "true";

    const task = await Task.findById(taskId).select("project");
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const filter = { task: taskId };
    if (!includeDeleted) {
      filter.isDeleted = false;
    }

    const files = await File.find(filter)
      .populate("uploader", "username")
      .sort({ createdAt: -1 });

    await logAudit({
      user: req.user.id,
      action: "viewed_task_files",
      targetType: "Task",
      targetId: taskId,
      metadata: {
        count: files.length,
        includeDeleted,
      },
    });

    res.status(200).json(files);
  } catch (err) {
    console.error("Error fetching files by task:", err);
    res.status(500).json({ message: "Failed to fetch task files" });
  }
};

export const downloadFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const file = await File.findById(fileId);
    if (!file || file.isDeleted) return res.status(404).json({ message: 'File not found' });

    const filePath = path.join(process.cwd(), 'uploads', file.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File not found on server' });

    await logAudit({
      user: req.user.id,
      action: 'downloaded_file',
      targetType: 'File',
      targetId: fileId,
      metadata: { originalname: file.originalname }
    });

    res.download(filePath, file.originalname);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ message: 'Download failed' });
  }
};

export const deleteFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const file = await File.findById(fileId).populate({ path: 'task', select: 'title project' });
    if (!file) return res.status(404).json({ message: 'File not found' });

    file.isDeleted = true;
    await file.save();

    const io = getIO(req);
    io.to(file.task._id.toString()).emit('fileDeleted', file._id);

    await logAudit({
      user: req.user._id,
      action: 'deleted_file',
      targetType: 'File',
      targetId: file._id,
      metadata: { name: file.originalname },
    });

    await logActivity({
      io,
      project: file.task.project,
      user: req.user._id,
      action: 'deleted file',
      meta: { fileId: file._id, filename: file.filename },
    });

    res.status(200).json({ message: 'File deleted (soft)' });
  } catch (err) {
    console.error('Delete file error:', err);
    res.status(500).json({ message: 'Failed to delete file' });
  }
};

export const restoreFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const file = await File.findById(fileId).populate({ path: 'task', select: 'project' });
    if (!file) return res.status(404).json({ message: 'File not found' });

    file.isDeleted = false;
    await file.save();

    const io = getIO(req);
    io.to(file.task._id.toString()).emit('fileRestored', file);

    await logAudit({
      user: req.user._id,
      action: 'restored_file',
      targetType: 'File',
      targetId: file._id,
      metadata: { name: file.originalname },
    });

    await logActivity({
      io,
      project: file.task.project,
      user: req.user._id,
      action: 'restored file',
      meta: { fileId: file._id, filename: file.filename },
    });

    res.status(200).json({ message: 'File restored' });
  } catch (err) {
    console.error('Restore file error:', err);
    res.status(500).json({ message: 'Failed to restore file' });
  }
};

export const permanentlyDeleteFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const file = await File.findById(fileId).populate({ path: 'task', select: 'project' });
    if (!file) return res.status(404).json({ message: 'File not found' });

    const filePath = file.filePath ? path.resolve(file.filePath) : null;
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);

    const projectId = file.task?.project;
    const fileName = file.originalname;

    await File.findByIdAndDelete(fileId);

    const io = getIO(req);
    if (file.task) io.to(file.task._id.toString()).emit('filePermanentlyDeleted', fileId);

    await logAudit({
      user: req.user._id,
      action: 'permanently_deleted_file',
      targetType: 'File',
      targetId: fileId,
      metadata: { name: fileName },
    });

    await logActivity({
      io,
      project: projectId,
      user: req.user._id,
      action: 'permanently deleted file',
      meta: { fileId, filename: fileName },
    });

    res.status(200).json({ message: 'File permanently deleted' });
  } catch (error) {
    console.error('Error permanently deleting file:', error);
    res.status(500).json({ message: 'Failed to permanently delete file' });
  }
};
