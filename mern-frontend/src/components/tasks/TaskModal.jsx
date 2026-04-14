import React, { useEffect, useState } from "react";
import API from "../../services/axiosInstance";
import toast from "react-hot-toast";
import {
  Loader2,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  User,
  Calendar,
} from "lucide-react";

export default function TaskModal({ taskId, onClose, onStatusChange, projectId }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newSubtask, setNewSubtask] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchTask();
  }, [taskId]);

  const fetchTask = async () => {
    try {
      setLoading(true);
      const { data } = await API.get(`/tasks/${taskId}`);
      console.log(data)
      setDetails(data);
    } catch (err) {
      toast.error("Failed to fetch task details");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    try {
      await API.patch(`/tasks/${taskId}/status`, { status: newStatus });
      toast.success(`Status updated to ${newStatus}`);
      onStatusChange?.();
      fetchTask();
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleToggleSubtask = async (subtaskId, completed) => {
    try {
      await API.patch(`/tasks/${taskId}/subtasks/${subtaskId}/toggle`, {
        completed,
      });
      fetchTask();
    } catch {
      toast.error("Failed to toggle subtask");
    }
  };

  const handleAddSubtask = async () => {
    if (!newSubtask.trim()) return;
    try {
      await API.post(`/tasks/${taskId}/subtasks`, { title: newSubtask });
      setNewSubtask("");
      fetchTask();
    } catch {
      toast.error("Failed to add subtask");
    }
  };

  const handleDeleteSubtask = async (subtaskId) => {
    try {
      await API.delete(`/tasks/${taskId}/subtasks/${subtaskId}`);
      fetchTask();
    } catch {
      toast.error("Failed to delete subtask");
    }
  };

  const startEditSubtask = (subtask) => {
    setEditingId(subtask._id);
    setEditValue(subtask.title);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  const saveEditSubtask = async (subtaskId) => {
    if (!editValue.trim()) return;
    try {
      await API.patch(`/tasks/${taskId}/subtasks/${subtaskId}`, {
        title: editValue.trim(),
      });
      setEditingId(null);
      setEditValue("");
      fetchTask();
    } catch {
      toast.error("Failed to edit subtask");
    }
  };

  if (!details) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-lg p-6 relative">
        {/* Close Button */}
        <button
          className="absolute top-3 right-4 text-gray-500 hover:text-red-500"
          onClick={onClose}
        >
          <X size={20} />
        </button>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-blue-500" size={28} />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Title + Edit */}
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {details.title}
              </h2>
              <button
                onClick={() => setIsEditing(true)}
                className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
              >
                ✎ Edit
              </button>
            </div>

            {/* Description */}
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {details.description || "No description"}
            </p>

            {/* Metadata */}
            <div className="flex flex-wrap gap-4 text-xs text-gray-600 dark:text-gray-300">
              {details.assignee && (
                <div className="flex items-center gap-1">
                  <User size={14} />
                  {details.assignee.name || details.assignee.username}
                </div>
              )}
              {details.dueDate && (
                <div className="flex items-center gap-1">
                  <Calendar size={14} />
                  {new Date(details.dueDate).toLocaleDateString()}
                </div>
              )}
            </div>

            {/* Status control */}
            <div>
              <p className="text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">
                Status
              </p>
              <div className="flex gap-2 flex-wrap">
                {["todo", "in-progress", "review", "done"].map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatusUpdate(s)}
                    className={`px-3 py-1 text-xs rounded-full transition capitalize ${
                      details.status === s
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Subtasks */}
            <div>
              <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-200">
                Subtasks
              </h3>
              <ul className="space-y-2 mt-2">
                {details.subtasks?.map((s) => (
                  <li key={s._id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={s.completed}
                      onChange={() =>
                        handleToggleSubtask(s._id, !s.completed)
                      }
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />

                    {editingId === s._id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="flex-1 border px-2 py-1 rounded text-sm dark:bg-gray-700 dark:text-white"
                          autoFocus
                        />
                        <button
                          onClick={() => saveEditSubtask(s._id)}
                          className="text-green-600 hover:text-green-800"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between flex-1">
                        <span
                          className={`text-sm ${
                            s.completed
                              ? "line-through text-gray-500"
                              : "text-gray-700 dark:text-gray-200"
                          }`}
                        >
                          {s.title}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEditSubtask(s)}
                            className="text-blue-500 hover:text-blue-700"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteSubtask(s._id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>

              {/* Add subtask */}
              <div className="flex mt-3">
                <input
                  type="text"
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  placeholder="Add subtask..."
                  className="flex-1 border px-2 py-1 rounded text-sm dark:bg-gray-700 dark:text-white"
                  onKeyDown={(e) => e.key === "Enter" && handleAddSubtask()}
                />
                <button
                  onClick={handleAddSubtask}
                  className="ml-2 px-3 py-1 bg-blue-600 text-white rounded flex items-center gap-1 hover:bg-blue-700 text-sm"
                >
                  <Plus size={14} /> Add
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {isEditing && details && (
        <TaskEditModal
          task={details}
          projectId={projectId}
          onClose={() => setIsEditing(false)}
          onSave={() => {
            setIsEditing(false);
            fetchTask(); // refresh TaskModal after save
            onStatusChange?.();
          }}
        />
      )}
    </div>
  );
}
