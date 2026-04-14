import React from "react";
import { Calendar, AlertTriangle, Flag } from "lucide-react";
import clsx from "clsx";

export default function MyTaskCard({ task, onClick }) {
  if (!task) return null;

  const priorityColors = {
    low: "bg-green-100 text-green-700",
    medium: "bg-yellow-100 text-yellow-700",
    high: "bg-red-100 text-red-700",
  };

  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const isOverdue = dueDate && dueDate < new Date();

  return (
    <div
      onClick={onClick}
      className="cursor-pointer bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg p-4 shadow-sm hover:shadow-md transition"
    >
      {/* Title */}
      <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-2">
        {task.title || "Untitled Task"}
      </h3>

      {/* Project */}
      {task.project && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {task.project.name}
        </p>
      )}

      <div className="flex items-center justify-between mt-3">
        {/* Priority */}
        {task.priority && (
          <span
            className={clsx(
              "text-xs px-2 py-0.5 rounded-full font-medium capitalize",
              priorityColors[task.priority] || "bg-gray-100 text-gray-600"
            )}
          >
            <Flag className="inline h-3 w-3 mr-1" />
            {task.priority}
          </span>
        )}

        {/* Due date */}
        {dueDate && (
          <span
            className={clsx(
              "flex items-center text-xs font-medium",
              isOverdue
                ? "text-red-600"
                : "text-gray-500 dark:text-gray-400"
            )}
          >
            <Calendar className="h-3 w-3 mr-1" />
            {dueDate.toLocaleDateString()}
            {isOverdue && (
              <AlertTriangle className="h-3 w-3 ml-1 text-red-500" />
            )}
          </span>
        )}
      </div>

      {/* Assignees */}
      {task.assignees?.length > 0 && (
        <div className="flex -space-x-2 mt-3">
          {task.assignees.slice(0, 3).map((user) => (
            <img
              key={user._id}
              src={user.avatar || "/default-avatar.png"}
              alt={user.username}
              className="w-6 h-6 rounded-full border-2 border-white dark:border-zinc-900"
              title={user.username}
            />
          ))}
          {task.assignees.length > 3 && (
            <span className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 dark:bg-zinc-700 text-xs text-gray-600 dark:text-gray-300">
              +{task.assignees.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
