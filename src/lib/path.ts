/** Joins a folder and a file name with the separator the folder already uses. */
export function joinPath(directory: string, fileName: string): string {
  if (directory.endsWith("/") || directory.endsWith("\\")) {
    return `${directory}${fileName}`;
  }
  return `${directory}${directory.includes("\\") ? "\\" : "/"}${fileName}`;
}
