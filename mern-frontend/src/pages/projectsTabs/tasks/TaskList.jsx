import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../../../services/axiosInstance';
import toast from 'react-hot-toast';
import { FaEdit, FaEye, FaTrash, FaUndo, FaEyeSlash } from 'react-icons/fa';
import { useProject } from '../../../contexts/ProjectContext';
import { useAuth } from '../../../shared/useAuth';

const TaskList = () => {
  const { user } = useAuth();
  const { currentProject } = useProject();
  const [tasks, setTasks] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);

  useEffect(() => {
    if (!currentProject?._id) return;

    const fetchTasks = async () => {
      try {
        setLoading(true);
        const res = await API.get(`/tasks/project/${currentProject._id}`);
        setTasks(res.data);
        setFiltered(res.data);
      } catch (err) {
        toast.error('Failed to fetch tasks');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [currentProject]);

  useEffect(() => {
    let result = tasks;

    if (search.trim()) {
      result = result.filter(task =>
        task.title.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (statusFilter) {
      result = result.filter(task => task.status === statusFilter);
    }

    result = result.filter(task => task.isDeleted === showDeleted);
    setFiltered(result);
  }, [search, statusFilter, tasks, showDeleted]);

  const handleSoftDelete = async (taskId) => {
    try {
      await API.patch(`/tasks/${taskId}/soft-delete`);
      toast.success('Task soft-deleted');
      setTasks(prev =>
        prev.map(task =>
          task._id === taskId ? { ...task, isDeleted: true } : task
        )
      );
    } catch (err) {
      toast.error('Soft delete failed');
    }
  };

  const handleRestore = async (taskId) => {
    try {
      await API.patch(`/tasks/${taskId}/restore`);
      toast.success('Task restored');
      setTasks(prev =>
        prev.map(task =>
          task._id === taskId ? { ...task, isDeleted: false } : task
        )
      );
    } catch (err) {
      toast.error('Restore failed');
    }
  };

  const toggleWatcher = async (task) => {
    try {
      const isWatching = task.watchers?.includes(user.id);
      if (isWatching) {
        await API.delete(`/tasks/${task._id}/watchers/${user.id}`);
        toast.success('Unwatched task');
        task.watchers = task.watchers.filter((id) => id !== user.id);
      } else {
        await API.post(`/tasks/${task._id}/watchers`, { userId: user.id });
        toast.success('Watching task');
        task.watchers.push(user.id);
      }
      setTasks([...tasks]);
    } catch (err) {
      toast.error('Failed to update watcher status');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h2 className="text-2xl font-semibold dark:text-white">
          {showDeleted ? 'Deleted Tasks' : `Tasks in ${currentProject?.name}`}
        </h2>
        <div className="flex gap-4">
          <Link
            to="/dashboard/tasks/new"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            + New Task
          </Link>
          <button
            onClick={() => setShowDeleted(prev => !prev)}
            className="px-4 py-2 rounded border dark:text-white"
          >
            {showDeleted ? 'Show Active' : 'Show Deleted'}
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Search task title"
          className="w-full md:w-1/2 p-2 rounded border dark:bg-gray-800 dark:text-white"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="p-2 rounded border dark:bg-gray-800 dark:text-white"
        >
          <option value="">All Statuses</option>
          <option value="todo">To Do</option>
          <option value="inProgress">In Progress</option>
          <option value="done">Done</option>
        </select>
      </div>

      {loading ? (
        <p className="text-gray-600 dark:text-gray-300">Loading tasks...</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-300">No tasks found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((task) => (
            <div
              key={task._id}
              className="bg-white dark:bg-gray-800 p-4 rounded shadow flex flex-col gap-2"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold dark:text-white">{task.title}</h3>
                <span className="text-xs text-gray-500">{task.status}</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {task.description?.slice(0, 80)}...
              </p>
              <div className="flex gap-2 justify-end mt-2">
                {!task.isDeleted ? (
                  <>
                    <Link to={`/dashboard/tasks/${task._id}/view`} className="text-blue-500">
                      <FaEye />
                    </Link>
                    <Link to={`/dashboard/tasks/${task._id}/edit`} className="text-yellow-500">
                      <FaEdit />
                    </Link>
                    <button
                      onClick={() => toggleWatcher(task)}
                      className="text-purple-500"
                      title={task.watchers?.includes(user.id) ? 'Unwatch' : 'Watch'}
                    >
                      {task.watchers?.includes(user.id) ? <FaEyeSlash /> : <FaEye />}
                    </button>
                    <button onClick={() => handleSoftDelete(task._id)} className="text-red-500">
                      <FaTrash />
                    </button>
                  </>
                ) : (
                  <button onClick={() => handleRestore(task._id)} className="text-green-500">
                    <FaUndo />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TaskList;
