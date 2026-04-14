import { useEffect, useState } from 'react';
import { Pie } from 'react-chartjs-2';
import API from '../../services/axiosInstance';
import toast from 'react-hot-toast';

const TaskStatusChart = ({ projectId }) => {
  const [data, setData] = useState({ todo: 0, inProgress: 0, done: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;

    const fetchStatusCounts = async () => {
      try {
        setLoading(true);
        const res = await API.get(`/analytics/project/${projectId}/status`);
        setData(res.data.data || { todo: 0, inProgress: 0, done: 0 });
      } catch (err) {
        console.error(err);
        toast.error('Failed to load task status analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchStatusCounts();
  }, [projectId]);

  if (loading) return <p>Loading chart...</p>;

  const total = data.todo + data.inProgress + data.done;
  if (total === 0) {
    return (
      <p className="text-gray-500 dark:text-gray-400 italic">
        No tasks available yet.
      </p>
    );
  }

  const chartData = {
    labels: ['To Do', 'In Progress', 'Done'],
    datasets: [
      {
        data: [data.todo, data.inProgress, data.done],
        backgroundColor: ['#FBBF24', '#3B82F6', '#10B981'],
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'bottom' },
      tooltip: { enabled: true },
    },
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
      <h3 className="font-semibold mb-2 text-gray-800 dark:text-gray-200">
        Task Status Distribution
      </h3>
      <Pie key={JSON.stringify(chartData)} data={chartData} options={options} />
    </div>
  );
};

export default TaskStatusChart;
