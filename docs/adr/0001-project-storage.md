# One JSON file per project, listed by path

A Project File is one JSON file the user saves wherever they choose, written atomically (temp file, then rename). The Projects Page list is an index of paths in app data (`state.json`), not a folder scan. We picked this over an app-owned projects folder because a video project has to live next to its footage, and over a SQLite project registry because a project file is portable, inspectable and recoverable from a backup, while the index is disposable: losing it costs the list, never a project.

## Considered Options

- **Scan one app-owned folder**: the least code and no index to desync, but the user cannot keep a project beside its media.
- **SQLite registry as the source of truth**: queryable, but the project then exists only inside app data, and every save becomes database work before there is an editor to save from.
- **Folder bundle per project** (project file + render cache + autosaves): right once caches and autosaves exist; pointless without them.

## Consequences

- `state.json` can disagree with disk. A Missing row is shown rather than silently dropped, and `Open project…` is the recovery path.
- Every write goes through the atomic writer. Truncate-and-write can leave a corrupt project file after a crash, and there is no autosave to fall back on.
