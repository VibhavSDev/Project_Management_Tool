import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { authorizeProjectRole } from '../middlewares/authorizeProjectRole.js';
import {
  createComment,
  getCommentsForTask,
  updateComment,
  softDeleteComment,
  restoreComment,
  toggleCommentReaction,
} from '../controllers/commentController.js';

const router = express.Router();

router.use(protect);

router.post('/:taskId', authorizeProjectRole('owner', 'editor', 'viewer'), createComment);
router.get('/:taskId', authorizeProjectRole('owner', 'editor', 'viewer'), getCommentsForTask);
router.patch('/:commentId', authorizeProjectRole('owner', 'editor', 'viewer'), updateComment);
router.patch("/:commentId/react", authorizeProjectRole('owner', 'editor', 'viewer'), toggleCommentReaction);
router.delete('/:commentId/delete', authorizeProjectRole('owner', 'editor', 'viewer'), softDeleteComment);
router.patch('/:commentId/restore', authorizeProjectRole('owner'), restoreComment);

export default router;
