import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { authorizeProjectRole } from '../middlewares/authorizeProjectRole.js';
import upload from '../config/multerConfig.js';
import {
  createTask,
  getTasksByProject,
  getMyTasks,
  updateTask,
  deleteTask,
  watchTask,
  unwatchTask,
  softDeleteTask,
  restoreTask,
  searchTasks,
  getTaskById,
  updateTaskStatus,
  getSubtasks,
  toggleTaskAssignee
} from '../controllers/taskController.js';
import {
  addSubtask,
  updateSubtask,
  toggleSubtask,
  deleteSubtask
} from '../controllers/taskController.js';

const router = express.Router();

router.use(protect);

router.post('/create', upload.single('file'), authorizeProjectRole('owner', 'editor'), createTask);
router.get('/my-tasks', getMyTasks);
router.get('/:id', authorizeProjectRole('owner', 'editor', 'viewer'), getTaskById);
router.get('/project/:projectId', authorizeProjectRole('owner', 'editor', 'viewer'), getTasksByProject);
router.get('/search/:projectId', authorizeProjectRole('owner', 'editor', 'viewer'), searchTasks);

router.put('/:id', authorizeProjectRole('owner', 'editor'), updateTask);
router.delete('/:id/delete', authorizeProjectRole('owner', 'editor'), softDeleteTask);
router.delete('/:id/hard', authorizeProjectRole('owner'), deleteTask);
router.post('/:id/restore', authorizeProjectRole('owner'), restoreTask);

router.patch('/:id/status', authorizeProjectRole('owner', 'editor'), updateTaskStatus);
router.patch("/:taskId/assignees", authorizeProjectRole('owner', 'editor'), toggleTaskAssignee);
router.patch('/:id/watch', authorizeProjectRole('owner', 'editor', 'viewer'), watchTask);
router.patch('/:id/unwatch', authorizeProjectRole('owner', 'editor', 'viewer'), unwatchTask);

router.post('/:taskId/subtasks', authorizeProjectRole('owner', 'editor'), addSubtask);
router.get('/:taskId/subtasks', authorizeProjectRole('owner', 'editor', 'viewer'), getSubtasks);
router.put('/:taskId/subtasks/:subtaskId', authorizeProjectRole('owner', 'editor'), updateSubtask);
router.patch('/:taskId/subtasks/:subtaskId/toggle', authorizeProjectRole('owner', 'editor', 'viewer'), toggleSubtask);
router.delete('/:taskId/subtasks/:subtaskId', authorizeProjectRole('owner', 'editor'), deleteSubtask);

export default router;
