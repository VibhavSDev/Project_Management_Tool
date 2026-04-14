import Activity from '../models/Activity.js';

// ===============================
// GET /admin/activity
// ===============================
export const getSystemActivity = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      userId,
      projectId,
      action,
    } = req.query;

    const query = {};

    if (userId) query.user = userId;
    if (projectId) query.project = projectId;
    if (action) query.action = { $regex: action, $options: 'i' };

    const activity = await Activity.find(query)
      .populate('user', 'username email')
      .populate('project', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Activity.countDocuments(query);

    res.json({
      activity,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch {
    res.status(500).json({ message: 'Failed to fetch system activity' });
  }
};
