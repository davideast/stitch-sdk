# V1 Autonomous Execution Plan

Companion to `V1_PLAN.md` (with pre-mortem amendments). This file is the operating manual for executing the remaining plan autonomously. **Final artifact: a linear train of local branches, each a candidate PR.** Nothing is pushed or published by the autonomous run.

Status legend: `pending` · `in-progress` · `green` (all gates pass) · `parked` (blocked, see notes)

## Branch topology

A **linear stack** (train): each branch is created from the tip of the previous green branch. Rationale: generated files conflict badly across parallel branches; a train means every PR diff is clean against its predecessor, and merging in order into `main` is conflict-free. The tip of the train is always the full integration state.

- Branch naming: `v1/NN-short-name` (NN = train order).
- A PR for branch `v1/NN` targets `v1/NN-1` (stacked PRs), or branches are merged bottom-up into `main`.
- **Rebase rule for generated files:** never hand-merge `packages/sdk/generated/src/*`; resolve by re-running `npm run generate` after taking the source-side resolution. (Branch 01 makes output deterministic, which is why it goes first.)
- **Step 0 (before any new work):** the uncommitted D12 changes currently in the working tree are committed as `v1/00-d12-options-object` — the train's first car.

## Per-branch gates (run on every branch before marking green)

```bash
npm run generate && npm run generate   # twice; then: git diff --exit-code packages/sdk/generated
npm run build
npm run test                            # vitest unit suite
npm run test:scripts                    # bun emitter + IR contract tests
bun scripts/validate-generated.ts       # from branch 01 onward this must pass
npx tsc --noEmit                        # in packages/sdk
```

Branches touching e2e-visible behavior (13, 14, 20) additionally run `npm run test:e2e` **only if** `STITCH_API_KEY` is set; otherwise note "e2e deferred" in the log — never park on a missing key.

Commit convention: `type(scope): summary [V1_PLAN §ref]`; breaking commits from Stage D onward use `!`.

## The train

### Stage A — Foundations (Phase 0; non-breaking)

| #   | Branch                          | Scope (plan refs)                                                                                                                                                                                                                                                                                       | Status  |
| --- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 00  | `v1/00-d12-options-object`      | Commit the already-implemented D12 work (codegen options-object, regen, tests, docs).                                                                                                                                                                                                                      | green   |
| 01  | `v1/01-deterministic-codegen`   | §0.3a: relative-path hashing in `generate-sdk.ts`/`validate-generated.ts`; remove `Generated:` timestamp from emitted headers; `generatedAt` only in lock (bumped only when hashes change); recompute stale `lock.manifest.sourceHash` from the committed manifest (note: true re-capture needs live server — see needs-human); atomic manifest+lock writes; loud failure on corrupt lock. | green   |
| 02  | `v1/02-ci-and-packaging`        | §0.3b+0.4: CI adds `validate:generated` + `test:scripts` jobs; delete phantom root scripts, implement `scripts/sync-versions.ts`; `@google/adk` + `ai` + `@google/genai` → optional peers with guarded import & actionable error; exports `types` first; `publint` + lock + version-sync checks added to publish-readiness.                                  | green   |
| 03  | `v1/03-entity-manager`          | §0.1: composite cache keys (all reference keys), generated `static entityKey`, remove `"unknown"` fallback (uncached instance + debug warn), license header; full test matrix incl. cross-project collision regression.                                                                                      | green   |
| 04  | `v1/04-construction-paths`      | §0.2 (amended): `upload-handler` + `proxy/virtual-tools` route through `entities.resolve`; constructors throw descriptive error on string data pointing to factories; dummyClient returns parsed payload + propagates `isError`; de-mocked tests for both seams; `parseToolResult` extracted + shared; `entities` added to `StitchToolClientSpec`. | green   |
| 05  | `v1/05-handler-hardening`       | §0.5: worker-pool concurrency with per-asset error collection, `r.ok` on HTML fetch (skip+warn), tmp-file cleanup on failure, sanitize `ext`, https-only asset URLs, `WRITE_FAILED` produced for fs errors, dead comment removed. DEVIATION: partial asset failures → explicit warnings (not `success:false`) — un-rewritten URLs still resolve remotely, so the download remains usable; the bug was *silent* success. | green   |

### Stage B — Pipeline (Phase 1; internal)

| #   | Branch                       | Scope (plan refs)                                                                                                                                                                                                                                              | Status  |
| --- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 06  | `v1/06-codegen-snapshots`    | §1.1 (amended): fixture manifest + domain-map covering every IR feature; per-file snapshots (hash lines stripped); tsc compile check vs stub runtime; 9 behavioral tests on emitted classes (options routing, projections incl. each/each multi-collect, cache, factories, constructor rejection, entityKey). Generator gained sandbox env overrides (STITCH_CODEGEN_*). DEVIATION: grep-style test replacement deferred to branch 19. | green   |
| 07  | `v1/07-ir-strict`            | §1.2+1.3: `.strict()` IR; delete `ProjectionStep.fallback` + `FieldMappingSpec`; implement `ArgParam.default` (generate() now sends DESKTOP); reject array-step without `index`/`each`/`find` (validation==emission); validate `find` dot-paths; unbounded-array lint + `acknowledgeSingle` escape hatch (fires on Project.generate/Screen.edit as expected until branch 13); cache `index` support; required-before-optional moot post-D12. | green   |
| 08  | `v1/08-capture-raw-skills`   | §1.5+1.6: capture stores raw schemas (repair moved to serving in proxy listTools + load time in codegen); `lock.generated.repairedTools` records load-time repairs; skill purged of phantom features + documents strict IR/lint/options shape; `check:skills` consistency gate (token presence/absence + behavioral safeParse probes) wired into CI. DEVIATION: full doc-generation from Zod deferred — consistency CHECK chosen instead (cheaper, same drift protection). | green   |
| 09  | `v1/09-response-fixtures`    | §1.7: 13 per-tool fixtures (generation fixtures carry 3 screens across 2 components — the drift shape); 16 tests: one per binding + a COMPLETENESS gate that fails when a binding lacks a fixture case; truncation behavior PINNED with branch-13 marker; `scripts/refresh-response-fixtures.ts` re-records read-only fixtures live (server-drift early warning). | green   |

### Stage C — Runtime (Phase 2; mostly internal)

| #   | Branch                        | Scope (plan refs)                                                                                                                                                                                                                                                  | Status  |
| --- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 10  | `v1/10-errors-and-retry`      | §2.2+2.3 (D6 revised): central `classifyError`/`isRecoverable` in `spec/error-mapping.ts` (status-first, word-boundary text fallback), adopted in `client.ts` (x2)/`upload-handler`/`download-handler`; `retry` config knob + full-jitter backoff for **idempotent reads only** (`get_*`/`list_*`) — `Retry-After` skipped (MCP text errors carry none); 50 new matrix/fake-timer tests. | green |
| 11  | `v1/11-lifecycle-config`      | §2.4+2.5+2.6+2.7: terminal `close()` (`CLIENT_CLOSED`), transport cleanup on reconnect, fresh MCP `Client` per transport; unified `StitchConfigSchema` + env precedence (D5 revised: `GOOGLE_CLOUD_PROJECT` stays first-class) + deprecation warnings; singleton lazy-on-invoke, `has`/`ownKeys`, `resetStitchSingleton()`, full-config support; `STITCH_DEBUG` diagnostics with header redaction. | pending |
| 12  | `v1/12-proxy-unification`     | §2.1 (D9): proxy on `StitchToolClient`; delete hand-rolled JSON-RPC client; virtual-tool registry (no hardcoded list, collision detection); `capture-tools.ts` switches to client raw-request path.                                                                       | pending |

### Stage D — Breaking batch (Phase 3; every commit `!`)

| #   | Branch                        | Scope (plan refs)                                                                                                                                                                                                                               | Status  |
| --- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 13  | `v1/13-generation-results`    | §3.1 (amended): IR `returns.kind: "generation"` → generated `Generation` class `{ screens, first, raw }` (no `primary`); migrate `generate`/`edit`/`variants`/`apply`; lint → **error** for non-`each` projections on generative tools. **Fixes the truncation bug.** Surface `userFeedback`/progress on `raw`. | pending |
| 14  | `v1/14-content-methods`       | §3.2 (D2): `getHtmlUrl`/`getImageUrl` = old behavior; `getHtml` fetches content, `getImage` returns bytes+contentType; IR `cache.writeBack`; throw `NOT_FOUND` instead of `""` (kill `\|\| ""` emission).                                              | pending |
| 15  | `v1/15-sealed-entities`       | §3.3 (amended): constructors `protected` (drop the 04 string-throw shim); `cache: false` client option for value-object behavior; identity-map LRU/WeakRef explicitly **deferred** past 1.0.                                                          | pending |
| 16  | `v1/16-types-and-exports`     | §3.4 (descoped)+3.5: `data: unknown` + typed accessors for load-bearing fields (ids, names, downloadUrls — fixture-verified only); re-export generated types/responses from entry; delete stale `types.ts` duplicates; stop exporting internals; smoke-test allowlist. | pending |
| 17  | `v1/17-adapters`              | §3.6 (D7/D8): tools-adapter via `dynamicTool()`/`jsonSchema()` from optional-peer `ai` (delete symbol forgery); `include:` validates names and throws; adk `cleanSchema` self-recursion fix.                                                          | pending |
| 18  | `v1/18-bundle-and-misc`       | §3.7+3.8: `toolDefinitions` behind `/tools` subpath (out of root export); `sideEffects: false`; size-limit in CI; `StitchError.status`/`toolName`; bump `protocolVersion`; per-method JSDoc accuracy.                                                  | pending |

### Stage E — Test & release engineering (Phase 4)

| #   | Branch                         | Scope (plan refs)                                                                                                                                                                                                                      | Status  |
| --- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| 19  | `v1/19-test-architecture`      | §4.1: generated `client` param typed as `StitchToolClientSpec`; replace `vi.mock`-of-domain-classes with spec fakes; kill private-state pokes + `process.env` swaps (`vi.stubEnv`); coverage config + thresholds (80% src, 100% entity-manager & error-mapping). | pending |
| 20  | `v1/20-e2e-and-release`        | §4.2+4.3 (amended): e2e `e2e-sdk-<runId>` naming + teardown scaffold (delete-tool adoption deferred — needs-human); single env-gating contract (either auth mode); publish-readiness adds validate-generated/publint/peer-matrix, Windows-safe, tarball cleanup; `RELEASING.md`; **`MIGRATION-1.0.md`** written from Stage D commit log. | pending |
| 21  | `v1/21-docs-audit`             | §4.4 (pipeline Stage 9): audit `stitch-sdk-usage`, `stitch-sdk-readme`, `stitch-sdk-development`, `stitch-sdk-domain-design` + README against the train's tip surface; every example must compile against built dist.                          | pending |

## Autonomous protocol

1. **One branch at a time, in train order.** Create from previous green tip. Implement scope. Run gates. Commit (small, logical commits). Update the status table in this file (committed on the same branch) and the session task list.
2. **Decision rule:** where `V1_PLAN.md` offers alternatives, take the stated default/amendment. Log any deviation in the branch's notes column with one-line rationale. Never expand scope beyond the branch's plan refs — defects discovered out-of-scope get a note in the ledger below, not a fix.
3. **Failure rule:** 3 distinct fix attempts per gate failure. Then: if the failing item is severable, descope it to the ledger and proceed; if not, mark `parked`, **re-branch the next car from the last green tip**, renumber nothing, and continue. A parked branch never blocks the train silently.
4. **Regen discipline:** any branch touching `scripts/` or `domain-map.json` regenerates and commits generated output in the same branch. The double-generate gate enforces idempotency.
5. **No push, no publish, no `gh`.** Local branches only. The run ends with `git branch --list 'v1/*'` + a final report: per-branch status, gate results, diffstat, suggested PR title/body (saved to `.v1-reports/NN-branch.md`).
6. **Session continuity:** this file is the source of truth; a resuming session reads the status table, checks out the last green tip, and continues with the first `pending` row.

## Needs-human ledger (outside autonomous scope)

- Re-run **live capture** (Stage 1) to refresh `tools-manifest.json` against the real server — requires `STITCH_API_KEY`; branch 01 recomputes the lock from the committed manifest as an interim truth.
- File server-team requests: **delete-project tool** (e2e teardown), **structured tool errors** (error mapping ceiling), schema-stability/versioning policy.
- Publish a `0.x-test` dist-tag through wombat-dressing-room to validate release mechanics (plan amendment #12).
- Live e2e validation of branches 13/14 if no key is present during the run; rc publication; recruiting an internal consumer for rc soak.
- Decide `Generation` naming bikeshed (`first` vs `screens[0]` only) at PR review — train uses `first`.

## Kickoff

Say **"execute the train"** (optionally "through Stage B" etc.). Stage D intentionally requires no extra confirmation — breaking changes are pre-authorized by `V1_PLAN.md` — but each Stage D branch's report flags its breaking surface for PR review.
