import { describe, expect, test } from "bun:test";

import { Effect } from "effect";

import { ProjectService } from "./project-service";

const run = <A, E>(effect: Effect.Effect<A, E, ProjectService>) =>
  Effect.runPromise(effect.pipe(Effect.provide(ProjectService.layerMemory)));

describe("ProjectService (in-memory layer)", () => {
  test("lists a created project, newest first", async () => {
    const entries = await run(
      Effect.gen(function* () {
        const service = yield* ProjectService;
        yield* service.create({ name: "  First  ", id: "id-1", directory: "/films" });
        yield* service.create({ name: "Second", id: "id-2", directory: "/films" });
        return yield* service.list();
      }),
    );

    expect(entries.map((entry) => entry.name)).toEqual(["Second", "First"]);
    expect(entries.every((entry) => entry.missing === false)).toBe(true);
  });

  test("refuses a second project with the same name in the same folder", async () => {
    const error = await run(
      Effect.gen(function* () {
        const service = yield* ProjectService;
        yield* service.create({ name: "Film", id: "id-1", directory: "/films" });
        return yield* service.create({ name: "Film", id: "id-2", directory: "/films" });
      }).pipe(Effect.flip),
    );

    expect(error.code).toBe("already-exists");
  });

  test("forgetting a project removes the row and keeps the file openable", async () => {
    const { remaining, reopened } = await run(
      Effect.gen(function* () {
        const service = yield* ProjectService;
        const opened = yield* service.create({ name: "Film", id: "id-1", directory: "/films" });
        yield* service.forget(opened.path);
        return {
          remaining: yield* service.list(),
          reopened: yield* service.open(opened.path),
        };
      }),
    );

    expect(remaining).toEqual([]);
    expect(reopened.project.name).toBe("Film");
  });
});
