# PR: v1/03-entity-manager

**Base:** `v1/02-ci-and-packaging` -> **Head:** `v1/03-entity-manager`

## Commits

### fix(entities)!: composite identity-map keys; never cache partial identities [V1_PLAN §0.1]

- cache key is now ClassName + ALL reference key values (JSON-encoded):
  the same screen ID under two projects yields two distinct instances.
  Previously both resolved to ONE instance bound to the first project,
  sending subsequent get_screen calls to the wrong project (verified bug)
- entities with underivable identity are returned UNCACHED instead of
  aliasing under a shared 'unknown' key; STITCH_DEBUG=1 surfaces a warn
- generated classes emit static entityKey; EntityManager prefers it over
  EntityClass.name, which breaks under minified consumer bundles
- BREAKING (behavioral): resolve with a bare ID that under-specifies a
  multi-key entity no longer returns the cached scoped instance
- EntityManager test matrix: 13 tests (collision regression, merge-on-hit,
  hooks, dispose/clear, minification, debug warn)

Gates: validate ✓ build ✓ 201/201 unit ✓ 81/81 scripts ✓ tsc ✓

## Diffstat

```
 packages/sdk/src/entity-manager.ts            | 104 ++++++++-----
 packages/sdk/test/unit/entity-manager.test.ts | 205 ++++++++++++++++++++++++--
 scripts/generate-sdk.ts                       |   9 ++
 8 files changed, 282 insertions(+), 48 deletions(-)
```
