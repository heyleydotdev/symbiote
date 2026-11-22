import { Option, Schema } from "effect";

/** A project file exactly as the Rust backend writes it to disk. */
export class Sequence extends Schema.Class<Sequence>("symbiote/Sequence")({
  id: Schema.String,
  name: Schema.String,
}) {}

export class Project extends Schema.Class<Project>("symbiote/Project")({
  version: Schema.Int,
  id: Schema.String,
  name: Schema.String,
  createdAt: Schema.Int,
  updatedAt: Schema.Int,
  sequences: Schema.Array(Sequence),
}) {}

/** A row in the projects list. `missing` means the file is gone from disk. */
export class RecentProject extends Schema.Class<RecentProject>("symbiote/RecentProject")({
  path: Schema.String,
  name: Schema.String,
  openedAt: Schema.Int,
  missing: Schema.Boolean,
}) {}

export class OpenedProject extends Schema.Class<OpenedProject>("symbiote/OpenedProject")({
  path: Schema.String,
  project: Project,
}) {}

export const ProjectErrorCodes = [
  "invalid-name",
  "invalid-path",
  "already-exists",
  "not-found",
  "unreadable",
  "io",
  "unexpected",
] as const;

export type ProjectErrorCode = (typeof ProjectErrorCodes)[number];

/** Bumped when the file shape changes; reading any other version is refused. */
export const PROJECT_VERSION = 1;

export class ProjectError extends Schema.TaggedError<ProjectError>()("ProjectError", {
  code: Schema.Literals(ProjectErrorCodes),
  message: Schema.String,
}) {}

export function projectError(code: ProjectErrorCode, message: string): ProjectError {
  return new ProjectError({ code, message });
}

const ErrorPayload = Schema.Struct({
  code: Schema.Literals(ProjectErrorCodes),
  message: Schema.String,
});

/** Backend errors arrive as plain objects; anything else is a bug or a crash. */
export function toProjectError(cause: unknown): ProjectError {
  if (cause instanceof ProjectError) {
    return cause;
  }
  const payload = Schema.decodeUnknownOption(ErrorPayload)(cause);
  return Option.isSome(payload)
    ? new ProjectError(payload.value)
    : new ProjectError({ code: "unexpected", message: String(cause) });
}

export function projectErrorMessage(cause: unknown): string {
  return toProjectError(cause).message;
}
