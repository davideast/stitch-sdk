# PR: v1/06-codegen-snapshots

**Base:** `v1/05-handler-hardening` -> **Head:** `v1/06-codegen-snapshots`

## Commits

### test(codegen): golden snapshot + compile + behavioral suite over fixture IR [V1_PLAN §1.1]

- generator accepts STITCH_CODEGEN_MANIFEST/_DOMAIN_MAP/_OUT env
  overrides so tests run the REAL pipeline into a sandbox
- fixtures exercise every IR feature: self/param/computed/selfArray,
  optional->options object, rename, Record param (old regex-parser
  killer), projections ([], prop, index, find, each/each), cache,
  factories, parentField, reference keys
- 6 per-file snapshots (source-hash lines stripped so they churn only
  on emitter changes); tsc compile check against stub runtime modules
- 9 behavioral tests on emitted classes via Bun TS import: multi-
  component widget collection (the truncation-bug shape), cache
  short-circuit, factory hydration, constructor string rejection,
  static entityKey
- grep-style test replacement deferred to branch 19 (noted)

Gates: validate ✓ build ✓ 212/212 unit ✓ 98/98 scripts ✓ tsc ✓


## Diffstat
```
 scripts/test/codegen-snapshot.test.ts              | 329 +++++++++++++++++++++
 scripts/test/fixtures/fixture-domain-map.json      | 118 ++++++++
 scripts/test/fixtures/fixture-manifest.json        | 127 ++++++++
 6 files changed, 832 insertions(+), 11 deletions(-)
```
