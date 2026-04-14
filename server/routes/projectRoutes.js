import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { authorizeRoles } from '../middlewares/roleMiddleware.js';
import { authorizeProjectRole } from '../middlewares/authorizeProjectRole.js';
import {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  inviteToProject,
  acceptInvite,
  getProjectInvites,
  leaveProject,
  getProjectMembers,
  removeMemberFromProject,
  updateProjectMemberRole,
  archiveProject,
  restoreProject
} from '../controllers/projectController.js';

const router = express.Router();

router.use(protect);

router.post('/', authorizeRoles('admin', 'manager'), createProject);
router.get('/', getProjects);
router.get('/:projectId', authorizeProjectRole('owner', 'editor', 'viewer'), getProjectById);
router.put('/:projectId', authorizeProjectRole('owner'), updateProject);
router.delete('/:projectId', authorizeProjectRole('owner'), deleteProject);

router.post('/:projectId/invite', authorizeProjectRole('owner'), inviteToProject);
router.get('/:projectId/invites', authorizeProjectRole('owner', 'editor', 'viewer'), getProjectInvites);
router.post('/accept-invite/:token', acceptInvite);
router.delete('/:projectId/leave', authorizeProjectRole('viewer', 'editor'), leaveProject);

router.get("/:projectId/members", authorizeProjectRole('owner', 'editor', 'viewer'), getProjectMembers);
router.delete('/:projectId/members/:memberId', authorizeProjectRole('owner'), removeMemberFromProject);
router.patch('/:projectId/members/:memberId/role', authorizeProjectRole('owner'), updateProjectMemberRole);

router.patch('/:projectId/archive', authorizeProjectRole('owner'), archiveProject);
router.patch('/:projectId/restore', authorizeProjectRole('owner'), restoreProject);

export default router;
