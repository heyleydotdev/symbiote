import { useCallback, useEffect, useState } from "react";

import { runProject } from "../lib/app-runtime";
import { projectErrorMessage, type RecentProject } from "../lib/project";

/** `projects === null` means the list has not loaded yet. */
export function useProjects() {
  const [projects, setProjects] = useState<ReadonlyArray<RecentProject> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    runProject((service) => service.list())
      .then((loaded) => {
        setProjects(loaded);
        setError(null);
      })
      .catch((cause: unknown) => setError(projectErrorMessage(cause)));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { projects, error, reload };
}
