import { useEffect, useState } from 'react';
import API from '../../../services/axiosInstance';
import toast from 'react-hot-toast';
import { FaEdit, FaSave, FaTimes } from 'react-icons/fa';
import { useSocket } from '../../../contexts/SocketContext.jsx';
import TaskCommentsTab from '../../../components/taskDetails/TaskCommentsTab.jsx';
import TaskFilesTab from '../../../components/taskDetails/TaskFilesTab.jsx';
import TaskWatchersTab from '../../../components/taskDetails/TaskWatchersTab.jsx';
import TaskActivityTab from '../../../components/taskDetails/TaskActivityTab.jsx';
import TaskAssigneesSection from '../../../components/taskDetails/TaskAssigneesSection.jsx';
import { useAuth } from '../../../shared/useAuth.js';

const tabs = [
  { name: 'Comments', path: 'comments' },
  { name: 'Files', path: 'files' },
  { name: 'Watchers', path: 'watchers' },
  { name: 'Activity', path: 'activity' },
];

const statusStyles = {
  todo: "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  "in-progress": "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200",
  done: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200",
};

const priorityStyles = {
  low: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200",
  high: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200",
};

const Avatar = ({ user, onClick, disabled = false }) => {
  const initials = user.username
    ?.split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={`${user.username} (click to unassign)`}
      className={`relative w-8 h-8 rounded-full border-2 border-white dark:border-gray-900
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:ring-2 hover:ring-red-400"}
      `}
    >
      {user.avatar ? (
        <img
          src={user.avatar}
          alt={user.username}
          className="w-full h-full rounded-full object-cover"
        />
      ) : (
        <div className="w-full h-full rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-semibold">
          {initials}
        </div>
      )}

      {/* ❌ hover remove icon */}
      {!disabled && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center opacity-0 hover:opacity-100">
          ✕
        </span>
      )}
    </button>
  );
};



const TaskDetails = ({taskId, onClose}) => {
  const { socket } = useSocket();
  const { user } = useAuth();
  const currentUser = user;
  const [activeTab, setActiveTab] = useState('comments');

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingSection, setEditingSection] = useState(null);
  // 'title' | 'meta' | 'description' | null

  const [editData, setEditData] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: '',
    status: '',
  });

  const [subtasks, setSubtasks] = useState([]);
  const [newSubtask, setNewSubtask] = useState('');
  const [editingSubtaskId, setEditingSubtaskId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');

  /* 🔒 LOCK BACKGROUND SCROLL + ESC CLOSE */
  useEffect(() => {
    document.body.style.overflow = 'hidden';

    const escHandler = (e) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', escHandler);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', escHandler);
    };
  }, [onClose]);

  // Fetch task details
  const fetchTask = async () => {
    try {
      const res = await API.get(`/tasks/${taskId}`);
      console.log("TASK FROM API:", res.data.assignedTo);
      setTask(res.data); // 🔥 REQUIRED
      setEditData({
        title: res.data.title,
        description: res.data.description,
        dueDate: res.data.dueDate?.split('T')[0] || '',
        priority: res.data.priority,
        status: res.data.status,
      });

      fetchSubtasks();
    } catch (err) {
      console.error(err);
      toast.error('Failed to load task');
    } finally {
      setLoading(false);
    }
  };

  const projectId = task?.project?._id || task?.projectId;

  // Fetch subtasks
  const fetchSubtasks = async () => {
    try {
      const res = await API.get(`/tasks/${taskId}/subtasks`);
      setSubtasks(res.data || []);
    } catch {
      toast.error('Failed to load subtasks');
    }
  };

  // Socket updates
  useEffect(() => {
    if (taskId) fetchTask();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);


  useEffect(() => {
    if (!socket) return;

    const handleTaskUpdated = (updatedTask) => {
      if (!updatedTask || updatedTask._id !== taskId) return;

      {setTask({
        ...updatedTask,
        assignedTo: Array.isArray(updatedTask.assignedTo)
          ? updatedTask.assignedTo
          : [],
      });
      setEditData({
        title: updatedTask.title,
        description: updatedTask.description,
        dueDate: updatedTask.dueDate?.split('T')[0] || '',
        priority: updatedTask.priority,
        status: updatedTask.status,
      });}
    };


    const handleSubtaskUpdated = ({ task }) => {
      if (task === taskId) {
        fetchSubtasks(); // this endpoint does NOT emit taskUpdated
      }
    };

    socket.on('taskUpdated', handleTaskUpdated);
    socket.on('subtaskUpdated', handleSubtaskUpdated);

    return () => {
      socket.off('taskUpdated', handleTaskUpdated);
      socket.off('subtaskUpdated', handleSubtaskUpdated);
    };
  }, [socket, taskId]);

  // Handle edit inputs
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      await API.put(`/tasks/${taskId}`, editData);
      toast.success('Task updated');
      setEditingSection(null);
      fetchTask();
    } catch {
      toast.error('Update failed');
    }
  };

  // Subtask handlers
  const handleAddSubtask = async () => {
    if (!newSubtask.trim()) return;
    try {
      await API.post(`/tasks/${taskId}/subtasks`, { title: newSubtask });
      setNewSubtask('');
      fetchSubtasks();
      toast.success('Subtask added');
    } catch {
      toast.error('Failed to add subtask');
    }
  };

  const toggleSubtask = async (subtaskId) => {
    try {
      await API.patch(`/tasks/${taskId}/subtasks/${subtaskId}/toggle`);
      fetchSubtasks();
      toast.success('Subtask updated');
    } catch {
      toast.error('Failed to toggle subtask');
    }
  };

  const startEditSubtask = (subtask) => {
    setEditingSubtaskId(subtask._id);
    setEditingTitle(subtask.title);
  };

  const cancelEditSubtask = () => {
    setEditingSubtaskId(null);
    setEditingTitle('');
  };

  const saveSubtaskTitle = async (subtaskId) => {
    if (!editingTitle.trim()) return;
    try {
      await API.patch(`/tasks/${taskId}/subtasks/${subtaskId}`, { title: editingTitle });
      fetchSubtasks();
      toast.success('Subtask updated');
      cancelEditSubtask();
    } catch {
      toast.error('Failed to update subtask');
    }
  };

  const handleDeleteSubtask = async (subtaskId) => {
    if (!window.confirm("Are you sure you want to delete this subtask?")) return;

    try {
      await API.delete(`/tasks/${taskId}/subtasks/${subtaskId}`);
      fetchSubtasks();
      toast.success("Subtask deleted");
    } catch {
      toast.error("Failed to delete subtask");
    }
  };

  const copyTaskId = () => {
    navigator.clipboard.writeText(task._id);
    toast.success("Task ID copied");
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-900 w-full max-w-5xl h-[90vh] rounded-xl p-6 animate-pulse">
          <div className="h-6 w-1/3 bg-gray-200 dark:bg-gray-700 rounded mb-6" />
          <div className="space-y-3">
            <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-4 w-5/6 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-4 w-4/6 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!task) return null;

  // const assignees = Array.isArray(task.assignedTo)
  // ? task.assignedTo
  // : task.assignedTo
  //   ? [task.assignedTo]
  //   : [];

  const assignees = Array.isArray(task?.assignedTo)
  ? task.assignedTo
  : [];

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* MODAL */}
      <div
        className="bg-white dark:bg-gray-900 w-full max-w-5xl h-[90vh] rounded-xl shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700 gap-6">

          {/* LEFT: TITLE */}
          <div className="flex items-center gap-3 flex-1">
            {editingSection === 'title' ? (
              <input
                name="title"
                value={editData.title}
                onChange={handleEditChange}
                className="text-xl font-semibold bg-transparent border-b focus:outline-none w-full"
              />
            ) : (
              <h2 onClick={() => setEditingSection('title')} className="text-xl font-semibold truncate">{task.title}</h2>
            )}
          </div>

          {task.priority && (
            <span
              className={`text-xs px-2 py-1 rounded-full font-medium ${
                priorityStyles[task.priority]
              }`}
            >
              {task.priority}
            </span>
          )}

          <span
            className={`text-xs px-2 py-1 rounded-full font-medium ${
              statusStyles[task.status] || statusStyles.todo
            }`}
          >
            {task.status.replace("-", " ")}
          </span>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Created by{" "}
            <span className="font-medium">
              {task.createdBy?.username || "Unknown"}
            </span>{" "}
            on {new Date(task.createdAt).toLocaleDateString()}
          </p>

          {/* RIGHT: ASSIGNEES + WATCHERS */}
          <div className="flex items-center gap-6">

            {/* ASSIGNEES */}
            {projectId && (
              <TaskAssigneesSection
                taskId={task._id}
                assignees={assignees}
                projectId={task?.project?._id}
                onChange={fetchTask}
              />
            )}

            {/* WATCHERS */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Watchers</span>
              <div className="flex -space-x-2">
                {task.watchers?.length ? (
                  task.watchers.map(user => (
                    <Avatar
                      key={user._id}
                      user={user}
                      disabled={user._id !== currentUser._id}
                      onClick={() =>
                        API.patch(`/tasks/${task._id}/watchers`, {
                          userId: user._id,
                        }).then(fetchTask)
                      }
                    />
                  ))
                ) : (
                  <span className="text-xs text-gray-400">0</span>
                )}
              </div>
            </div>

            <button
              onClick={copyTaskId}
              className="text-xs px-2 py-1 border rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Copy ID
            </button>

            {/* CLOSE */}
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-red-500 text-xl"
            >
              ✕
            </button>
          </div>
        </div>

        {/* CONTENT (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* DESCRIPTION */}
          {editingSection === 'description' ? (
            <textarea
              name="description"
              value={editData.description}
              onChange={handleEditChange}
              rows={3}
              className="w-full p-2 rounded bg-gray-100 dark:bg-gray-800"
            />
          ) : (
            <p className="text-gray-600 dark:text-gray-300">
              {task.description || 'No description'}
            </p>
          )}

          {/* META */}
          <div className="flex flex-wrap gap-6 text-sm items-center">

            {/* STATUS */}
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Status:</span>
              {editingSection === 'meta' ? (
                <select
                  name="status"
                  value={editData.status}
                  onChange={handleEditChange}
                  className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800"
                >
                  <option value="todo">To Do</option>
                  <option value="in-progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              ) : (
                <strong className="capitalize">{task.status}</strong>
              )}
            </div>

            {/* PRIORITY */}
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Priority:</span>
              {editingSection === 'meta' ? (
                <select
                  name="priority"
                  value={editData.priority}
                  onChange={handleEditChange}
                  className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              ) : (
                <strong className="capitalize">{task.priority}</strong>
              )}
            </div>

            {/* DUE DATE */}
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Due:</span>
              {editingSection === 'meta' ? (
                <input
                  type="date"
                  name="dueDate"
                  value={editData.dueDate}
                  onChange={handleEditChange}
                  className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800"
                />
              ) : (
                <strong>
                  {task.dueDate
                    ? new Date(task.dueDate).toLocaleDateString()
                    : 'N/A'}
                </strong>
              )}
            </div>

          </div>

          {/* ACTIONS */}
          {editingSection === 'meta' ? (
            <div className="flex gap-3">
              <button onClick={handleSave} className="text-green-600 flex gap-1">
                <FaSave /> Save
              </button>
              <button onClick={() => setEditingSection(null)} className="text-gray-500 flex gap-1">
                <FaTimes /> Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditingSection('meta')}
              className="text-indigo-600 flex gap-1"
            >
              <FaEdit /> Edit
            </button>
          )}

          {/* TABS */}
          <nav className="flex gap-6 border-b pb-2">
            {tabs.map((t) => (
              <button
                key={t.path}
                onClick={() => setActiveTab(t.path)}
                className={`pb-1 text-sm font-medium transition ${
                  activeTab === t.path
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.name}
              </button>
            ))}
          </nav>

          {activeTab === 'comments' && <TaskCommentsTab taskId={task._id} projectId={projectId}/>}
          {activeTab === 'files' && <TaskFilesTab taskId={task._id} />}
          {activeTab === 'watchers' && <TaskWatchersTab taskId={task._id} task={task} refetchTask={fetchTask}/>}
          {activeTab === 'activity' && <TaskActivityTab taskId={task._id} />}

        {/* Subtasks */}
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
          <h4 className="font-semibold mb-2">Subtasks</h4>
          <div className="flex gap-2 mb-3">
            <input
              value={newSubtask}
              onChange={(e) => setNewSubtask(e.target.value)}
              placeholder="New subtask"
              className="flex-1 px-2 py-1 border rounded"
            />
            <button onClick={handleAddSubtask} className="px-3 py-1 bg-blue-600 text-white rounded">
              Add
            </button>
          </div>

          <ul className="space-y-1">
            {subtasks.map((st) => (
              <li
                key={st._id}
                className="flex items-center justify-between gap-2 bg-gray-50 dark:bg-gray-700 p-2 rounded"
              >
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="checkbox"
                    checked={st.completed}
                    onChange={() => toggleSubtask(st._id)}
                  />
                  {editingSubtaskId === st._id ? (
                    <input
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      className="flex-1 px-1 py-0.5 rounded border"
                      autoFocus
                    />
                  ) : (
                    <span
                      className={`${
                        st.completed ? "line-through text-gray-400" : "text-gray-800 dark:text-gray-200"
                      }`}
                    >
                      {st.title}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {editingSubtaskId === st._id ? (
                    <>
                      <button
                        onClick={() => saveSubtaskTitle(st._id)}
                        className="text-green-600 hover:text-green-800 text-sm"
                      >
                        <FaSave />
                      </button>
                      <button
                        onClick={cancelEditSubtask}
                        className="text-gray-500 hover:text-gray-700 text-sm"
                      >
                        <FaTimes />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => startEditSubtask(st)}
                      className="text-indigo-600 hover:text-indigo-800 text-sm"
                    >
                      <FaEdit />
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteSubtask(st._id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
        </div>
      </div>
      </div>
  );
};

export default TaskDetails;
