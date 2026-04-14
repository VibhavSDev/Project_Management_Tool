// src/pages/projects/ProjectCard.jsx
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import {
  MoreHorizontal,
  Clock,
} from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../../components/ui/Dropdown-menu";

const ProjectCard = ({
  project,
  user,
  view,
  onLeave,
  onArchive,
  onRestore,
  onInvite,
}) => {
  const isOwner = project.owner._id === user?.id;
  const isArchived = project.isArchived;

  return (
    <Card className={`
        rounded-xl border transition-all
        ${isArchived
        ? "opacity-75 border-dashed bg-gray-50 dark:bg-gray-900/50"
        : "hover:-translate-y-0.5 hover:ring-1 hover:ring-indigo-500/30"}
    `}>
      <CardHeader className="flex justify-between items-start">
        <div>
          <CardTitle className="flex gap-2">
            {project.name}
            {isOwner && (
            <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                Owner
            </Badge>
            )}
          </CardTitle>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
            {project.description || "No description provided"}
        </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
              <MoreHorizontal size={18} />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            {view === "active" ? (
              <>
                <DropdownMenuItem onClick={() => onInvite(project._id)}>
                  👥 Invite
                </DropdownMenuItem>

                {!isOwner && (
                  <DropdownMenuItem
                    onClick={() => onLeave(project._id)}
                    className="text-red-600"
                  >
                    🚪 Leave
                  </DropdownMenuItem>
                )}

                {isOwner && (
                  <DropdownMenuItem
                    onClick={() => onArchive(project._id)}
                    className="text-yellow-600 focus:bg-yellow-50 dark:focus:bg-yellow-900/20"
                  >
                    📦 Archive
                  </DropdownMenuItem>
                )}
              </>
            ) : (
              isOwner && (
                <DropdownMenuItem
                  onClick={() => onRestore(project._id)}
                  className="text-green-600"
                >
                  ♻️ Restore
                </DropdownMenuItem>
              )
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <CardContent>
        <div className="flex items-center text-xs text-gray-500 mb-3">
          <Clock size={12} className="mr-1" />
          Updated{" "}
          {formatDistanceToNow(new Date(project.updatedAt))} ago
        </div>

        {view === "active" && (
          <div className="mt-4 flex justify-between items-center">
            <Button size="sm" asChild>
                <Link to={`/dashboard/projects/${project._id}`}>
                Open Project
                </Link>
            </Button>

            <Button size="icon" variant="ghost" asChild>
                <Link to={`/dashboard/projects/${project._id}/analytics`}>
                📊
                </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProjectCard;
