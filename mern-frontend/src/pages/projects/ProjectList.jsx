// src/pages/projects/ProjectList.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { useAuth } from "../../shared/useAuth";
import {
  getProjects,
  leaveProject,
  archiveProject,
  restoreProject,
} from "../../services/projectService";

import ProjectToolbar from "./ProjectToolbar";
import ProjectGrid from "./ProjectGrid";

const ProjectList = () => {
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [view, setView] = useState("active");

  const navigate = useNavigate();
  const { user } = useAuth();

  const fetchProjects = async () => {
    try {
      const res = await getProjects();
      console.log(res.projects);
      setProjects(res.projects || []);
    } catch (err) {
      toast.error("Failed to fetch projects");
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleLeave = async (projectId) => {
    try {
      await leaveProject(projectId);
      toast.success("Left project");
      setProjects((prev) => prev.filter((p) => p._id !== projectId));
    } catch {
      toast.error("Failed to leave project");
    }
  };

  const handleArchive = async (projectId) => {
    try {
      await archiveProject(projectId);
      toast.success("Project archived");
      fetchProjects();
    } catch {
      toast.error("Failed to archive project");
    }
  };

  const handleRestore = async (projectId) => {
    try {
      await restoreProject(projectId);
      toast.success("Project restored");
      fetchProjects();
    } catch {
      toast.error("Failed to restore project");
    }
  };

  const filteredProjects = projects
    .filter((p) => (view === "archived" ? p.isArchived : !p.isArchived))
    .filter((p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

  return (
    <main className="min-h-screen bg-gray-100 dark:bg-gray-900 px-4 py-10">
      <ProjectToolbar
        view={view}
        setView={setView}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onCreate={() => navigate("/dashboard/projects/new")}
      />

      <ProjectGrid
        projects={filteredProjects}
        view={view}
        user={user}
        onLeave={handleLeave}
        onArchive={handleArchive}
        onRestore={handleRestore}
        onInvite={(id) => navigate(`/dashboard/projects/${id}/invite`)}
      />
    </main>
  );
};

export default ProjectList;
