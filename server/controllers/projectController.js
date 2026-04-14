import mongoose from 'mongoose';
import Project from '../models/Project.js'; 
import User from '../models/User.js';
import { sendEmail } from '../utils/sendEmail.js';
import crypto from 'crypto';
import { logAudit } from '../utils/logAudit.js';
import { logActivity } from '../utils/logActivity.js';

const getIO = (req) => req.app.get("io");

export const createProject = async (req, res) => {
  try {
    const { name, description, members = [] } = req.body;
    const existingProject = await Project.findOne({ name });
    if (existingProject)
      return res.status(400).json({ message: 'Project already exists' });

    const creator = { user: req.user._id, projectRole: 'owner' };
    const cleanedMembers = Array.isArray(members)
      ? members
          .filter(m => m?.user && m?.projectRole)
          .filter(m => m.user !== req.user._id.toString())
      : [];
    const uniqueMembers = [creator, ...cleanedMembers];

    const project = await Project.create({
      name,
      description,
      owner: req.user._id,
      members: uniqueMembers,
    });

    const io = getIO(req);
    io.to(req.user._id.toString()).emit("projectCreated", project);

    for (const member of cleanedMembers) {
      io.to(member.user.toString()).emit("addedToProject", {
        projectId: project._id,
        projectName: project.name,
        role: member.projectRole,
      });
    }

    await logActivity({
      io,
      project: project._id,
      user: req.user._id,
      action: 'created project',
      meta: { name: project.name }
    });

    await logAudit({ 
      user: req.user._id,
      action: 'created project',
      targetType: 'Project',
      targetId: project._id,
      metadata: { name: project.name }
    });

    res.status(201).json({ success: true, project });
  } catch (err) {
    console.error('Create Project Error:', err);
    res.status(500).json({ success: false, message: 'Failed to create project', error: err.message });
  }
};

export const getProjects = async (req, res) => {
  try {
    const query = req.user?.role === 'admin' ? {} : { 'members.user': req.user._id };
    const projects = await Project.find(query)
      .populate('members.user', 'username email avatar')
      .populate('owner', 'username email avatar')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, projects });
  } catch (err) {
    console.error('Get Projects Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch projects' });
  }
};

export const getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId)
      .populate('members.user', 'username email avatar')
      .populate('owner', 'username email avatar');

    if (!project) return res.status(404).json({ message: 'Project not found' });

    const isAdmin = req.user?.role === 'admin';
    const isOwner = project.owner._id.toString() === req.user._id.toString();
    const isMember = project.members.some(m => m.user._id.toString() === req.user._id.toString());

    if (!isAdmin && !isOwner && !isMember)
      return res.status(403).json({ message: 'Not authorized to access this project' });

    const memberRecord = project.members.find(m => m.user._id.toString() === req.user._id.toString());
    const currentUserRole = isOwner ? 'owner' : memberRecord?.projectRole || (isAdmin ? 'admin' : null);

    res.status(200).json({ ...project.toObject(), currentUserId: req.user._id, currentUserRole });
  } catch (err) {
    console.error('Get Project Error:', err);
    res.status(500).json({ message: 'Failed to get project' });
  }
};

export const updateProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const isOwner = project.owner.toString() === req.user._id.toString();
    if (!isOwner) return res.status(403).json({ message: 'Only owner can update this project' });

    project.name = req.body.name || project.name;
    project.description = req.body.description || project.description;
    await project.save();

    const updatedProject = await Project.findById(project._id)
      .populate('owner', 'username email avatar')
      .populate('members.user', 'username email avatar');
    
    const io = getIO(req);
    io.to(project._id).emit("projectUpdated", { updatedProject });

    await logAudit({
      user: req.user._id,
      action: 'updated_project',
      targetType: 'Project',
      targetId: project._id,
      metadata: { name: project.name }
    });
    await logActivity({
      io,
      project: project._id,
      user: req.user._id,
      action: 'updated project',
      meta: { name: project.name }
    });

    res.status(200).json(updatedProject);
  } catch (err) {
    console.error('Update Project Error:', err);
    res.status(500).json({ message: 'Failed to update project' });
  }
};

export const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const isOwner = project.owner.toString() === req.user._id.toString();
    if (!isOwner) return res.status(403).json({ message: 'Only owner can delete this project' });

    await project.deleteOne();

    const io = getIO(req);
    io.to(req.params.projectId).emit("projectDeleted", { projectId : req.params.projectId });

    await logAudit({
      user: req.user._id,
      action: 'deleted_project',
      targetType: 'Project',
      targetId: project._id,
      metadata: { name: project.name }
    });

    await logActivity({
      io,
      project: project._id,
      user: req.user._id,
      action: 'deleted project',
      meta: { name: project.name }
    });

    res.status(200).json({ message: 'Project deleted successfully' });
  } catch (err) {
    console.error('Delete Project Error:', err);
    res.status(500).json({ message: 'Failed to delete project' });
  }
};

export const inviteToProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { email } = req.body;

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (project.owner.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Only owner can invite users' });

    const existingUser = await User.findOne({ email });
    if (!existingUser) return res.status(404).json({ message: 'No registered user with that email' });

    if (project.members.some(m => m.user.toString() === existingUser._id.toString()))
      return res.status(400).json({ message: 'User is already a member' });

    if (project.invitations.some(inv => inv.email === email))
      return res.status(400).json({ message: 'User already invited' });

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000);
    project.invitations.push({ email, token, expires });
    await project.save({ validateBeforeSave: false });

    const inviteUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/accept-invite/${token}`;
    await sendEmail({ to: email, subject: "You're invited to a project", html: `<p>Click to accept invite (expires in 1 hour):</p><a href="${inviteUrl}">${inviteUrl}</a>` });

    const io = getIO(req);
    if (existingUser) {
      io.to(existingUser._id.toString()).emit("inviteReceived", {
        projectId,
        projectName: project.name,
        invitedBy: req.user.username,
        email,
      });
    }

    await logAudit({
      user: req.user._id,
      action: 'invited_user_to_project',
      targetType: 'Project',
      targetId: project._id,
      metadata: { invitedEmail: email }
    });

    await logActivity({
      io,
      project: project._id,
      user: req.user._id,
      action: 'invited user',
      meta: { email }
    });

    res.status(200).json({ message: 'Invitation sent successfully' });
  } catch (err) {
    console.error('Invite error:', err);
    res.status(500).json({ message: 'Failed to send invite' });
  }
};

export const acceptInvite = async (req, res) => {
  try {
    const { token } = req.params;
    const user = req.user;

    const project = await Project.findOne({ 'invitations.token': token });
    if (!project) return res.status(404).json({ message: 'Invalid invitation token' });

    const invite = project.invitations.find(i => i.token === token);
    if (!invite || invite.expires < new Date())
      return res.status(400).json({ message: 'Invitation has expired' });

    if (project.members.some(m => m.user.toString() === user._id.toString()))
      return res.status(400).json({ message: 'You are already a member of this project' });

    project.members.push({ user: user._id, projectRole: 'viewer' });
    project.invitations = project.invitations.filter(i => i.token !== token);
    await project.save({ validateBeforeSave: false });

    const io = getIO(req);
    io.to(project._id.toString()).emit("memberJoined", {
      projectId: project._id,
      userId: user._id,
      username: user.username,
      role: "viewer",
    });

    await logAudit({
      user: user._id,
      action: 'accepted_invite',
      targetType: 'Project',
      targetId: project._id,
      metadata: { userId: user._id }
    });

    await logActivity({
      io,
      project: project._id,
      user: user._id,
      action: 'joined project',
      meta: { userId: user._id }
    });

    res.status(200).json({ message: 'You have joined the project successfully' });
  } catch (err) {
    console.error('Accept invite error:', err);
    res.status(500).json({ message: 'Failed to accept invite' });
  }
};

export const getProjectInvites = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (project.owner.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Only project owner can view invites' });

    res.status(200).json({ success: true, invitations: project.invitations });
  } catch (err) {
    console.error('Get Project Invites Error:', err);
    res.status(500).json({ message: 'Failed to fetch invites' });
  }
};

export const leaveProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (project.owner.toString() === req.user._id.toString())
      return res.status(400).json({ message: "Project owner can't leave the project" });

    const beforeCount = project.members.length;
    project.members = project.members.filter(m => m.user.toString() !== req.user._id.toString());
    if (beforeCount === project.members.length)
      return res.status(400).json({ message: 'You are not a member of this project' });

    await project.save();

    const io = getIO(req);
    io.to(project._id.toString()).emit("memberLeft", {
      projectId: project._id,
      userId: req.user._id,
    });

    await logActivity({
      io,
      project: projectId,
      user: req.user._id,
      action: 'left project',
      meta: { userId: req.user._id }
    });

    await logAudit({
      user: req.user._id,
      action: 'left_project',
      targetType: 'Project',
      targetId: projectId,
      metadata: { userId: req.user._id }
    });

    res.status(200).json({ message: 'You have left the project successfully' });
  } catch (err) {
    console.error('Leave Project Error:', err);
    res.status(500).json({ message: 'Failed to leave project' });
  }
};

export const updateProjectMemberRole = async (req, res) => {
  try {
    const { projectId, memberId } = req.params;
    const { newRole } = req.body;

    if (!mongoose.Types.ObjectId.isValid(projectId) ||
        !mongoose.Types.ObjectId.isValid(memberId)) {
      return res.status(400).json({ message: "Invalid project or member ID" });
    }

    const allowedRoles = ["viewer", "editor"];
    if (!allowedRoles.includes(newRole)) {
      return res.status(400).json({
        message: "Invalid role. Allowed roles: viewer, editor",
      });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const member = project.members.find(
      (m) => m.user.toString() === memberId.toString()
    );

    if (!member) {
      return res.status(404).json({ message: "Member not found in project" });
    }

    if (member.user.toString() === project.owner.toString()) {
      return res
        .status(400)
        .json({ message: "Cannot change owner role" });
    }

    if (member.projectRole === newRole) {
      return res
        .status(200)
        .json({ message: "Member already has this role" });
    }

    member.projectRole = newRole;
    project.members.forEach((m) => {
      if (!mongoose.Types.ObjectId.isValid(m._id)) {
        m._id = new mongoose.Types.ObjectId();
      }
    });
    
    await project.save();

    const io = getIO(req);
    io.to(memberId.toString()).emit("roleChanged", {
      projectId,
      newRole,
    });
    io.to(projectId.toString()).emit("memberRoleUpdated", {
      memberId,
      newRole,
    });

    await logAudit({
      user: req.user._id,
      action: "updated_member_role",
      targetType: "Project",
      targetId: projectId,
      metadata: { memberId, newRole },
    });

    await logActivity({
      io,
      project: projectId,
      user: req.user._id,
      action: "updated member role",
      meta: { memberId, newRole },
    });

    res.status(200).json({
      message: "Member role updated successfully",
      memberId,
      newRole,
    });
  } catch (err) {
    console.error("Update Member Role Error:", err);
    res.status(500).json({ message: "Failed to update member role" });
  }
};

export const getProjectMembers = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user._id;

    const project = await Project.findById(projectId)
      .populate("owner", "username email avatar")
      .populate("members.user", "username email avatar");

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const isMember =
      project.owner._id.toString() === userId.toString() ||
      project.members.some(m => m.user._id.toString() === userId.toString());

    if (!isMember) {
      return res.status(403).json({ message: "Access denied" });
    }

    const members = [
      {
        _id: project.owner._id,
        username: project.owner.username,
        email: project.owner.email,
        avatar: project.owner.avatar,
        role: "owner",
      },
      ...project.members.map(m => ({
        _id: m.user._id,
        username: m.user.username,
        email: m.user.email,
        avatar: m.user.avatar,
        role: m.projectRole,
      })),
    ];

    res.json(members);
  } catch (error) {
    console.error("getProjectMembers error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const removeMemberFromProject = async (req, res) => {
  try {
    const { projectId, memberId } = req.params;
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const isOwner = project.owner.toString() === req.user._id.toString();
    if (!isOwner)
      return res.status(403).json({ message: 'Only owner or admin can remove members' });

    project.members = project.members.filter(m => m.user.toString() !== memberId);
    await project.save();

    const io = getIO(req);
    io.to(memberId).emit("removedFromProject", {
      projectId: project._id,
      removedBy: req.user.username,
    });

    await logAudit({
      user: req.user._id,
      action: 'removed_member',
      targetType: 'Project',
      targetId: project._id,
      metadata: { removedUserId: memberId }
    });

    await logActivity({
      io,
      project: project._id,
      user: req.user._id,
      action: 'removed member from project',
      meta: { removedUserId: memberId }
    });

    res.status(200).json({ message: 'Member removed' });
  } catch (err) {
    console.error('Remove Member Error:', err);
    res.status(500).json({ message: 'Failed to remove member' });
  }
};

export const archiveProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findByIdAndUpdate(projectId, { isArchived: true }, { new: true, runValidators: true });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const io = getIO(req);
    io.to(projectId).emit("projectArchived", { projectId });

    res.json({ success: true, message: 'Project archived', project });
  } catch (err) {
    console.error('Archive Project Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const restoreProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findByIdAndUpdate(projectId, { isArchived: false }, { new: true, runValidators: true });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const io = getIO(req);
    io.to(projectId).emit("projectRestored", { projectId });

    res.json({ success: true, message: 'Project restored', project });
  } catch (err) {
    console.error('Restore Project Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
