# PR: v1/02-ci-and-packaging

**Base:** `v1/01-deterministic-codegen` -> **Head:** `v1/02-ci-and-packaging`

## Commits

### fix(packaging): CI gates, optional peer deps, exports order, release script repair [V1_PLAN §0.3b+0.4]

- CI: validate:generated and test:scripts now run on every PR (the
  lock system and codegen/IR contract tests previously never ran in CI)
- @google/adk, @google/genai, ai declared as OPTIONAL peerDependencies;
  adk-adapter uses a guarded dynamic import with an actionable install
  message instead of a bare ERR_MODULE_NOT_FOUND
- exports map lists 'types' condition first (publint/TS node16 rule)
- delete phantom release scripts (pack:local, deploy:release,
  validate:release referenced nonexistent files); implement
  scripts/sync-versions.ts (+ --check mode); root version synced 0.3.5
- publish-readiness: adds publint, validate:generated, and version-sync
  checks; publint repository.url suggestion applied

Gates: publint ✓ validate ✓ build ✓ 190/190 unit ✓ 81/81 scripts ✓ tsc ✓


## Diffstat
```
 packages/sdk/src/adk-adapter.ts | 17 +++++++-
 scripts/publish-readiness.ts    | 40 +++++++++++++++++
 scripts/sync-versions.ts        | 55 ++++++++++++++++++++++++
 8 files changed, 203 insertions(+), 53 deletions(-)
```
