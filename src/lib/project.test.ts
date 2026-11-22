import { expect, test } from "bun:test";

import { Schema } from "effect";

import { OpenedProject, toProjectError } from "./project";

test("decodes the payload the Rust backend returns", () => {
  const payload = {
    path: "C:/films/My Film.sym",
    project: {
      version: 1,
      id: "6f1a",
      name: "My Film",
      createdAt: 1_760_000_000_000,
      updatedAt: 1_760_000_000_000,
      sequences: [{ id: "s1", name: "Sequence 01" }],
    },
  };

  const opened = Schema.decodeUnknownSync(OpenedProject)(payload);

  expect(opened.project.name).toBe("My Film");
  expect(opened.project.sequences).toHaveLength(1);
});

test("rejects a payload missing the fields the UI reads", () => {
  const decode = Schema.decodeUnknownSync(OpenedProject);

  expect(() => decode({ path: "x", project: { name: "No version" } })).toThrow();
});

test("normalizes backend errors and anything else", () => {
  expect(toProjectError({ code: "already-exists", message: "taken" })).toMatchObject({
    code: "already-exists",
    message: "taken",
  });
  expect(toProjectError("boom")).toMatchObject({ code: "unexpected", message: "boom" });
});
