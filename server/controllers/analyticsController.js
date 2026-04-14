import mongoose from "mongoose";
import Task from "../models/Task.js";
import Activity from "../models/Activity.js";
import Project from "../models/Project.js";

export const getTaskStatusCount = async (req, res) => {
  try {
    const { projectId } = req.params;

    const result = { todo: 0, inProgress: 0, done: 0 };

    const counts = await Task.aggregate([
      {
        $match: {
          project: new mongoose.Types.ObjectId(projectId),
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    counts.forEach((item) => {
      const status = (item._id || "").toLowerCase();
      if (status === "todo") result.todo = item.count;
      if (status === "in-progress" || status === "inprogress")
        result.inProgress = item.count;
      if (status === "done") result.done = item.count;
    });

    res.json({ success: true, data: result });
  } catch (err) {
    console.error("Error in getTaskStatusCount:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getTasksPerUser = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId).populate(
      "members.user",
      "username email avatar"
    );

    if (!project) {
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    }

    const aggregated = await Task.aggregate([
      {
        $match: {
          project: new mongoose.Types.ObjectId(projectId),
          isDeleted: false,
          assignedTo: { $ne: null },
        },
      },
      {
        $group: {
          _id: "$assignedTo",
          count: { $sum: 1 },
        },
      },
    ]);

    const countMap = {};
    aggregated.forEach((entry) => {
      countMap[entry._id.toString()] = entry.count;
    });

    const result = project.members.map((m) => ({
      userId: m.user._id,
      username: m.user.username,
      email: m.user.email,
      avatar: m.user.avatar,
      count: countMap[m.user._id.toString()] || 0,
    }));

    res.json({ success: true, data: result });
  } catch (err) {
    console.error("Error in getTasksPerUser:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getTaskTrends = async (req, res) => {
  try {
    const { projectId } = req.params;
    const days = parseInt(req.query.days, 10) || 7;

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const createdTasks = await Task.aggregate([
      {
        $match: {
          project: new mongoose.Types.ObjectId(projectId),
          createdAt: { $gte: sinceDate },
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const completedTasks = await Task.aggregate([
      {
        $match: {
          project: new mongoose.Types.ObjectId(projectId),
          status: "done",
          updatedAt: { $gte: sinceDate },
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Pre-fill trends map
    const trendsMap = {};
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split("T")[0];
      trendsMap[key] = { date: key, created: 0, completed: 0 };
    }

    createdTasks.forEach((item) => {
      if (trendsMap[item._id]) trendsMap[item._id].created = item.count;
    });

    completedTasks.forEach((item) => {
      if (trendsMap[item._id]) trendsMap[item._id].completed = item.count;
    });

    res.json({
      success: true,
      data: Object.values(trendsMap),
    });
  } catch (err) {
    console.error("Error in getTaskTrends:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getRecentActivity = async (req, res) => {
  try {
    const { projectId } = req.params;

    const activities = await Activity.find({
      project: new mongoose.Types.ObjectId(projectId), 
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("user", "username email avatar");

    res.json({ success: true, data: activities });
  } catch (err) {
    console.error("Error in getRecentActivity:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
