# PR: v1/08-capture-raw-skills

**Base:** `v1/07-ir-strict` -> **Head:** `v1/08-capture-raw-skills`

## Commits

### feat(pipeline): raw capture, load/serve-time schema repair, skill/IR consistency gate [V1_PLAN §1.5+1.6]

- refreshTools stores schemas RAW: the captured manifest is no longer
  coupled to repair heuristics (a repair-logic change previously
  rewrote the pipeline's source of truth silently)
- repair moved to consumption points: proxy listTools repairs a served
  copy; generate-sdk repairs at load and records repaired tool names in
  lock.generated.repairedTools (server-side schema fixes show as diffs)
- stitch-sdk-domain-design skill: phantom fieldMapping/idField docs
  purged; strict IR, acknowledgeSingle lint, param default, find, and
  the D12 options-object signature documented
- new scripts/check-skill-consistency.ts (bun run check:skills, in CI):
  required tokens present, dead tokens absent, lists behaviorally
  pinned to ir-schema via safeParse probes
- DEVIATION: doc-generation from Zod descriptions deferred in favor of
  the consistency check (same drift protection, far less machinery)

Gates: check:skills ✓ validate ✓ build ✓ 212/212 unit ✓ 113/113 scripts ✓ tsc ✓

## Diffstat

```
 packages/sdk/src/proxy/handlers/listTools.ts     |  12 +-
 scripts/check-skill-consistency.ts               | 149 +++++++++++++++++++++++
 scripts/generate-sdk.ts                          |  22 ++++
 9 files changed, 227 insertions(+), 42 deletions(-)
```
