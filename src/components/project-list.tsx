import { cn } from "cn";

import { formatRelativeTime } from "../lib/format-time";
import type { RecentProject } from "../lib/project";
import { Button } from "./ui/button";

interface ProjectListProps {
  projects: ReadonlyArray<RecentProject>;
  onOpen: (project: RecentProject) => void;
  onForget: (project: RecentProject) => void;
}

export function ProjectList({ projects, onOpen, onForget }: ProjectListProps) {
  return (
    <ul className="flex flex-col gap-0.5">
      {projects.map((project) => (
        <li
          key={project.path}
          className="group flex items-center gap-1 rounded-md hover:bg-foreground/5"
        >
          <button
            type="button"
            disabled={project.missing}
            title={project.path}
            onClick={() => onOpen(project)}
            className="flex min-w-0 flex-1 flex-col items-start rounded-md px-2 py-1.5 text-start outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed"
          >
            <span className="w-full truncate text-sm">{project.name}</span>
            <span className={cn("text-xs text-muted", project.missing && "text-danger")}>
              {project.missing ? "Missing file" : formatRelativeTime(project.openedAt)}
            </span>
          </button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Remove ${project.name} from the list`}
            onClick={() => onForget(project)}
            className="me-1 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
          >
            ×
          </Button>
        </li>
      ))}
    </ul>
  );
}
