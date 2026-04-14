import { useEffect, useState } from "react";
import API from "../../services/axiosInstance";
import { useAuth } from "../../shared/useAuth";
import toast from "react-hot-toast";
import { FaEye, FaEyeSlash, FaUser } from "react-icons/fa";
import { useSocket } from "../../contexts/SocketContext";

const TaskWatchersTab = ({ taskId, refetchTask, task }) => {
  const { user, logout } = useAuth();
  const { socket } = useSocket(); 
  const [loading, setLoading] = useState(false);
  const [watching, setWatching] = useState(false);

  // check if current user is already a watcher
  useEffect(() => {
    if (!user || !task) return;

    setWatching(
      task.watchers?.some(w => String(w._id) === String(user._id)) || false
    );
  }, [task, user]);

  useEffect(() => {
    if (!socket || !taskId) return;

    socket.emit("joinTask", taskId);

    return () => {
      socket.emit("leaveTask", taskId);
    };
  }, [socket, taskId]);

  useEffect(() => {
    if (!socket) return;

    const onWatcherUpdated = ({ taskId: updatedTaskId, watchers }) => {
      if (updatedTaskId !== taskId) return;
      refetchTask(); // safest: always re-sync task
    };

    const onFilesUploaded = ({ taskId: uploadedTaskId, files }) => {
      if (uploadedTaskId !== taskId) return;

      setFiles(prev => {
        const existingIds = new Set(prev.map(f => f._id));
        const newFiles = files.filter(f => !existingIds.has(f._id));
        return [...newFiles, ...prev];
      });

      toast.success(`${files.length} new file(s) uploaded`);
    };


    socket.on("taskWatchersUpdated", onWatcherUpdated);
    socket.on("taskFilesUploaded", onFilesUploaded);

      return () => {
        socket.off("taskWatchersUpdated", onWatcherUpdated);
        socket.off("taskFilesUploaded", onFilesUploaded);
      };
  }, [socket, taskId, refetchTask]);

  const handleToggleWatch = async () => {
    if (!taskId) return;
    
    try {
      setLoading(true);

      if (watching) {
        setWatching(false); // optimistic
        await API.post(`/tasks/${taskId}/unwatch`);
        toast.success("You are no longer watching this task");
      } else {
        setWatching(true); // optimistic
        await API.post(`/tasks/${taskId}/watch`);
        toast.success("You are now watching this task");
      }

      await refetchTask();
    } catch (err) {
      console.error(err);
      toast.error("Action failed");
      // rollback if request failed
      setWatching(!watching);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Watchers
        </h2>
        <button
          disabled={loading}
          onClick={handleToggleWatch}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition ${
            watching
              ? "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-800 dark:text-white"
              : "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-700 dark:text-white"
          } ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
        >
          {loading ? (
            <span className="animate-spin">⏳</span>
          ) : watching ? (
            <>
              <FaEyeSlash /> Unwatch
            </>
          ) : (
            <>
              <FaEye /> Watch
            </>
          )}
        </button>
      </div>

      {/* Watchers list */}
      {task?.watchers?.length > 0 ? (
        <ul className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {task.watchers.map((w) => (
            <li
              key={w._id}
              className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition"
            >
              <img
                src={
                  w.avatar
                    ? `${import.meta.env.VITE_API_URL.replace("/api", "")}/${
                        w.avatar
                      }`
                    : "/default-avatar.png"
                }
                alt={w.username}
                className="w-10 h-10 rounded-full object-cover border"
              />
              <div>
                <p className="font-medium text-gray-800 dark:text-gray-200">
                  {w.username}
                </p>
                {w.role && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {w.role}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-center py-10 text-gray-500 dark:text-gray-400">
          <FaUser className="mx-auto text-4xl mb-2 opacity-50" />
          <p>No watchers yet. Be the first to watch this task!</p>
        </div>
      )}
    </div>
  );
};

export default TaskWatchersTab;
