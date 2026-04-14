import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { authorizeProjectRole } from '../middlewares/authorizeProjectRole.js';
import { authorizeRoles } from '../middlewares/roleMiddleware.js';
import {
    getMyActivity,
    getTaskActivityFeed,
    getProjectActivity
} from '../controllers/activityController.js';

const router = express.Router();

router.use(protect);

router.get('/me', getMyActivity);
router.get('/project/:projectId', authorizeProjectRole('owner', 'editor', 'viewer'), getProjectActivity);
router.get('/task/:taskId/feed', authorizeProjectRole('owner', 'editor', 'viewer'), getTaskActivityFeed);

// ===== 🔹 Remove unsafe top-level /activities fetch =====
// If you want, we can add admin-only route like:
// router.get('/', protect, authorizeRoles('admin'), getAllActivities);

export default router;
