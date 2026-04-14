import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../shared/useAuth";
import { useEffect, useState } from "react";
import {
  Menu,
  Moon,
  Sun,
  Bell,
  CheckCheck,
  ClipboardList,
  MessageSquare,
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Activity,
  User,
  Users,
  ChevronDown,
} from "lucide-react";
import { useTheme } from "next-themes";
import API from "../services/axiosInstance";
import { TaskUIProvider, useTaskUI } from "../contexts/TaskUIContext";
import TaskDetails from "../pages/projectsTabs/tasks/TaskDetails";
import CreateTask from "../pages/projectsTabs/tasks/CreateTask";

const DashboardLayoutContent = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { isCreatingTask, openTaskId, openTask, closeTask, taskModal } = useTaskUI();

  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  }, [mounted, resolvedTheme]);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await API.get("/projects");
        const data = res.data.projects || res.data || [];
        setProjects(data);
        if (data.length > 0) setSelectedProject(data[0]);
      } catch (err) {
        console.error("Failed to fetch projects", err);
      }
    };
    fetchProjects();
  }, []);

  useEffect(() => {
    const handleResize = () => setIsSidebarOpen(window.innerWidth >= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".profile-menu")) setShowProfileMenu(false);
      if (!e.target.closest(".project-dropdown")) setShowProjectDropdown(false);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const fetchNotifications = async (pageNum = 1) => {
    try {
      setLoadingNotifications(true);
      const res = await API.get(`/notifications?page=${pageNum}`);
      setNotifications((prev) =>
        pageNum === 1 ? res.data.notifications : [...prev, ...res.data.notifications]
      );
      setPage(res.data.page);
      setPages(res.data.pages);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleOpenNotifications = () => {
    setShowNotifications((p) => !p);
    if (!showNotifications) {
      fetchNotifications(1);
    }
  };

  const extractTaskId = (link) => {
    if (!link) return null;

    // expected: /tasks/:taskId
    const parts = link.split("/");
    return parts[parts.length - 1];
  };

  const handleNotificationClick = async (notification) => {
    // mark as read (if you have API/socket)
    if (!notification.isRead) {
      await API.patch(`/notifications/${notification._id}/read`);
      setNotifications((prev) =>
        prev.map((x) =>
          x._id === notification._id ? { ...x, isRead: true } : x
        )
      );
    }

    if (notification.type === "task") {
      const taskId = extractTaskId(notification.link);
      if (taskId) {
        openTask(taskId);
      }
    }

    setShowNotifications(false);
  };

  const markAllAsRead = async () => {
    await API.patch("/notifications/mark-all-read");
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, isRead: true }))
    );
  };

  const timeAgo = (date) => {
    const sec = Math.floor((Date.now() - new Date(date)) / 1000);
    const map = [
      [31536000, "y"],
      [2592000, "mo"],
      [86400, "d"],
      [3600, "h"],
      [60, "m"],
    ];
    for (const [s, l] of map) {
      const v = Math.floor(sec / s);
      if (v >= 1) return `${v}${l} ago`;
    }
    return "just now";
  };

  const notificationIcon = (type) => {
    if (type === "task") return <ClipboardList className="h-4 w-4 text-blue-500" />;
    if (type === "comment") return <MessageSquare className="h-4 w-4 text-green-500" />;
    if (type === "project") return <FolderKanban className="h-4 w-4 text-purple-500" />;
    return <Bell className="h-4 w-4 text-gray-400" />;
  };

  const hasUnread = notifications.some((n) => !n.isRead);

  const navItems = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { label: "Projects", icon: FolderKanban, path: "/dashboard/projects" },
    { label: "My Tasks", icon: CheckSquare, path: "/dashboard/my-tasks" },
    { label: "Activity", icon: Activity, path: "/dashboard/activity" },
    { label: "Profile", icon: User, path: "/dashboard/profile" },
    ...(user?.role === "admin"
      ? [{ label: "Admin", icon: Users, path: "/dashboard/admin" }]
      : []),
  ];

  if (!mounted) return null;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Mobile backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      {/* Sidebar */}
      <aside
        className={`
          fixed md:static z-40 h-full
          flex flex-col transition-transform duration-300
          bg-white dark:bg-gray-900
          border-r border-gray-200 dark:border-gray-800
          w-64
          ${
            isSidebarOpen
              ? "translate-x-0"
              : "-translate-x-full md:translate-x-0"
          }
        `}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <span className="font-semibold text-lg tracking-tight">
            {isSidebarOpen ? "ProjectMate" : "PM"}
          </span>
        </div>

        <nav className="flex-1 px-2 space-y-1">
          {navItems.map(({ label, icon: Icon, path }) => {
            const active =
              path === "/dashboard"
                ? location.pathname === "/dashboard"
                : location.pathname.startsWith(path);

            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`group flex items-center gap-3 px-3 py-2 rounded-md text-sm transition
                ${
                  active
                    ? "bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
                title={!isSidebarOpen ? label : ""}
              >
                <Icon size={18} />
                {isSidebarOpen && <span>{label}</span>}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <button
            className="md:hidden p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => setIsSidebarOpen((p) => !p)}
            aria-label="Toggle sidebar"
          >
            <Menu size={20} />
          </button>
          <div className="relative project-dropdown">
            <button
              onClick={() => setShowProjectDropdown((p) => !p)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              {selectedProject?.name || "Select Project"}
              <ChevronDown size={16} />
            </button>

            {showProjectDropdown && (
              <div className="absolute z-50 mt-2 w-52 rounded-md border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow">
                {projects.map((proj) => (
                  <button
                    key={proj._id}
                    onClick={() => {
                      setSelectedProject(proj);
                      navigate(`/dashboard/projects/${proj._id}`);
                      setShowProjectDropdown(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    {proj.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="relative notification-panel">
            <button
              onClick={handleOpenNotifications}
              className="relative p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Bell size={20} />
              {/* unread indicator (UI only for now) */}
              {hasUnread && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500" />
                )}
            </button>

            {showNotifications && (
            <div className="absolute right-0 mt-2 w-96 max-h-[70vh] overflow-hidden rounded-lg border shadow-lg z-50
                            bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
              
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b dark:border-gray-800">
                <h3 className="text-sm font-semibold">Notifications</h3>
                <button onClick={markAllAsRead} className="text-xs text-indigo-600 hover:underline">
                  Mark all read
                </button>
              </div>

              {/* List */}
              <div className="max-h-[50vh] overflow-y-auto divide-y dark:divide-gray-800">
                {loadingNotifications && (
                  <div className="p-4 text-sm text-gray-500">Loading...</div>
                )}

                {!loadingNotifications && notifications.length === 0 && (
                  <div className="p-6 text-center text-sm text-gray-500">
                    🎉 You’re all caught up
                  </div>
                )}

                {notifications.map((n, idx) => (
                  <button
                    key={n._id || idx}
                    onClick={() => handleNotificationClick(n)}
                    className={`w-full flex gap-3 px-4 py-3 text-left
                          ${!n.isRead && "bg-indigo-50 dark:bg-indigo-900/20"}
                          hover:bg-gray-100 dark:hover:bg-zinc-800`}
                  >
                    {notificationIcon(n.type)}
                        <div className="flex-1">
                          <p className="text-sm">{n.message}</p>
                          <p className="text-xs text-gray-400">
                            {timeAgo(n.createdAt.toLocaleString())}
                          </p>
                        </div>
                  </button>
                ))}
              </div>

              {/* Footer */}
              {page < pages && (
                <button
                  onClick={() => fetchNotifications(page + 1)}
                  className="w-full py-2 text-sm text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                >
                  Load more
                </button>
              )}
            </div>
          )}
          </div>


            <button onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
              {resolvedTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <div className="relative profile-menu">
              <button onClick={() => setShowProfileMenu((p) => !p)}>
                <User size={20} />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-44 rounded-md border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow">
                  <button
                    onClick={() => navigate("/dashboard/profile")}
                    className="w-full px-4 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    Profile
                  </button>
                  <button
                    onClick={logout}
                    className="w-full px-4 py-2 text-sm text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>

      {/* {isCreatingTask && <CreateTask projectId={projectId} />} */}
      
      {!isCreatingTask && taskModal.taskId && (
        <TaskDetails
          taskId={taskModal.taskId}
          projectId={taskModal.projectId}
          onClose={closeTask}
        />
      )}
    </div>
  );
};

const DashboardLayout = () => {
  return (
    <TaskUIProvider>
      <DashboardLayoutContent />
    </TaskUIProvider>
  );
};

export default DashboardLayout;

