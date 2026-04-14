import React, { useEffect, useState, useMemo } from "react";
import API from "../services/axiosInstance";
import TaskCard from "../components/tasks/TaskCard"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { ClipboardList, Search, Flag } from "lucide-react";
import { useTaskUI } from "../contexts/TaskUIContext";
import { useAuth } from "../shared/useAuth";
import { useSocket } from "../contexts/SocketContext";


// Skeleton loader
const TaskSkeleton = () => (
  <div className="animate-pulse space-y-3">
    <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
    <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
    <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-full"></div>
  </div>
);

const STATUSES = [
  { key: "todo", label: "Todo", color: "bg-red-500" },
  { key: "in-progress", label: "In Progress", color: "bg-yellow-500" },
  { key: "review", label: "Review", color: "bg-blue-500" },
  { key: "done", label: "Done", color: "bg-green-500" },
];

const PRIORITIES = [
  { key: "high", color: "text-red-600 bg-red-100" },
  { key: "medium", color: "text-yellow-600 bg-yellow-100" },
  { key: "low", color: "text-green-600 bg-green-100" },
];

export default function MyTasks() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [filters, setFilters] = useState({
    todo: true,
    "in-progress": true,
    review: true,
    done: true,
  });
  const [selectedProject, setSelectedProject] = useState("all");
  const [dueDateFilter, setDueDateFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { openTask } = useTaskUI();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch tasks
  const fetchMyTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await API.get("/tasks/my-tasks");
      const tasksArray = Array.isArray(data) ? data : data.tasks || [];
      setTasks(tasksArray);

      // Unique projects
      const uniqueProjects = [
        ...new Map(
          tasksArray.map((t) => [
            t.project?._id,
            { _id: t.project?._id, name: t.project?.name },
          ])
        ).values(),
      ].filter((p) => p._id);
      setProjects(uniqueProjects);
    } catch (err) {
      console.error("Error fetching tasks", err);
      setError("Failed to load your tasks. Please try again.");
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyTasks();
  }, []);

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const { data: updatedTask } = await API.patch(
        `/tasks/${taskId}/status`,
        { status: newStatus }
      );
      setTasks((prev) =>
        prev.map((t) => (t._id === updatedTask._id ? updatedTask : t))
      );
    } catch (err) {
      console.error("Failed to update task status", err);
      fetchMyTasks();
    }
  };

  const onDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    const sourceStatus = source.droppableId;
    const destStatus = destination.droppableId;
    const prevTasks = [...tasks];

    if (sourceStatus === destStatus && source.index === destination.index) {
      return;
    }

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t._id === draggableId ? { ...t, status: destStatus } : t
      )
    );

    try {
      await handleStatusChange(draggableId, destStatus);
    } catch {
      setTasks(prevTasks);
    }
  };

  const canDragTask = (task) => {
    if (!user) return false;

    // Archived / deleted
    if (task.isDeleted) return false;

    // Optional: lock completed tasks
    // if (task.status === "done") return false;

    // Task must be assigned to me
    const isAssignedToMe =
      task.assignees?.some(a => a._id === user._id) ||
      task.assignee?._id === user._id;

    return isAssignedToMe;
  };


  // Filtering logic
  const applyFilters = (task) => {
    // Status
    if (!filters[task.status]) return false;

    // Project
    if (selectedProject !== "all" && task.project?._id !== selectedProject) {
      return false;
    }

    // Priority
    if (priorityFilter !== "all" && task.priority !== priorityFilter) {
      return false;
    }

    // Due date
    if (dueDateFilter !== "all" && task.dueDate) {
      const due = new Date(task.dueDate).setHours(0, 0, 0, 0);
      const today = new Date().setHours(0, 0, 0, 0);

      if (dueDateFilter === "overdue" && due >= today) return false;
      if (dueDateFilter === "today" && due !== today) return false;
      if (dueDateFilter === "upcoming" && due <= today) return false;
    }

    // Search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const inTitle = task.title?.toLowerCase().includes(query);
      const inDesc = task.description?.toLowerCase().includes(query);
      if (!inTitle && !inDesc) return false;
    }

    return true;
  };

  // Memoized filtered tasks
  const filteredTasks = useMemo(
    () => tasks.filter(applyFilters),
    [tasks, selectedProject, dueDateFilter, priorityFilter, searchQuery, filters]
  );

  const totalTasks = filteredTasks.length;

  const tasksByStatus = useMemo(() => {
    return filteredTasks.reduce((acc, task) => {
      acc[task.status] = acc[task.status] || [];
      acc[task.status].push(task);
      return acc;
    }, {});
  }, [filteredTasks]);


  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Tasks</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Tasks assigned to you across all projects
          </p>
        </div>
        <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-600 text-sm font-medium">
          {totalTasks} tasks
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status */}
        <div className="flex flex-wrap gap-2">
          {STATUSES.map(({ key, label, color }) => (
            <button
              key={key}
              title={`Toggle ${label} tasks`}
              className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                filters[key]
                  ? `${color} text-white`
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
              onClick={() =>
                setFilters((prev) => ({ ...prev, [key]: !prev[key] }))
              }
            >
              {label}
            </button>
          ))}
        </div>

        {/* Project */}
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="ml-auto px-3 py-1 rounded-md border bg-white dark:bg-zinc-800 dark:border-gray-700 text-sm"
        >
          <option value="all">All Projects</option>
          {projects.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </select>

        {/* Priority */}
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-1 rounded-md border bg-white dark:bg-zinc-800 dark:border-gray-700 text-sm"
        >
          <option value="all">All Priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p.key} value={p.key}>
              {p.key}
            </option>
          ))}
        </select>

        {/* Due Date */}
        <select
          value={dueDateFilter}
          onChange={(e) => setDueDateFilter(e.target.value)}
          className="px-3 py-1 rounded-md border bg-white dark:bg-zinc-800 dark:border-gray-700 text-sm"
        >
          <option value="all">All Dates</option>
          <option value="overdue">Overdue</option>
          <option value="today">Due Today</option>
          <option value="upcoming">Upcoming</option>
        </select>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setSearchQuery("")}
            className="pl-9 pr-3 py-1 rounded-md border bg-white dark:bg-zinc-800 dark:border-gray-700 text-sm w-52"
          />
          <Search className="absolute left-2 top-1.5 h-4 w-4 text-gray-400" />
        </div>

        {/* Reset */}
        <button
          className="px-3 py-1 rounded-full text-sm bg-gray-100 dark:bg-gray-700"
          onClick={() => {
            setFilters({
              todo: true,
              "in-progress": true,
              review: true,
              done: true,
            });
            setSelectedProject("all");
            setPriorityFilter("all");
            setDueDateFilter("all");
            setSearchQuery("");
          }}
        >
          Reset
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="text-red-500 text-sm text-center py-4">{error}</div>
      )}

      {/* Kanban */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {STATUSES.map(({ key, label, color }) => (
            <div
              key={key}
              className="bg-gray-50 dark:bg-zinc-800 p-4 rounded-lg min-h-[400px]"
            >
              <div
                className={`sticky top-0 z-10 flex items-center justify-between mb-3 ${color} text-white px-3 py-1 rounded`}
              >
                <h2 className="font-semibold capitalize">{label}</h2>
              </div>
              <div className="space-y-4">
                <TaskSkeleton />
                <TaskSkeleton />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {STATUSES.map(({ key, label, color }) => (
              <Droppable droppableId={key} key={key}>
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="bg-gray-50 dark:bg-zinc-800 p-4 rounded-lg min-h-[400px] flex flex-col"
                  >
                    <div
                      className={`sticky top-0 z-10 flex items-center justify-between mb-3 ${color} text-white px-3 py-1 rounded`}
                    >
                      <h2 className="font-semibold capitalize">{label}</h2>
                      <span className="text-sm">
                        {(tasksByStatus[key] || []).length}
                      </span>
                    </div>

                    {filters[key] &&
                      (tasksByStatus[key] || [])
                        .map((task, index) => {
                          const isDragDisabled = !canDragTask(task);
                          return (
                          <Draggable
                            key={task._id}
                            draggableId={(task._id)}
                            index={index}
                            isDragDisabled={isDragDisabled}
                          >
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...(isDragDisabled ? {} : provided.dragHandleProps)}
                                title={
                                  isDragDisabled
                                    ? "You cannot drag this task"
                                    : "Drag to change status"
                                }
                                className={`mb-3 transition ${
                                  isDragDisabled
                                    ? "opacity-50 cursor-not-allowed"
                                    : "cursor-grab active:cursor-grabbing"
                                }`}
                              >
                                <TaskCard
                                  variant="my"
                                  task={task}
                                  onClick={() => openTask(task._id)}
                                  // 👇 Show priority badge inside card
                                  extraBadge={
                                    task.priority && (
                                      <span
                                        className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${
                                          PRIORITIES.find(
                                            (p) => p.key === task.priority
                                          )?.color
                                        }`}
                                      >
                                        <Flag className="h-3 w-3" />
                                        {task.priority}
                                      </span>
                                    )
                                  }
                                />
                              </div>
                            )}
                          </Draggable>
                          );
                        })}

                    {/* Empty */}
                    {filters[key] &&
                      (tasksByStatus[key] || []).length === 0 && (
                        <div className="flex flex-col items-center justify-center text-gray-400 text-sm mt-6">
                          <ClipboardList className="h-6 w-6 mb-1" />
                          No tasks here
                        </div>
                      )}

                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      )}
    </div>
  );
}
