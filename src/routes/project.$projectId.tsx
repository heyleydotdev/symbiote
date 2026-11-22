import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { runProject } from "../lib/app-runtime";
import { projectErrorMessage, type OpenedProject } from "../lib/project";

interface ProjectSearch {
  path: string;
}

export const Route = createFileRoute("/project/$projectId")({
  validateSearch: (search: Record<string, unknown>): ProjectSearch => ({
    path: typeof search.path === "string" ? search.path : "",
  }),
  component: ProjectPage,
});

function ProjectPage() {
  const { path } = Route.useSearch();
  const [opened, setOpened] = useState<OpenedProject | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const error = path === "" ? "No project was selected." : loadError;

  useEffect(() => {
    if (path === "") {
      return;
    }
    let active = true;
    runProject((service) => service.open(path))
      .then((result) => {
        if (active) {
          setOpened(result);
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setLoadError(projectErrorMessage(cause));
        }
      });
    return () => {
      active = false;
    };
  }, [path]);

  return (
    <main className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex items-center gap-3 border-b border-border px-3 py-2">
        <Link
          to="/"
          className="rounded-md px-2 py-1 text-sm text-muted outline-none hover:bg-foreground/5 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          ← Projects
        </Link>
        <span className="truncate text-sm font-medium">{opened?.project.name ?? ""}</span>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center gap-2 p-10 text-center">
        {error !== null && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        {error === null && opened !== null && (
          <>
            <h1 className="text-2xl font-semibold">{opened.project.name}</h1>
            <p className="max-w-sm text-sm text-muted">
              The editor for this project will live here.
            </p>
          </>
        )}
        {error === null && opened === null && (
          <p className="text-sm text-muted">Opening project…</p>
        )}
      </section>
    </main>
  );
}
