# PR: v1/16-types-and-exports

**Base:** `v1/15-sealed-entities` -> **Head:** `v1/16-types-and-exports`

## Commits

### feat(api)!: typed export surface; data is unknown; internals sealed [V1_PLAN §3.4+3.5]

- index re-exports ALL generated types + responses (export type *):
  consumers can finally name VariantOptions, DesignSystemInput,
  SelectedScreenInstance, and every *Response used in signatures
- stale handwritten DesignTheme/ScreenInstance (shapes INCOMPATIBLE
  with what the SDK returns) deleted; ProjectData now references the
  generated types; stale GenerateScreenParams deleted
- entity 'data' is unknown (was any): generated internals cast
  explicitly; load-bearing access goes through typed accessors
  (.title on Project/Screen extensions). Full typed-data deferred per
  pre-mortem amendment 5 (types from repaired schemas would lie)
- internals no longer exported: repairToolSchemas, repairSchema,
  StitchProxyConfigSchema (type-only now); dead fife.ts + tests deleted
- BREAKING: removed exports; data: unknown requires narrowing

Gates: validate ✓ check:skills ✓ smoke ✓ build ✓ 320/320 unit ✓ 113/113 scripts ✓ tsc ✓


## Diffstat
```
 packages/sdk/test/unit/fife.test.ts                | 44 ----------------------
 scripts/generate-sdk.ts                            |  9 +++--
 .../__snapshots__/codegen-snapshot.test.ts.snap    |  6 +--
 13 files changed, 51 insertions(+), 135 deletions(-)
```
