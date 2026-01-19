// Parse Service - URL Parsing Logic for Naver/Kakao Maps
import axios from 'axios';
import * as cheerio from 'cheerio';
import { STATION_MAP } from '../config/constants.js';

/**
 * Parse a restaurant URL (Naver Map, Kakao Map) and extract data
 * @param {string} url - Input URL
 * @returns {Promise<Object>} - Restaurant data
 */
export const parseUrl = async (url) => {
    console.log(`Step 1: Fetching initial URL: ${url}`);

    // Step 1: Resolve redirects
    const initialResponse = await axios.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        timeout: 10000
    });

    let finalUrl = initialResponse.request.res.responseUrl;
    console.log(`Resolved URL: ${finalUrl}`);

    let placeId = null;
    const idMatch = finalUrl.match(/place\/(\d+)/) || finalUrl.match(/restaurant\/(\d+)/);
    if (idMatch) {
        placeId = idMatch[1];
    }

    let data = null;

    // Smart Kakao -> Naver Conversion
    if (finalUrl.includes('kakao.com')) {
        console.log("Detected KakaoMap URL. Attempting to convert to Naver...");
        try {
            const kakaoResp = await axios.get(finalUrl, {
                headers: { 'User-Agent': 'facebookexternalhit/1.1;line-poker/1.0' },
                timeout: 10000
            });
            const $k = cheerio.load(kakaoResp.data);
            const kakaoTitle = $k('meta[property="og:title"]').attr('content') || $k('title').text() || '';
            const kakaoAddress = $k('meta[property="og:description"]').attr('content') || '';

            const searchName = kakaoTitle.replace(' | 카카오맵', '').trim();

            if (searchName) {
                const findNaverId = async (query) => {
                    console.log(`Searching Naver for: "${query}"...`);
                    const searchUrl = `https://m.search.naver.com/search.naver?query=${encodeURIComponent(query)}`;
                    const searchResp = await axios.get(searchUrl, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1'
                        },
                        timeout: 10000
                    });
                    const idMatch = searchResp.data.match(/m\.place\.naver\.com\/(?:restaurant|place)\/(\d+)/);
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
                    console.log(`Found Naver Place ID: ${placeId}. Switching context to Naver.`);
                    finalUrl = `https://m.place.naver.com/restaurant/${placeId}`;
                } else {
                    console.log("Naver Place ID not found in search results.");
                }
            }
        } catch (convErr) {
            console.error("Kakao->Naver conversion failed:", convErr.message);
        }
    }

    if (placeId) {
        console.log(`Extracted Place ID: ${placeId}. Fetching mobile site...`);
        const mobileUrl = `https://m.place.naver.com/restaurant/${placeId}/home`;

        try {
            const mobileResponse = await axios.get(mobileUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1',
                    'Referer': 'https://m.place.naver.com/'
                },
                timeout: 10000
            });

            const $ = cheerio.load(mobileResponse.data);
            const scriptContent = $('script').map((i, el) => $(el).html()).get().join('\n');
            const stateMatch = scriptContent.match(/window\.__APOLLO_STATE__\s*=\s*({.+?});/);

            if (stateMatch) {
                const state = JSON.parse(stateMatch[1]);
                const values = Object.values(state);
                const business = values.find(v => v.id === placeId && v.name && v.__typename !== 'Menu');

                const menuItems = [];
                const menuImages = [];

                values.forEach(v => {
                    if (v.__typename === 'Menu') {
                        let menuStr = v.name;
                        if (v.price) {
                            const priceNum = parseInt(v.price.replace(/[^0-9]/g, ''), 10);
                            if (!isNaN(priceNum)) {
                                menuStr += ` (${priceNum.toLocaleString()}원)`;
                            } else {
                                menuStr += ` (${v.price})`;
                            }
                        }
                        menuItems.push(menuStr);
                        if (v.images && v.images.length > 0) {
                            menuImages.push(v.images[0]);
                        }
                    } else if (v.name && v.price && v.isRecommended) {
                        let menuStr = v.name;
                        const priceNum = parseInt(v.price.replace(/[^0-9]/g, ''), 10);
                        if (!isNaN(priceNum)) {
                            menuStr += ` (${priceNum.toLocaleString()}원)`;
                        } else {
                            menuStr += ` (${v.price})`;
                        }
                        menuItems.push(menuStr);
                    }
                });

                if (business) {
                    let images = business.images ? business.images.slice(0, 5).map(img => img.url) : [];
                    if (images.length === 0 && menuImages.length > 0) {
                        images = menuImages.slice(0, 5);
                    }

                    // Extract station info with enhanced logic
                    let station = '';

                    // Try to extract from Naver's transport/subway section
                    const subwaySection = $('.place_section_content').filter((i, el) => {
                        return $(el).find('.place_section_h').text().includes('지하철') ||
                            $(el).find('.place_section_h').text().includes('교통');
                    });

                    if (subwaySection.length > 0) {
                        const subwayText = subwaySection.find('.txt_traffic').text().trim() ||
                            subwaySection.find('.subway_item').text().trim();

                        if (subwayText) {
                            const match = subwayText.match(/([가-힣\d]+역)\s*(?:[\s\d,·호선]+)?/);
                            if (match) {
                                station = match[0].trim();
                            }
                        }
                    }

                    // Fallback: extract from road address
                    if (!station && business.road) {
                        const stationMatch = business.road.match(/([가-힣\d]+역)/);
                        if (stationMatch) {
                            let extractedStation = stationMatch[1];

                            // Direct match
                            if (STATION_MAP[extractedStation]) {
                                station = `${extractedStation} ${STATION_MAP[extractedStation]}`;
                            } else {
                                // Fuzzy match
                                const fuzzyMatch = Object.keys(STATION_MAP).find(key =>
                                    key.includes(extractedStation) || extractedStation.includes(key.replace('역', ''))
                                );
                                if (fuzzyMatch) {
                                    station = `${fuzzyMatch} ${STATION_MAP[fuzzyMatch]}`;
                                } else {
                                    station = extractedStation;
                                }
                            }
                        }
                    }

                    data = {
                        id: Date.now().toString(),
                        url: finalUrl,
                        name: business.name,
                        category: business.category,
                        images: images,
                        image: images[0] || '',
                        description: business.description || business.microReview || '',
                        location: business.roadAddress || business.abbrAddress || '',
                        station: station,
                        menu: menuItems.length > 0 ? menuItems.join(', ') : '정보 없음',
                        priceRange: '$$',
                        tags: [business.category],
                        likes: 0,
                        dislikes: 0,
                        dislikeReasons: []
                    };

                    if (images.length === 0) {
                        const ogImage = $('meta[property="og:image"]').attr('content');
                        if (ogImage) {
                            data.images = [ogImage];
                            data.image = ogImage;
                        }
                    }
                }
            }
        } catch (innerError) {
            console.error("Failed to parse mobile site:", innerError.message);
        }
    }

    // Fallback: Use old logic (FacebookBot) if rich data extraction failed
    if (!data) {
        console.log("Falling back to basic OG extraction");
        const fallbackResponse = await axios.get(url, {
            headers: {
                'User-Agent': 'facebookexternalhit/1.1;line-poker/1.0',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
            },
            timeout: 3000
        });

        const html = fallbackResponse.data;
        const $ = cheerio.load(html);

        const title = $('meta[property="og:title"]').attr('content') || $('title').text() || '';
        let image = $('meta[property="og:image"]').attr('content') || '';
        const description = $('meta[property="og:description"]').attr('content') || '';
        const urlFromMeta = $('meta[property="og:url"]').attr('content') || url;

        if (image && image.startsWith('//')) {
            image = 'https:' + image;
        }

        let name = title;
        if (title.trim() === '네이버지도' && description) {
            name = description;
        }

        data = {
            id: Date.now().toString(),
            url: urlFromMeta,
            name: name,
            category: 'Unknown',
            images: image ? [image] : [],
            image: image,
            description: description,
            location: '',
            menu: '정보 없음',
            priceRange: "$$",
            tags: ["Scraped"],
            likes: 0, dislikes: 0, dislikeReasons: []
        };
    }

    // --- Geocoding Logic ---
    if (data && data.location && (!data.latitude || !data.longitude)) {
        try {
            console.log(`Trying to geocode address: ${data.location}`);
            const coords = await getCoordinates(data.location);
            if (coords) {
                console.log(`Geocoding successful: ${coords.lat}, ${coords.lng}`);
                data.latitude = coords.lat;
                data.longitude = coords.lng;
            }
        } catch (geoErr) {
            console.error("Geocoding failed:", geoErr.message);
        }
    }

    return data;
};

// Helper: Get Coordinates from Address using Naver Geocoding API
import { NAVER_CLIENT_ID, NAVER_CLIENT_SECRET } from '../config/constants.js';

const getCoordinates = async (address) => {
    if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
        console.warn("Naver Client ID/Secret missing. Skipping geocoding.");
        return null;
    }

    try {
        const response = await axios.get('https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode', {
            params: { query: address },
            headers: {
                'X-NCP-APIGW-API-KEY-ID': NAVER_CLIENT_ID,
                'X-NCP-APIGW-API-KEY': NAVER_CLIENT_SECRET
            }
        });

        if (response.data.addresses && response.data.addresses.length > 0) {
            const { x, y } = response.data.addresses[0];
            return { lat: parseFloat(y), lng: parseFloat(x) }; // y=latitude, x=longitude
        }
        return null;
    } catch (err) {
        console.error("Geocoding API Error:", err.message);
        return null;
    }
};

export default { parseUrl };
