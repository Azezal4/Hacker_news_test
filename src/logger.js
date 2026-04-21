// Minimal structured logger.

const log = {
    info: (m) => console.log(`[INFO]  ${m}`),
    warn: (m) => console.warn(`[WARN]  ${m}`),
    pass: (m) => console.log(`[PASS]  ${m}`),
    fail: (m) => console.error(`[FAIL]  ${m}`),
};

module.exports = { log };