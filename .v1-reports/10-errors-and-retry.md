# PR: v1/10-errors-and-retry

**Base:** `v1/09-response-fixtures` -> **Head:** `v1/10-errors-and-retry`

## Commits

### feat(runtime): central error mapper + idempotent-read retry [V1_PLAN §2.2+2.3]

- New src/spec/error-mapping.ts: classifyError({ status?, text? }) —
  status ALWAYS wins (429/404/403/401/5xx); text fallback (MCP isError
  path) uses word-boundary regexes, so "author"/"authorize" never
  classify as AUTH_FAILED and "1404 items" never fires \b404\b; plus
  isRecoverable() (RATE_LIMITED | NETWORK_ERROR)
- Adopted in all 3 divergent sites: client.ts parseToolResult + httpPost,
  upload-handler.ts catch (StitchError code trusted, 403 no longer
  mislabeled AUTH_FAILED → UPLOAD_FAILED since UploadErrorCode lacks
  PERMISSION_DENIED), download-handler.ts catch (fs-code WRITE_FAILED
  and local fetch/network → FETCH_FAILED checks kept ahead of mapper,
  NOT_FOUND → PROJECT_NOT_FOUND)
- Retry (D6 REVISED): StitchConfigSchema gains
  retry: false | { attempts (1-10, default 3), baseMs 250, maxMs 4000 };
  callTool auto-retries RATE_LIMITED only, for /^(get_|list_)/ tools
  only — generative/mutating tools never auto-retry (a retried
  generation duplicates minutes of work and quota); full-jitter
  exponential backoff via exported computeBackoffMs(); httpPost has NO
  retry (mutating uploads), documented inline. Retry-After not honored:
  MCP text errors carry no headers
- 50 new tests: status/text/precedence/word-boundary matrix
  (error-mapping.test.ts) + fake-timer retry suite (retry.test.ts:
  rate-limited-twice-then-success = 3 calls, generative throws
  immediately with zero timers, retry:false, non-RATE_LIMITED never
  retried, backoff cap). All existing client.test.ts error-code
  expectations pass unchanged — the mapper is faithful to prior behavior

Gates: validate ✓ check:skills ✓ build ✓ 278/278 unit ✓ 113/113 scripts ✓ tsc ✓


## Diffstat
```
 packages/sdk/src/upload-handler.ts           |  19 ++-
 packages/sdk/test/unit/error-mapping.test.ts | 110 ++++++++++++++++
 packages/sdk/test/unit/retry.test.ts         | 181 +++++++++++++++++++++++++++
 8 files changed, 475 insertions(+), 61 deletions(-)
```
