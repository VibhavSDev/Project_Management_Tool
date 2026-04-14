// src/pages/Activity.jsx
import React, { useEffect, useState, useMemo } from "react";
import API from "../services/axiosInstance";
import { formatDistanceToNow } from "date-fns";
import { io } from "socket.io-client";
import { Search, Bell, FileText, User, ClipboardList } from "lucide-react";
import { useSocket } from "../contexts/SocketContext"

// Skeleton loader
const ActivitySkeleton = () => (
  <div className="animate-pulse space-y-2 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
    <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/3"></div>
    <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-2/3"></div>
    <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/4"></div>
  </div>
);

export default function Activity() {
  const { socket } = useSocket();
  const [activity, setActivity] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [selectedProject, setSelectedProject] = useState("all");
  const [activityType, setActivityType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {

    const fetchActivity = async () => {
      try {
        setLoading(true);
        const { data } = await API.get("/activity/me");
        console.log(data)
        const list = Array.isArray(data) ? data : [];

        setActivity(list);

        console.log(list)

        // Extract unique projects for filter
        const uniqueProjects = [
          ...new Map(
            list.map((a) => [
              a.project?._id,
              { _id: a.project?._id, name: a.project?.name },
            ])
          ).values(),
        ].filter((p) => p._id);

        setProjects(uniqueProjects);
        console.log(uniqueProjects);
        setError(null);
      } catch (err) {
        console.error("Error fetching activity:", err);
        setError("Failed to load activity");
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();

    socket.on("newActivity", (newItem) => {
      setActivity((prev) => [newItem, ...prev]);
    });

    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  // Apply filters
  const filteredActivity = useMemo(() => {
    return activity.filter((item) => {
      if (selectedProject !== "all" && item.project?._id !== selectedProject) {
        return false;
      }
      if (activityType !== "all") {
        const action = (item.action || "").toLowerCase();
        if (!action.includes(activityType)) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const text =
          `${item.user?.username || ""} ${item.action || ""} ${item.text|| ""} ${item.project?.name || ""}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [activity, selectedProject, activityType, searchQuery]);

  // Icon mapping
  const getIcon = (action = "") => {
    const a = action.toLowerCase();

    if (a.includes("task")) return <ClipboardList className="h-5 w-5 text-blue-500" />;
    if (a.includes("comment")) return <FileText className="h-5 w-5 text-green-500" />;
    if (a.includes("file")) return <Bell className="h-5 w-5 text-purple-500" />;
    if (a.includes("invite") || a.includes("member"))
      return <User className="h-5 w-5 text-orange-500" />;

    return <Bell className="h-5 w-5 text-gray-500" />;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Activity</h1>
        <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-600 text-sm font-medium">
          {filteredActivity.length} events
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Project filter */}
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="px-3 py-1 rounded-md border bg-white dark:bg-zinc-800 dark:border-gray-700 text-sm"
        >
          <option value="all">All Projects</option>
          {projects.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </select>

        {/* Type filter */}
        <select
          value={activityType}
          onChange={(e) => setActivityType(e.target.value)}
          className="px-3 py-1 rounded-md border bg-white dark:bg-zinc-800 dark:border-gray-700 text-sm"
        >
          <option value="all">All Types</option>
          <option value="created task">Created Task</option>
          <option value="updated task">Updated Task</option>
          <option value="commented">Commented</option>
          <option value="uploaded file">Uploaded File</option>
          <option value="invited member">Invited Member</option>
        </select>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search activity..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-3 py-1 rounded-md border bg-white dark:bg-zinc-800 dark:border-gray-700 text-sm w-60"
          />
          <Search className="absolute left-2 top-1.5 h-4 w-4 text-gray-400" />
        </div>

        {/* Reset button */}
        <button
          className="px-3 py-1 rounded-full text-sm bg-gray-100 dark:bg-gray-700"
          onClick={() => {
            setSelectedProject("all");
            setActivityType("all");
            setSearchQuery("");
          }}
        >
          Reset
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          <ActivitySkeleton />
          <ActivitySkeleton />
          <ActivitySkeleton />
        </div>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : !filteredActivity.length ? (
        <div className="flex flex-col items-center justify-center text-gray-400 text-sm mt-6">
          <ClipboardList className="h-6 w-6 mb-1" />
          No activity found
        </div>
      ) : (
        <ul className="space-y-4">
          {filteredActivity.map((item) => (
            <li
              key={item._id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-start gap-3"
            >
              <div>{getIcon(item.action || item.text)}</div>
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <span className="font-medium">
                    {item.user?.username || "Unknown User"}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(item.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                <p className="text-gray-700 dark:text-gray-300 mt-1">
                  {item.action || item.text}
                </p>
                {item.project && (
                  <p className="text-sm text-gray-500 mt-1">
                    Project: {item.project.name}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
