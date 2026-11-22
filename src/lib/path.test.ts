import { expect, test } from "bun:test";

import { joinPath } from "./path";

test("keeps the separator the folder already uses", () => {
  expect(joinPath("C:\\Projects", "Film.sym")).toBe("C:\\Projects\\Film.sym");
  expect(joinPath("/home/me/films", "Film.sym")).toBe("/home/me/films/Film.sym");
});

test("does not double a trailing separator", () => {
  expect(joinPath("C:\\Projects\\", "Film.sym")).toBe("C:\\Projects\\Film.sym");
  expect(joinPath("/home/me/films/", "Film.sym")).toBe("/home/me/films/Film.sym");
});
