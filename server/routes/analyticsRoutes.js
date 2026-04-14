import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { authorizeProjectRole } from "../middlewares/authorizeProjectRole.js";
import {
  getTaskStatusCount,
  getTasksPerUser,
  getTaskTrends,
  getRecentActivity,
} from "../controllers/analyticsController.js";

const router = express.Router();

router.use(protect);

router.get("/project/:projectId/status", authorizeProjectRole("owner", "editor", "viewer"), getTaskStatusCount);
router.get("/project/:projectId/assignees", authorizeProjectRole("owner", "editor", "viewer"), getTasksPerUser);
router.get("/project/:projectId/trends", authorizeProjectRole("owner", "editor", "viewer"), getTaskTrends);
router.get("/project/:projectId/recent-activity", authorizeProjectRole("owner", "editor", "viewer"), getRecentActivity);

export default router;
