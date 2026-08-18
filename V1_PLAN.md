# Stitch SDK 1.0 Implementation Plan

Status: DRAFT — derived from the pre-1.0 architecture assessment (2026-06-09).
Owner: davideast

Versioning strategy:

- **0.3.x patches** — Phase 0 regression fixes (non-breaking, ship immediately).
- **0.4.0** — Phase 1 + 2 (pipeline/runtime hardening; additive or internal).
- **1.0.0-rc.x** — Phase 3 breaking API batch behind a release candidate.
- **1.0.0** — after Phase 4 gates pass (coverage, e2e, publish-readiness, migration guide).

Rule for the whole plan: **every breaking change lands in Phase 3, in one batch, with one migration guide.** Phases 0–2 must remain consumable by current 0.3.x users.

---

## API decisions to lock before any code (Decision Record)

These are the choices everything downstream depends on. Decide once, write them at the top of the migration guide.

| #   | Decision                                                                             | Default recommendation                                                                                                                      |
| --- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | `project.generate()` / `screen.edit()` return shape                                  | `Generation` result object: `{ screens: Screen[], primary: Screen, raw }`                                                                   |
| D2  | `getHtml()` / `getImage()` semantics                                                 | Fetch content; add `getHtmlUrl()` / `getImageUrl()` for the URL                                                                             |
| D3  | Entity construction                                                                  | Constructors `protected`; `EntityManager.resolve` is the only path; factories stay                                                          |
| D4  | Entity `data` typing                                                                 | Generated per-entity interfaces; `data?: ScreenData` etc., no `any`                                                                         |
| D5  | Config/env contract                                                                  | One schema: `STITCH_API_KEY`, `STITCH_ACCESS_TOKEN`, `STITCH_BASE_URL`, `STITCH_PROJECT_ID` (alias `GOOGLE_CLOUD_PROJECT` kept, documented) |
| D6  | Retry policy                                                                         | Built-in exponential backoff for `RATE_LIMITED` (configurable, max 3, jitter)                                                               |
| D7  | AI SDK coupling                                                                      | `ai` becomes optional peer dep; use `dynamicTool()`/`jsonSchema()`; delete symbol forgery                                                   |
| D8  | ADK coupling                                                                         | `@google/adk` optional peer dep with clear install error                                                                                    |
| D9  | MCP stack                                                                            | Single stack: proxy + capture run through `StitchToolClient` (real MCP SDK)                                                                 |
| D10 | IR dead features (`ProjectionStep.fallback`, `ArgParam.default`, `FieldMappingSpec`) | Implement `default`; delete `fallback` + `FieldMappingSpec`; IR schema goes strict                                                          |

---

## Phase 0 — Stop the bleeding (0.3.x patches, ship this week)

Regression fixes for bugs live on `main` today. No API changes. Each item ships with the test that would have caught it.

### 0.1 EntityManager identity-map correctness — `packages/sdk/src/entity-manager.ts`

- [ ] Cache key = `ClassName` + **all** reference key values joined (`Screen:p1:abc`), not just the last segment. Fixes verified cross-project collision.
- [ ] Replace `EntityClass.name` with a generated `static entityKey` on each class (minification-safe). Codegen change in `scripts/generate-sdk.ts` class emission.
- [ ] Remove the `"unknown"` fallback key: if no identity can be derived, **return an uncached instance** (never alias unrelated entities). Log a debug warning.
- [ ] Tests: cross-project same-ID resolves to distinct instances; merge-on-hit semantics pinned; no-identity data does not enter cache; `dispose()`/`clear()` invoke hooks.

### 0.2 Direct-construction regression (#358 fallout)

- [ ] `packages/sdk/src/upload-handler.ts:128-137` — route through `client.entities.resolve(Screen, ["projectId","screenId"], screenData)` instead of `new Screen(...)`.
- [ ] `packages/sdk/src/proxy/virtual-tools.ts:20-22` — same for `Project`.
- [ ] Interim (until Phase 3 makes constructors protected): restore ID hydration in generated constructors for string + `data.name` inputs so the public `new Project(client, id)` pattern works again. Codegen change + regenerate.
- [ ] Fix `virtual-tools.ts` dummyClient: `callTool` must return the **parsed** payload (reuse `parseToolResponse`), and propagate `isError` as a thrown `StitchError` instead of silent success.
- [ ] Tests: un-mock the seams. `upload.test.ts` asserts returned screens have working `screenId`/`id` and that `screen.edit()` sends correct args against a fake spec client. `proxy.test.ts` exercises the real `downloadAssets` path with a stubbed transport, not a mocked method.

### 0.3 Lock & drift system actually works

- [ ] `scripts/generate-sdk.ts:74` + `scripts/validate-generated.ts:46` — hash paths **relative to `GENERATED_DIR`**, posix-normalized.
- [ ] Remove `Generated: <timestamp>` from emitted headers (keep source hashes). Output becomes byte-reproducible.
- [ ] Stamp `generatedAt` only in the lock file, not in hashed content.
- [ ] Regenerate + recommit lock so `validate:generated` passes on a clean checkout (currently fails — #359 drift).
- [ ] `.github/workflows/ci.yml` — add `validate:generated` and `test:scripts` jobs. CI must fail on drift and on codegen/IR contract test failures.
- [ ] `scripts/capture-tools.ts` — fail loudly (don't silently reset) on corrupt lock; write manifest + lock atomically (write temp, rename both).

### 0.4 Packaging breakage

- [ ] `@google/adk` → `peerDependencies` (+ `peerDependenciesMeta.optional: true`); wrap import in a try/catch with actionable error ("install @google/adk to use @google/stitch-sdk/adk").
- [ ] `ai` → optional peer (types only today, but the `.d.ts` references it).
- [ ] Root `package.json`: delete or implement the four phantom scripts (`version:sync`, `pack:local`, `deploy:release`, `validate:release`). Decide: implement `sync-versions.ts` (root↔packages/sdk version lockstep) and delete the rest until Phase 4.
- [ ] `packages/sdk/package.json` exports: `"types"` condition **first** in every export entry. Add `publint` to publish-readiness.

### 0.5 Download/upload handler correctness — `packages/sdk/src/download-handler.ts`

- [ ] `runWithConcurrency` rewrite: collect per-task results/errors (`Promise.allSettled` semantics with a worker-pool), never lose rejections, never abort sibling tasks. Return `{ succeeded, failed }`; `execute()` reports partial failure honestly (`success: false` + per-asset errors).
- [ ] Add `r.ok` check on screen HTML fetch (line 112) — same treatment as screenshots/assets.
- [ ] `unlink` temp files on every failure path (wrap write+rename in try/finally).
- [ ] Delete the "let's just check NOT_FOUND" comment block; classification via the central error mapper (Phase 2.2) — interim: map 401→`AUTH_FAILED`, 403→`PERMISSION_DENIED`.
- [ ] Sanitize `ext` like the rest of the filename; restrict asset downloads to https and (optionally) a host allowlist of known Stitch CDNs.

Exit criteria Phase 0: `bun run validate:generated` green on clean checkout in CI; new EntityManager + handler tests green; `npm pack` + consumer-import smoke green with peer-dep layout.

---

## Phase 1 — Codegen & IR hardening (0.4.0)

Goal: the pipeline becomes trustworthy — deterministic output, validation that matches emission, IR with no dead surface, skills that cannot drift.

### 1.1 Golden snapshot tests for codegen

- [ ] New `scripts/test/fixtures/`: a fixture manifest + fixture domain-map exercising every IR feature (each arg routing type, every projection shape, cache, factories, parentField, sideEffects).
- [ ] Snapshot test: run generation against fixtures, assert emitted TS **byte-for-byte** (`bun:test` snapshot). Any emitter change shows up as a reviewed diff.
- [ ] Replace the grep-style "tests" (`constructor-visibility`, `ghost-method-guard`, etc.) with assertions over the snapshot fixtures or ts-morph AST queries — not formatting-sensitive substring checks.

### 1.2 Projection semantics: validation == emission

- [ ] `validateProjection` (`scripts/generate-sdk.ts:116-178`): **reject** stepping into an array property without `index`/`each`/`find` (today it silently unwraps while emission emits `?.prop` → runtime `undefined`).
- [ ] Validate the dot-path inside `find` against the array item schema.
- [ ] Add the IR lint from the assessment: **warn when `index: 0` or `find` is applied to an unbounded array** in `outputSchema` — the exact pattern behind the `generate()` truncation bug. Warning lists the binding and suggests `each`/`array: true`.
- [ ] `emitCacheProjection`: support `index`, reject `each`/`find` in cache projections at validation time.

### 1.3 IR cleanup (D10) — `scripts/ir-schema.ts`

- [ ] All IR Zod objects → `.strict()`. Unknown keys (e.g. the documented-but-nonexistent `fieldMapping`) become hard errors instead of silent strips.
- [ ] Implement `ArgSpec.default`: emit `deviceType: deviceType ?? "DESKTOP"` (domain-map already declares it; today it's dead).
- [ ] Delete `ProjectionStep.fallback` and `FieldMappingSpec` (or implement — default: delete; nothing uses them).
- [ ] Validate required-before-optional parameter ordering per binding; fail codegen with a diagnostic.
- [ ] Validate `selfArray.field` / `self` fields exist in the class's `constructorParams`.

### 1.4 Param emission without string round-trip

- [ ] Replace `generate-sdk.ts:915-929` regex re-parse with direct ts-morph `addParameter` structures built from `(name, optional, tsType)` tuples. Kills the `Record<string, X>` / inline-object time bomb.
- [ ] Snapshot fixture includes a tool with a `Record` param and an inline object param to pin this.

### 1.5 Capture is raw; repair is a load-time concern

- [ ] `scripts/capture-tools.ts` / `proxy/client.ts:128`: write **unrepaired** schemas to `tools-manifest.json`; apply `repairToolSchemas` where schemas are consumed (Stage 3 load, runtime `listTools`).
- [ ] Manifest header documents "raw as served"; add a `repairs:` section to the lock recording which `$defs` were injected at generation time, so server-side fixes are visible as diffs.

### 1.6 Skills as generated contract

- [ ] New script `scripts/generate-skill-reference.ts`: emit the IR reference tables (class config fields, arg routing types, projection step fields, cache spec) into a marked section of `.agents/skills/stitch-sdk-domain-design/SKILL.md` from `ir-schema.ts` metadata (`.describe()` on every field).
- [ ] Remove `fieldMapping`/`idField` documentation (stale — schema never had them).
- [ ] CI check: regenerating the skill section produces no diff (same pattern as lock validation).
- [ ] Update `stitch-sdk-pipeline/SKILL.md` Stage 2/3 to mention the strict IR and the new lint.

Exit criteria Phase 1: snapshot suite green in CI; regenerating twice in a row produces zero diff; an IR file with `fieldMapping` fails validation with a clear error; the unbounded-array lint fires on the current `generate` binding (expected — fixed in Phase 3).

---

## Phase 2 — Runtime consolidation (0.4.0)

### 2.1 One MCP stack (D9)

- [ ] Rewrite `packages/sdk/src/proxy/client.ts` to use `StitchToolClient` (real MCP SDK transport) instead of hand-rolled JSON-RPC fetch. Deletes: `Date.now()` request IDs, missing SSE accept header, missing `Mcp-Session-Id`, un-awaited `notifications/initialized` race.
- [ ] `scripts/capture-tools.ts` switches to `StitchToolClient.listTools()` (raw request path already exists at `client.ts:261`).
- [ ] `proxy/virtual-tools.ts`: delete the dummyClient shim — virtual tools receive the real client (the seam where the C2 bug lived).
- [ ] `isVirtualTool` derives from the registered tool list; remote tool name collisions are detected and rejected at startup.

### 2.2 Central error mapper

- [ ] New `src/spec/error-mapping.ts`: single `classifyError({ status?, mcpText?, cause? }): StitchErrorCode`. Status codes take priority; substring matching only as MCP-text fallback, with word-boundary matching (no more "author" → AUTH_FAILED).
- [ ] Adopt in `client.ts` (`parseToolResponse`, `httpPost`), `upload-handler.ts`, `download-handler.ts`, `project-ext.ts`. Delete the three divergent copies.
- [ ] Remove dead codes from `spec/errors.ts`/`spec/download.ts` or wire them (`WRITE_FAILED` on fs errors; delete `PATH_TRAVERSAL_ATTEMPT` + its JSDoc). Map `UNSUPPORTED_FORMAT` → `VALIDATION_ERROR`.
- [ ] Table-driven unit tests: (status, body, expected code) matrix.

### 2.3 Retry/backoff (D6)

- [ ] `callTool` + `httpPost`: on `RATE_LIMITED` (and 503), exponential backoff with jitter, default 3 attempts, honor `Retry-After`. Config: `retry: { attempts, baseMs, maxMs } | false` in `StitchConfigSchema`.
- [ ] `recoverable` flag documented: "the SDK already retried; recoverable means _you_ may retry the operation."
- [ ] Tests with fake timers: backoff schedule, Retry-After honored, non-recoverable codes never retried.

### 2.4 Connection lifecycle

- [ ] `close()` is terminal: subsequent calls throw `StitchError("CLIENT_CLOSED")` (new code). Singleton invalidation relies on this.
- [ ] Reconnect path closes the previous transport before creating a new one; guard against `Client.connect` on an already-connected client (recreate the MCP `Client` per transport).
- [ ] `connectPromise` reset + `isConnected` transitions covered by tests (connect failure → retry works; concurrent `callTool` → single connect).

### 2.5 Unified config (D5)

- [ ] One `StitchConfigSchema` consumed by client, singleton, and proxy. Proxy-only fields move to a `proxy` sub-object.
- [ ] Env precedence documented and tested: explicit config > `STITCH_*` > legacy aliases (`GOOGLE_CLOUD_PROJECT`, `STITCH_MCP_URL`, `STITCH_HOST` — accepted with a deprecation warning, removed in 2.0).
- [ ] Align proxy auth validation with client (`accessToken` requires `projectId` in both, same error text); config validation errors say "Invalid configuration", not "Authentication failed."

### 2.6 Singleton hygiene — `packages/sdk/src/singleton.ts`

- [ ] Lazy proxy only instantiates the client on **method invocation**, not property access; implement `has`/`ownKeys` traps so introspection doesn't lie.
- [ ] `getOrCreateClient` accepts the full config (incl. `accessToken`); cache key derived from the resolved config, and a bare call re-resolves env (fixes stale-key reuse).
- [ ] Export `resetStitchSingleton()` for tests (replaces `vi.resetModules()` gymnastics).

Exit criteria Phase 2: proxy e2e (`run-proxy` example) green against live server through the unified stack; error-mapping matrix green; retry tests green; only one config schema exists in `src/spec/`.

---

## Phase 3 — The breaking API batch (1.0.0-rc)

Everything user-visible breaks here, together, once.

### 3.1 Generation results (D1) — fixes the known truncation bug

- [ ] IR: add `returns.kind: "generation"` (or `returns.wrapper: "Generation"`) producing a generated `Generation` class: `{ screens: Screen[], primary: Screen, raw: <TypedResponse> }`. `primary` = first screen; `screens` = `each`/`each` flatten across all `outputComponents`.
- [ ] `domain-map.json`: `Project.generate`, `Screen.edit` → generation returns (replaces `find` + `index: 0` truncation). `Screen.variants`, `DesignSystem.apply` migrate to the same shape for consistency (currently `Screen[]`).
- [ ] Surface `userFeedback` / progress fields from the response on `Generation.raw` (typed) — data the SDK currently discards.
- [ ] Unbounded-array lint (1.2) upgraded from warn → **error** for non-`each` projections over generative tools.
- [ ] Migration guide entry with before/after code.

### 3.2 Content vs URL methods (D2)

- [ ] `Screen.getHtmlUrl()` / `getImageUrl()` = today's behavior (cache-aware URL).
- [ ] `Screen.getHtml()` fetches the URL and returns HTML content (with `r.ok` check); `getImage()` returns `Uint8Array` (or `{ bytes, contentType }`).
- [ ] Fetched results write back to `this.data` so repeat calls don't refetch (pin with test).
- [ ] Missing URL → throw `NOT_FOUND` `StitchError`, not `return ""`. Kill the `|| ""` emission for non-string-guaranteed projections (`generateReturnExpression` in `generate-sdk.ts:564`).
- [ ] IR: `cache.writeBack: true` support so this is codegen-driven, not handwritten.

### 3.3 Entity construction sealed (D3)

- [ ] Generated constructors → `protected` (real visibility; delete the grep test). Public path: `stitch.project(id)`, `project.screen(id)` factories + method returns.
- [ ] Remove interim Phase 0.2 constructor hydration (no longer reachable).
- [ ] Bounded identity map: LRU (default ~500 entries) or `WeakRef`+`FinalizationRegistry`; `dispose`/`clear` documented. Config knob on client.

### 3.4 Typed data path (D4)

- [ ] Codegen Phase C: per-entity `ScreenData`/`ProjectData`/`DesignSystemData` interfaces derived from the union of `outputSchema` shapes that feed each class (the projection validator already knows the terminal schema node of every binding — reuse it).
- [ ] `data?: ScreenData` replaces `data: any`; `uploadDesignMd` returns typed `UploadDesignMdResponse`, not `Promise<any>`.
- [ ] `callTool<T>` stays generic but generated call sites are fully typed end-to-end; `(c: any)` lambdas in emitted projections become typed.

### 3.5 Export surface

- [ ] Re-export `types.generated` + `responses.generated` from `src/index.ts` (consumers can name `VariantOptions`, `DesignSystemInput`, `SelectedScreenInstance`, every `*Response`).
- [ ] Delete stale handwritten duplicates in `src/types.ts` (`DesignTheme`, `ScreenInstance`).
- [ ] Stop exporting internals: `repairToolSchemas`, `repairSchema`, `buildFifeSuffix` (delete `fife.ts` or fold into download-handler), `StitchProxyConfigSchema`.
- [ ] `smoke-test.ts` export-policy assertions updated to the 1.0 surface (allowlist, not piecemeal).

### 3.6 Adapter rewrites (D7, D8)

- [ ] `tools-adapter.ts`: import `dynamicTool`/`jsonSchema` from `ai` (optional peer); delete `Symbol.for("vercel.ai.schema")` forgery. `include:` filter validates names against `toolDefinitions` and **throws** on unknown names (both adapters).
- [ ] `adk-adapter.ts`: guarded dynamic import with actionable error; fix `cleanSchema` self-recursive `$def` cycle (emit `$ref` placeholder or depth-cap).

### 3.7 Misc breaking cleanups

- [ ] `protocolVersion` default bumped to current MCP spec rev.
- [ ] `StitchError` carries `status?: number` and `toolName?: string` structured fields.
- [ ] Method JSDoc: generated docs get real descriptions per method (`getHtml` no longer says "Retrieves the details of a specific screen").

Exit criteria Phase 3: `1.0.0-rc.0` published to a dist-tag; example suite (`packages/sdk/examples/*`) updated and runs green against rc; migration guide complete (`MIGRATION-1.0.md`).

---

## Phase 4 — Test, release engineering, and 1.0 gates

### 4.1 Test architecture

- [ ] Generated classes type `client` as `StitchToolClientSpec` (not concrete) → tests inject spec-conforming fakes; ban `vi.mock` of domain classes in unit tests (lint rule or review checklist).
- [ ] New suites: EntityManager (full matrix from 0.1), client lifecycle (2.4), retry (2.3), error mapping (2.2), generated-method behavior against fake client (generation results, cache write-back, factories).
- [ ] Kill private-state pokes (`client["isConnected"]`) — use the spec seam; replace `process.env` object swaps with `vi.stubEnv`.
- [ ] `vitest.config.ts`: coverage enabled; gate: ≥80% lines on `src/`, 100% on `entity-manager.ts` and `spec/error-mapping.ts`.
- [ ] Remove stray `console.log` from tests; live tests gate on **either** auth mode (API key or access token), consistent with e2e.

### 4.2 E2E hygiene

- [ ] e2e projects named `e2e-sdk-<runId>`; teardown step deletes them — if no delete tool exists, file the server request now (also a genuine SDK surface gap for 1.0) and interim: dedicated test account + documented manual sweep.
- [ ] e2e asserts the new contracts: `generate()` returns all screens of a multi-screen response (regression test for the original bug); `getHtml()` returns HTML, not a URL.
- [ ] `live.test.ts` and `e2e-test.ts` consolidated on one harness/env contract.

### 4.3 Release pipeline

- [ ] `scripts/publish-readiness.ts`: add `validate:generated`, `publint`, peer-dep install matrix (with/without `ai`/`@google/adk`); fix tarball cleanup on failure; Windows-safe exec (no `2>/dev/null` strings).
- [ ] Implement `scripts/sync-versions.ts`; release flow documented in `RELEASING.md` (capture → generate → validate → test → readiness → publish).
- [ ] CI matrix: bun + node LTS; jobs: typecheck, unit, scripts-test, build, smoke, validate:generated, publint. e2e nightly with key from secrets.
- [ ] Changesets (or equivalent) for changelog discipline from 1.0 onward; semver + deprecation policy documented (legacy env aliases removed in 2.0).

### 4.4 Docs & skills audit (pipeline Stage 9)

- [ ] `stitch-sdk-usage`, `stitch-sdk-readme`, `stitch-sdk-development`, `stitch-sdk-domain-design` updated against the 1.0 surface (constructor sealing, Generation results, content-vs-URL methods, config/env table, error codes).
- [ ] README: AI SDK + ADK install instructions show peer deps; migration guide linked.

  1.0 ship gates (all must be green): CI full matrix · validate:generated · coverage thresholds · publish-readiness · e2e (incl. multi-screen generation assertion) · examples run · migration guide reviewed.

---

## Sequencing & parallelism

```
Phase 0 (week 1)        0.1 ──┬── 0.2 (depends on 0.1 key shape)
                        0.3 ──┤   0.4, 0.5 independent — parallel
                              ▼
Phase 1 (weeks 2-3)     1.1 first (snapshots = safety net) → 1.2/1.3/1.4 parallel → 1.5, 1.6
Phase 2 (weeks 2-4)     2.2 → 2.3 (mapper before retry) ; 2.1 independent ; 2.4/2.5/2.6 after 2.1
Phase 3 (weeks 4-6)     3.1 needs 1.2+1.3 (IR changes) ; 3.4 needs 1.1 (snapshots) ; rest parallel
Phase 4 (weeks 5-7)     4.1 alongside Phase 3 ; 4.2/4.3 before rc ; 4.4 last (Stage 9)
```

Phases 1 and 2 are independent workstreams and can run concurrently. Phase 3 is a single PR train on a `v1` branch, merged when complete, released as rc.

---

## Pre-mortem risk register & plan amendments (added 2026-06-09)

Outcome of a pre-mortem pass over this plan. Each amendment supersedes the original text above where they conflict.

### Decision record changes

- **D5 (revised):** Do NOT deprecate `GOOGLE_CLOUD_PROJECT` — it is the GCP-wide convention and other Google SDKs read it. Keep it first-class alongside `STITCH_*` vars. Only `STITCH_HOST`/`STITCH_MCP_URL` get folded into `STITCH_BASE_URL`.
- **D6 (revised):** Auto-retry applies to **idempotent reads only** (`get_*`, `list_*`) by default. Generative tools (`generate_*`, `edit_*`, `create_*`) are never auto-retried — a retried generation duplicates minutes of work, burns quota, and can orphan screens server-side. Callers opt in per-call if they want it.
- **D11 (new):** Supported-runtimes statement before 1.0: Node ≥18 and Bun are supported; browser/edge are explicitly unsupported at 1.0 (download/upload handlers use `node:fs`). Document it; add an engines/exports check to publish-readiness.
- **D12 (new):** Decide the long-running-call story before freezing method signatures. The schema already ships `ProgressUpdate`/`ProgressUpdates` types and the SDK has zero notification handling. At minimum: reserve an options-object parameter (`generate(prompt, opts?)`) so `onProgress`/`signal` can be added post-1.0 without breaking. Positional-params-then-options is itself a breaking change later — get the shape right now.
  - **✅ IMPLEMENTED (2026-06-09):** codegen now emits required params positional + trailing `options?: { ... }` for all optional params (`generateMethodParams` in `scripts/generate-sdk.ts`); the regex param re-parse (Phase 1.4 hazard) was removed in the same change. Breaking: `createProject(title)` → `createProject({ title })`, `createDesignSystemFromDesignMd(x, deviceType)` → `(x, { deviceType })`; `generate`/`edit`/`variants` optional args moved to `options`. Call sites, tests, README, and skills updated. Future `onProgress`/`signal` land as new `options` fields, non-breaking.

### Plan amendments

1. **Phase 0.2 changed:** do NOT restore constructor ID-hydration. Restoring `new Project(client, id)` in 0.3.x only to re-break it at 1.0 is worse than deprecating now. Instead: constructor throws a descriptive deprecation error pointing to `stitch.project(id)`. Saves the double codegen work and the user whiplash.
2. **Phase 1.1 amended:** byte-snapshots alone will ossify — reviewers rubber-stamp churn. Snapshots must be small and per-feature, AND fixture output must be **compiled and behavior-tested** (run generated methods against a fake client + recorded responses). Behavioral fixtures are the real gate; snapshots are the diff aid.
3. **New Phase 1.7 — record/replay response fixtures:** capture real server responses (sanitized) per tool into `test/fixtures/responses/`; every binding gets a projection test against recorded data. This is the only guard against semantically-valid-but-wrong domain maps (the truncation bug class) that doesn't need live API. Refresh fixtures in the nightly e2e run and diff — this doubles as a **server-drift early-warning system**.
4. **Phase 3.1 amended:** drop `Generation.primary` or rename to `first` — "primary" implies server-designated significance that does not exist (screen order is not guaranteed meaningful). Don't encode a guess in 1.0 API names.
5. **Phase 3.4 descoped:** generating exact `data` types from repaired/loose schemas produces lying types (`schema-repair` stubs are permissive). Scope to: typed **accessors** for fields the SDK itself relies on (ids, names, downloadUrls) + `data: unknown` (not `any`). Full typed-data only for fields verified present in recorded fixtures (1.7). Re-evaluate post-1.0.
6. **Phase 3.3 amended:** identity-map double-down (LRU/WeakRef) is deferred. Pre-1.0 the EntityManager scope is: correct composite keys, no `unknown` aliasing, documented merge semantics, and a `cache: false` client option for users who want value-object behavior. WeakRef/FinalizationRegistry complexity is not justified until a real memory report exists. Open question tracked for 1.x: whether the identity map should be opt-in.
7. **Phase 1.2 lint amended:** the `index:0`-over-unbounded-array error needs an escape hatch (`"acknowledgeSingle": true` on the step) for genuinely single-result semantics, or Stage 2 agents will fight codegen with worse workarounds.
8. **Phase 4.2 decoupled from server team:** e2e cleanup must not gate 1.0 on a delete tool that may not ship. Gate instead on: dedicated test account + `e2e-sdk-<runId>` naming + documented sweep. File the delete-tool request now; adopt when it lands.
9. **Branch strategy changed:** no long-lived `v1` branch — generated files make long-lived branches merge hell and main keeps moving (capture/regen churn). Phase 3 lands on main behind `npm dist-tag next` releases; `main` is releasable as rc at all times once Phase 2 exits. Maintain a `release-0.x` branch only for Phase 0 backports.
10. **New Phase 3.8 — bundle hygiene:** root `index.ts` re-exports `toolDefinitions` (~1,800 lines of JSON) into every consumer bundle. Move tool definitions behind the `/ai` and `/adk` subpaths (or a new `/tools` subpath), add `"sideEffects": false`, and add a bundle-size check (size-limit) to CI.
11. **New Phase 2.7 — diagnostics:** a `STITCH_DEBUG=1` / `debug` config flag that logs tool calls, retries, cache hits, and connection lifecycle (with auth headers redacted — verify transport `onerror` logging cannot leak headers). Without this, post-1.0 field bug reports are unactionable.
12. **Release-machinery check moved up:** wombat-dressing-room publishing, `latest` vs `next` dist-tags, and rc publishing flow must be validated in Phase 0 (publish a `0.3.x-test` to a dist-tag), not discovered at rc time.

### Standing risks (no plan change, monitor)

- **Server schema churn invalidates IR work mid-plan** — highest-likelihood risk. Mitigation is 1.7's drift early-warning + keeping Phase 3 IR changes small. If `outputComponents` restructures again, re-run Stage 2 before continuing Phase 3.
- **MCP tool errors are text-only** — the "status-code-first" error mapper only improves `httpPost`; `callTool` classification stays substring-based. Push the server team for structured error content; don't promise more than the protocol carries.
- **rc soak may get zero external feedback** (few consumers). Gates are self-referential. Mitigation: run the examples suite + both adapters against the rc in a clean consumer project as a mandatory gate; recruit at least one internal consumer.
- **Solo-maintainer timeline:** the week labels assume parallel workstreams that one person cannot run. Treat phase _ordering_ as the contract, not the weeks. Cut line for 1.0 if needed: Phase 3.6 adapter rewrites and 3.8 can slip to 1.1 (additive); D1/D2/D3/exports cannot.
