# PR: v1/07-ir-strict

**Base:** `v1/06-codegen-snapshots` -> **Head:** `v1/07-ir-strict`

## Commits

### feat(ir)!: strict IR schema; validation matches emission; truncation lint [V1_PLAN §1.2+1.3]

- every IR object is .strict(): unknown keys (e.g. the documented-but-
  never-implemented fieldMapping/idField) are hard errors instead of
  silent strips — the Stage 2 agent must fail loudly, not believe a
  discarded feature was applied
- delete dead IR surface: ProjectionStep.fallback, FieldMappingSpec
- implement ArgParam.default (was accepted and ignored): emits
  options?.x ?? "<default>"; generate() now actually sends the IR's
  deviceType DESKTOP default. default requires optional:true
- validateProjection rewritten to MATCH emission: plain prop access
  through an array is an error (emitted chain would be undefined);
  index/each on non-array is an error; find dot-paths validated
  against item schemas
- NEW LINT: index/find on an UNBOUNDED array warns about silent
  truncation unless acknowledgeSingle:true — fires on Project.generate
  and Screen.edit (the known bug, fixed by Generation results in
  branch 13)
- emitCacheProjection supports index; each/find rejected by CacheSpec
- 15 new IR contract + emitter tests; fixture exercises default +
  acknowledgeSingle (snapshots updated, diff reviewed)

Gates: validate ✓ build ✓ 212/212 unit ✓ 113/113 scripts ✓ tsc ✓


## Diffstat
```
 scripts/test/fixtures/fixture-domain-map.json      |   4 +-
 scripts/test/generate-sdk.test.ts                  | 125 ++++++++++
 scripts/test/ir-schema.test.ts                     |  85 +++++--
 10 files changed, 459 insertions(+), 170 deletions(-)
```
