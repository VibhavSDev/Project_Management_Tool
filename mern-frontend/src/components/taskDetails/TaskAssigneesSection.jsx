import { useEffect, useRef, useState } from "react";
import API from "../../services/axiosInstance";
import { FaPlus } from "react-icons/fa";
import toast from "react-hot-toast";

const Avatar = ({ user, onRemove, disabled }) => {
  const initials = user.username
    ?.split(" ")
    .map(w => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <button
      disabled={disabled}
      onClick={onRemove}
      title={disabled ? user.username : `${user.username} (click to unassign)`}
      className={`relative w-8 h-8 rounded-full border-2 border-white dark:border-gray-900
        ${disabled ? "opacity-60" : "hover:ring-2 hover:ring-red-400"}
      `}
    >
      {user.avatar ? (
        <img src={user.avatar} className="w-full h-full rounded-full object-cover" />
      ) : (
        <div className="w-full h-full rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-semibold">
          {initials}
        </div>
      )}
    </button>
  );
};

const TaskAssigneesSection = ({ taskId, assignees = [], projectId, onChange }) => {
  const [members, setMembers] = useState([]);
  const [open, setOpen] = useState(false);
  const [loadingUser, setLoadingUser] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!projectId) return;

    API.get(`/projects/${projectId}/members`)
      .then(res => setMembers(res.data || []))
      .catch(() => toast.error("Failed to load project members"));
  }, [projectId]);

  // close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!dropdownRef.current?.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggleAssignee = async (userId) => {
    if (loadingUser) return;

    try {
      setLoadingUser(userId);
      await API.patch(`/tasks/${taskId}/assignees`, { userId });
      onChange?.();
    } catch {
      toast.error("Failed to update assignee");
    } finally {
      setLoadingUser(null);
      setOpen(false);
    }
  };

  const isAssigned = (id) => assignees.some(u => u._id === id);

  return (
    <div className="relative flex items-center gap-2" ref={dropdownRef}>
      <span className="text-xs text-gray-500">Assignees</span>

      {/* Assigned avatars */}
      <div className="flex -space-x-2">
        {assignees.length ? (
          assignees.map(user => (
            <Avatar
              key={user._id}
              user={user}
              onRemove={() => toggleAssignee(user._id)}
              disabled={loadingUser === user._id}
            />
          ))
        ) : (
          <span className="text-xs text-gray-400">None</span>
        )}
      </div>

      {/* Add */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-7 h-7 flex items-center justify-center rounded-full border border-dashed text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <FaPlus size={12} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-10 right-0 z-50 w-56 bg-white dark:bg-gray-900 rounded-lg shadow-xl border dark:border-gray-700">
          <p className="px-3 py-2 text-xs text-gray-500 border-b dark:border-gray-700">
            Project members
          </p>

          <ul className="max-h-60 overflow-y-auto">
            {members.map(m => {
              const assigned = isAssigned(m._id);
              return (
                <li
                  key={m._id}
                  onClick={() => toggleAssignee(m._id)}
                  className={`px-3 py-2 text-sm cursor-pointer flex justify-between items-center
                    hover:bg-gray-100 dark:hover:bg-gray-800
                    ${assigned ? "text-indigo-600 font-medium" : ""}
                  `}
                >
                  {m.username}
                  {loadingUser === m._id ? "…" : assigned && "✓"}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default TaskAssigneesSection;
