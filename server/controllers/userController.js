import bcrypt from 'bcrypt';
import User from '../models/User.js';

const getBaseUrl = (req) => process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;

export const searchUsersByEmail = async (req, res, next) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ success: false, message: 'Email query is required' });

    const users = await User.find({ email: new RegExp(email, 'i'), isActive: true })
      .select('-password -resetPasswordToken -resetPasswordExpires');

    const baseUrl = getBaseUrl(req);
    const formattedUsers = users.map(u => ({
      id: u._id,
      username: u.username,
      email: u.email,
      role: u.role,
      avatar: u.avatar ? `${baseUrl}/${u.avatar}` : null,
      isActive: u.isActive,
    }));

    res.status(200).json({ success: true, users: formattedUsers });
  } catch (err) {
    next(err);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -resetPasswordToken -resetPasswordExpires');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const isSelf = req.user._id.toString() === user._id.toString();
    const isAdminOrManager = ['admin', 'manager'].includes(req.user.role);

    if (!isSelf && !isAdminOrManager) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const fullUser = {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      avatar: user.avatar ? user.avatar : null,
    };

    res.status(200).json({ success: true, user: fullUser });
  } catch (err) {
    next(err);
  }
};

export const updateUserProfile = async (req, res, next) => {
  try {
    const { username, email, password, role } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const isSelf = req.user._id.toString() === user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isSelf && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (username) user.username = username;
    if (email) user.email = email;
    if (password && isSelf) user.password = await bcrypt.hash(password, 10);
    if (role && isAdmin) user.role = role;

    const updatedUser = await user.save();
    console.log(updatedUser);
    const baseUrl = getBaseUrl(req);

    res.status(200).json({
      success: true,
      user: {
        id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        avatar: updatedUser.avatar ? `${baseUrl}/${updatedUser.avatar}` : null,
        isActive: updatedUser.isActive,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const updateAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No avatar file uploaded' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.avatar = `uploads/avatars/${req.file.filename}`;
    await user.save();

    const baseUrl = getBaseUrl(req);
    res.status(200).json({
      success: true,
      message: 'Avatar updated successfully',
      avatar: `${baseUrl}/${user.avatar}`,
    });
  } catch (err) {
    console.error('Error updating avatar:', err);
    res.status(500).json({ success: false, message: 'Server error while updating avatar' });
  }
};
