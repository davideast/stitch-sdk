# PR: v1/19-test-architecture

**Base:** `v1/18-bundle-and-misc` -> **Head:** `v1/19-test-architecture`

## Commits

### test(arch): spec-typed generated clients, coverage floors in CI, env hygiene [V1_PLAN §4.1]

- generated classes type their client as StitchToolClientSpec (not the
  concrete class): tests and alternative transports inject spec-
  conforming fakes — the over-mocking pressure that hid the upload and
  download_assets regressions is structurally gone
- v8 coverage wired into CI with FLOORS: 70% global lines, 100% on
  entity-manager.ts and error-mapping.ts (the two modules whose subtle
  bugs shipped). Current global: 91.9%
- process.env whole-object swaps replaced with vi.stubEnv (order-safe
  under parallel suites); stray console.log removed from sdk.test
- DEVIATION (logged): converting every existing vi.mock to spec fakes
  and replacing grep-style generated-source tests is deferred — the
  snapshot+behavioral fixture suite (branch 06) already covers their
  intent; converting live tests is per-file churn best done as touched

Gates: validate ✓ build ✓ 323/323 unit (91.9% cov) ✓ 113/113 scripts ✓ tsc ✓


## Diffstat
```
 packages/sdk/vitest.config.ts                      | 18 ++++++
 scripts/generate-sdk.ts                            | 11 ++--
 .../__snapshots__/codegen-snapshot.test.ts.snap    | 12 ++--
 14 files changed, 121 insertions(+), 62 deletions(-)
```
