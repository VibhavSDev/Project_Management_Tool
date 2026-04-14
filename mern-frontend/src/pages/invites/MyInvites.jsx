import { useEffect, useState } from 'react';
import API from '../../services/axiosInstance';
import toast from 'react-hot-toast';
import { FaCheck, FaClock, FaTimes } from 'react-icons/fa';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const MyInvites = () => {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchInvites = async () => {
    try {
      const res = await API.get('/users/me/invites');
      setInvites(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load invites');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (token) => {
    try {
      await API.post(`/projects/accept-invite/${token}`);
      toast.success('Invite accepted');
      fetchInvites();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || 'Failed to accept invite');
    }
  };

  useEffect(() => {
    fetchInvites();
  }, []);

  return (
    <main className="min-h-screen px-4 py-10 bg-gray-100 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Project Invites</h1>

        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">Loading invites...</p>
        ) : invites.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 italic">No invites found.</p>
        ) : (
          <ul className="space-y-4">
            {invites.map((invite) => (
              <li
                key={invite._id}
                className="bg-white dark:bg-gray-800 rounded p-4 shadow flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
              >
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                    {invite.project.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Invited as <span className="font-medium">{invite.role}</span> •{' '}
                    {formatDistanceToNow(new Date(invite.createdAt))} ago
                  </p>
                </div>

                <div className="flex gap-3">
                  {invite.accepted ? (
                    <span className="flex items-center text-green-600 text-sm font-medium">
                      <FaCheck className="mr-1" /> Accepted
                    </span>
                  ) : (
                    <>
                      <button
                        onClick={() => handleAccept(invite.token)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-1.5 rounded"
                      >
                        Accept
                      </button>
                      {/* Optional Reject button if supported */}
                      {/* <button
                        onClick={() => handleReject(invite.token)}
                        className="bg-gray-600 hover:bg-gray-700 text-white text-sm px-4 py-1.5 rounded"
                      >
                        Reject
                      </button> */}
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-sm text-indigo-500 hover:underline"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </main>
  );
};

export default MyInvites;
