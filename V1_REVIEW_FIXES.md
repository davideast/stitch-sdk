# V1 Adversarial Review — Per-Finding Fix Plan

Triage of the confirmed findings from the multi-agent adversarial review (44 agents, skeptic-verified). Companion to `V1_EXECUTION.md`. One refuted finding is recorded at the end (no action).

**Effort:** S = <30 min · M = a few hours · L = design + broad change.
**Gate-now?** "yes" = must land before 1.0 because fixing it later is itself a breaking change, OR it's a security/release blocker. "soon" = before GA but non-breaking to defer. "batch" = cleanup, can ride a follow-up.

## Triage summary

| ID  | Sev | One-line | Effort | Gate-now? |
| --- | --- | --- | --- | --- |
| C1  | critical | Path traversal: server/downstream `screenId` escapes `outputDir` | M | ✅ done (`v1/22`) |
| C2  | critical | Ships as patch over `latest` (version 0.3.5, no tags) | S | ✅ done (`v1/22`) |
| M1  | major | `screen.edit().first.getHtml()` doesn't type-check (self-ref base Screen) | M | ✅ done (`v1/23`) |
| M2  | major | `entityCache:false` silently dropped — value-object mode dead | S | ✅ done (`v1/23`) |
| M3  | major | Transport 429/401/403 bypass retry + classification | M | ✅ done (`v1/24`) |
| M4  | major | `VariantOptions.aspects` `(union)[]` precedence bug | S | ✅ done (`v1/23`) |
| M5  | major | `emitFlatMapProjection` bare `[index]` (latent crash) | S | ✅ done (`v1/23`) |
| M6  | major | Importing `generate-sdk.ts` runs `main()`, regenerates committed tree | S | ✅ done (`v1/24`) |
| M7  | major | Bundle catalog-leak probe false-passes | S | ✅ done (`v1/24`) |
| M8  | major | Docs cluster: README/skills/examples teach removed/renamed/0.x API | M | soon |
| M9  | major | CI gates: Node lane + consumer-types + publish-readiness wired (examples-tsc → Tranche 4 w/ M8; integration-in-CI deferred) | M | ◑ partial (`v1/24`) |
| m1–m18 | minor | see Tranche 5 | S each | batch |

---

## Tranche 1 — Critical (release blockers)

### C1 · Path traversal in `downloadAssets`
- **Fix:** After computing `screenSlug`/`screenDir` (and the design-system `dsName`/`dsDir`), enforce containment: `const safe = path.resolve(outputDir, screenSlug); if (!safe.startsWith(path.resolve(outputDir) + path.sep)) { warnings.push(...); continue; }`. Apply the same to the DESIGN.md dir. Either wire the dead `PATH_TRAVERSAL_ATTEMPT` code (assign it on violation, keep the `project-ext.ts` mapping) or delete the code + its JSDoc claim — don't ship a documented guard that doesn't run.
- **Files:** `packages/sdk/src/download-handler.ts` (~124-127, 146, 248, 273-274), `packages/sdk/src/slugify.ts` (consider rejecting `..`/`/` in the fallback), optionally `spec/download.ts` + `project-ext.ts:111`.
- **Effort:** M · **Risk:** low (additive guard).
- **Test:** the existing `download.test.ts:89` "prevents directory traversal" only covers the *asset-URL filename* path — add a case driving a malicious `screen.id` (`"../escaped/x"`, empty title) and assert (a) no file is written outside `outputDir`, (b) `success:false` or a warning, (c) the screen is skipped. Add the DESIGN.md vector too.
- **Note:** the proxy (`virtual-tools.ts` `download_assets`) exposes this to *any downstream MCP client* controlling `outputDir`+`projectId` — the guard fixes both the library and proxy threat models at once.

### C2 · Version / semver
- **Fix:** Bump `packages/sdk/package.json` to `1.0.0` (or `1.0.0-rc.0`); `bun run version:sync`; `bun scripts/inject-version.ts` (rebuild regenerates `src/version.ts`). For a staged rollout publish rc on `--tag next` (set `publishConfig.tag` per release, not permanently `latest`). Tag `v1.0.0-rc.0`.
- **Files:** `packages/sdk/package.json`, root `package.json` (via sync), `RELEASING.md` (note the dist-tag policy).
- **Effort:** S · **Risk:** none.
- **Gate:** add a `publish:readiness` check (or CI assert) that the version's major matches the "1.0" claim before publish — `sync-versions --check` only checks root↔sdk parity, not the major.

---

## Tranche 2 — Type-surface majors (breaking after 1.0, must land now)

### M1 · Generative methods return the un-extended `Screen` type
- **Root cause:** generated `screen.ts` declares `edit()`/`variants()` as `Generation<Screen, …>` where `Screen` is the file's own base class (codegen's `returnClasses` import logic skips `b.returns.class === className`, so no extension import for self-returns). Runtime is correct (the EntityManager registry upgrades to the ext class); only the static type is wrong. `designsystem.ts` `apply()` returning `Generation<Screen>` is fine *if* it imports the ext Screen — verify during the fix.
- **Recommended fix (type-only self-import, no runtime cycle):** in `generate-sdk.ts`, when a class has `extensionPath`, emit `import type { <Class> as <Class>Ext } from "<extensionPath>"` and use `<Class>Ext` in *all* return-type positions for that entity (the `Generation<…>` param, bare-class, and `[]` returns). Type-only imports are erased at runtime, so the base↔ext type cycle is fine for tsc/esbuild. This generalizes to any extended entity.
- **Files:** `scripts/generate-sdk.ts` (import emission near the per-class import block; return-type string at ~1123-1130), regenerate.
- **Effort:** M · **Risk:** medium — must confirm `tsc` is happy with the base-file type-importing its own extension. Build + a consumer-compile probe required.
- **Test:** add a codegen-fixture case where the fixture entity has an `extensionPath` and a self-returning generation method, then assert the emitted return type references the ext alias; add a behavioral/`tsc` assertion that `gen.first.<extMethod>()` compiles. Fix `MIGRATION-1.0.md:48` once true.
- **Alternative (rejected):** declaration merging / `declare module` augmentation — messier and easy to get wrong.

### M2 · `entityCache:false` silently dropped
- **Fix:** add `entityCache: input?.entityCache` to the object `resolveConfigWithEnv` returns (`client.ts:78-86`); add `entityCache` to `SingletonClientConfig` + the `resolveAndKey` field list (`singleton.ts`). The `EntityManager` `enabled` path is already correct.
- **Files:** `packages/sdk/src/client.ts`, `packages/sdk/src/singleton.ts`.
- **Effort:** S · **Risk:** none.
- **Test:** the *integration* path is the gap — add a test that constructs `new StitchToolClient({ entityCache:false })` (and `Stitch({entityCache:false})`) and asserts two resolves of the same identity are distinct instances. Keep the existing direct-`EntityManager` test.

### M4 · `VariantOptions.aspects` precedence
- **Fix:** in `jsonSchemaToTs` array case (`generate-sdk.ts` ~437), parenthesize union item types: `const item = jsonSchemaToTs(prop.items, allDefs, namedTypes); return /[|&]/.test(item) ? \`(${item})[]\` : \`${item}[]\`;`. Regenerate.
- **Files:** `scripts/generate-sdk.ts`, regenerate (snapshot churn limited to `aspects`).
- **Effort:** S · **Risk:** low.
- **Test:** add a `jsonSchemaToTs` unit case `{type:"array",items:{enum:["A","B"]}}` → `("A" | "B")[]`; add a behavioral assertion that `variants(prompt, { aspects:["LAYOUT","COLOR_SCHEME"] })` compiles.

---

## Tranche 3 — Latent / gate-integrity majors (before GA)

### M3 · Transport HTTP errors bypass retry + classification
- **Fix:** in `callTool`'s catch (`client.ts:311-331`), normalize non-`StitchError` transport errors before the retry decision: detect the MCP SDK `StreamableHTTPError` (has numeric `.code` = HTTP status) and map via `classifyError({ status })` into a `StitchError` (carrying `.status`, `.toolName`). Then the existing `RATE_LIMITED`-retry logic fires for real 429s, and callers always see `StitchError`. Apply the same normalization to `listToolsRaw`/`callToolRaw` surfaces if they can throw transport errors.
- **Files:** `packages/sdk/src/client.ts`.
- **Effort:** M · **Risk:** medium — verify the `StreamableHTTPError` shape against the pinned `@modelcontextprotocol/sdk` version; don't over-broaden (only wrap genuine HTTP-status errors, leave network/abort errors as-is or map to `NETWORK_ERROR`).
- **Test:** `retry.test.ts` currently covers only the isError-text path — add a case that throws a `StreamableHTTPError(429)` from the inner client on a `list_*` tool and asserts full retry budget + final `StitchError(RATE_LIMITED)`; a 401 case asserting `AUTH_FAILED` with `.status===401`.

### M5 · `emitFlatMapProjection` bare `[index]`
- **Fix:** in `emitFlatMapProjection` (`generate-sdk.ts` ~354, ~371), emit `?.[${index}]` instead of `[${index}]`, matching the other three emitter paths.
- **Files:** `scripts/generate-sdk.ts`.
- **Effort:** S · **Risk:** none (current domain-map has no `each`+`index`, so zero shipping churn).
- **Test:** add a `generate-sdk.test.ts` case pinning the exact emission for `[each, prop, index]` and a runtime eval on a missing-intermediate input asserting `[]`/`undefined` not a throw. Also relax the false "Semantics MATCH EMISSION exactly" comment or make it true.

### M6 · `generate-sdk.ts` runs `main()` on import
- **Fix:** guard the entrypoint: `if (import.meta.main) main().catch(...)` (Bun/Node ≥20 support `import.meta.main`; otherwise compare `import.meta.url` to `process.argv[1]`). The scripts test then imports pure functions without triggering a real regenerate.
- **Files:** `scripts/generate-sdk.ts` (bottom).
- **Effort:** S · **Risk:** none — `npm run generate` still works (it executes the file as the entry).
- **Test:** add a scripts test asserting `import("../generate-sdk.js")` does NOT mutate `packages/sdk/generated` (or simply that importing it doesn't print the Stage-3 banner). Independently, harden CI by keeping `validate:generated` *after* `test:scripts` would still be wrong — with the guard, ordering no longer matters.

### M7 · Bundle catalog-leak probe false-passes
- **Fix:** make the probe match minified output. Either (a) probe for a stable catalog-only token that survives minification unescaped (e.g. a tool *name* string is unreliable — it appears in method bodies; instead probe for a distinctive description substring that contains no newline, taken from the *interior* of the longest description), or (b) compare against the JSON-escaped form: `text.includes(JSON.stringify(probe).slice(1,-1))`. Option (b) is the robust general fix. Also lower the size budget toward the real 31 KB + headroom so the budget is a meaningful backstop.
- **Files:** `scripts/check-bundle-size.ts`.
- **Effort:** S · **Risk:** low.
- **Test:** add a self-test (or a comment-documented manual step) that bundles `/tools` (catalog definitely present) and asserts the probe *fires* — i.e. prove the guard catches a real leak, not just that the clean root passes.

### M9 · CI gate gaps (false confidence)
- **Fix:** (a) add a Node lane to `ci.yml` (`actions/setup-node`, run `test`/`smoke` under Node in addition to Bun) since the published target is Node. (b) Add `examples/` to a type-check gate (a dedicated `tsconfig` that `include`s `examples/**`, run in CI) — this is what would have caught M8's 18 errors. (c) Wire `publish:readiness` into CI (or a release workflow) and extend its consumer-import test to import `/ai`, `/adk`, `/tools` (with and without optional peers). (d) Decide on integration/e2e: gate live tests on a secret, but run the mocked AI/ADK adapter round-trips (`MockLanguageModelV3`) in CI rather than excluding all of `test/integration/**`.
- **Files:** `.github/workflows/ci.yml`, a new `packages/sdk/tsconfig.examples.json`, `scripts/publish-readiness.ts`, `packages/sdk/vitest.config.ts` (narrow the integration exclude).
- **Effort:** M · **Risk:** low; mostly additive CI.
- **Note:** this is the structural fix that keeps M8 from re-rotting.

---

## Tranche 4 — Docs cluster (M8, do alongside M1/M4 so docs match the fixed API)

All confirmed; the runtime is correct, the docs teach the wrong API. Fix the API-divergent ones *after* M1/M4 land so examples reflect the corrected types.

- **README** (`packages/sdk/README.md`): `result.project?.projectId` → use `name` via `parseResourceName` or show `sdk.project(...)`; Screen method table `edit`/`variants` → trailing `options` + `Generation<…>` returns; the `aspects` example depends on M4.
- **usage skill** (`stitch-sdk-usage/SKILL.md`): `project.uploadImage` → `project.upload`; API table `getHtml`/`getImage` (content/`Uint8Array`, not URL/string), `edit`/`variants`/`apply` signatures + `Generation` returns.
- **dev skill** (`stitch-sdk-development/SKILL.md`): `stitch.toolMap`/root `toolDefinitions` → `@google/stitch-sdk/tools`; the `sideEffects` example `method:"uploadImage"` → `"upload"`; `STITCH_HOST` → `STITCH_BASE_URL` (note deprecation).
- **examples** (`packages/sdk/examples/*.ts`): fix the 18 tsc errors — `download-artifacts.ts` treating `getImage()` bytes as a fetchable URL; `edit-screen.ts` `getHtml` on the edit result (unblocked by M1); `extract-symbols`/`extract-tailwind` dangling `htmlOrUrl` in dead `if(false)` blocks; `inspect-tools.ts` `stitch.toolMap`; `get-screen`/`retrieve-screen` accessing fields on `data: unknown`; `getting-started`/`browse-designs` printing `Uint8Array` as a URL.
- **index.ts comment** `// Extended: includes uploadImage()` → `upload()`.
- **M8-gate (couples with M9):** expand `check:skills` to all skill files (not just domain-design) and, ideally, extract + compile fenced `ts` code blocks from README/skills against `dist` — substring scanning can't catch any of this.
- **Effort:** M (mechanical once M1/M4 land) · **Risk:** low.

---

## Tranche 5 — Minors (batch into one follow-up)

| ID  | Fix | File |
| --- | --- | --- |
| m1  | Deep-merge or document shallow merge-on-cache-hit (nested `File` fields dropped) | `entity-manager.ts:137`, generated writeBack |
| m2  | Recurse redaction to full depth; soften "can never leak" comment | `src/debug.ts:28-44` |
| m3  | Re-check `isClosed` after the `connect()` await before setting `isConnected=true` | `client.ts:281-282` |
| m4  | `.url()` on `baseUrl` schema (or wrap `new URL` in a `StitchError`); treat `''` as unset | `spec/client.ts:33`, `client.ts:264` |
| m5  | Empty-guard or doc `Generation` public ctor; or make `first` `TItem \| undefined` | `src/generation.ts:42` |
| m6  | Give `uploadDesignMd` a typed return (extend codegen to allow a response-type return, or hand-type in ext) | `domain-map.json`, `generate-sdk.ts` |
| m7  | Fix the "atomic across both files" comment (it isn't) or sequence with a single combined write | `capture-tools.ts:98-104` |
| m8  | Update stale `core.ts` "bypasses SDK transport" class doc | `proxy/core.ts:28-30` |
| m9  | `teardown()` in `finally`/both exit paths, not only on success | `e2e-test.ts:248-261` |
| m10 | Test the `auth.ts` no-credentials throw directly | `test/unit/` |
| m11 | Strengthen the `uploadDesignMd` fixture assertion (not just `toBeTruthy`) | `response-fixtures.test.ts:135` |
| m12 | Skip (warn+continue) a screen with neither `id` nor `name` instead of aborting batch | `download-handler.ts:124` |
| m13 | Warn on unreachable/un-downloadable screens (consistency with the rest) | `download-handler.ts:139-144` |
| m14 | Fix the two vacuous `.gif` upload tests (titles claim httpPost mapping; assert `UNSUPPORTED_FORMAT` pre-check) | `upload.test.ts:116-146` |
| m15 | tool-map `parseParams`: handle `$ref`/nested params, add source-level unit tests | `tool-map.ts:42-51` |
| m16 | sideeffect-manifest guard regex: also match getters | `test/unit/sideeffect-manifest.test.ts:67` |
| m17 | Bump `container-proxy/package.json` dep off `^0.0.3` | `examples/container-proxy/package.json` |
| m18 | Include `repairedTools` in the lock idempotency comparison (or stop claiming it's a drift signal) | `generate-sdk.ts:1385-1396`, `validate-generated.ts` |

---

## Refuted (no action)

- **Pack-size "298 vs 303.8 KB stale" → refuted.** Decimal (`npm pack`) vs binary (KiB) unit conflation; actual is 297 KiB, under the 300 KiB budget. The `31 KB` bundle and `323/323`, `113/113` numbers re-verified accurate.

---

## Suggested branches

1. `v1/22-critical-fixes` — C1, C2 (small, ship immediately).
2. `v1/23-type-surface` — M1, M2, M4 (+ M5 codegen), regenerate, fresh untruncated gate run. These are the breaking-after-1.0 set.
3. `v1/24-runtime-and-gates` — M3, M6, M7, M9.
4. `v1/25-docs-and-minors` — M8 docs (after 2 lands) + Tranche 5.

Each branch: full untruncated gate suite (`build`, `test`/`test:coverage`, `test:scripts`, `validate:generated`, `check:skills`, `check:bundle`, `smoke`, `tsc`) — and from now on **never pipe `bun test` through `tail`**.
