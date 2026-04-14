// src/components/tasks/TaskActivityTab.jsx
import { useEffect, useState } from "react";
import API from "../../services/axiosInstance";
import toast from "react-hot-toast";
import { useSocket } from "../../contexts/SocketContext";

const formatActivity = (log) => {
  const meta = log.meta || {};

  // 🧑 Assignee change
  if (meta.from || meta.to) {
    if (!meta.from && meta.to) {
      return `assigned task to ${meta.to}`;
    }
    if (meta.from && !meta.to) {
      return `unassigned task from ${meta.from}`;
    }
    return `reassigned task from ${meta.from} → ${meta.to}`;
  }

  // 🔄 Status change
  if (meta.newStatus) {
    return `changed task status to "${meta.newStatus}"`;
  }

  // 📎 File upload
  if (meta.filename) {
    return `uploaded file "${meta.filename}"`;
  }

  // 💬 Comment activity
  if (meta.commentId) {
    return log.action || "updated a comment";
  }

  // 🧾 Default fallback
  return log.action || "performed an action";
};


const TaskActivityTab = ({ taskId }) => {
  const { socket } = useSocket();
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const res = await API.get(`/activity/task/${taskId}/feed`);
        setActivity(res.data.data);
        console.log(res.data.data);
      } catch (err) {
        console.error("Error fetching task activity", err);
        toast.error("Failed to load task activity");
      } finally {
        setLoading(false);
      }
    };

    if (taskId) {
      console.log("Fetching activity for taskId:", taskId);
      fetchActivity();
    } else {
      console.warn("TaskActivityTab mounted without a valid taskId");
      setLoading(false);
    }
  }, [taskId]);

  // 🔴 Real-time task activity
  useEffect(() => {
    if (!socket || !taskId) return;

    // join task room
    socket.emit("joinTask", taskId);

    const handleTaskActivity = (newActivity) => {
      if (newActivity?.meta?.taskId === taskId) {
        setActivity((prev) => [newActivity, ...prev]);
      }
    };

    socket.on("taskActivityCreated", handleTaskActivity);

    return () => {
      socket.off("taskActivityCreated", handleTaskActivity);
      socket.emit("leaveTask", taskId);
    };
  }, [socket, taskId]);
  

  if (loading) {
    return (
      <div className="p-4 text-gray-500 dark:text-gray-400">
        Loading task activity...
      </div>
    );
  }
  

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
        Task Activity
      </h3>

      {activity.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">
          No activity yet for this task.
        </p>
      ) : (
        <ul className="space-y-3">
          {activity.map((log) => (
            <li
              key={log._id}
              className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-800 shadow-sm"
            >
              <p className="text-sm text-gray-800 dark:text-gray-200">
                <span className="font-medium text-indigo-600 dark:text-indigo-400">
                  <span className="font-medium text-indigo-600 dark:text-indigo-400">
                    {typeof log.user === "object"
                      ? log.user.username
                      : log.user || "Someone"}
                  </span>
                </span>{" "}
                {formatActivity(log)}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {new Date(log.createdAt).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TaskActivityTab;
