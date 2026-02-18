// EDIT THIS FILE TO COMPLETE ASSIGNMENT QUESTION 1
const fs = require("fs");
const { expect, chromium, test } = require("@playwright/test");


async function sortHackerNewsArticles() {
    // launch browser
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    // Killing the browser caching
    const session = await context.newCDPSession(page); 
    await session.send('Network.setCacheDisabled', { cacheDisabled: true });
    
    // Handling exceptions
    try {
        // Test 1: go to Hacker News
        await page.goto("https://news.ycombinator.com/newest");
        await expect(page).toHaveTitle("New Links | Hacker News");

        // Use a Map to store unique articles by URL to handle "pagination shifting"
        const articleMap = new Map();

        // fetching all the relevant topics such as URL, Title, Timestamps and Links
        while (articleMap.size < 100) {
            await page.waitForSelector(".athing");

            const pageData = await page.evaluate(() => {
                const results = [];
                const rows = document.querySelectorAll(".athing");

                rows.forEach((row) => {
                    const titleElement = row.querySelector(".titleline > a");
                    const nextRow = row.nextElementSibling;
                    const ageElement = nextRow ? nextRow.querySelector(".age") : null;

                    if (titleElement && ageElement) {
                        const title = titleElement.innerText;
                        const url = titleElement.href;
                        const timestampAttr = ageElement.getAttribute("title");

                        var unixTimestamps = Number(timestampAttr.split(" ")[1]);
                        results.push({ title, url, timestamp: unixTimestamps });
                    }
                });
                return results;
            });

            // Test Condition: If a new article is posted during test
            // old one might get shifted making duplicate data during pagination
            pageData.forEach(art => articleMap.set(art.url, art));
            console.log(`Collected ${articleMap.size} unique articles so far...`)
            
            // locate and autoclink on more
            if (articleMap.size < 100) {
                var moreButton = page.locator(".morelink");
                if (await moreButton.isVisible()) {
                    await moreButton.click();
                } else {
                    break;
                }
            }
        }
        // Convert map value to array
        var allNews = Array.from(articleMap.values());
        // Slicing data as it fetched 120
        const sliced100 = allNews.slice(0, 100);
       
        const failureItems = [];

        // validating fetched and sorted items : bool
        const isSorted = sliced100.every(
            (val, i) => {
                if (i === 0) return true 
                return sliced100[i - 1].timestamp >= val.timestamp
        });

        if (isSorted) {
            console.log("Articles are sorted in Ascending order \n");
            /* 
            Note: Unable to use playwright-reporter because it lacked project run scope
            Generating custom csv file for further human validation.
            */
           const csvRows = ["Rank,Title, URL, Human_Readable_Date, Timestamp"];
           const csvData = sliced100.map((pd, index) => {
                return `"${index + 1}", "${pd.title}", "${pd.url}", ${pd.timestamp}, ${new Date(pd.timestamp)}`;
            });

            fs.writeFileSync("passed_sort_cases.csv", csvRows + csvData.join("\n"));
            console.log("Results saved to hacker_news_results.csv");
            
            await page.goto(
                "https://i.pinimg.com/736x/a5/99/ab/a599ab0a566a169aa0cd5ecbb4036e7d.jpg",
            );
            await page.waitForTimeout(5000);
        } 
        else {
            // Error Segregation : if failed list out the failed ones in the csv file
            console.log("Fetched articles not sorted");
            sliced100.forEach((val, i) => {
                if (i > 0 && sliced100[i - 1].timestamp < val.timestamp) {
                    console.error(`SORT VIOLATION FOUND: -----------------------`);
                    console.error(`Index ${i-1}: ${sliced100[i-1].title} (TS: ${sliced100[i-1].timestamp})`);
                    console.error(`Index ${i}: ${val.title} (TS: ${val.timestamp})`);
                    console.error(`Difference: ${val.timestamp - sliced100[i-1].timestamp} seconds out of order.`);
                    failureItems.push({
                            rank: i + 1,
                            title: val.title,
                            timestamp: val.timestamp,
                            error: `Newer than rank ${i}`
                    });
                }
            });
            // reporting failed test cases
            const failureHeader = "Index,Title,URL,Timestamp,Human_Readable_Date\n";
            const failureData = failureItems.map((pd) => {
                return `"${pd.rank}","${pd.title}","${pd.url}",${pd.timestamp},"${new Date(pd.timestamp * 1000).toLocaleString()}"`;
            }).join("\n");

            fs.writeFileSync("failed_sort_cases.csv", failureHeader + failureData);
            console.warn(`Failure report generated: failed_sort_cases.csv (${failureItems.length} items)`);
        }
    } 
    catch (e) {
        console.log("Error Occured: ", e);
    } 
    finally {
        // marks completion of all test cases
        await browser.close();
    }
}

(async () => {
    // wait for the page to load
    await sortHackerNewsArticles();
})();
