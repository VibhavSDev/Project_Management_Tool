import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { generateResetToken } from '../utils/generateResetToken.js';
import { sendEmail } from '../utils/sendEmail.js';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const getBaseUrl = (req) => process.env.CLIENT_URL || `${req.protocol}://${req.get("host")}`;

export const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

export const registerUser = async (req, res, next) => {
  try {
    let { username, email, password, role } = req.body;
    email = email.toLowerCase();

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ success: false, message: "Email is already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      role: role || 'member',
    });

    if (req.file) newUser.avatar = `uploads/avatars/${req.file.filename}`;

    await newUser.save();

    const token = generateToken(newUser);
    const baseUrl = getBaseUrl(req);

    res.status(201).json({
      success: true,
      token,
      expiresIn: "7d",
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        avatar: newUser.avatar ? `${baseUrl}/${newUser.avatar}` : null,
      }
    });
  } catch (err) {
    next(err);
  }
};

export const loginUser = async (req, res, next) => {
  try {
    let { email, password } = req.body;
    email = email.toLowerCase();

    const user = await User.findOne({ email }).select('+password');
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    if (!user.isActive) return res.status(403).json({ success: false, message: 'Account is inactive' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = generateToken(user);
    const baseUrl = getBaseUrl(req);

    res.status(200).json({
      success: true,
      token,
      expiresIn: "7d",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar ? `${baseUrl}/${user.avatar}` : null,
      }
    });
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req, res, next) => {
  try {
    if (!req.user.isActive) return res.status(403).json({ success: false, message: 'Account is deactivated' });

    const user = await User.findById(req.user.id).select('-password -resetPasswordToken -resetPasswordExpires -__v');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        avatar: user.avatar ? user.avatar : null,
      }
    });
  } catch (err) {
    next(err);
  }
};


export const requestPasswordReset = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const { token, hashedToken } = generateResetToken();
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 min
    await user.save();

    const resetUrl = `${getBaseUrl(req)}/reset-password/${token}`;
    await sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      html: `
        <p>Hi ${user.username},</p>
        <p>You requested a password reset. Click below:</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>This link will expire in 15 minutes.</p>
      `
    });

    res.status(200).json({ success: true, message: 'Reset link sent to email' });
  } catch (err) {
    next(err);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired token' });

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ success: true, message: 'Password has been reset successfully' });
  } catch (err) {
    next(err);
  }
};

export const googleLogin = async (req, res, next) => {
  try {
    const { credential } = req.body;

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture, sub } = payload;

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        email,
        username: name,
        avatar: picture,
        provider: 'google',
        googleId: sub,
        role: 'member',
      });
    }

    const token = generateToken(user);
    const baseUrl = getBaseUrl(req);

    res.status(200).json({
      success: true,
      message: 'Google login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar ? `${baseUrl}/${user.avatar}` : null,
      }
    });
  } catch (err) {
    console.error('Google login error:', err);
    res.status(401).json({ success: false, message: 'Google login failed' });
  }
};
