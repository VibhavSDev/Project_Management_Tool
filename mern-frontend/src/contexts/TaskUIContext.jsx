import { useState, createContext, useContext } from "react";

const TaskUIContext = createContext(null);

export const TaskUIProvider = ({ children }) => {
  const [openTaskId, setOpenTaskId] = useState(null);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [createTaskStatus, setCreateTaskStatus] = useState("todo");
  const [taskModal, setTaskModal] = useState({
    taskId: null,
    projectId: null,
  });

  const openTask = (taskId, projectId = null) => {
    setOpenTaskId(taskId, projectId);
    setTaskModal({ taskId, projectId });
    setIsCreatingTask(false);
  };

  const closeTask = () => {
    setOpenTaskId(null);
    setTaskModal({ taskId: null, projectId: null });
  }

  const openCreateTask = (status = "todo") => {
    setCreateTaskStatus(status);
    setIsCreatingTask(true);
    setOpenTaskId(null);
  };

  const closeCreateTask = () => setIsCreatingTask(false);


  return (
    <TaskUIContext.Provider
      value={{
        openTaskId,
        isCreatingTask,
        createTaskStatus,
        taskModal,
        openTask,
        closeTask,
        openCreateTask,
        closeCreateTask,
      }}
    >
      {children}
    </TaskUIContext.Provider>
  );
};

export const useTaskUI = () => {
  const ctx = useContext(TaskUIContext);
  if (!ctx) {
    throw new Error("useTaskUI must be used within TaskUIProvider");
  }
  return ctx;
};
