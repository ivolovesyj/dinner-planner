import axios from 'axios';
import * as cheerio from 'cheerio';

const parseUrl = async (url) => {
    console.log(`Step 1: Fetching initial URL: ${url}`);

    // Step 1: Resolve redirects
    try {
        const initialResponse = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
            timeout: 5000
        });

        let finalUrl = initialResponse.request.res.responseUrl;
        console.log(`Resolved URL: ${finalUrl}`);

        let placeId = null;
        let data = null;

        // Smart Kakao -> Naver Conversion
        if (finalUrl.includes('kakao.com') || finalUrl.includes('kko.to')) {
            console.log("Detected KakaoMap URL. Attempting to convert to Naver...");
            try {
                // Fetch Kakao page
                const kakaoResp = await axios.get(finalUrl, {
                    headers: { 'User-Agent': 'facebookexternalhit/1.1;line-poker/1.0' },
                    timeout: 5000
                });
                const $k = cheerio.load(kakaoResp.data);

                // Debugging: Log what we found
                const ogTitle = $k('meta[property="og:title"]').attr('content');
                const titleTag = $k('title').text();
                const ogDesc = $k('meta[property="og:description"]').attr('content');

                console.log(`[Debug] Kakao OG Title: ${ogTitle}`);
                console.log(`[Debug] Kakao Title Tag: ${titleTag}`);
                console.log(`[Debug] Kakao OG Description: ${ogDesc}`);

                const kakaoTitle = ogTitle || titleTag || '';
                const kakaoAddress = ogDesc || '';

                const searchName = kakaoTitle.replace(' | 카카오맵', '').trim();
                console.log(`[Debug] Search Name from Kakao: ${searchName}`);

                if (searchName) {
                    const findNaverId = async (query) => {
                        console.log(`Searching Naver for: "${query}"...`);
                        const searchUrl = `https://m.search.naver.com/search.naver?query=${encodeURIComponent(query)}`;
                        const searchResp = await axios.get(searchUrl, {
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1'
                            },
                            timeout: 5000
                        });

                        // Debugging: Log partial response or regex check
                        // console.log(searchResp.data.substring(0, 500)); 

                        const idMatch = searchResp.data.match(/m\.place\.naver\.com\/(?:restaurant|place)\/(\d+)/);
                        if (idMatch) console.log(`[Debug] Regex matched ID: ${idMatch[1]}`);
                        else console.log(`[Debug] Regex failed to find ID in Naver Search result`);

                        return idMatch ? idMatch[1] : null;
                    };

                    let foundId = await findNaverId(searchName);

                    if (!foundId && kakaoAddress) {
                        const addrParts = kakaoAddress.split(' ');
                        const locationPart = addrParts.find(p => p.endsWith('길') || p.endsWith('로')) ||
                            addrParts.find(p => p.endsWith('동') || p.endsWith('읍') || p.endsWith('면')) ||
                            addrParts.find(p => p.endsWith('구'));

                        if (locationPart) {
                            const locationQuery = `${searchName} ${locationPart}`;
                            console.log(`Retrying search with location: "${locationQuery}"`);
                            foundId = await findNaverId(locationQuery);
                        }
                    }

                    if (foundId) {
                        placeId = foundId;
                        console.log(`FOUND NAVER ID: ${placeId}`);
                    } else {
                        console.log("FAILED TO FIND NAVER ID");
                    }
                }
            } catch (err) {
                console.error("Kakao conversion error:", err.message);
            }
        }

    } catch (e) {
        console.error("Top level error:", e.message);
    }
};

parseUrl('https://kko.to/uewWnyeFC2');
