# PR: v1/12-proxy-unification

**Base:** `v1/11-lifecycle-config` -> **Head:** `v1/12-proxy-unification`

## Commits

### refactor(proxy)!: one MCP stack — proxy and capture run through StitchToolClient [V1_PLAN §2.1]

- StitchToolClient gains callToolRaw (envelope passthrough, no retry —
  downstream owns error semantics) and listToolsRaw (raw schemas, no
  repair, no virtual tools); listTools() now layers on listToolsRaw
- ProxyContext carries a real StitchToolClient (constructed in core.ts
  from proxy config); initializeStitchConnection = connect + refresh.
  The MCP SDK now owns the initialize handshake — the hand-rolled
  JSON-RPC fetch stack is DELETED (Date.now() request ids, missing SSE
  accept header, no Mcp-Session-Id, un-awaited notifications/initialized
  racing tools/list: all gone)
- virtual tools execute against ctx.client directly — the dummyClient
  shim (where the silent-success bug lived) is deleted
- callTool handler: undefined upstream result returns a proper isError
  envelope instead of undefined; remote tools colliding with virtual
  tool names are shadowed with a loud warning, not listed twice
- capture-tools.ts captures through the client raw path (same manifest
  format, same atomic writes)

NOTE: implementing agent hit budget mid-branch; completed, gated, and
collision-handling added by conductor.

Gates: validate ✓ check:skills ✓ build ✓ 314/314 unit ✓ 113/113 scripts ✓ tsc ✓

STAGE C COMPLETE

## Diffstat

```
 packages/sdk/test/unit/proxy.test.ts         |  75 +++++--
 packages/sdk/test/unit/virtual-tools.test.ts |  55 ++---
 scripts/capture-tools.ts                     |  28 ++-
 12 files changed, 309 insertions(+), 375 deletions(-)
```
