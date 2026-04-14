import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import {
  getNotifications,
  getUnreadNotifications,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  markNotificationAsRead,
} from '../controllers/notificationController.js';

const router = express.Router();

router.use(protect);

router.get('/', getNotifications);
router.get('/unread', getUnreadNotifications);
router.patch('/:id/read', markNotificationAsRead);
router.put('/all/read', markAllAsRead);
router.delete('/:id', deleteNotification);
router.delete('/clear-all', clearAllNotifications);

export default router;
