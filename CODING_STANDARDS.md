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
interface ButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
}

export function Button({ children, onClick, disabled = false, variant = "primary" }: ButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled} className={`btn btn-${variant}`}>
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
├── globals.css         # Tailwind CSS entry
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
