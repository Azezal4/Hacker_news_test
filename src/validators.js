// Validation logic. Pure functions — no I/O, no side effects.
// This separation means these could be unit-tested without Playwright.

const { CLOCK_SKEW_GRACE_SECONDS } = require("./config");

/**
 * Primary assertion: articles are sorted newest-to-oldest.
 * Newest-to-oldest means DESCENDING by Unix timestamp.
 *
 * @returns {{ passed: boolean, violations: Array }}
 */
function validateSortOrder(items) {
    const violations = [];
    for (let i = 1; i < items.length; i++) {
        const prev = items[i - 1];
        const curr = items[i];
        if (prev.timestamp < curr.timestamp) {
            violations.push({
                index: i,
                prev,
                curr,
                gapSeconds: curr.timestamp - prev.timestamp,
            });
        }
    }
    return { passed: violations.length === 0, violations };
}

/**
 * Extra QA invariants the stated sort check wouldn't catch on its own:
 *   - duplicate URLs (dedup logic failure or HN bug)
 *   - future timestamps (clock / timezone issues)
 *   - empty titles (parse failure)
 *   - non-finite timestamps (NaN slipping through a missing attribute)
 *
 * @returns {{ passed: boolean, issues: string[] }}
 */
function validateInvariants(items) {
    const nowSec = Math.floor(Date.now() / 1000);
    const seen = new Set();
    const issues = [];

    items.forEach((item, i) => {
        const rank = i + 1;
        if (!item.title || !item.title.trim()) {
            issues.push(`Item #${rank}: empty title`);
        }
        if (!Number.isFinite(item.timestamp) || item.timestamp <= 0) {
            issues.push(`Item #${rank}: invalid timestamp (${item.timestamp})`);
        }
        if (item.timestamp > nowSec + CLOCK_SKEW_GRACE_SECONDS) {
            issues.push(`Item #${rank}: future timestamp (${new Date(item.timestamp * 1000).toISOString()})`);
        }
        if (seen.has(item.url)) {
            issues.push(`Item #${rank}: duplicate URL (${item.url})`);
        }
        seen.add(item.url);
    });

    return { passed: issues.length === 0, issues };
}

module.exports = { validateSortOrder, validateInvariants };