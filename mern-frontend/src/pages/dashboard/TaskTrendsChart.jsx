import { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import API from '../../services/axiosInstance';
import toast from 'react-hot-toast';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,   // ✅
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler   // ✅ required for `fill`
);


const TaskTrendsChart = ({ projectId, days = 7 }) => {
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;

    const fetchTrends = async () => {
      try {
        setLoading(true);
        const res = await API.get(`/analytics/project/${projectId}/trends?days=${days}`);
        setTrendData(res.data.data || []);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load task trends');
      } finally {
        setLoading(false);
      }
    };

    fetchTrends();
  }, [projectId, days]);

  if (loading) return <p>Loading trends...</p>;
  if (!trendData.length)
    return (
      <p className="text-gray-500 dark:text-gray-400">
        No tasks created in the past {days} days.
      </p>
    );

  const chartData = {
    labels: trendData.map((entry) =>
      new Date(entry.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    ),
    datasets: [
      {
        label: 'Tasks Created',
        data: trendData.map((entry) => entry.created),
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        fill: true,
        tension: 0.3,
      },
      {
        label: 'Tasks Completed',
        data: trendData.map((entry) => entry.completed),
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        fill: true,
        tension: 0.3,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
    },
    scales: {
      y: { beginAtZero: true, ticks: { stepSize: 1 } },
    },
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
      <h3 className="font-semibold mb-2 text-gray-800 dark:text-gray-200">
        Task Trends (Last {days} Days)
      </h3>
      <Line key={JSON.stringify(chartData)} data={chartData} options={options} />
    </div>
  );
};

export default TaskTrendsChart;
