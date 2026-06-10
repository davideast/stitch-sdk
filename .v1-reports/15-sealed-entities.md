# PR: v1/15-sealed-entities

**Base:** `v1/14-content-methods` -> **Head:** `v1/15-sealed-entities`

## Commits

### feat(entities)!: sealed constructors + entityCache value-object mode [V1_PLAN §3.3]

- generated entity constructors are PROTECTED: the EntityManager is the
  one sanctioned construction path (hydrates reference keys, dedupes,
  upgrades to extension classes). Public path: factories + returns.
  Runtime string-guard kept for plain-JS consumers
- EntityManager.resolve takes EntityClassRef<T> (prototype-typed, not a
  construct signature) so sealed classes pass the type checker; the
  internal construction cast is deliberate and documented
- new entityCache config (default true): false gives value-object
  behavior — every resolve returns a fresh, fully-hydrated, never-
  cached instance (for consumers who don't want shared mutable
  instances). Identity-map LRU/WeakRef bounding explicitly DEFERRED
  past 1.0 pending a real memory report (pre-mortem amendment 6)
- BREAKING: new Screen(...)/new Project(...) is now a compile error in
  TS (was a runtime error since v1/04)

Gates: validate ✓ check:skills ✓ build ✓ 326/326 unit ✓ 113/113 scripts ✓ tsc ✓


## Diffstat
```
 packages/sdk/test/unit/entity-manager.test.ts      | 18 ++++++++++
 scripts/generate-sdk.ts                            |  4 +++
 .../__snapshots__/codegen-snapshot.test.ts.snap    |  8 +++--
 11 files changed, 71 insertions(+), 22 deletions(-)
```
