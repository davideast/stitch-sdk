# PR: v1/13-generation-results

**Base:** `v1/12-proxy-unification` -> **Head:** `v1/13-generation-results`

## Commits

### feat(api)!: Generation results — generate/edit/variants/apply return ALL screens [V1_PLAN §3.1]

THE 1.0 headline fix. Stitch returns many screens per generation;
project.generate() and screen.edit() silently truncated to one via a
find+index projection. Root cause was an IR modeling flaw, fixed at the
IR level so the bug class cannot recur:

- new Generation<Item, Raw> container (handwritten src/generation.ts,
  exported): .screens (all of them), .first (response order — NOT
  server-designated, hence not 'primary'), .raw (full typed response,
  so future server enrichment like userFeedback/progress is additive),
  iterable, .length
- IR: returns.kind 'generation' — requires class, requires an 'each'
  projection (single-item projections on generative responses are
  structurally impossible), forbids redundant 'array'
- codegen: emits Generation<Class, ToolResponse>; empty generations
  throw a descriptive StitchError at the call site so .first is total
- truncation lint ESCALATES to a hard codegen error for generate_/
  edit_/apply_ tools without kind:'generation'
- domain-map: all four generative bindings migrated to each/each +
  kind:'generation'
- BREAKING: generate/edit return Generation (was Screen); variants/
  apply return Generation (was Screen[])
- response-fixture tests flip from pinning the truncation to PROVING
  the fix: 3 screens across 2 components, all returned, raw exposed
- examples, e2e script, usage skill migrated; codegen fixtures cover
  the generation emission path (snapshots + behavioral + compile)

Gates: validate ✓ check:skills ✓ build ✓ 318/318 unit ✓ 113/113 scripts ✓ tsc ✓


## Diffstat
```
 .../__snapshots__/codegen-snapshot.test.ts.snap    |  9 ++--
 scripts/test/codegen-snapshot.test.ts              | 14 +++++-
 scripts/test/fixtures/fixture-domain-map.json      |  4 +-
 32 files changed, 313 insertions(+), 105 deletions(-)
```
