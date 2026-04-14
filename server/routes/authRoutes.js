import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import {
    loginUser,
    registerUser,
    getMe,
    resetPassword,
    requestPasswordReset
} from '../controllers/authController.js';
import { googleLogin } from '../controllers/authController.js';
import upload from '../config/multerConfig.js';

const router = express.Router();

router.post('/register', upload.single('avatar'), registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.post('/request-password-reset', requestPasswordReset);
router.post('/reset-password/:token', resetPassword);
router.post('/google', googleLogin);

export default router;
