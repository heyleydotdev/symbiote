import { invoke } from "@tauri-apps/api/core";
import { Context, Effect, Layer, Schema } from "effect";

import {
  OpenedProject,
  PROJECT_VERSION,
  Project,
  ProjectError,
  RecentProject,
  projectError,
  toProjectError,
} from "./project";

export interface CreateProjectInput {
  readonly name: string;
  readonly id: string;
  readonly directory: string;
}

const unexpectedResponse = (command: string) =>
  projectError("unexpected", `The backend returned an unexpected response to ${command}`);

/** One Tauri command: invoke it, then decode the payload before anyone uses it. */
const call = <A>(
  command: string,
  args: Record<string, unknown>,
  schema: Schema.Codec<A, unknown>,
) =>
  Effect.tryPromise({
    try: () => invoke<unknown>(command, args),
    catch: toProjectError,
  }).pipe(
    Effect.flatMap((payload) =>
      Schema.decodeUnknownEffect(schema)(payload).pipe(
        Effect.mapError(() => unexpectedResponse(command)),
      ),
    ),
    Effect.tapError((error) =>
      Effect.logError("project command failed").pipe(
        Effect.annotateLogs({ command, code: error.code, message: error.message }),
      ),
    ),
    Effect.withSpan(`ProjectService.${command}`),
  );

export class ProjectService extends Context.Service<
  ProjectService,
  {
    list(): Effect.Effect<ReadonlyArray<RecentProject>, ProjectError>;
    defaultDir(): Effect.Effect<string, ProjectError>;
    create(input: CreateProjectInput): Effect.Effect<OpenedProject, ProjectError>;
    open(path: string): Effect.Effect<OpenedProject, ProjectError>;
    forget(path: string): Effect.Effect<void, ProjectError>;
  }
>()("symbiote/ProjectService") {
  /** Talks to the Rust commands. Every payload is decoded before use. */
  static readonly layer = Layer.effect(
    ProjectService,
    Effect.gen(function* () {
      return ProjectService.of({
        list: () => call("list_projects", {}, Schema.Array(RecentProject)),
        defaultDir: () => call("default_project_dir", {}, Schema.String),
        create: (input) => call("create_project", { ...input }, OpenedProject),
        open: (path) => call("open_project", { path }, OpenedProject),
        forget: (path) => call("forget_project", { path }, Schema.Null).pipe(Effect.asVoid),
      });
    }),
  );

  /** In-memory backend used by tests. */
  static readonly layerMemory = Layer.effect(
    ProjectService,
    Effect.gen(function* () {
      const files = new Map<string, Project>();
      let recent: ReadonlyArray<{ path: string; project: Project }> = [];
      let lastDirectory = "/projects";

      const remember = (path: string, project: Project) => {
        recent = [{ path, project }, ...recent.filter((entry) => entry.path !== path)];
      };

      return ProjectService.of({
        list: () =>
          Effect.sync(() =>
            recent.map(
              (entry) =>
                new RecentProject({
                  path: entry.path,
                  name: entry.project.name,
                  openedAt: entry.project.updatedAt,
                  missing: false,
                }),
            ),
          ),
        defaultDir: () => Effect.succeed(lastDirectory),
        create: (input) =>
          Effect.gen(function* () {
            const name = input.name.trim();
            const path = `${input.directory}/${name}.sym`;
            if (files.has(path)) {
              return yield* projectError(
                "already-exists",
                `A project named ${name} already exists in this folder`,
              );
            }
            const now = Date.now();
            const project = new Project({
              version: PROJECT_VERSION,
              id: input.id,
              name,
              createdAt: now,
              updatedAt: now,
              sequences: [],
            });
            files.set(path, project);
            remember(path, project);
            lastDirectory = input.directory;
            return new OpenedProject({ path, project });
          }),
        open: (path) =>
          Effect.gen(function* () {
            const project = files.get(path);
            if (project === undefined) {
              return yield* projectError("not-found", `No project file at ${path}`);
            }
            remember(path, project);
            return new OpenedProject({ path, project });
          }),
        forget: (path) =>
          Effect.sync(() => {
            recent = recent.filter((entry) => entry.path !== path);
          }),
      });
    }),
  );
}
