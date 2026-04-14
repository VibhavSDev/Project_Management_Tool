import { Calendar, Flag } from 'lucide-react';
import classNames from 'classnames';

export default function ProjectTaskCard({ task, projectId, onClick }) {

   if (!task) return null;

   const {
    title = "Untitled task",
    priority,
    dueDate,
    status,
    assignee,
  } = task;

  const priorityColors = {
    low: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    medium:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    high: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  };

  const statusColors = {
    todo: "bg-gray-100 dark:bg-gray-700",
    "in-progress": "bg-blue-100 dark:bg-blue-900",
    review: "bg-purple-100 dark:bg-purple-900",
    done: "bg-green-100 dark:bg-green-900",
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700
                 hover:shadow-md hover:border-indigo-400 transition cursor-pointer ${`transition ${ task._flash ? "ring-2 ring-indigo-400" : "" }`}`}
    >
      <h4 className="text-sm font-semibold mb-2 line-clamp-2">
        {title}
      </h4>

      <div className="flex flex-wrap gap-2 mb-2">
        {priority && (
          <span
            className={classNames(
              "text-xs px-2 py-0.5 rounded-full flex items-center gap-1",
              priorityColors[priority]
            )}
          >
            <Flag size={12} />
            {priority}
          </span>
        )}

        {status && (
          <span
            className={classNames(
              "text-xs px-2 py-0.5 rounded-full capitalize",
              statusColors[status]
            )}
          >
            {status}
          </span>
        )}
      </div>

      {dueDate && (
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Calendar size={12} />
          {new Date(dueDate).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}
