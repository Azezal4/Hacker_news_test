// All output concerns: CSV writing and the console summary.
// Kept separate from validators so validators stay pure.

const fs = require("fs");
const path = require("path");
const { OUTPUT_DIR } = require("./config");

function ensureDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Titles can contain commas and quotes.
function csvField(value) {
    return `"${String(value).replace(/"/g, '""')}"`;
}

function csvRow(fields) {
    return fields.map(csvField).join(",");
}

function writeCsv(filename, header, rows) {
    ensureDir(OUTPUT_DIR);
    const fullPath = path.join(OUTPUT_DIR, filename);
    const content = [csvRow(header), ...rows.map(csvRow)].join("\n");
    fs.writeFileSync(fullPath, content);
    return fullPath;
}

function isoFromUnix(unixSeconds) {
    return new Date(unixSeconds * 1000).toISOString();
}

// --- Write to csv------------------------------------------------------------

function writePassReport(items) {
    const rows = items.map((a, i) => [
        i + 1,
        a.title,
        a.url,
        a.timestamp,
        isoFromUnix(a.timestamp),
    ]);
    return writeCsv(
        "passed_sort_cases.csv",
        ["Rank", "Title", "URL", "UnixTimestamp", "ISODate"],
        rows,
    );
}

function writeFailReport(violations) {
    // Each violation is a pair — emit both rows so the CSV tells the
    // story of what's adjacent to what.
    const rows = violations.flatMap((v) => [
        [v.index,     v.prev.title, v.prev.url, v.prev.timestamp, isoFromUnix(v.prev.timestamp), "prev"],
        [v.index + 1, v.curr.title, v.curr.url, v.curr.timestamp, isoFromUnix(v.curr.timestamp), `VIOLATION (+${v.gapSeconds}s newer than prev)`],
    ]);
    return writeCsv(
        "failed_sort_cases.csv",
        ["Rank", "Title", "URL", "UnixTimestamp", "ISODate", "Note"],
        rows,
    );
}

function printSummary(items, durationMs, pageLoads) {
    const oldest = items[items.length - 1];
    const newest = items[0];
    const spanMin = ((newest.timestamp - oldest.timestamp) / 60).toFixed(1);

    console.log("");
    console.log("─".repeat(60));
    console.log(`  Articles validated : ${items.length}`);
    console.log(`  Newest (rank 1)    : ${isoFromUnix(newest.timestamp)}`);
    console.log(`  Oldest (rank ${items.length})  : ${isoFromUnix(oldest.timestamp)}`);
    console.log(`  Time span          : ${spanMin} minutes`);
    console.log(`  Pages fetched      : ${pageLoads}`);
    console.log(`  Duration           : ${(durationMs / 1000).toFixed(2)}s`);
    console.log("─".repeat(60));
}

module.exports = {
    writePassReport,
    writeFailReport,
    printSummary,
    isoFromUnix,
};