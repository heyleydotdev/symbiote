import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { useEffect, useState, type FormEvent } from "react";

import { runProject } from "../lib/app-runtime";
import { joinPath } from "../lib/path";
import { projectErrorMessage, type OpenedProject } from "../lib/project";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";

interface NewProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (project: OpenedProject) => void;
}

export function NewProjectDialog({ open, onOpenChange, onCreated }: NewProjectDialogProps) {
  const [name, setName] = useState("");
  const [directory, setDirectory] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    runProject((service) => service.defaultDir())
      .then(setDirectory)
      .catch((cause: unknown) => setError(projectErrorMessage(cause)));
  }, [open]);

  const changeOpen = (next: boolean) => {
    if (next) {
      setError(null);
    }
    onOpenChange(next);
  };

  const browse = async () => {
    try {
      const picked = await openDialog({
        directory: true,
        multiple: false,
        title: "Choose where to save projects",
        defaultPath: directory,
      });
      if (typeof picked === "string") {
        setDirectory(picked);
      }
    } catch (cause) {
      setError(projectErrorMessage(cause));
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      const opened = await runProject((service) =>
        service.create({ name, id: crypto.randomUUID(), directory }),
      );
      setName("");
      onCreated(opened);
    } catch (cause) {
      setError(projectErrorMessage(cause));
    } finally {
      setPending(false);
    }
  };

  const trimmedName = name.trim();
  const destination =
    directory === ""
      ? ""
      : trimmedName === ""
        ? directory
        : joinPath(directory, `${trimmedName}.sym`);

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div>
            <DialogTitle>New project</DialogTitle>
            <DialogDescription>
              Name the project and choose where its file is saved.
            </DialogDescription>
          </div>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted">Name</span>
            <Input
              autoFocus
              value={name}
              onValueChange={(value) => setName(value)}
              placeholder="Untitled project"
            />
          </label>

          <div className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted">Save to</span>
            <div className="flex items-center gap-2">
              <span
                title={destination}
                className="min-w-0 flex-1 truncate rounded-md border border-border bg-background px-2.5 py-2 text-xs"
              >
                {directory === "" ? "Loading…" : destination}
              </span>
              <Button type="button" variant="secondary" size="sm" onClick={browse}>
                Browse…
              </Button>
            </div>
          </div>

          {error !== null && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || trimmedName === "" || directory === ""}>
              Create project
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
