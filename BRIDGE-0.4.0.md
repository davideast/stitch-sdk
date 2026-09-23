# Stitch SDK 0.4.0 — The Non-Breaking Bridge

Stitch SDK 0.4.0 delivers all critical security fixes, runtime hardening, and architectural improvements from the V1 release train in a **100% backward-compatible release**.

Existing applications running on `0.3.x` can upgrade to `0.4.0` with **zero code modifications**.

---

## What 0.4.0 Delivers

### 🛡️ Critical Fixes & Security Hardening
1. **Path Traversal Protection (C1)**: Enforces path containment in `downloadAssets` and the proxy tool, preventing directory escape attacks via malicious screen IDs or titles.
2. **Composite Identity Keys**: Eliminates cross-project screen collisions in `EntityManager` using multi-segment reference keys (`Screen:projectId:screenId`).
3. **Deep Merging on Cache Hits**: Prevents partial refresh responses from wiping out nested entity properties.
4. **Idempotent Retries**: Automatic exponential backoff with full jitter on rate-limits (429) and server unavailable (503) for read operations (`get_*`, `list_*`), honoring `Retry-After`.
5. **Unified MCP Client Stack**: Direct use of `StitchToolClient` for proxy and tooling capture, eliminating SSE header bugs and race conditions.

---

## Backward-Compatible Ergonomics

To avoid breaking 0.x code, 0.4.0 introduces smart compatibility bridges:

### 1. Multi-Screen Generation (`Generation` extends `Screen`)
Stitch returns multiple screens per generation. 0.4.0 captures **all screens** across all output components without breaking single-screen callers:
```ts
// Existing 0.x code continues to work (Generation duck-types Screen):
const screen = await project.generate("Login screen");
console.log(screen.id);
const url = await screen.getHtml(); // returns URL

// New 0.4.0 code can access all screens:
const generation = await project.generate("Login screen");
console.log(generation.screens); // Screen[]
console.log(generation.first);   // Screen
for (const s of generation) { ... }
```

### 2. Additive Content vs. URL Methods
To prevent breaking code that expects signed URLs:
```ts
// Existing methods continue returning URLs:
const htmlUrl = await screen.getHtml();  // URL (marked @deprecated)
const pngUrl  = await screen.getImage(); // URL (marked @deprecated)

// Explicit URL accessors:
const htmlUrl = await screen.getHtmlUrl();
const pngUrl  = await screen.getImageUrl();

// New content fetchers:
const htmlText = await screen.readHtml();  // Fetches string
const pngBytes = await screen.readImage(); // Fetches Uint8Array
```

### 3. Polymorphic Method Arguments
Methods accept either legacy positional arguments or trailing options objects:
```ts
// Positional (0.x style):
await project.generate("Login", "MOBILE");
await stitch.createProject("My App");

// Options object (future-proof style):
await project.generate("Login", { deviceType: "MOBILE" });
await stitch.createProject({ title: "My App" });
```

### 4. Hydrated Public Constructors
`new Project(client, "id")` remains public and properly hydrates entity state, with `@deprecated Use stitch.project(id)` guidance.

### 5. Root Catalog Re-Exports
`toolDefinitions` and `toolMap` remain exported from `@google/stitch-sdk` with `@deprecated Import from "@google/stitch-sdk/tools"`. Bundle size stays small thanks to `"sideEffects": false`.

### 6. Permissive Entity Data Typing
`entity.data` is typed with permissive index signatures (`[key: string]: any;`), providing autocomplete for modeled properties without breaking arbitrary property access with `unknown`.
