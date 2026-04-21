// Scrapes Hacker News /newest until we have TARGET_COUNT unique articles.
//
// Edge case worth calling out: new submissions posted mid-scrape can shift
// existing articles down a page, causing duplicates across "More" clicks.
// We dedupe by URL with a Map, which also preserves insertion order so
// "first N seen" == "first N on the page when we loaded it".

const { log } = require("./logger");

/**
 * DOM extraction runs inside page.evaluate — isolated so it's easy to read.
 * Returns a plain array of { title, url, timestamp } from the current page.
 */
function extractArticlesFromPage() {
    const rows = document.querySelectorAll(".athing");
    const out = [];
    rows.forEach((row) => {
        const titleEl = row.querySelector(".titleline > a");
        const subtext = row.nextElementSibling;
        const ageEl   = subtext ? subtext.querySelector(".age") : null;
        if (!titleEl || !ageEl) return;

        // The `title` attribute on .age contains the exact ISO timestamp
        // and Unix seconds — more reliable than parsing "5 minutes ago".
        const titleAttr = ageEl.getAttribute("title") || "";
        const unix = Number(titleAttr.split(" ")[1]);
        out.push({
            title: titleEl.innerText,
            url: titleEl.href,
            timestamp: unix,
        });
    });
    return out;
}

/**
 * Paginates through HN/newest, collecting unique articles until we have
 * at least `targetCount` or the "More" link disappears.
 *
 * @returns {Promise<{ articles: Array, pageLoads: number }>}
 */
async function scrapeArticles(page, targetCount) {
    const articles = new Map();
    let pageLoads = 0;

    while (articles.size < targetCount) {
        await page.waitForSelector(".athing");
        pageLoads += 1;

        const batch = await page.evaluate(extractArticlesFromPage);
        batch.forEach((a) => articles.set(a.url, a));
        log.info(`Collected ${articles.size} unique articles (page ${pageLoads})`);

        if (articles.size >= targetCount) break;

        const moreBtn = page.locator(".morelink");
        if (!(await moreBtn.isVisible())) {
            log.warn(`"More" link not visible — stopping at ${articles.size} articles`);
            break;
        }
        await moreBtn.click();
    }

    return {
        articles: Array.from(articles.values()),
        pageLoads,
    };
}

module.exports = { scrapeArticles };