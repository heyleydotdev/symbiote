# Agent Instructions

Tauri 2 + SvelteKit 5 (SPA) + TypeScript desktop app for movie dubbing. UI is early: ui-sdk-based primitives live in `src/lib/components/ui/`; most product spec lives in the local-only `PLAN.md`.

## Package Manager

- Use **bun** (`bun.lock`, `packageManager: bun@1.4.4`). CI installs with `bun install --frozen-lockfile`.

## Commands

| Task                                  | Command                                            |
| ------------------------------------- | -------------------------------------------------- |
| Dev server (port 1420, strict)        | `bun run dev`                                      |
| Full desktop app (starts Vite itself) | `bun run tauri dev`                                |
| Lint / autofix                        | `bun run lint` / `bun run lint:fix`                |
| Format / verify format                | `bun run format` / `bun run format:check`          |
| Typecheck Svelte + TS                 | `bun run check`                                    |
| Single lint target                    | `bunx oxlint src/routes/<file>.svelte`             |
| Rust compile check                    | `cargo check --manifest-path src-tauri/Cargo.toml` |
| Tests (none yet)                      | `bun test`                                         |

CI (`.github/workflows/ci.yml`, `master` branch) runs `bun run lint` then `bun run check`. Rust is not covered by CI.

## Conventions

- Svelte 5 runes only (`$props`, `$state`, `$derived`); no Svelte 4 stores/exports syntax.
- File names use kebab-case (`card-header.svelte`); SvelteKit reserved route files (`+page.svelte`, `+layout.svelte`) are the only exception.
- SPA only: `adapter-static`, `ssr = false` in `src/routes/+layout.ts`. No `+page.server.ts`, server routes, or Node APIs in app code.
- Dark mode only. Neutral range is 300–900; use the semantic tokens in the `@theme` block of `src/app.css` (`bg-background`, `text-foreground`, `text-muted-foreground`, `bg-muted`, `border-border`, `border-border-strong`, `outline-ring`) instead of raw neutral classes. Use `font-sinhala` or `:lang(si)` for Sinhala text.
- `oxfmt` sorts imports and Tailwind classes (reads `src/app.css`); run `bun run format` instead of hand-ordering.
- Component variants use `class-variance-authority`; `src/lib/components/ui/` holds primitives that wrap ui-sdk parts and merge `class` with `cn` from the `cn` package. No `.btn`-style CSS component classes.
- Rust (`src-tauri/`) owns file I/O, dialogs, media, sidecars; the frontend owns project schema/editing/TTS orchestration and treats project JSON as its own (`serde_json` opaque passthrough).
- Tauri config expects the frontend build in `build/` (`bun run build` via `beforeBuildCommand`); don't change `devUrl` port 1420 without updating Vite + `tauri.conf.json`.

## UI (ui-sdk)

- Before using `@ui-sdk/svelte`, follow the `ui-sdk` skill if it is installed, and read `node_modules/@ui-sdk/svelte/docs/llms.txt`.
- To build a new component, also search `node_modules/@ui-sdk/svelte/docs/core.md` by heading, and read `node_modules/@ui-sdk/svelte/docs/rendering.md` next to it.
- Import parts from their per-component entry (`@ui-sdk/svelte/input`, `@ui-sdk/svelte/button`), never the package root or `@ui-sdk/core/internal/*`.
- Keep `@layer ui-sdk;` first in `src/app.css`; ui-sdk ships its CSS in that layer.

## Agents & Models (opencode.jsonc)

- `build` (default) and `plan` (read-only) use `opencode-go/deepseek-v4.1-flash`.
- `explore` and the hidden `title` agent use `ollama/qwen2.5-coder:7b`; Ollama must be running.
- Local subagents (ask for them by name): `commit` (git add/commit, no push, loads `caveman-commit`), `changelog` (read-only git history), `ask` (read-only file Q&A).
- Local-model commands: `/fixtures` and `/explain-log`.

## Notes

- `PLAN.md` is gitignored but present locally: authoritative roadmap, data model (`Project`/`Cue`/`Character`), target module layout, and testing plans.
- `models/` is gitignored: local Python TTS scripts and VITS checkpoints, never committed.
- `.svelte-kit/` and `src-tauri/target/` are generated; never edit.
