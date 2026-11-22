import { expect, test } from "bun:test";

import { formatRelativeTime } from "./format-time";

const NOW = Date.parse("2026-01-15T12:00:00Z");
const ago = (milliseconds: number) => NOW - milliseconds;

test("says just now for anything under a minute", () => {
  expect(formatRelativeTime(ago(5_000), NOW)).toBe("just now");
});

test("picks the largest whole unit", () => {
  expect(formatRelativeTime(ago(3_600_000), NOW)).toBe("1 hour ago");
  expect(formatRelativeTime(ago(2 * 86_400_000), NOW)).toBe("2 days ago");
  expect(formatRelativeTime(ago(40 * 86_400_000), NOW)).toBe("last month");
});
