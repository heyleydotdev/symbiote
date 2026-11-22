# Coding Standards

Baseline conventions for this repo: React + TypeScript frontend, Rust/Tauri backend.

## Code Quality Principles

### 1. Readability First

- Code is read more than written.
- Clear variable and function names; self-documenting code over comments.
- Formatting is handled by oxfmt — do not hand-format.

### 2. KISS (Keep It Simple, Stupid)

- Simplest solution that works.
- No over-engineering, no premature optimization.
- Easy to understand > clever code.

### 3. DRY (Don't Repeat Yourself)

- Extract shared logic into functions or components.
- Avoid copy-paste programming.

### 4. YAGNI (You Aren't Gonna Need It)

- Don't build features before they're needed.
- Add complexity only when required.

## TypeScript / JavaScript

### Variable Naming

```typescript
// GOOD: descriptive
const searchQuery = "election";
const isUserAuthenticated = true;
const totalRevenue = 1000;

// BAD: unclear
const q = "election";
const flag = true;
const x = 1000;
```

### Function Naming

```typescript
// GOOD: verb-noun
async function fetchProjectData(projectId: string) {}
function calculateSimilarity(a: number[], b: number[]): number {}
function isValidEmail(email: string): boolean {}

// BAD: unclear or noun-only
async function project(id: string) {}
function similarity(a, b) {}
function email(e) {}
```

### Immutability

```typescript
// GOOD: create new values
const updatedProject = { ...project, name: "New Name" };
const updatedItems = [...items, newItem];

// BAD: mutate in place
project.name = "New Name";
items.push(newItem);
```

### Error Handling

```typescript
// GOOD: check and rethrow with context
async function fetchData(url: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Fetch failed:", error);
    throw new Error("Failed to fetch data");
  }
}

// BAD: no error handling
async function fetchData(url: string) {
  return (await fetch(url)).json();
}
```

### Async/Await

```typescript
// GOOD: parallel when independent
const [projects, settings, stats] = await Promise.all([
  fetchProjects(),
  fetchSettings(),
  fetchStats(),
]);

// BAD: sequential when unnecessary
const projects = await fetchProjects();
const settings = await fetchSettings();
const stats = await fetchStats();
```

### Type Safety

```typescript
// GOOD
interface Project {
  id: string;
  name: string;
  status: "active" | "archived";
}

function getProject(id: string): Promise<Project> {}

// BAD
function getProject(id: any): Promise<any> {}
```

### No `any`

`any` switches off type checking for everything it touches. It is a way to cheat the type system, not a type. Do not use it.

- Use a precise type, a generic, or `unknown` with narrowing.
- Do not paper over a mismatch with `as any`.
- If an untyped third-party boundary truly requires it, confine `any` to one line, narrow immediately, and add an `oxlint-disable` comment with the reason.

```typescript
// BAD
function parse(input: any): any {}
const data = response as any;

// GOOD: precise type
function parse(input: string): Project {}

// GOOD: generic when the caller decides the type
function first<T>(items: T[]): T | undefined {
  return items[0];
}

// GOOD: unknown plus a type guard when the shape is genuinely unknown
function isProject(value: unknown): value is Project {
  return typeof value === "object" && value !== null && "id" in value;
}

// Acceptable only at an untyped boundary:
// oxlint-disable-next-line typescript/no-explicit-any -- SDK ships no types
const sdk = untypedSdk as any;
```

## React

### Component Structure

```tsx
// GOOD: typed, explicit props
import { cva } from "class-variance-authority";

interface ButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
}

const buttonVariants = cva("rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50", {
  variants: {
    variant: {
      primary: "bg-primary text-primary-foreground hover:bg-primary/90",
      secondary: "border border-border hover:bg-foreground/5",
    },
  },
  defaultVariants: { variant: "primary" },
});

export function Button({ children, onClick, disabled = false, variant }: ButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={buttonVariants({ variant })}
    >
      {children}
    </button>
  );
}

// BAD: untyped, implicit structure
export function Button(props) {
  return <button onClick={props.onClick}>{props.children}</button>;
}
```

### Custom Hooks

```typescript
// GOOD: reusable, typed hook
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}
```

### State Updates

```typescript
// GOOD: functional update when derived from previous state
setCount((prev) => prev + 1);

// BAD: can be stale in async scenarios
setCount(count + 1);
```

### Conditional Rendering

```tsx
// GOOD
{
  isLoading && <Spinner />;
}
{
  error && <ErrorMessage error={error} />;
}
{
  data && <DataDisplay data={data} />;
}

// BAD: ternary hell
{
  isLoading ? (
    <Spinner />
  ) : error ? (
    <ErrorMessage error={error} />
  ) : data ? (
    <DataDisplay data={data} />
  ) : null;
}
```

## CSS & Tailwind

Tailwind v4, configured entirely in `src/globals.css`. There is no `tailwind.config.js`; theme, variants and utilities are declared in CSS.

### No component classes

Do not write `.btn`, `.btn-primary`, `.card`, or any other component class — not in `@layer components`, not in `@apply`, not in `globals.css`.

- Style components with utilities at the JSX call site. Variants are declared with `cva`, never a class name.
- Merge classes with `cn` from the `cn` package (a drop-in replacement for `clsx` + `tailwind-merge`, built for Tailwind v4). Do not hand-concatenate class strings: `cn` lets a caller's `className` win on conflicts.
- Base-element defaults (body font, selection color, scrollbar) belong in `@layer base`.
- A reusable single-purpose utility that no utility combination covers goes in `@utility`. That is for behavior, not for a component's look.

```tsx
// BAD: a class per component/variant
<button className={`btn btn-${variant}`} />;

// GOOD: cva for variants, cn to merge caller overrides
import { cva } from "class-variance-authority";
import { cn } from "cn";

const buttonVariants = cva("rounded-md px-3 py-1.5 text-sm", {
  variants: {
    variant: {
      primary: "bg-primary text-primary-foreground hover:bg-primary/90",
      secondary: "border border-border hover:bg-foreground/5",
    },
  },
  defaultVariants: { variant: "primary" },
});

<button className={cn(buttonVariants({ variant }), className)} />;
```

Use `cva` only when a component has variants, sizes, or compound cases; a component without variants just takes `cn(className)`. Type variants with `VariantProps<typeof buttonVariants>` instead of re-declaring the union.

### Repeated colors become theme tokens

A color used for the same purpose in more than one place must live in `src/globals.css`: a raw variable in `:root` (with its `.dark` value) exposed to Tailwind as `--color-*` through `@theme inline`.

```css
/* src/globals.css */
@import "tailwindcss";

/* Token map first: every --color-* points at a raw value below. */
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-border: var(--border);
}

:root {
  --background: oklch(0.99 0 0);
  --foreground: oklch(0.24 0.01 260);
  --primary: oklch(0.55 0.19 260);
  --primary-foreground: oklch(0.99 0 0);
  --border: --alpha(var(--color-white) / 5%);
}

.dark {
  --background: oklch(0.2 0.01 260);
  --foreground: oklch(0.95 0.01 260);
  --border: --alpha(var(--color-white) / 10%);
}
```

```tsx
// BAD: the same meaning spelled several ways
<div className="bg-[#1c1c1f] text-[#f5f5f5]" />
<div className="bg-zinc-900 text-zinc-100" />

// GOOD: one token per purpose
<div className="bg-background text-foreground border-border" />
```

- Raw value in `:root`, Tailwind token in `@theme inline` — every color needs both lines, same name, `--foo` → `--color-foo`.
- `@theme inline` stays at the top of the file, so the token map reads first. Output is unaffected by position; `@theme` is hoisted into the theme layer.
- `inline` makes the utility compile to `var(--border)` instead of a second `--color-*` indirection, so `border-border` and hand-written `var(--border)` read the same variable.
- `--alpha()` is a Tailwind build-time function: `--alpha(var(--color-white) / 5%)` compiles to `color-mix(in oklab, … 5%, transparent)`. Use it for translucent tokens instead of hard-coding `rgb(… / 5%)`, and use theme colors (`--color-white`, `--color-black`) as its input.
- Name tokens by purpose, not by literal value: `--danger` / `--color-danger`, not `--color-red-500`.
- One-off values may stay inline. The second use of the same value for the same purpose is the trigger to extract it.
- Use `oklch()` for new colors, `/50` for opacity instead of `bg-opacity-*`, and `current`/`inherit` when the color comes from the parent.

### Repeated sizes become theme tokens

Same rule for every custom size, not just text: `text-[11px]`, `gap-[7px]`, `w-[3px]`, `max-w-[42rem]`, `rounded-[10px]`, `tracking-[0.02em]`, `leading-[1.15]`, `shadow-[0_1px_2px_#0003]`.

Tailwind v4 generates the utility from the theme key, so extract with the namespace that matches the utility and the class name keeps working:

```css
@theme {
  /* text-[11px] -> text-2xs, with its line height */
  --text-2xs: 0.6875rem;
  --text-2xs--line-height: 1rem;

  /* gap-[7px] -> gap-1-75, w-[3px] -> w-0-75 */
  --spacing-1-75: 0.4375rem;
  --spacing-0-75: 0.1875rem;

  /* rounded-[10px] -> rounded-panel */
  --radius-panel: 0.625rem;

  /* tracking-[0.02em] -> tracking-caps */
  --tracking-caps: 0.02em;
}
```

| Custom value              | Theme namespace                        | Utility              |
| ------------------------- | -------------------------------------- | -------------------- |
| `text-[11px]`             | `--text-*` (+ `--text-*--line-height`) | `text-2xs`           |
| `gap-[7px]`, `w-[3px]`    | `--spacing-*`                          | `gap-1-75`, `w-0-75` |
| `max-w-[42rem]`           | `--container-*`                        | `max-w-prose-wide`   |
| `rounded-[10px]`          | `--radius-*`                           | `rounded-panel`      |
| `tracking-[0.02em]`       | `--tracking-*`                         | `tracking-caps`      |
| `leading-[1.15]`          | `--leading-*`                          | `leading-compact`    |
| `shadow-[...]`            | `--shadow-*`                           | `shadow-card`        |
| `font-[Instrument_Serif]` | `--font-*`                             | `font-display`       |
| arbitrary `min-[900px]:`  | `--breakpoint-*`                       | `desktop:`           |

Sizes are static values, so they use plain `@theme`; `inline` is for color tokens that wrap a raw variable.

### Modern Tailwind v4 usage

- `@import "tailwindcss"` appears once, in `src/globals.css`, before any other rule. Never import component CSS files.
- Prefer `size-4` over `w-4 h-4`, `inset-0`/`inset-x-0` over `top-0 left-0 right-0`, and logical properties (`ms-*`, `pe-*`, `ps-*`, `border-s`) so the layout survives RTL.
- Use `gap-*` on the flex/grid parent instead of margins between children.
- Use `*:` and `**:` for child styling, `not-*` for exclusions, `nth-*`, `starting:`, `has-*`, and container queries (`@container` + `@md:`) before adding JS or custom CSS.
- Any interactive element keeps a visible `focus-visible` ring; use `outline-hidden` when replacing the default outline, not `outline-none`.
- No `!important` and no `!` prefix. Fix the structure or the specificity instead.
- Dark mode uses a `.dark` class plus `@custom-variant dark (&:where(.dark, .dark *));` if `prefers-color-scheme` is not enough.

## Tauri Boundary

- Rust commands return `Result<T, E>` where `E: Serialize`; never panic across the boundary.
- Validate inputs in Rust before filesystem, network, or process work.
- Keep commands thin; put logic in plain functions that can be unit-tested.
- Type the `invoke` result on the frontend and handle rejection.

```rust
// src-tauri/src/lib.rs
#[tauri::command]
fn greet(name: &str) -> Result<String, String> {
    if name.trim().is_empty() {
        return Err("name must not be empty".into());
    }
    Ok(format!("Hello, {name}!"))
}
```

```typescript
// src/lib/greet.ts
import { invoke } from "@tauri-apps/api/core";

export async function greet(name: string): Promise<string> {
  return invoke<string>("greet", { name });
}
```

## File Organization

```
src/
├── routes/             # file-based routes (TanStack Router)
├── components/         # reusable UI
├── hooks/              # custom React hooks
├── lib/                # utilities and typed Tauri wrappers
├── globals.css         # Tailwind entry, design tokens, dark mode
└── routeTree.gen.ts    # generated by router plugin; do not edit
src-tauri/src/          # Rust backend and #[tauri::command]s
```

### File Naming

All frontend files use kebab-case. Component names stay PascalCase inside the file.

```
routes/__root.tsx           # router conventions are exceptions (__root, index)
components/button.tsx       # exports Button
components/project-card.tsx # exports ProjectCard
globals.css                 # Tailwind entry
hooks/use-auth.ts           # exports useAuth
lib/format-date.ts          # exports formatDate
lib/greet.ts                # typed wrapper per command
router.test.ts              # Bun test colocated with source
```

- Use lowercase kebab-case: `user-profile.tsx`, not `UserProfile.tsx` or `userProfile.tsx`.
- One component per file; the file name should describe the default/named export in kebab-case.
- Generated files keep their generator's name and are not renamed: `routeTree.gen.ts`.

## Comments & Documentation

```typescript
// GOOD: explain why
// Exponential backoff avoids overwhelming the API during outages.
const delay = Math.min(1000 * 2 ** retryCount, 30000);

// BAD: restate the code
// Increment counter by 1
count++;
```

Public utilities and Tauri commands get a short doc comment with parameters and failure cases.

## Performance

```typescript
// GOOD: memoize expensive work; copy before sort
const sortedProjects = useMemo(() => [...projects].sort((a, b) => b.volume - a.volume), [projects]);

// GOOD: lazy-load heavy screens
const HeavyChart = lazy(() => import("./HeavyChart"));
```

## Testing

Tests use Bun's built-in runner (`bun test`) and live next to the code as `*.test.ts`.

```typescript
import { expect, test } from "bun:test";

test("returns 0 for orthogonal vectors", () => {
  // Arrange
  const a = [1, 0, 0];
  const b = [0, 1, 0];

  // Act
  const similarity = calculateCosineSimilarity(a, b);

  // Assert
  expect(similarity).toBe(0);
});
```

Naming: describe the behavior and the condition.

```typescript
test("returns an empty array when no projects match the query", () => {});
test("throws when the name is blank", () => {});
```

## Code Smells

### Long functions

Split by responsibility once a function no longer fits on one screen.

```typescript
// GOOD
function processProjectData() {
  const validated = validateData();
  const transformed = transformData(validated);
  return saveData(transformed);
}
```

### Deep nesting

Use early returns over nested conditionals.

```typescript
if (!user) return;
if (!user.isAdmin) return;
if (!project) return;
if (!project.isActive) return;
if (!hasPermission) return;
```

### Magic numbers

Name constants.

```typescript
const MAX_RETRIES = 3;
const DEBOUNCE_DELAY_MS = 500;

if (retryCount > MAX_RETRIES) {
}
setTimeout(callback, DEBOUNCE_DELAY_MS);
```

**Remember**: Code quality is not negotiable. Clear, maintainable code enables rapid development and confident refactoring.
