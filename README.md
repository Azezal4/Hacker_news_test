# Solution Notes

## Run it

```bash
npm install
node index.js
```

Launches Chromium (headed so you can watch), scrapes HN/newest until it has 100 unique articles, validates sort order, writes a CSV to `reports/`. Exit code 0 on pass, 1 on fail.

## Structure

```
index.js              entry point
src/config.js         constants
src/logger.js         [INFO]/[PASS]/[FAIL] prefixes
src/scraper.js        HN page interaction
src/validators.js     sort check + invariants (pure functions)
src/reporter.js       CSV output + summary
```

Split it up so the validators can be tested without a browser, and so changes to HN's DOM only touch one file.

## The tricky bit — pagination shift

New articles get posted to HN every few seconds. 100 articles means ~4 "More" clicks. If a new article drops between my page 1 and page 2 loads, every existing article shifts down a spot and I'd see duplicates across pages.

Fix: collect into a Map keyed by URL. Duplicates overwrite themselves. Keep paginating until the Map has 100 entries, then slice.

## Timestamps

The `.age` element has a `title` attribute like `"2026-04-20T14:32:00 1745160720"` — I parse the Unix seconds out of that instead of the "5 minutes ago" text, which has bad resolution and lags.

Newest-to-oldest means descending by timestamp. I check `prev >= curr` pairwise.

## Extra checks

Sort order is the stated task, but a sort check alone wouldn't catch:

- duplicate URLs
- timestamps in the future (clock skew / parse bugs)
- empty titles
- NaN timestamps

Added those as separate invariants. They run after the sort check and report separately.

## Trade-offs

- **Standalone script, not `@playwright/test` runner.** The assignment says `node index.js`, so I kept it that way. I use `expect` from `@playwright/test` for the title assertion.
- **Headed by default** so it's easier to watch. One-line config change for CI.
- **Single browser.** Cross-browser runs would be the next thing to add.
- **No retry on "More" click.** HN has been stable for me, but for production I'd wrap clicks with a retry + backoff.

## If I had more time

- Run it 50 times and measure flake rate
- Cross-check timestamps against the HN Firebase API as an independent source of truth
- Unit tests for `validators.js` (they're pure, so it'd be quick)

## Note

I used AI to help with code review and structure, the way I'd use a senior engineer. The pagination-shift catch, the invariants, and the module split are mine, I can explain every line.