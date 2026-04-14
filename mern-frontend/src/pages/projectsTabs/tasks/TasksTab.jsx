// ✅ Updated TasksTab.jsx
import { useEffect, useState, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import API from "../../../services/axiosInstance.js";
import toast from "react-hot-toast";
import TaskCard from "../../../components/tasks/TaskCard.jsx";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useSocket } from "../../../contexts/SocketContext.jsx";
import { useTaskUI } from "../../../contexts/TaskUIContext.jsx";
import TaskSkeleton from "../../../components/tasks/TaskSkeleton.jsx";

const columns = [
  { key: "todo", label: "Todo" },
  { key: "in-progress", label: "In Progress" },
  { key: "review", label: "Review" },
  { key: "done", label: "Done" },
];

const TasksTab = () => {
  const { projectId } = useOutletContext();
  const { socket } = useSocket();
  const { openTask, openCreateTask } = useTaskUI();
  
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // -----------------------
  // Fetch tasks from server
  // -----------------------
  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/tasks/project/${projectId}`);
      setTasks(res.data || []);
    } catch (err) {
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [projectId]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const res = await API.get(`/tasks/project/${projectId}`);
      if (mounted) setTasks(res.data || []);
    };
    load();
    return () => { mounted = false; };
  }, [projectId]);

  useEffect(() => {
    if (!socket || !projectId) return;

    socket.emit("joinProject", projectId);

    return () => {
      socket.emit("leaveProject", projectId);
    };
  }, [socket, projectId]);

  const upsertTask = (task) => {
    setTasks(prev => {
      const index = prev.findIndex(t => t._id === task._id);
      if (index === -1) return [...prev, task];
      if (JSON.stringify(prev[index]) === JSON.stringify(task)) return prev;
      return prev.map(t => t._id === task._id ? task : t);
    });
  };

  // ---------------------
  // Socket event listeners
  // ---------------------
  useEffect(() => {
    if (!socket) return;

    const handleTaskCreated = (task) => {
      if (task.project?.toString() === projectId) {
        upsertTask(task);
      }
    };

    const handleTaskUpdated = (task) => {
      if (task.project?.toString() === projectId) {
        upsertTask(task);
      }
    };

    const handleTaskDeleted = (taskId) => {
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
    };

    const handleTaskStatusChanged = (task) => {
      if (task.project?.toString() === projectId) {
        upsertTask({ ...task, _flash: true });
        setTimeout(() => {
          setTasks(prev =>
            prev.map(t =>
              t._id === task._id ? { ...t, _flash: false } : t
            )
          );
        }, 1200);

        toast.success(`Task "${task.title}" moved to ${task.status}`);
      }
    };

    const handleTaskRestored = (task) => {
      upsertTask(task);
    };

    socket.on("taskCreated", handleTaskCreated);
    socket.on("taskUpdated", handleTaskUpdated);
    socket.on("taskDeleted", handleTaskDeleted);
    socket.on("taskStatusChanged", handleTaskStatusChanged); 
    socket.on("taskRestored", handleTaskRestored);

    return () => {
      socket.off("taskCreated", handleTaskCreated);
      socket.off("taskUpdated", handleTaskUpdated);
      socket.off("taskDeleted", handleTaskDeleted);
      socket.off("taskStatusChanged", handleTaskStatusChanged);
      socket.off("taskRestored", handleTaskRestored);
    };
  }, [socket, projectId]);

  // -----------------------
  // Group tasks by status
  // -----------------------
  const groupedTasks = useMemo(() => {
    return columns.reduce((acc, col) => {
      acc[col.key] = tasks.filter(
        (t) => t && t.status === col.key   // ✅ FIX
      );
      return acc;
    }, {});
  }, [tasks]);

  // ---------------------
  // Drag + Drop handler
  // ---------------------
  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination || source.droppableId === destination.droppableId) return;

    // 🔒 Edge case: task deleted in another tab while dragging
    const draggedTaskExists = tasks.some((t) => t._id === draggableId);
    if (!draggedTaskExists) return;

    // Optimistic UI update
    const prevTasks = [...tasks];
    setTasks((prev) =>
      prev.map((t) =>
        t._id === draggableId ? { ...t, status: destination.droppableId } : t
      )
    );

    try {
      await API.patch(`/tasks/${draggableId}/status`, {
        status: destination.droppableId,
      });
      // ✅ Don’t toast here → wait for socket confirmation
    } catch (err) {
      setTasks(prevTasks); // rollback
      toast.error("Failed to update task status");
    }
  };

  // ---------------------
  // Render
  // ---------------------
  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {loading && columns.map((col) => (
          <Droppable droppableId={col.key} key={col.key}>
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="rounded-xl p-3 flex flex-col min-h-[65vh] border bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold">{col.label}</h3>
                    <p className="text-xs text-gray-500">Loading…</p>
                  </div>
                </div>

                {/* Skeletons */}
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <TaskSkeleton key={i} />
                  ))}
                </div>
              </div>
            )}
          </Droppable>
        ))}
        {!loading && (
          columns.map((col) => (
            <Droppable droppableId={col.key} key={col.key}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`rounded-xl p-3 flex flex-col min-h-[65vh] border transition
                    ${
                      snapshot.isDraggingOver && snapshot.draggingFromThisWith === null
                        ? "bg-indigo-50 border-indigo-300 dark:bg-indigo-900/20"
                        : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                    }`}
                >
                  {/* Column header */}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold">{col.label}</h3>
                      <p className="text-xs text-gray-500">
                        {groupedTasks[col.key]?.length ?? 0} tasks
                      </p>
                    </div>

                    <button
                      onClick={() => openCreateTask(col.key)}
                      className="text-xs font-medium text-indigo-600 hover:underline"
                    >
                      + New
                    </button>
                  </div>

                  {/* Tasks */}
                  <div className="space-y-2 flex-1">
                    {groupedTasks[col.key]
                      ?.filter(Boolean)
                      .map((task, index) => (
                        <Draggable
                          key={task._id}
                          draggableId={task._id}
                          index={index}
                          className={`transition ${
                            snapshot.isDragging ? "rotate-1 scale-[1.02] shadow-lg" : ""
                          }`}
                        >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={snapshot.isDragging ? "opacity-80" : ""}
                          >
                            <TaskCard
                              variant="project"
                              task={task}
                              projectId={projectId}
                              onClick={() => openTask(task._id, projectId)}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}

                    {provided.placeholder}

                    {groupedTasks[col.key].length === 0 && (
                      <div className="text-center mt-10 text-gray-400">
                      <div className="text-2xl mb-2">📭</div>
                      <p className="text-xs">No tasks in this stage</p>
                    </div>
                    )}
                  </div>
                </div>
              )}
            </Droppable>
          ))
        )}
      </div>
    </DragDropContext>
  );
};

export default TasksTab;
