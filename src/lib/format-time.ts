// The app's copy is English, so the relative labels are too.
const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const UNITS: ReadonlyArray<readonly [Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 31_536_000_000],
  ["month", 2_592_000_000],
  ["week", 604_800_000],
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

/** "2 days ago" for a stored timestamp, so list rows need no clock formatting. */
export function formatRelativeTime(timestamp: number, now: number = Date.now()): string {
  const elapsed = timestamp - now;
  for (const [unit, milliseconds] of UNITS) {
    if (Math.abs(elapsed) >= milliseconds) {
      return relative.format(Math.round(elapsed / milliseconds), unit);
    }
  }
  return "just now";
}
