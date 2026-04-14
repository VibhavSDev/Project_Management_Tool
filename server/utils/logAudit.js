import AuditLog from '../models/AuditLog.js';

export const logAudit = async ({ user, action, targetType, targetId, metadata = {} }) => {
  const log = new AuditLog({
    user,
    action,
    targetType,
    targetId,
    metadata
  });
  await log.save();
};
