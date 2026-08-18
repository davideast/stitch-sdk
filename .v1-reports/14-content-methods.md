# PR: v1/14-content-methods

**Base:** `v1/13-generation-results` -> **Head:** `v1/14-content-methods`

## Commits

### feat(api)!: content-fetching getHtml/getImage; URL accessors; cache write-back [V1_PLAN §3.2]

D2: method names now do what they promise.

- generated getHtmlUrl()/getImageUrl(): cache-aware URL accessors with
  IR cache.writeBack — the get_screen response merges into this.data,
  so repeat calls stop refetching (pinned by test: 1 API call total)
- handwritten screen-ext getHtml() returns the HTML CONTENT; getImage()
  returns screenshot bytes (Uint8Array). Expired signed URLs throw
  NETWORK_ERROR with a refetch hint; missing artifacts throw NOT_FOUND
- the '|| ""' emission is dead: typed projections that come back empty
  throw NOT_FOUND instead of silently returning ""
- EntityManager gains an implementation REGISTRY: project-ext and
  screen-ext register as the canonical classes for their entityKey, so
  EVERY resolve (generated self-references like edit() returning
  Screens, uploads, factories) instantiates the extension class —
  without generated code importing its own extension (no ESM cycle/TDZ)
- BREAKING: getHtml/getImage now fetch content (URL callers migrate to
  getHtmlUrl/getImageUrl); missing artifacts throw instead of ""
- examples/e2e/usage skill migrated; 7 new content/write-back/registry
  tests

Gates: validate ✓ check:skills ✓ build ✓ 325/325 unit ✓ 113/113 scripts ✓ tsc ✓

## Diffstat

```
 scripts/e2e-test.ts                                |   8 +-
 scripts/generate-sdk.ts                            |  22 +++-
 scripts/ir-schema.ts                               |   5 +
 30 files changed, 427 insertions(+), 79 deletions(-)
```
