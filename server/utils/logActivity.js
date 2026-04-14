import Activity from '../models/Activity.js';

export const logActivity = async ({ io, project, user, action, meta = {} }) => {
  const activity = await Activity.create({
    project,
    user,
    action,
    meta,
  });

  const populatedActivity = await Activity.findById(activity._id)
    .populate('user', 'username avatar');

  if (io) {
    // Project-wide activity
    io.to(project.toString()).emit('activityCreated', populatedActivity);

    // Task-specific activity 
    if (meta.taskId) {
      io.to(meta.taskId.toString()).emit('taskActivityCreated', populatedActivity);
    }
  }

  return activity;
};
