import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { authorizeRoles } from '../middlewares/roleMiddleware.js';

import {
  getAllUsers,
  updateUserRole,
  deactivateUser,
  reactivateUser,
  bulkDeactivateUsers,
  getAllTasksAdmin,
} from '../controllers/adminController.js';

import {
  getAllProjectsAdmin,
  getProjectDetailsAdmin,
  deleteProjectAdmin,
  suspendProjectAdmin,
  archiveProjectAdmin,
  restoreProjectAdmin,
} from '../controllers/adminProjectController.js';

import {
  getSystemActivity,
} from '../controllers/adminActivityController.js';

const router = express.Router();

// 🔐 Admin-only access
router.use(protect, authorizeRoles('admin'));

// =======================
// 👤 Users
// =======================
router.get('/users', getAllUsers);
router.put('/user/:id/role', updateUserRole);
router.put('/user/:id/deactivate', deactivateUser);
router.put('/user/:id/reactivate', reactivateUser);
router.put('/user/bulk-deactivate', bulkDeactivateUsers);

// =======================
// 📁 Projects (READ-ONLY + DELETE)
// =======================
router.get('/projects', getAllProjectsAdmin);          // list all projects
router.get('/projects/:projectId', getProjectDetailsAdmin); // inspect one project
// router.delete('/projects/:projectId', deleteProjectAdmin);  // remove project (abuse/moderation)
// router.put('/projects/:projectId/suspend', suspendProjectAdmin);
// router.put('/projects/:projectId/restore', restoreProjectAdmin);
router.put('/projects/:projectId/archive', archiveProjectAdmin);
router.put('/projects/:projectId/unarchive', restoreProjectAdmin);


// =======================
// 📊 System Activity
// =======================
router.get('/activity', getSystemActivity);

router.get('/tasks', getAllTasksAdmin);

export default router;
