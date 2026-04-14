import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../../../services/axiosInstance';
import TaskForm from './TaskForm';
import toast from 'react-hot-toast';

const EditTask = () => {
  const { id: projectId, taskId } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTask = async () => {
      try {
        const res = await API.get(`/tasks/${taskId}`);
        setTask(res.data);
      } catch (err) {
        console.error(err);
        toast.error('Failed to fetch task');
        navigate(`/dashboard/projects/${projectId}/tasks`);
      } finally {
        setLoading(false);
      }
    };
    fetchTask();
  }, [projectId, taskId, navigate]);

  const handleSuccess = () => {
    navigate(`/dashboard/projects/${projectId}/tasks`);
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
        Edit Task
      </h2>
      {loading ? (
        <p className="text-gray-600 dark:text-gray-300">Loading task...</p>
      ) : (
        <TaskForm projectId={projectId} task={task} onSuccess={handleSuccess} />
      )}
    </div>
  );
};

export default EditTask;
