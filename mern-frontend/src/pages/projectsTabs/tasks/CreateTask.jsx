import { useEffect } from "react";
import { useTaskUI } from "../../../contexts/TaskUIContext";
import TaskForm from "./TaskForm.jsx"; 
import { X } from "lucide-react";
import toast from "react-hot-toast";

const CreateTask = ({ projectId }) => {
  const { closeCreateTask, openTask } = useTaskUI();

  const handleSuccess = (createdTaskId) => {
    toast.success("Task created successfully");
    closeCreateTask();
    if (createdTaskId) openTask(createdTaskId); // open TaskDetails after creation
  };

  // ESC key close
  useEffect(() => {
    const handleEsc = (e) => e.key === "Escape" && closeCreateTask();
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 overflow-y-auto"
      onClick={closeCreateTask}
    >
      <div
        className="min-h-screen flex items-start justify-center px-4 py-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative w-full max-w-xl">
          {/* Close button */}
          <button
            onClick={closeCreateTask}
            className="absolute -top-3 -right-3 bg-white dark:bg-gray-800 rounded-full p-2 shadow hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X size={18} />
          </button>

          <TaskForm
            projectId={projectId}
            onSuccess={(taskId) => handleSuccess(taskId)}
          />
        </div>
      </div>
    </div>
  );
};

export default CreateTask;
