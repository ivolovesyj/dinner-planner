import axios from 'axios';
import * as cheerio from 'cheerio';

const placeId = "1701633989"; // From previous step
const mobileUrl = `https://m.place.naver.com/restaurant/${placeId}/home`;

async function run() {
    console.log(`Fetching ${mobileUrl}...`);
    try {
        const response = await axios.get(mobileUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1',
                'Referer': 'https://m.place.naver.com/'
            }
        });

        const html = response.data;
        const $ = cheerio.load(html);

        console.log("Title:", $('title').text());

        // Check for serialized state in scripts
        $('script').each((i, el) => {
            const content = $(el).html() || "";
            if (content.includes('window.__APOLLO_STATE__')) {
                console.log("Found window.__APOLLO_STATE__!");
                try {
                    // Extract the JSON string
                    // Usually window.__APOLLO_STATE__ = { ... };
                    const jsonStr = content.match(/window\.__APOLLO_STATE__\s*=\s*({.+?});/)?.[1];
                    if (jsonStr) {
                        const data = JSON.parse(jsonStr);
                        // Find the root Query object or specific restaurant data
                        // It's a normalized cache, so we search values
                        console.log("Keys in State:", Object.keys(data).length);

                        // Look for "name", "roadAddress", "menu" in the values
                        const values = Object.values(data);
                        const business = values.find(v => v.id === placeId || (v.name && v.roadAddress));

                        if (business) {
                            console.log("\n=== Extracted Business Info ===");
                            console.log("Name:", business.name);
                            console.log("Address:", business.roadAddress || business.abbrAddress);
                            console.log("Category:", business.category);
                            console.log("Description:", business.description);
                            console.log("Images:", business.images ? business.images.length : 0);
                        } else {
                            console.log("Could not find business object in Apollo State");
                            // Dump a small sample to debug
                            console.log("Sample value:", JSON.stringify(values[0], null, 2));
                        }

                        // Look for Menu
                        const menus = values.filter(v => v.__typename === 'Menu' || (v.name && v.price));
                        if (menus.length > 0) {
                            console.log(`\n=== Found ${menus.length} Menus ===`);
                            menus.slice(0, 3).forEach(m => console.log(`- ${m.name}: ${m.price}`));
                        }
                    }
                } catch (jsonErr) {
                    console.error("Error parsing Apollo State:", jsonErr.message);
                }
            }
        });

    } catch (e) {
        console.error("Error:", e.message);
    }
}

run();
