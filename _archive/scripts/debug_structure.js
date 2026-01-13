import axios from 'axios';
import * as cheerio from 'cheerio';

const placeId = '1927978962'; // From the log (Yeol Ddang Jya)
const mobileUrl = `https://m.place.naver.com/restaurant/${placeId}/photo`;

async function debug() {
    console.log(`Fetching ${mobileUrl}...`);
    try {
        const mobileResponse = await axios.get(mobileUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1',
                'Referer': 'https://m.place.naver.com/'
            },
            timeout: 5000
        });

        const $ = cheerio.load(mobileResponse.data);
        const scriptContent = $('script').map((i, el) => $(el).html()).get().join('\n');
        const stateMatch = scriptContent.match(/window\.__APOLLO_STATE__\s*=\s*({.+?});/);

        if (stateMatch) {
            const state = JSON.parse(stateMatch[1]);
            const values = Object.values(state);

            // Find the main business object
            const business = values.find(v => v.id === placeId && v.name && v.__typename !== 'Menu');

            if (business) {
                console.log('--- Business Object Keys ---');
                console.log(Object.keys(business));

                console.log('\n--- Business Object Content (Partial) ---');
                console.log(JSON.stringify(business, null, 2).substring(0, 2000)); // Print first 2000 chars

                // Check for anything looking like an image
                console.log('\n--- Potential Image Fields (Business Object) ---');
                for (const key of Object.keys(business)) {
                    console.log(`${key}:`, JSON.stringify(business[key]).substring(0, 100));
                }

                console.log('\n--- Searching for Line Info (호선) ---');
                const lineInfo = values.filter(v => JSON.stringify(v).includes('호선'));
                console.log(`Found ${lineInfo.length} objects containing '호선'.`);
                if (lineInfo.length > 0) {
                    lineInfo.slice(0, 3).forEach(v => console.log(JSON.stringify(v, null, 2).substring(0, 500)));
                }

                console.log('\n--- Searching All State Values for Photos ---');
                const photoObjects = values.filter(v =>
                    v.__typename &&
                    (v.__typename.includes('Photo') || v.__typename.includes('Image'))
                );
                console.log(`Found ${photoObjects.length} objects with 'Photo' or 'Image' in typename.`);

                if (photoObjects.length > 0) {
                    console.log('Sample Photo Object:', JSON.stringify(photoObjects[0], null, 2));
                } else {
                    // Fallback search: look for any 'list' strings that might be base64 or weird URLs
                    console.log('No Photo objects found. Dumping first 5 objects to see structure:');
                    values.slice(0, 5).forEach(v => console.log(v));
                }
            } else {
                console.log('Business object not found in values.');
            }
        } else {
            console.log('Apollo State not found.');
        }

    } catch (e) {
        console.error(e);
    }
}

debug();
