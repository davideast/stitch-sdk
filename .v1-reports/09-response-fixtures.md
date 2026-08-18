# PR: v1/09-response-fixtures

**Base:** `v1/08-capture-raw-skills` -> **Head:** `v1/09-response-fixtures`

## Commits

### test(fixtures): per-binding response fixtures + drift early-warning [V1_PLAN §1.7]

- 13 synthesized per-tool fixtures in test/fixtures/responses/;
  generation responses deliberately contain 3 screens across 2
  outputComponents (the server shape that caused the truncation bug)
- 16 tests: every domain-map binding runs against its fixture through
  the REAL generated SDK; a completeness gate fails when a binding is
  added without a fixture case
- Project.generate / Screen.edit truncation is PINNED as current
  behavior with an explicit branch-13 marker; Screen.variants and
  DesignSystem.apply assert ALL screens are collected
- scripts/refresh-response-fixtures.ts re-records read-only fixtures
  from the live API (sanitized) — a non-empty diff after a server
  deploy is the schema-drift early-warning signal

Gates: validate ✓ check:skills ✓ build ✓ 228/228 unit ✓ 113/113 scripts ✓ tsc ✓

STAGE B COMPLETE

## Diffstat

```
 .../test/fixtures/responses/upload_design_md.json  |   1 +
 packages/sdk/test/unit/response-fixtures.test.ts   | 194 +++++++++++++++++++++
 scripts/refresh-response-fixtures.ts               |  86 +++++++++
 16 files changed, 474 insertions(+), 1 deletion(-)
```
