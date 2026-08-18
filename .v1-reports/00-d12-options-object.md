# PR: v1/00-d12-options-object

**Base:** `main` -> **Head:** `v1/00-d12-options-object`

## Commits

### docs(v1): mark v1/00 green in execution table

### feat(codegen)!: optional params move to trailing options object [V1_PLAN D12]

Required tool params stay positional (IR order); all optional params are
collected into a single trailing 'options?: { ... }' parameter so future
fields (onProgress, signal, new server params) can be added without
breaking method signatures.

- generateMethodParams replaces generateParamType: emits structured
  ts-morph parameters, removing the regex param re-parse (Phase 1.4 hazard)
- generateArgsObject routes optional params as options?.x, including
  computed-template interpolation
- collision guard: required param named 'options' fails codegen
- BREAKING: createProject(title) -> createProject({ title });
  createDesignSystemFromDesignMd(x, deviceType) -> (x, { deviceType });
  generate/edit/variants optional args move into options
- call sites, tests, README, and skills updated

### docs: add V1 plan with pre-mortem amendments and autonomous execution plan

## Diffstat

```
 packages/sdk/test/unit/sdk.test.ts                |    2 +-
 scripts/generate-sdk.ts                           |   90 +-
 scripts/test/generate-sdk.test.ts                 |  131 +-
 19 files changed, 1534 insertions(+), 1765 deletions(-)
```
