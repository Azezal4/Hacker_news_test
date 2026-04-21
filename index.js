// QA Wolf Take-Home — Question 1
// Validates that EXACTLY the first 100 articles on Hacker News/newest
// are sorted from newest to oldest (descending by Unix timestamp).
//
// Run: node index.js

const { chromium, expect } = require("@playwright/test");

const { TARGET_COUNT, HN_URL, HN_EXPECTED_TITLE, HEADLESS } = require("./src/config");
const { log } = require("./src/logger");
const { scrapeArticles } = require("./src/scraper");
const { validateSortOrder, validateInvariants } = require("./src/validators");
const { writePassReport, writeFailReport, printSummary } = require("./src/reporter");

async function sortHackerNewsArticles() {
    const started = Date.now();
    const browser = await chromium.launch({ headless: HEADLESS });
    const context = await browser.newContext();
    const page = await context.newPage();

    let exitCode = 0;

    try {
        log.info(`Navigating to ${HN_URL}`);
        await page.goto(HN_URL);
        await expect(page).toHaveTitle(HN_EXPECTED_TITLE);

        const { articles, pageLoads } = await scrapeArticles(page, TARGET_COUNT);

        if (articles.length < TARGET_COUNT) {
            log.fail(`Could not collect ${TARGET_COUNT} articles (got ${articles.length})`);
            exitCode = 1;
            return;
        }

        const first100 = articles.slice(0, TARGET_COUNT);

        const sortResult = validateSortOrder(first100);
        const invResult  = validateInvariants(first100);

        printSummary(first100, Date.now() - started, pageLoads);

        if (sortResult.passed) {
            log.pass(`All ${TARGET_COUNT} articles are sorted newest-to-oldest`);
            log.info(`Report: ${writePassReport(first100)}`);
        } else {
            log.fail(`Sort order violated in ${sortResult.violations.length} place(s):`);
            sortResult.violations.forEach((v) => {
                const snippet = v.curr.title.slice(0, 60);
                console.error(`  @ rank ${v.index}→${v.index + 1}: "${snippet}" is ${v.gapSeconds}s newer than its predecessor`);
            });
            log.info(`Failure report: ${writeFailReport(sortResult.violations)}`);
            exitCode = 1;
        }

        if (invResult.passed) {
            log.pass(`All invariants passed (unique URLs, valid timestamps, non-empty titles)`);
        } else {
            log.fail(`Invariant violations:`);
            invResult.issues.forEach((i) => console.error(`  ${i}`));
            exitCode = 1;
        }
    } catch (err) {
        log.fail(`Unexpected error: ${err.message}`);
        console.error(err);
        exitCode = 1;
    } finally {
        await browser.close();
        process.exit(exitCode);
    }
}

(async () => {
    await sortHackerNewsArticles();
})();