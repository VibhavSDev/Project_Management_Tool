import { useEffect, useState } from "react";
import { useOutletContext, Link } from "react-router-dom";
import API from "../../services/axiosInstance";
import { useSocket } from "../../contexts/SocketContext";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/Card";
import { Avatar } from "../../components/ui/Avatar";
import { Tooltip } from "../../components/ui/Tooltip";
import toast from "react-hot-toast";

const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />
);

const CompletionRing = ({ percent }) => {
  const radius = 34;
  const stroke = 6;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset =
    circumference - (percent / 100) * circumference;

  return (
    <svg height={radius * 2} width={radius * 2}>
      <circle
        stroke="currentColor"
        fill="transparent"
        strokeWidth={stroke}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
        className="text-gray-300 dark:text-gray-600"
      />
      <circle
        stroke="currentColor"
        fill="transparent"
        strokeWidth={stroke}
        strokeDasharray={`${circumference} ${circumference}`}
        style={{ strokeDashoffset }}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
        className="text-green-500 transition-all duration-500"
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        className="text-sm font-semibold fill-gray-800 dark:fill-gray-100"
      >
        {percent}%
      </text>
    </svg>
  );
};

const OverviewTab = () => {
  const { projectId, project, setProject } = useOutletContext();
  const { socket } = useSocket();
  const [taskSummary, setTaskSummary] = useState(null);
  const [recentFiles, setRecentFiles] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;

    const fetchOverview = async () => {
      try {
        setLoading(true);

        const [ statusRes, filesRes, activityRes] =
          await Promise.allSettled([
            API.get(`/analytics/project/${projectId}/status`),
            API.get(`/files/project/${projectId}`),
            API.get(`/analytics/project/${projectId}/recent-activity`),
          ]);

        // ✅ Task Summary
        if (statusRes.status === "fulfilled" && statusRes.value?.data?.data) {
          setTaskSummary(statusRes.value.data.data);
        } else {
          setTaskSummary(null);
        }

        // ✅ Recent Files
        if (filesRes.status === "fulfilled" && Array.isArray(filesRes.value?.data)) {
          setRecentFiles(filesRes.value.data.slice(0, 5)); // last 5 files
        } else {
          setRecentFiles([]);
        }

        // ✅ Recent Activity
        if (activityRes.status === "fulfilled" && Array.isArray(activityRes.value?.data?.data)) {
          setRecentActivity(activityRes.value.data.data.slice(0, 5)); // last 5 activities
        } else {
          setRecentActivity([]);
        }
      } catch (err) {
        console.error("Overview Fetch Error:", err);
        toast.error("Failed to load overview");
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, [projectId]);

  useEffect(() => {
    if (!socket) return;

    socket.on("projectUpdated", ({ project: updatedProject }) => {
      if (updatedProject._id === projectId) {
        setProject(updatedProject);
      }
    });

    socket.on("fileUploaded", ({ file }) => {
      setRecentFiles((prev) => [file, ...prev].slice(0, 5));
    });

    socket.on("activityCreated", ({ activity }) => {
      setRecentActivity((prev) => [activity, ...prev].slice(0, 5));
    });

    return () => {
      socket.off("projectUpdated");
      socket.off("fileUploaded");
      socket.off("activityCreated");
    };
  }, [socket, projectId]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-40 lg:col-span-2" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40 lg:col-span-2" />
      </div>
    );
  }

  if (!project) {
    return <div className="p-4 text-red-500">Project not found.</div>;
  }

  const totalTasks =
    taskSummary?.todo +
    taskSummary?.inProgress +
    taskSummary?.done || 0;

  const completionPercent =
    totalTasks > 0
      ? Math.round((taskSummary.done / totalTasks) * 100)
      : 0;

  const lastUpdated = project?.updatedAt
    ? new Date(project.updatedAt).toLocaleString()
    : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Project Summary */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Project Summary</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold">{project.name}</h2>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                {project.description || "No description provided"}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Created on {new Date(project.createdAt).toLocaleDateString()} by{" "}
                <span className="font-medium">{project.owner?.username}</span>
              </p>
            </div>

            {/* Completion Ring */}
            <CompletionRing percent={completionPercent} />
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Completion</span>
              <span>{completionPercent}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded h-2">
              <div
                className="bg-green-500 h-2 rounded transition-all"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </div>

          {/* Last Updated */}
          {lastUpdated && (
            <span className="inline-block w-fit text-xs px-2 py-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
              Last updated: {lastUpdated}
            </span>
          )}
        </CardContent>
      </Card>

      {/* Members Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex -space-x-3">
            {project.members.slice(0, 5).map((m) => (
              <Tooltip key={m.user._id} content={`${m.user.username} (${m.role})`}>
                <Avatar
                  src={
                    m.user.avatar
                      ? `${import.meta.env.VITE_API_URL.replace("/api", "")}/${m.user.avatar}`
                      : "/default-avatar.png"
                  }
                  alt={m.user.username}
                  className="w-10 h-10 border-2 border-white dark:border-gray-800"
                />
              </Tooltip>
            ))}
            {project.members.length > 5 && (
              <div className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-sm">
                +{project.members.length - 5}
              </div>
            )}
          </div>
          <Link
            to="members"
            className="text-sm text-blue-600 dark:text-blue-400 mt-2 block hover:underline"
          >
            View all members →
          </Link>
        </CardContent>
      </Card>

      {/* Task Snapshot */}
      <Card>
        <CardHeader>
          <CardTitle>Task Snapshot</CardTitle>
        </CardHeader>
        <CardContent>
          {taskSummary ? (
            <ul className="space-y-1 text-sm">
              <li>📌 Todo: <span className="font-medium">{taskSummary.todo}</span></li>
              <li>⏳ In Progress: <span className="font-medium">{taskSummary.inProgress}</span></li>
              <li>✅ Done: <span className="font-medium">{taskSummary.done}</span></li>
            </ul>
          ) : (
            <p className="text-gray-500 text-sm">No task data available</p>
          )}
          <Link
            to="tasks"
            className="text-sm text-blue-600 dark:text-blue-400 mt-2 block hover:underline"
          >
            View all tasks →
          </Link>
        </CardContent>
      </Card>

      {/* Recent Files */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Files</CardTitle>
        </CardHeader>
        <CardContent>
          {recentFiles.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {recentFiles.map((f) => (
                <li key={f._id} className="flex justify-between">
                  <span>{f.filename}</span>
                  <a
                    href={`${API.defaults.baseURL}/files/download/${f._id}`}
                    className="text-blue-500 hover:underline"
                  >
                    Download
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-sm">No recent files uploaded</p>
          )}
          <Link
            to="files"
            className="text-sm text-blue-600 dark:text-blue-400 mt-2 block hover:underline"
          >
            View all files →
          </Link>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length > 0 ? (
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              {recentActivity.map((activity, idx) => (
                <li
                  key={idx}
                  className="border-b border-gray-200 dark:border-gray-700 pb-1"
                >
                  <span className="font-medium">
                    {activity.user?.username || "Unknown"}
                  </span>{" "}
                  {activity.action}{" "}
                  <span className="text-gray-500">
                    ({activity.timeAgo || "just now"})
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-sm">No recent activity</p>
          )}
          <Link
            to="activity"
            className="text-sm text-blue-600 dark:text-blue-400 mt-2 block hover:underline"
          >
            View all activity →
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default OverviewTab;
