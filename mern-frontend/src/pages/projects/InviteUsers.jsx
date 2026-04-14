import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import API from '../../services/axiosInstance';
import toast from 'react-hot-toast';

const InviteUsers = () => {
  const { projectId } = useParams();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email.trim()) return toast.error('Email is required');

    try {
      setLoading(true);
      await API.post(`/projects/${projectId}/invite`, { email, role });
      toast.success('User invited successfully');
      setEmail('');
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.message || 'Failed to send invite');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-10 bg-gray-100 dark:bg-gray-900 flex justify-center items-start">
      <section className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Invite to Project</h2>
        <form onSubmit={handleInvite} className="space-y-5">
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="user@example.com"
              required
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="member">Member</option>
              <option value="manager">Manager</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-md transition disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send Invite'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-indigo-500 hover:underline"
          >
            ← Back to Project
          </button>
        </div>
      </section>
    </main>
  );
};

export default InviteUsers;
