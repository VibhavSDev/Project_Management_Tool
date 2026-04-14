import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import API from "../../services/axiosInstance";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/Card";
import toast from "react-hot-toast";
import { useSocket } from "../../contexts/SocketContext";

const COLORS = ["#f87171", "#fbbf24", "#34d399"]; // red, yellow, green

const AnalyticsTab = () => {
  const { projectId } = useOutletContext();
  const [statusData, setStatusData] = useState([]);
  const [memberData, setMemberData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const [statusRes, assigneesRes, trendsRes, activityRes] =
          await Promise.allSettled([
            API.get(`/analytics/project/${projectId}/status`),
            API.get(`/analytics/project/${projectId}/assignees`),
            API.get(`/analytics/project/${projectId}/trends`),
            API.get(`/analytics/project/${projectId}/recent-activity`),
          ]);

        console.log(statusRes);
        console.log(assigneesRes);
        console.log(trendsRes);
        console.log(activityRes);

        // ✅ Task Status
        if (statusRes.status === "fulfilled" && statusRes.value?.data?.data) {
          const raw = statusRes.value.data.data;

          setStatusData([
            { name: "Todo", value: raw.todo || 0 },
            { name: "In Progress", value: raw["in-progress"] || raw.inProgress || 0 },
            { name: "Done", value: raw.done || 0 },
          ]);

        } else {
          console.error("Status fetch failed:", statusRes.reason);
          setStatusData([]);
        }

        // ✅ Assignees
        if (assigneesRes.status === "fulfilled" && Array.isArray(assigneesRes.value?.data?.data)) {
          setMemberData(
            assigneesRes.value.data.data.map((u) => ({
              name: u.username || "Unknown",
              tasks: u.count || 0,
            }))
          );
        } else {
          console.warn("Assignees fetch returned no usable data");
          setMemberData([]);
        }

        // ✅ Trends
        if (trendsRes.status === "fulfilled" && Array.isArray(trendsRes.value?.data?.data)) {
          setTrendData(
            trendsRes.value.data.data.map((d) => ({
              date: new Date(d.date).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
              }) || "N/A",
              created: d.created || 0,
              completed: d.completed || 0,
            }))
          );
        } else {
          console.warn("Trends fetch returned no usable data");
          setTrendData([]);
        }

        // ✅ Activity
        if (activityRes.status === "fulfilled" && Array.isArray(activityRes.value?.data?.data)) {
          setRecentActivity(activityRes.value.data.data);
        } else {
          console.warn("Recent activity fetch returned no usable data");
          setRecentActivity([]);
        }
      } catch (err) {
        console.error("Analytics Fetch Error:", err);
        toast.error("Failed to load analytics");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
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

    const refreshAnalytics = () => {
      fetchAnalytics();
    };

    socket.on("taskCreated", refreshAnalytics);
    socket.on("taskUpdated", refreshAnalytics);
    socket.on("taskDeleted", refreshAnalytics);
    socket.on("taskRestored", refreshAnalytics);

    return () => {
      socket.off("taskCreated", refreshAnalytics);
      socket.off("taskUpdated", refreshAnalytics);
      socket.off("taskDeleted", refreshAnalytics);
      socket.off("taskRestored", refreshAnalytics);
    };
  }, [socket, projectId]);

  if (loading) {
    return <div className="p-4">Loading analytics...</div>;
  }

  const formatAction = (action) =>
    action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:col-span-2">
        <Card>
          <CardContent className="text-center">
            <p className="text-sm text-gray-500">Total Tasks</p>
            <p className="text-2xl font-bold">
              {statusData.reduce((sum, s) => sum + s.value, 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="text-center">
            <p className="text-sm text-gray-500">Completed</p>
            <p className="text-2xl font-bold text-green-600">
              {statusData.find(s => s.name === "Done")?.value || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="text-center">
            <p className="text-sm text-gray-500">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">
              {(statusData.find(s => s.name === "Todo")?.value || 0) +
              (statusData.find(s => s.name === "In Progress")?.value || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Task Status */}
      <Card>
        <CardHeader>
          <CardTitle>Task Status Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {statusData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-sm">No status data available</p>
          )}
        </CardContent>
      </Card>

      {/* Tasks Per User */}
      <Card>
        <CardHeader>
          <CardTitle>Tasks Per User</CardTitle>
        </CardHeader>
        <CardContent>
          {memberData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={memberData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-20} textAnchor="end" interval={0} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="tasks" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-sm">No member data available</p>
          )}
        </CardContent>
      </Card>

      {/* Task Trends */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Task Trends (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="created" stroke="#3b82f6" strokeWidth={2} name="Created" />
                <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} name="Completed" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-sm">No trend data available</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              {recentActivity.map((activity, idx) => (
                <li
                  key={idx}
                  className="border-b border-gray-200 dark:border-gray-700 pb-1"
                >
                  <span className="font-medium">
                    {activity.user?.username || "Unknown"}
                  </span>{" "}
                  {formatAction(activity.action)}{" "}
                  <span className="text-gray-500">
                    ({activity.timeAgo || "just now"})
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AnalyticsTab;
