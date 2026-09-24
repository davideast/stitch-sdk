# PR: v1/17-adapters

**Base:** `v1/16-types-and-exports` -> **Head:** `v1/17-adapters`

## Commits

### feat(adapters)!: real ai primitives, loud include validation, cycle-safe adk schemas [V1_PLAN §3.6]

- tools-adapter now imports dynamicTool/jsonSchema from the optional
  peer 'ai' (guarded TLA import with actionable install error). The
  forged Symbol.for('vercel.ai.schema') object — coupling to
  undocumented internals of a fast-moving package — is DELETED
- include filters THROW on unknown tool names in both the AI SDK and
  ADK adapters (misspelled names previously vanished silently from the
  agent's toolbox)
- adk cleanSchema breaks self-recursive $def cycles with {} instead of
  embedding in-progress objects by reference (circular JSON explosion)
- BREAKING: importing @google/stitch-sdk/ai without 'ai' installed now
  throws at import with install instructions (previously worked by
  forgery); include typos throw

Gates: validate ✓ build ✓ 323/323 unit ✓ 113/113 scripts ✓ tsc ✓

## Diffstat

```
 packages/sdk/src/adk-adapter.ts               | 23 ++++++++++++
 packages/sdk/src/tools-adapter.ts             | 54 +++++++++++++++++----------
 packages/sdk/test/unit/adapter-guards.test.ts | 51 +++++++++++++++++++++++++
 4 files changed, 109 insertions(+), 21 deletions(-)
```
