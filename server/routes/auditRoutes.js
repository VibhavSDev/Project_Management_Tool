import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { authorizeRoles } from '../middlewares/roleMiddleware.js';
import { getAllAuditLogs,
  getLogsByUser,
  getLogsByProject,
  getLogsByTask,
  getLogsByFile,
  clearAllAuditLogs,
} from '../controllers/auditController.js';

const router = express.Router();

// 🔐 All audit routes require authentication
router.use(protect);

// ==========================
// 🔒 ADMIN-ONLY ROUTES
// ==========================

// Get ALL audit logs (system-wide)
router.get("/", authorizeRoles("admin"), getAllAuditLogs);

// Clear all audit logs (dangerous, admin only)
router.delete("/", authorizeRoles("admin"), clearAllAuditLogs);

// ==========================
// 👤 USER / CONTEXTUAL ROUTES
// ==========================

// Logs for a specific user
// Admin → any user
// User → only their own logs
router.get("/user/:userId", getLogsByUser);

// Logs for a specific project
// Admin → allowed
// Project members → allowed
router.get("/project/:projectId", getLogsByProject);

// Logs for a specific task
router.get("/task/:taskId", getLogsByTask);

// Logs for a specific file
router.get("/file/:fileId", getLogsByFile);

export default router;
