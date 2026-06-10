# PR: v1/11-lifecycle-config

**Base:** `v1/10-errors-and-retry` -> **Head:** `v1/11-lifecycle-config`

## Commits

### feat(runtime): terminal close, unified config/env, singleton hygiene, STITCH_DEBUG [V1_PLAN §2.4-2.7]

- Terminal close(): new CLIENT_CLOSED StitchErrorCode; after close()
  every connect/callTool/httpPost/listTools throws
  StitchError(CLIENT_CLOSED, recoverable:false) — create a new
  StitchToolClient instead; close() is idempotent, swallows transport
  close failures, and resets connectPromise/isConnected
- Reconnect path: doConnect() closes any previous transport (errors
  ignored) BEFORE building the new one — no dangling sockets — and
  recreates the MCP Client per transport (connect() twice on one
  Client is undefined behavior); connectPromise single-flight kept,
  failure → state reset → retry-connect covered by tests
- Unified config/env (D5 REVISED): shared resolveConfigWithEnv() —
  apiKey ?? STITCH_API_KEY; accessToken ?? STITCH_ACCESS_TOKEN;
  projectId ?? STITCH_PROJECT_ID ?? GOOGLE_CLOUD_PROJECT (both
  first-class, no warning); baseUrl ?? STITCH_BASE_URL ?? STITCH_HOST
  (deprecated alias — console.warn ONCE per process via module
  boolean, removed in 2.0). Config refine message is now "Invalid
  configuration: provide either 'apiKey' OR ('accessToken' +
  'projectId')." — not "Authentication failed"
- Proxy aligned: StitchProxyConfigSchema refine requires a quota
  project with accessToken (same error text as client); proxy URL
  precedence explicit config > STITCH_BASE_URL > STITCH_MCP_URL
  (STITCH_MCP_URL stays accepted for the proxy binary, per scope —
  no warning)
- Singleton hygiene: getOrCreateClient takes the full config surface
  (apiKey/accessToken/projectId/baseUrl/timeout/retry); cache key is
  the RESOLVED config JSON, so a bare call after an env change gets a
  fresh client and identical resolved config reuses; stitch proxy is
  lazy-on-INVOKE (get returns cached wrappers; client constructed only
  at call time) with has/ownKeys/getOwnPropertyDescriptor traps —
  console.log(stitch), Object.keys, and 'in' work without credentials;
  new resetStitchSingleton() export (also from index)
- STITCH_DEBUG diagnostics: new src/debug.ts debugLog(area, message,
  data?) → stderr as [stitch-sdk:{area}], no-op unless STITCH_DEBUG;
  keys matching /authorization|api[-_]?key|token/i redacted (top level
  + one deep). Wired into connect/doConnect/close lifecycle, callTool
  (tool name + arg KEYS only — never arg values — + retry attempts),
  and transport.onerror (replaces bare console.error; logs err.message
  only so embedded request headers can't leak)
- Tests: +36 (314 unit total) — terminal-close matrix, reconnect
  transport-teardown ordering + fresh-Client assertion, env-precedence
  matrix incl. warn-once, singleton lazy/introspection/cache-key/env-
  invalidation suite (vi.stubEnv, no vi.resetModules), debug redaction
  + silence; proxy tests updated for the aligned refine

Gates: validate ✓ check:skills ✓ build ✓ 314/314 unit ✓ 113/113 scripts ✓ tsc ✓


## Diffstat
```
 packages/sdk/test/unit/client.test.ts    | 206 ++++++++++++++++++++++++++++++-
 packages/sdk/test/unit/debug.test.ts     | 105 ++++++++++++++++
 packages/sdk/test/unit/singleton.test.ts | 176 ++++++++++++++++++++------
 13 files changed, 835 insertions(+), 100 deletions(-)
```
