import { expect, test } from "bun:test";

import { createMemoryHistory, createRouter } from "@tanstack/react-router";

import { routeTree } from "./routeTree.gen";

test("index route is mounted at /", () => {
  const router = createRouter({ routeTree, history: createMemoryHistory() });
  expect(router.routesByPath["/"]?.id).toBe("/");
});
