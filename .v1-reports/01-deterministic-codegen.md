# PR: v1/01-deterministic-codegen

**Base:** `v1/00-d12-options-object` -> **Head:** `v1/01-deterministic-codegen`

## Commits

### fix(pipeline): deterministic codegen and portable, passing lock validation [V1_PLAN §0.3a]

- hashDirectory hashes paths relative to the generated dir (posix-
  normalized): same content now hashes identically on every machine
- remove Generated timestamp from emitted file headers; output is
  byte-reproducible and back-to-back generation is a zero diff
- lock generatedAt only bumps when content hashes change (idempotent)
- corrupt stitch-sdk.lock now fails loudly in generate + capture
  instead of silently resetting and discarding sections
- capture writes manifest+lock atomically (tmp + rename)
- reconcile lock.manifest.sourceHash with the committed manifest
  (stale since #359); live re-capture tracked in needs-human ledger

validate:generated now passes on a clean checkout.
Gates: validate ✓ idempotency ✓ build ✓ 190/190 unit ✓ 81/81 scripts ✓ tsc ✓

## Diffstat

```
 scripts/capture-tools.ts                          | 33 +++++++++----
 scripts/generate-sdk.ts                           | 57 +++++++++++++++++++----
 scripts/validate-generated.ts                     |  6 ++-
 13 files changed, 83 insertions(+), 36 deletions(-)
```
