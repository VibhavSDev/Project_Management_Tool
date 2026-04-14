import { useEffect, useState } from 'react';
import API from '../../services/axiosInstance';
import toast from 'react-hot-toast';
import { useProject } from '../../contexts/ProjectContext';

const ProjectSelector = ({ onSelect }) => {
  const { setCurrentProject } = useProject();
  const [projects, setProjects] = useState([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await API.get('/projects');
        const list = res.data.projects || [];
        setProjects(list);
        console.log(list)

        if (list.length > 0) {
          setSelected(list[0]._id);
          setCurrentProject(list[0]);     // ✅ update context immediately
          onSelect?.(list[0]._id);
        }
      } catch (err) {
        toast.error('Failed to load projects');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []); // ✅ no need for [onSelect]

  const handleChange = (e) => {
    const projectId = e.target.value;
    const selectedProject = projects.find(p => p._id === projectId);
    setSelected(projectId);
    setCurrentProject(selectedProject || null);
    onSelect?.(projectId);
  };

  return (
    <div className="w-full max-w-md">
      <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-200">
        Select a Project
      </label>
      <select
        value={selected}
        onChange={handleChange}
        disabled={loading || projects.length === 0}
        className="w-full p-2 rounded border dark:bg-gray-800 dark:text-white disabled:opacity-50"
      >
        <option value="">-- Choose Project --</option>
        {projects.map((project) => (
          <option key={project._id} value={project._id}>
            {project.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ProjectSelector;
