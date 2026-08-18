# PR: v1/04-construction-paths

**Base:** `v1/03-entity-manager` -> **Head:** `v1/04-construction-paths`

## Commits

### fix(entities)!: route all construction through the identity map [V1_PLAN §0.2]

Two shipped features were broken by the #358 regression (constructors no
longer hydrate IDs) and masked by over-mocked tests:

- Project.upload() returned Screens with undefined screenId/projectId;
  now resolved via client.entities (test asserts hydrated identity)
- proxy download_assets tool constructed Project from a string (always
  ZodError) AND its dummyClient returned raw MCP envelopes, so server
  errors read as '0 screens, success'. Now: identity-map construction,
  shared parseToolResult (extracted from StitchToolClient), and isError
  envelopes throw StitchError
- generated constructors now THROW a descriptive VALIDATION_ERROR on
  string data, pointing to the factory methods (BREAKING: new
  Project(client, 'id') was silently broken; now it is loudly broken)
- StitchToolClientSpec gains 'entities'; virtual tools share a single
  registry (no hardcoded name list)
- new virtual-tools.test.ts exercises the REAL Project + EntityManager +
  envelope-parsing path (no Project mock)

Gates: validate ✓ build ✓ 205/205 unit ✓ 81/81 scripts ✓ tsc ✓

## Diffstat

```
 packages/sdk/test/unit/upload.test.ts        |  19 +++--
 packages/sdk/test/unit/virtual-tools.test.ts | 101 ++++++++++++++++++++++
 scripts/generate-sdk.ts                      |   8 ++
 14 files changed, 250 insertions(+), 78 deletions(-)
```
