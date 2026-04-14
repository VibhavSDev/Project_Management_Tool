// src/pages/projects/ProjectToolbar.jsx
import { PlusCircle, Search } from "lucide-react";
import { Button } from "../../components/ui/Button";

const ProjectToolbar = ({
  view,
  setView,
  searchTerm,
  setSearchTerm,
  onCreate,
}) => {
  return (
    <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
        {view === "active" ? "📁 Your Projects" : "🗄️ Archived Projects"}
      </h1>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-2">
          <Button
            variant={view === "active" ? "default" : "secondary"}
            size="sm"
            onClick={() => setView("active")}
          >
            Active
          </Button>
          <Button
            variant={view === "archived" ? "default" : "secondary"}
            size="sm"
            onClick={() => setView("archived")}
          >
            Archived
          </Button>
        </div>

        <div className="relative">
          <Search size={18} className="absolute left-2 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 pr-3 py-2 rounded-md border bg-gray-50 dark:bg-gray-800"
          />
        </div>

        {view === "active" && (
          <Button onClick={onCreate} className="flex gap-2">
            <PlusCircle size={18} />
            New Project
          </Button>
        )}
      </div>
    </div>
  );
};

export default ProjectToolbar;
