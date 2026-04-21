// Centralised config. Keeping magic numbers out of the main logic.

module.exports = {
    TARGET_COUNT: 100,
    HN_URL: "https://news.ycombinator.com/newest",
    HN_EXPECTED_TITLE: "New Links | Hacker News",
    OUTPUT_DIR: "reports",
    HEADLESS: false,
    CLOCK_SKEW_GRACE_SECONDS: 60,
};