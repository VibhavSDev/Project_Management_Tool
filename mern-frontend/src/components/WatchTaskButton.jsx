import { useState, useEffect } from 'react';
import API from '../services/axiosInstance';
import { useAuth } from '../shared/useAuth';
import toast from 'react-hot-toast';

const WatchTaskButton = ({ taskId, currentWatchers = [], onChange }) => {
  const { user } = useAuth();
  const [watching, setWatching] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && currentWatchers?.some(u => u._id === user.id)) {
      setWatching(true);
    } else {
      setWatching(false);
    }
  }, [user, currentWatchers]);

  const toggleWatch = async () => {
    try {
      setLoading(true);
      const url = `/tasks/${taskId}/${watching ? 'unwatch' : 'watch'}`;
      await API.post(url);
      toast.success(`You are now ${watching ? 'not watching' : 'watching'} this task`);
      setWatching(!watching);
      if (onChange) onChange();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update watch status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggleWatch}
      disabled={loading}
      className={`text-sm px-3 py-1.5 rounded border ${
        watching
          ? 'bg-yellow-100 text-yellow-800 border-yellow-400 hover:bg-yellow-200'
          : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
      }`}
    >
      {watching ? 'Unwatch' : 'Watch'}
    </button>
  );
};

export default WatchTaskButton;
