import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import API from '../../services/axiosInstance';
import toast from 'react-hot-toast';
import { formatDistanceToNow, isAfter, isBefore, format, isToday, isYesterday } from 'date-fns';
import {
  FaPlus, FaEdit, FaTrash, FaFile, FaUser, FaTasks,
  FaComment, FaUndoAlt, FaSyncAlt, FaChevronDown, FaChevronUp
} from 'react-icons/fa';
import { useSocket } from '../../contexts/SocketContext';

const iconMap = {
  'create-task': <FaPlus className="text-green-600" />,
  'update-task': <FaEdit className="text-yellow-500" />,
  'delete-task': <FaTrash className="text-red-600" />,
  'restore-task': <FaUndoAlt className="text-green-500" />,
  'upload-file': <FaFile className="text-blue-500" />,
  'delete-file': <FaTrash className="text-red-600" />,
  'restore-file': <FaUndoAlt className="text-green-600" />,
  'add-comment': <FaComment className="text-indigo-500" />,
  'edit-comment': <FaEdit className="text-indigo-400" />,
  'delete-comment': <FaTrash className="text-red-500" />,
  'invite-member': <FaUser className="text-purple-500" />,
  'remove-member': <FaUser className="text-red-500" />,
  'create-project': <FaTasks className="text-green-600" />,
  'update-project': <FaEdit className="text-yellow-500" />,
};

const groupLogsByDate = (logs) => {
  const groups = {};
  logs.forEach((log) => {
    const date = new Date(log.createdAt);
    let label = format(date, 'PPP');

    if (isToday(date)) label = 'Today';
    else if (isYesterday(date)) label = 'Yesterday';

    if (!groups[label]) groups[label] = [];
    groups[label].push(log);
  });
  return groups;
};

const ActivityTab = () => {
  const { projectId } = useOutletContext();
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedLogs, setExpandedLogs] = useState({}); // track expanded state

  const [actionFilter, setActionFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const { socket } = useSocket();

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await API.get(`/activity/project/${projectId}`);
      const data = res.data.data || [];
      setLogs(data);
      setFilteredLogs(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchLogs();
  }, [projectId]);

  useEffect(() => {
    if (!socket || !projectId) return;

    socket.emit("joinProject", projectId);

    return () => {
      socket.emit("leaveProject", projectId);
    };
  }, [socket, projectId]);

  useEffect(() => {
    if (!socket || !projectId) return;

    const handleNewActivity = (activity) => {
      setLogs((prev) => [activity, ...prev]);
    };

    socket.on("activityCreated", handleNewActivity);

    return () => {
      socket.off("activityCreated", handleNewActivity);
    };
  }, [socket, projectId]);

  useEffect(() => {
    let filtered = [...logs];

    if (actionFilter !== 'all') {
      filtered = filtered.filter((log) => log.action?.startsWith(actionFilter));
    }

    if (userFilter.trim()) {
      filtered = filtered.filter((log) =>
        log.userId?.username?.toLowerCase().includes(userFilter.toLowerCase())
      );
    }

    if (startDate) {
      filtered = filtered.filter((log) =>
        isAfter(new Date(log.createdAt), new Date(startDate))
      );
    }

    if (endDate) {
      filtered = filtered.filter((log) =>
        isBefore(new Date(log.createdAt), new Date(endDate))
      );
    }

    setFilteredLogs(filtered);
  }, [actionFilter, userFilter, startDate, endDate, logs]);

  const groupedLogs = groupLogsByDate(filteredLogs);

  const toggleExpand = (logId) => {
    setExpandedLogs((prev) => ({
      ...prev,
      [logId]: !prev[logId],
    }));
  };

  const formatAction = (action) => {
    if(action==undefined) return action;
    return action
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Activity Logs</h2>
        <button
          onClick={fetchLogs}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-sm text-gray-700 dark:text-gray-200"
        >
          <FaSyncAlt /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="p-2 rounded border text-sm dark:bg-gray-800 dark:border-gray-700"
        >
          <option value="all">All Actions</option>
          <option value="create">Create</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
          <option value="restore">Restore</option>
          <option value="upload">Upload</option>
          <option value="add">Add</option>
          <option value="edit">Edit</option>
          <option value="invite">Invite</option>
        </select>

        <input
          type="text"
          placeholder="Filter by username"
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          className="p-2 rounded border text-sm dark:bg-gray-800 dark:border-gray-700"
        />

        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="p-2 rounded border text-sm dark:bg-gray-800 dark:border-gray-700"
        />

        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="p-2 rounded border text-sm dark:bg-gray-800 dark:border-gray-700"
        />
      </div>

      {/* Logs */}
      {loading ? (
        <p className="text-gray-500 dark:text-gray-400">Loading activities...</p>
      ) : filteredLogs.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 italic">No activity logs match your filters.</p>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedLogs).map(([date, logs]) => (
            <div key={date}>
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">{date}</h3>
              <ul className="space-y-4 border-l border-gray-300 dark:border-gray-600 pl-4">
                {logs.map((log) => (
                  <li key={log._id} className="flex items-start gap-4 relative">
                    <span className="absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600">
                      {iconMap[log.action] || <FaTasks className="text-gray-400" />}
                    </span>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded shadow w-full">
                      <div className="flex items-center gap-3 mb-1">
                        {log.userId?.avatar ? (
                          <img
                            src={log.userId.avatar}
                            alt={log.userId.username}
                            className="w-6 h-6 rounded-full"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs">
                            {log.userId?.username?.[0]?.toUpperCase() || "?"}
                          </div>
                        )}
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
                          {log.userId?.username || 'System'}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDistanceToNow(new Date(log.createdAt))} ago
                        </span>
                        <button
                          onClick={() => toggleExpand(log._id)}
                          className="ml-auto text-xs flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {expandedLogs[log._id] ? <FaChevronUp /> : <FaChevronDown />}
                          Details
                        </button>
                      </div>
                      <p className="text-gray-700 dark:text-gray-200 text-sm">
                        {formatAction(log.action)}
                      </p>

                      {expandedLogs[log._id] && log.meta && (
                        <pre className="mt-3 p-3 bg-gray-100 dark:bg-gray-900 text-xs rounded overflow-x-auto text-gray-800 dark:text-gray-200">
                          {JSON.stringify(log.meta, null, 2)}
                        </pre>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActivityTab;
