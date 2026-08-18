# PR: v1/20-e2e-and-release

**Base:** `v1/19-test-architecture` -> **Head:** `v1/20-e2e-and-release`

## Commits

### chore(release): e2e hygiene, portable publish-readiness, RELEASING + MIGRATION docs [V1_PLAN §4.2+4.3]

- e2e projects named e2e-sdk-<runId>; teardown() auto-adopts a server
  delete-project tool the moment one ships (requested; ledger), and
  until then states plainly what was left behind
- live integration suite unlocks on EITHER auth mode (API-key-only
  environments could never run it); stale uploadImage/getImage-as-URL
  calls in the live suite migrated to the 1.0 surface
- publish-readiness: Windows-safe exec (no shell redirections), exit-
  hook cleanup of tarball + temp project even when a check throws,
  writeFileSync import instead of require() in ESM
- pack drops source maps that pointed at unshipped .ts sources:
  441 KB -> 298 KB, back under the 300 KB budget
- RELEASING.md (pipeline order, checklist, gate invariants) and
  MIGRATION-1.0.md (full 0.x -> 1.0 table + rationale) written

Gates: publish:readiness 34/34 ✓ validate ✓ build ✓ 323/323 unit ✓ 113/113 scripts ✓

## Diffstat

```
 packages/sdk/test/integration/live.test.ts | 14 ++---
 scripts/e2e-test.ts                        | 35 ++++++++++++-
 scripts/publish-readiness.ts               | 40 +++++++++++----
 7 files changed, 192 insertions(+), 17 deletions(-)
```
