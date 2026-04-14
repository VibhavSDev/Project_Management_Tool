import { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import API from '../../services/axiosInstance';
import toast from 'react-hot-toast';

const TasksPerUserChart = ({ projectId }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await API.get(`/analytics/project/${projectId}/assignees`);
        // Ensure we always get an array
        setData(res.data.data || []);
      } catch (err) {
        console.error(err);
        toast.error('Failed to fetch tasks per user');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId]);

  if (loading) return <p>Loading chart...</p>;

  if (!data.length) {
    return (
      <p className="text-gray-500 dark:text-gray-400 italic">
        No users or tasks found for this project.
      </p>
    );
  }

  const chartData = {
    labels: data.map(
      (user) =>
        user.name ||
        user.username || // fallback for older backend keys
        user.email ||
        'Unknown'
    ),
    datasets: [
      {
        label: 'Tasks Assigned',
        data: data.map((user) => user.count || 0), // ensure count is always a number
        backgroundColor: '#6366F1',
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1 }, // show integer steps
      },
    },
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
      <h3 className="font-semibold mb-2 text-gray-800 dark:text-gray-200">
        Tasks per User
      </h3>
      <Bar key={JSON.stringify(chartData)} data={chartData} options={options} />
    </div>
  );
};

export default TasksPerUserChart;
