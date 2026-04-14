import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { authorizeProjectRole } from '../middlewares/authorizeProjectRole.js';
import upload from '../config/multerConfig.js';
import {
  getFilesByProject,
  getFilesByTask,
  uploadTaskFiles,
  deleteFile,
  permanentlyDeleteFile,
  downloadFile,
  restoreFile,
} from '../controllers/fileController.js';

const router = express.Router();

router.use(protect);

router.post('/upload/:taskId', authorizeProjectRole('owner', 'editor'), upload.array('files', 5), uploadTaskFiles);
router.get('/project/:projectId', authorizeProjectRole('owner', 'editor', 'viewer'), getFilesByProject);
router.get('/task/:taskId', authorizeProjectRole('owner', 'editor', 'viewer'), getFilesByTask);
router.get('/download/:fileId', authorizeProjectRole('owner', 'editor', 'viewer'), downloadFile);
router.delete('/:fileId', authorizeProjectRole('owner', 'editor'), deleteFile);
router.delete('/:fileId/permanent', authorizeProjectRole('owner'), permanentlyDeleteFile);
router.patch('/:fileId/restore', authorizeProjectRole('owner'), restoreFile);

export default router;
