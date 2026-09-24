# PR: v1/05-handler-hardening

**Base:** `v1/04-construction-paths` -> **Head:** `v1/05-handler-hardening`

## Commits

### fix(download): deterministic error handling and hardening [V1_PLAN §0.5]

- runWithConcurrency rewritten as a worker pool that COLLECTS every
  rejection: the Promise.race pool either swallowed errors or aborted
  sibling downloads, nondeterministically by timing
- per-asset failures surface as explicit warnings; screen still
  downloads (un-rewritten URLs remain remotely functional). Deviation
  from plan text ('success:false on partial') noted in V1_EXECUTION.md
- HTML fetch checks r.ok: an expired signed URL's 403 body is no longer
  saved as code.html and counted as success
- writeAtomic helper unlinks temp files on ANY failure (no .tmp-\* strays)
- asset downloads restricted to https:// URLs
- extension sanitized through the same allowlist as the basename
- fs errors (EACCES/ENOSPC/EROFS/EPERM/EEXIST) map to WRITE_FAILED
  (previously dead code); 'let's just check NOT_FOUND' confusion removed
- 7 new hardening tests; existing fixtures moved to https

Gates: validate ✓ build ✓ 212/212 unit ✓ 81/81 scripts ✓ tsc ✓

STAGE A COMPLETE

## Diffstat

```
 packages/sdk/src/download-handler.ts              | 128 ++++++++---
 packages/sdk/test/unit/download-hardening.test.ts | 249 ++++++++++++++++++++++
 packages/sdk/test/unit/download.test.ts           |  62 +++---
 4 files changed, 378 insertions(+), 63 deletions(-)
```
