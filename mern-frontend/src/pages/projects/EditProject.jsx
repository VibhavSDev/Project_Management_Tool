import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from './../../contexts/SocketContext';
import { useOutletContext } from 'react-router-dom'
import API from '../../services/axiosInstance';
import toast from 'react-hot-toast';

const EditProject = () => {
  const { projectId } = useParams();
  const { socket } = useSocket();
  const { setProject } = useOutletContext();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const res = await API.get(`/projects/${projectId}`);
        const { name, description } = res.data;
        setFormData({ name, description });
      } catch (err) {
        toast.error('Failed to load project');
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [projectId, navigate]);

  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const closeModal = () => {
    navigate(-1); // 👈 return to ProjectDetails without unmount
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await API.put(`/projects/${projectId}`, formData);

      setProject(res.data); // 🔥 instant UI update
      console.log(res.data)
      // 🔔 Emit socket update
      socket?.emit('projectUpdated', res.data);

      toast.success('Project updated');
      closeModal();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={closeModal}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Edit Project
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium dark:text-gray-300">
                  Project Name
                </label>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full mt-1 p-2 rounded border dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium dark:text-gray-300">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  className="w-full mt-1 p-2 rounded border dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded border dark:border-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default EditProject;
