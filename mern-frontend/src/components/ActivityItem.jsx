import React from 'react';
import { MessageSquare, FileEdit, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function ActivityItem({ activity }) {
  const { userId, action, meta, createdAt, type, text, user, metadata } = activity;

  const iconMap = {
    comment: <MessageSquare className="w-5 h-5 text-blue-500" />,
    log: <FileEdit className="w-5 h-5 text-yellow-500" />,
    done: <CheckCircle className="w-5 h-5 text-green-500" />
  };

  let description = '';

  if (type === 'comment') {
    description = `${user} commented: "${text}"`;
  } else if (type === 'log') {
    description = `${user} ${action.replace(/_/g, ' ')} ${metadata?.newStatus ? `"${metadata.newStatus}"` : ''}`;
  } else {
    // fallback for Activity model
    description = `${userId?.name || 'Someone'} ${action}`;
  }

  return (
    <div className="flex items-start gap-3 p-3 bg-white dark:bg-zinc-900 rounded shadow-sm">
      <div className="flex-shrink-0">{iconMap[type] || iconMap.log}</div>
      <div className="flex-1">
        <p className="text-sm">{description}</p>
        <span className="text-xs text-gray-500">
          {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
        </span>
      </div>
    </div>
  );
}
