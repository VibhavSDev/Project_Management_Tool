import { NavLink, Outlet, useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import API from '../../services/axiosInstance';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Edit, Archive, Trash2, RotateCcw, Users } from 'lucide-react';
import { useSocket } from '../../contexts/SocketContext.jsx'; // 👈 import socket
import { useTaskUI } from "../../contexts/TaskUIContext.jsx";
import TaskDetails from "../projectsTabs/tasks/TaskDetails.jsx";
import CreateTask from "../projectsTabs/tasks/CreateTask.jsx";

const tabs = [
  { name: 'Overview', path: '' },
  { name: 'Tasks', path: 'tasks' },
  { name: 'Files', path: 'files' },
  { name: 'Members', path: 'members' },
  { name: 'Activity', path: 'activity' },
  { name: 'Analytics', path: 'analytics' },
];

const ProjectDetails = () => {
  const { projectId } = useParams();
  const {
    openTaskId,
    isCreatingTask,
    closeTask,
    closeCreateTask,
  } = useTaskUI();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const navigate = useNavigate();
  const { socket } = useSocket(); // 👈 get socket instance

  useEffect(() => {
    if (!projectId) return;

    const fetchProject = async () => {
      try {
        const res = await API.get(`/projects/${projectId}`);
        console.log(res.data)
        setProject(res.data);
      } catch (err) {
        toast.error('Failed to load project');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [projectId]);

  // 👇 Join project room for live updates
  useEffect(() => {
    if (socket && projectId) {
      console.log('Joining project room:', projectId);
      socket.emit('joinProject', projectId);

      return () => {
        socket.emit('leaveProject', projectId);
      };
    }
  }, [socket, projectId]);

  useEffect(() => {
    if (!socket) return;

    socket.on('projectUpdated', (updatedProject) => {
      if (updatedProject._id === projectId) {
        console.log(updatedProject)
        setProject(updatedProject);
      }
    });

    socket.on('projectDeleted', ({ projectId: deletedId }) => {
      if (deletedId === projectId) {
        toast('Project was deleted');
        navigate('/dashboard/projects');
      }
    });

    return () => {
      socket.off('projectUpdated');
      socket.off('projectDeleted');
    };
  }, [socket, projectId, navigate]);


  // --- Quick actions ---
  const handleArchive = async () => {
     if (!confirm('Archive this project?')) return;

    try {
      setActionLoading(true);
      await API.patch(`/projects/${projectId}/archive`);

      setProject((p) => ({ ...p, isArchived: true }));
      socket?.emit('projectArchived', {
        projectId,
        project: res.data,
      });

      toast.success('Project archived');
    } catch {
      toast.error('Failed to archive project');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!confirm('Restore this project?')) return;

    try {
      setActionLoading(true);
      await API.patch(`/projects/${projectId}/restore`);

      setProject((p) => ({ ...p, isArchived: false }));
      socket?.emit('projectRestored', {
        projectId,
        project: res.data,
      });

      toast.success('Project restored');
    } catch {
      toast.error('Failed to restore project');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('This will permanently delete the project. Continue?')) return;

    try {
      setActionLoading(true);
      await API.delete(`/projects/${projectId}`);

      socket?.emit('projectDeleted', { projectId });
      toast.success('Project deleted');
      navigate('/dashboard/projects');
    } catch {
      toast.error('Failed to delete project');
    } finally {
      setActionLoading(false);
    }
  };

  if (!projectId) {
    return (
      <div className="p-6 text-center text-red-600 dark:text-red-400">
        ❌ Invalid URL: Missing project ID.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-600 dark:text-gray-300">
        Loading project details...
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6 text-center text-red-600 dark:text-red-400">
        ⚠️ Project not found or access denied.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      {/* ================= HEADER ================= */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          {/* Project Info */}
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              {project.name}
              {project.isArchived ? (
                <Badge variant="destructive">Archived</Badge>
              ) : (
                <Badge variant="outline">Active</Badge>
              )}
            </h1>

            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {project.description || "No description provided"}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Owner: {project.owner?.username || "Unknown"} • Created{" "}
              {new Date(project.createdAt).toLocaleDateString()}
            </p>
          </div>

          {/* Members + Actions */}
          <div className="flex flex-col items-end gap-3">
            {/* Members preview */}
            <div className="flex items-center gap-1">
              <Users size={14} className="text-gray-400 mr-1" />
              {project.members?.slice(0, 4).map((m) => (
                <img
                  key={m.user._id}
                  src={
                    m.user.avatar
                      ? `${import.meta.env.VITE_API_URL.replace(
                          "/api",
                          ""
                        )}/${m.user.avatar}`
                      : "/default-avatar.png"
                  }
                  className="w-7 h-7 rounded-full border-2 border-white dark:border-gray-900"
                  title={m.user.username || m.user.email}
                />
              ))}
              {project.members?.length > 4 && (
                <span className="text-xs text-gray-500 ml-1">
                  +{project.members.length - 4}
                </span>
              )}
            </div>

            {/* Quick actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  navigate(`/dashboard/projects/${projectId}/edit`)
                }
              >
                <Edit size={14} className="mr-1" /> Edit
              </Button>

              {project.isArchived ? (
                <Button size="sm" variant="secondary" disabled={actionLoading} onClick={handleRestore}>
                  <RotateCcw size={14} className="mr-1" /> Restore
                </Button>
              ) : (
                <Button size="sm" variant="secondary" disabled={actionLoading} onClick={handleArchive}>
                  <Archive size={14} className="mr-1" /> Archive
                </Button>
              )}

              <Button size="sm" variant="destructive" disabled={actionLoading} onClick={handleDelete}>
                <Trash2 size={14} className="mr-1" /> Delete
              </Button>
            </div>
          </div>
        </div>

        {/* ================= TABS ================= */}
        <div className="mt-4 flex gap-2 overflow-x-auto">
          {tabs.map(({ name, path }) => (
            <NavLink
              key={path}
              to={path}
              end={path === ""}
              className={({ isActive }) =>
                `px-4 py-2 rounded-md text-sm font-medium transition
                ${
                  isActive
                    ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`
              }
            >
              {name}
            </NavLink>
          ))}
        </div>
      </div>


      {/* ================= CONTENT ================= */}
      <div className="flex-1 overflow-y-auto p-6">
        {!isCreatingTask && !openTaskId && <Outlet context={{ projectId, project, setProject }} />}
      </div>
      

      {/* CREATE TASK MODAL */}
      {isCreatingTask && <CreateTask projectId={projectId} />}

      {/* {!isCreatingTask && openTaskId && (
        <TaskDetails
          taskId={openTaskId}
          onClose={closeTask} 
        />
      )} */}

    </div>
    
  );
};

export default ProjectDetails;
