// src/pages/projects/ProjectGrid.jsx
import ProjectCard from "./ProjectCard";

const ProjectGrid = ({
  projects,
  view,
  user,
  onLeave,
  onArchive,
  onRestore,
  onInvite,
}) => {
  if (projects.length === 0) {
    return (
      <div className="mt-24 text-center text-gray-500">
        <p className="text-lg font-medium">
            {view === "active"
            ? "No projects yet"
            : "No archived projects"}
        </p>
        <p className="text-sm mt-1">
            {view === "active"
            ? "Create a project to start collaborating"
            : "Archived projects will appear here"}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((project) => (
        <ProjectCard
          key={project._id}
          project={project}
          user={user}
          view={view}
          onLeave={onLeave}
          onArchive={onArchive}
          onRestore={onRestore}
          onInvite={onInvite}
        />
      ))}
    </div>
  );
};

export default ProjectGrid;
