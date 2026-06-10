# PR: v1/21-docs-audit

**Base:** `v1/20-e2e-and-release` -> **Head:** `v1/21-docs-audit`

## Commits

### docs: README + development skill audited against the 1.0 surface [V1_PLAN §4.4]

- README: Generation results, content-fetching getHtml/getImage with
  URL accessors, options objects, /tools subpath imports, accurate
  method tables, write-back cache + NOT_FOUND semantics
- stitch-sdk-development skill: phantom fieldMapping/idField example
  REPLACED with the real reference.keys shape; cache examples updated
  to the Generation API
- stitch-sdk-usage and stitch-sdk-domain-design were migrated in their
  feature branches (08/13/14); examples migrated in 13/14

Gates: check:skills ✓ validate ✓ 323/323 unit ✓ 113/113 scripts ✓

STAGE E COMPLETE — TRAIN COMPLETE


## Diffstat
```
 .agents/skills/stitch-sdk-development/SKILL.md | 13 +++-------
 V1_EXECUTION.md                                |  2 +-
 packages/sdk/README.md                         | 36 ++++++++++++++------------
 3 files changed, 24 insertions(+), 27 deletions(-)
```
