import { useState } from 'react';
import API from '../../services/axiosInstance';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { PlusCircle } from 'lucide-react';

const CreateProject = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Project name is required');

    try {
      setLoading(true);
      const project = await API.post('/projects', { name, description });
      toast.success('Project created successfully!');
      navigate(`/dashboard/projects`);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || 'Project creation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 dark:bg-gray-900 px-4 py-10 flex justify-center items-start">
      <section className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <PlusCircle className="text-indigo-600 dark:text-indigo-400" size={28} />
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Create New Project</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Project Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. Marketing Redesign"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Add a short summary of your project's goals"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-md transition disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Project'}
          </button>
        </form>
      </section>
    </main>
  );
};

export default CreateProject;
