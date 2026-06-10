# PR: v1/18-bundle-and-misc

**Base:** `v1/17-adapters` -> **Head:** `v1/18-bundle-and-misc`

## Commits

### feat(packaging)!: tool catalog behind /tools; bundle budget; structured errors [V1_PLAN §3.7+3.8]

- toolDefinitions + toolMap move to '@google/stitch-sdk/tools': the
  ~2K-line inlined JSON catalog no longer ships in every root import
  (root bundle: 31 KB). Singleton drops its toolMap surface (it was
  the eager edge pulling the catalog into the root graph)
- sideEffects allowlist (NOT false): project-ext/screen-ext registry
  registrations and adapter TLA guards are real side effects bundlers
  must keep
- new check:bundle CI gate: 120 KB root budget + catalog-leak probe
  using catalog-only description text (tool names appear legitimately
  in generated method bodies and are not reliable markers)
- StitchError gains structured .status (HTTP) and .toolName (MCP)
- proxy protocolVersion default bumped 2024-11-05 → 2025-06-18
- IR Binding.description: JSDoc override for bindings whose semantics
  differ from the raw tool (getHtmlUrl/getImageUrl no longer claim to
  'retrieve the details of a specific screen')
- BREAKING: toolDefinitions/toolMap removed from root export + singleton

Gates: validate ✓ check:skills ✓ smoke ✓ bundle ✓ build ✓ 323/323 unit ✓ 113/113 scripts ✓ tsc ✓

STAGE D COMPLETE


## Diffstat
```
 scripts/generate-sdk.ts                           |  2 +-
 scripts/ir-schema.ts                              |  6 ++
 scripts/smoke-test.ts                             | 17 ++++--
 25 files changed, 177 insertions(+), 44 deletions(-)
```
