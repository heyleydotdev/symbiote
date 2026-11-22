import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { useState } from "react";

import { NewProjectDialog } from "../components/new-project-dialog";
import { ProjectList } from "../components/project-list";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { useProjects } from "../hooks/use-projects";
import { runProject } from "../lib/app-runtime";
import { projectErrorMessage, type OpenedProject, type RecentProject } from "../lib/project";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const navigate = useNavigate();
  const { projects: loaded, error: loadError, reload } = useProjects();
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const goToProject = (opened: OpenedProject) => {
    navigate({
      to: "/project/$projectId",
      params: { projectId: opened.project.id },
      search: { path: opened.path },
    });
  };

  const openProject = async (path: string) => {
    setActionError(null);
    try {
      goToProject(await runProject((service) => service.open(path)));
    } catch (cause) {
      setActionError(projectErrorMessage(cause));
    }
  };

  const pickProject = async () => {
    try {
      const picked = await openDialog({
        multiple: false,
        title: "Open project",
        filters: [{ name: "Symbiote project", extensions: ["sym"] }],
      });
      if (typeof picked === "string") {
        await openProject(picked);
      }
    } catch (cause) {
      setActionError(projectErrorMessage(cause));
    }
  };

  const forgetProject = (project: RecentProject) => {
    setActionError(null);
    runProject((service) => service.forget(project.path))
      .then(reload)
      .catch((cause: unknown) => setActionError(projectErrorMessage(cause)));
  };

  const needle = query.trim().toLowerCase();
  const projects = loaded ?? [];
  const loading = loaded === null;
  const visible =
    needle === ""
      ? projects
      : projects.filter((project) => project.name.toLowerCase().includes(needle));
  const error = actionError ?? loadError;

  return (
    <main className="flex h-screen overflow-hidden bg-background text-foreground">
      <aside className="flex w-72 shrink-0 flex-col border-e border-border bg-surface">
        <div className="p-3">
          <Input
            value={query}
            onValueChange={(value) => setQuery(value)}
            placeholder="Search projects"
            aria-label="Search projects"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {loading && <p className="px-2 py-1.5 text-xs text-muted">Loading…</p>}
          {!loading && visible.length === 0 && (
            <p className="px-2 py-1.5 text-xs text-muted">
              {projects.length === 0 ? "No projects yet." : "No projects match your search."}
            </p>
          )}
          {!loading && visible.length > 0 && (
            <ProjectList
              projects={visible}
              onOpen={(project) => void openProject(project.path)}
              onForget={forgetProject}
            />
          )}
        </div>

        {error !== null && (
          <p role="alert" className="border-t border-border px-3 py-2 text-xs text-danger">
            {error}
          </p>
        )}

        <div className="border-t border-border p-3">
          <Button variant="secondary" className="w-full" onClick={() => void pickProject()}>
            Open project…
          </Button>
        </div>
      </aside>

      <section className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">Symbiote</h1>
        <p className="max-w-sm text-sm text-muted">
          Cut, edit and grade your footage. Create a project to get started, or open one from the
          list.
        </p>
        <Button className="mt-2" onClick={() => setCreating(true)}>
          New project
        </Button>
      </section>

      <NewProjectDialog open={creating} onOpenChange={setCreating} onCreated={goToProject} />
    </main>
  );
}
