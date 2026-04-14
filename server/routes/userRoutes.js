import express from 'express';
import {
  getUserById,
  updateUserProfile,
  searchUsersByEmail,
} from '../controllers/userController.js';
import { protect } from '../middlewares/authMiddleware.js';
import upload from '../config/multerConfig.js';
import { updateAvatar } from '../controllers/userController.js';
import { authorizeRoles } from '../middlewares/roleMiddleware.js';

const router = express.Router();

router.get('/search', protect, authorizeRoles('admin', 'manager'), searchUsersByEmail);
router.get('/:id', protect, getUserById);
router.put('/:id', protect, updateUserProfile);
router.post('/avatar', protect, upload.single('avatar'), updateAvatar);

export default router;
