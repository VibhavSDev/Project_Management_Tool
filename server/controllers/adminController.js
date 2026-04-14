import User from '../models/User.js';
import Task from '../models/Task.js';
import { logAudit } from '../utils/logAudit.js';

const getBaseUrl = (req) => process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;

export const getAllUsers = async (req, res, next) => {
  try {
    let { page = 1, limit = 10, role, sort = "username", order = "asc", search } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);

    const allowedSortFields = ["username", "email", "createdAt", "role"];
    const sortField = allowedSortFields.includes(sort) ? sort : "username";
    const sortOrder = order === "desc" ? -1 : 1;

    const query = {};

    if (role && role !== "all") query.role = role;
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(query)
      .select("-password -resetPasswordToken -resetPasswordExpires")
      .sort({ [sortField]: sortOrder })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const total = await User.countDocuments(query);
    const baseUrl = getBaseUrl(req);

    const formattedUsers = users.map(u => ({
      id: u._id,
      username: u.username,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      avatar: u.avatar ? `${baseUrl}/${u.avatar}` : null,
    }));

    res.status(200).json({
      success: true,
      users: formattedUsers,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    next(err);
  }
};

export const updateUserRole = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const { role } = req.body;
    if (!role) return res.status(400).json({ success: false, message: 'Role is required' });

    user.role = role;
    await user.save();

    await logAudit({
      user: req.user._id,
      action: 'updated_user_role',
      targetType: 'User',
      targetId: user._id,
      metadata: { newRole: role }
    });

    res.status(200).json({
      success: true,
      message: 'User role updated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      }
    });
  } catch (err) {
    next(err);
  }
};

export const deactivateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.isActive = false;
    await user.save();

    await logAudit({
      user: req.user._id,
      action: 'deactivated_user',
      targetType: 'User',
      targetId: user._id,
      metadata: { email: user.email }
    });

    res.status(200).json({
      success: true,
      message: 'User deactivated successfully',
      userId: user._id
    });
  } catch (err) {
    next(err);
  }
};

export const reactivateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.isActive = true;
    await user.save();

    await logAudit({
      user: req.user._id,
      action: 'reactivated_user',
      targetType: 'User',
      targetId: user._id,
      metadata: { email: user.email }
    });

    res.status(200).json({
      success: true,
      message: 'User reactivated successfully',
      userId: user._id
    });
  } catch (err) {
    next(err);
  }
};

export const bulkDeactivateUsers = async (req, res, next) => {
  try {
    const { userIds = [] } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ success: false, message: 'userIds must be a non-empty array' });
    }

    const result = await User.updateMany(
      { _id: { $in: userIds }, isActive: true },
      { $set: { isActive: false } }
    );

    await logAudit({
      user: req.user._id,
      action: 'bulk_deactivated_users',
      targetType: 'User',
      targetId: null,
      metadata: { userIds }
    });

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} users deactivated successfully`,
      deactivatedCount: result.modifiedCount
    });
  } catch (err) {
    next(err);
  }
};

export const getAllTasksAdmin = async (req, res) => {
  try {
    const tasks = await Task.find()
      .populate('project', 'name')
      .populate('assignee', 'username email')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(tasks);
  } catch {
    res.status(500).json({ message: 'Failed to fetch tasks' });
  }
};

