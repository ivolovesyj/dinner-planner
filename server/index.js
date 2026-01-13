import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import * as cheerio from 'cheerio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import 'dotenv/config'; // Load env vars
import mongoose from 'mongoose';
import Room from './models/Room.js';
import AdCampaign from './models/AdCampaign.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-1234';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin1234'; // Set this in Fly.io secrets!

// Auth Middleware
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Auth required' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(403).json({ error: 'Invalid token' });
    }
};

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/dinner_planner';
// Note: User needs to set MONGO_URI in production (Fly.io secrets)

// Enhanced Connection Logic
console.log('Attempting to connect to MongoDB...');
mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 5000, // Fail fast after 5s
    socketTimeoutMS: 45000,
})
    .then(() => console.log('✅ MongoDB Connected Successfully'))
    .catch(err => console.error('❌ MongoDB Initial Connection Error:', err));

mongoose.connection.on('error', err => {
    console.error('❌ MongoDB Runtime Error:', err);
});
mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB Disconnected');
});

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration - allow Vercel frontend
app.use(cors({
    origin: ['https://dinner-planner-nine.vercel.app', 'http://localhost:5173'],
    credentials: true
}));
app.use(express.json());

// Global Request Logger
app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.originalUrl || req.url}`);
    next();
});

// Health check endpoint for Railway
app.get('/', (req, res) => {
    res.json({ status: 'ok', service: 'dinner-planner-api' });
});

// Helper: Read Room Data (MongoDB)
const readRoom = async (roomId) => {
    try {
        const room = await Room.findOne({ roomId }).lean();
        if (!room) return null;

        // --- Ad Injection Logic ---
        // 1. Identify Context (Stations)
        const stationCounts = {};
        const stationRegex = /([가-힣\d]+역)/;

        room.restaurants.forEach(r => {
            // Check 'station' field first
            if (r.station) {
                const match = r.station.match(stationRegex);
                if (match) {
                    const st = match[1];
                    stationCounts[st] = (stationCounts[st] || 0) + 1;
                }
            }
            // Check title/name
            else if (r.name) {
                const match = r.name.match(stationRegex);
                if (match) {
                    const st = match[1];
                    stationCounts[st] = (stationCounts[st] || 0) + 1;
                }
            }
        });

        // Sort stations by frequency (most popular first)
        const sortedStations = Object.keys(stationCounts).sort((a, b) => stationCounts[b] - stationCounts[a]);
        const targetStation = sortedStations[0]; // Pick the top one for now

        if (targetStation) {
            // 2. Fetch Active Ads for this station
            const ad = await AdCampaign.findOne({
                active: true,
                targetStations: targetStation
            }).lean();

            // 3. Inject Ad
            if (ad) {
                // Determine injection index (e.g., 2nd position or last)
                // Let's put it at index 1 (2nd item) if possible, or append
                const injectionIndex = Math.min(room.restaurants.length, 1);

                const adData = {
                    id: `ad_${ad._id}`,
                    isSponsored: true,
                    name: ad.title,
                    description: ad.description,
                    image: ad.imageUrl,
                    url: ad.linkUrl,
                    sponsorName: ad.sponsorName,
                    // Minimal fields to prevent UI errors
                    likes: 0, dislikes: 0, tags: ['Sponsored'],
                    category: 'Advertisement',
                    menu: 'Sponsored'
                };

                // Inject without mutating DB (since we used .lean())
                room.restaurants.splice(injectionIndex, 0, adData);

                // Track Impression (Async - fire and forget)
                AdCampaign.updateOne({ _id: ad._id }, { $inc: { impressions: 1 } }).exec();
            }
        }

        return room;
    } catch (error) {
        console.error(`Read failed for ${roomId}:`, error);
        return null;
    }
};

// Helper: Write Room Data (MongoDB)
const writeRoom = async (roomId, data) => {
    try {
        // Update or insert. 
        // Note: 'data' contains the full object including restaurants. 
        // In a real optimized DB app, we would push/pull distinct items, 
        // but to maintain compatibility with the previous "overwrite" logic:
        await Room.findOneAndUpdate({ roomId }, data, { upsert: true, new: true });
    } catch (error) {
        console.error(`Write failed for ${roomId}:`, error);
        throw error;
    }
};

// --- Reusable Parse Logic ---
const parseUrl = async (url) => {
    console.log(`Step 1: Fetching initial URL: ${url}`);

    // Step 1: Resolve redirects
    const initialResponse = await axios.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        timeout: 10000 // Increased to 10s
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
                timeout: 10000 // Increased to 10s
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
                        timeout: 10000 // Increased to 10s
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
                timeout: 10000 // Increased to 10s
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
                            // Extract station name and lines (e.g., "을지로3가역 2,3호선")
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

                            // Station map for line info
                            const stationMap = {
                                '청량리역': '(1,경의중앙,수인분당,경춘선)', '제기동역': '(1호선)', '신설동역': '(1,2,우이신설선)', '동묘앞역': '(1,6호선)',
                                '동대문역': '(1,4호선)', '종로5가역': '(1호선)', '종로3가역': '(1,3,5호선)', '종각역': '(1호선)',
                                '시청역': '(1,2호선)', '서울역': '(1,4,경의중앙,공항철도)', '남영역': '(1호선)', '용산역': '(1,경의중앙선)',
                                '노량진역': '(1,9호선)', '대방역': '(1,신림선)', '신길역': '(1,5호선)', '영등포역': '(1호선)', '신도림역': '(1,2호선)',
                                '을지로입구역': '(2호선)', '을지로3가역': '(2,3호선)', '을지로4가역': '(2,5호선)', '동대문역사문화공원역': '(2,4,5호선)',
                                '신당역': '(2,6호선)', '상왕십리역': '(2호선)', '왕십리역': '(2,5,경의중앙,수인분당선)', '한양대역': '(2호선)',
                                '뚝섬역': '(2호선)', '성수역': '(2호선)', '건대입구역': '(2,7호선)', '구의역': '(2호선)', '강변역': '(2호선)',
                                '잠실나루역': '(2호선)', '잠실역': '(2,8호선)', '잠실새내역': '(2호선)', '종합운동장역': '(2,9호선)',
                                '삼성역': '(2호선)', '선릉역': '(2,수인분당선)', '역삼역': '(2호선)', '강남역': '(2,신분당선)',
                                '교대역': '(2,3호선)', '서초역': '(2호선)', '방배역': '(2호선)', '사당역': '(2,4호선)', '낙성대역': '(2호선)',
                                '서울대입구역': '(2호선)', '봉천역': '(2호선)', '신림역': '(2,신림선)', '구로디지털단지역': '(2호선)',
                                '대림역': '(2,7호선)', '문래역': '(2호선)', '영등포구청역': '(2,5호선)', '당산역': '(2,9호선)',
                                '합정역': '(2,6호선)', '홍대입구역': '(2,경의중앙,공항철도)', '신촌역': '(2호선)', '이대역': '(2호선)',
                                '아현역': '(2호선)', '충정로역': '(2,5호선)',
                                '구파발역': '(3호선)', '연신내역': '(3,6호선)', '불광역': '(3,6호선)', '녹번역': '(3호선)', '홍제역': '(3호선)',
                                '무악재역': '(3호선)', '독립문역': '(3호선)', '경복궁역': '(3호선)', '안국역': '(3호선)',
                                '충무로역': '(3,4호선)', '동대입구역': '(3호선)', '약수역': '(3,6호선)', '금호역': '(3호선)', '옥수역': '(3,경의중앙선)',
                                '압구정역': '(3호선)', '신사역': '(3,신분당선)', '잠원역': '(3호선)', '고속터미널역': '(3,7,9호선)',
                                '남부터미널역': '(3호선)', '양재역': '(3,신분당선)', '매봉역': '(3호선)', '도곡역': '(3,수인분당선)',
                                '대치역': '(3호선)', '학여울역': '(3호선)', '대청역': '(3호선)', '일원역': '(3호선)', '수서역': '(3,수인분당,GTX-A)',
                                '혜화역': '(4호선)', '명동역': '(4호선)', '회현역': '(4호선)', '숙대입구역': '(4호선)', '삼각지역': '(4,6호선)',
                                '신용산역': '(4호선)', '이촌역': '(4,경의중앙선)', '동작역': '(4,9호선)', '이수역': '(4,7호선)',
                                '서대문역': '(5호선)', '광화문역': '(5호선)', '청구역': '(5,6호선)',
                                '마포역': '(5호선)', '공덕역': '(5,6,경의중앙,공항철도)', '여의나루역': '(5호선)', '여의도역': '(5,9호선)',
                                '목동역': '(5호선)', '오목교역': '(5호선)', '발산역': '(5호선)', '마곡역': '(5호선)', '송정역': '(5호선)',
                                '망원역': '(6호선)', '상수역': '(6호선)', '광흥창역': '(6호선)', '대흥역': '(6호선)', '효창공원앞역': '(6,경의중앙선)',
                                '녹사평역': '(6호선)', '이태원역': '(6호선)', '한강진역': '(6호선)', '버티고개역': '(6호선)', '창신역': '(6호선)',
                                '보문역': '(6,우이신설선)', '안암역': '(6호선)', '고려대역': '(6호선)',
                                '청담역': '(7호선)', '강남구청역': '(7,수인분당선)', '학동역': '(7호선)', '논현역': '(7,신분당선)', '반포역': '(7호선)',
                                '내방역': '(7호선)', '남성역': '(7호선)', '숭실대입구역': '(7호선)', '상도역': '(7호선)', '장승배기역': '(7호선)',
                                '신대방삼거리역': '(7호선)', '보라매역': '(7,신림선)', '신풍역': '(7호선)', '대림역': '(2,7호선)', '남구로역': '(7호선)',
                                '가산디지털단지역': '(1,7호선)',
                                '몽촌토성역': '(8호선)', '석촌역': '(8,9호선)', '송파역': '(8호선)', '가락시장역': '(3,8호선)', '문정역': '(8호선)',
                                '신논현역': '(9,신분당선)', '언주역': '(9호선)', '선정릉역': '(9,수인분당선)', '삼성중앙역': '(9호선)', '봉은사역': '(9호선)',
                                '국회의사당역': '(9호선)', '당산역': '(2,9호선)', '가양역': '(9호선)',
                                '압구정로데오역': '(수인분당선)', '서울숲역': '(수인분당선)'
                            };

                            // Direct match
                            if (stationMap[extractedStation]) {
                                station = `${extractedStation} ${stationMap[extractedStation]}`;
                            } else {
                                // Fuzzy match for partial names like "3가역" -> "을지로3가역"
                                const fuzzyMatch = Object.keys(stationMap).find(key =>
                                    key.includes(extractedStation) || extractedStation.includes(key.replace('역', ''))
                                );
                                if (fuzzyMatch) {
                                    station = `${fuzzyMatch} ${stationMap[fuzzyMatch]}`;
                                } else {
                                    station = extractedStation; // Keep as is if no match
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

    return data;
};

// --- API Endpoints ---

// 1. Create Room
app.post('/api/rooms', async (req, res) => {
    const roomId = randomUUID();
    const initialData = {
        roomId,
        createdAt: new Date().toISOString(),
        restaurants: []
    };
    await writeRoom(roomId, initialData);
    res.json({ roomId });
});

// 2. Get Room Data
app.get('/api/rooms/:roomId', async (req, res) => {
    const { roomId } = req.params;
    const data = await readRoom(roomId);
    if (!data) {
        return res.status(404).json({ error: 'Room not found' });
    }
    res.json(data);
});

// 3. Add Restaurant to Room
app.post('/api/rooms/:roomId/restaurants', async (req, res) => {
    const { roomId } = req.params;
    const { url, author, userId } = req.body;

    if (!url) return res.status(400).json({ error: 'URL required' });

    try {
        const roomData = await readRoom(roomId);
        if (!roomData) return res.status(404).json({ error: 'Room not found' });

        // Check if already exists in this room
        // NOTE: A more robust check might parse the URL first to get a canonical ID
        // But for now, let's parse first.
        const newData = await parseUrl(url);

        // Add author info
        newData.author = author || '익명';
        newData.ownerId = userId; // Store ownership for deletion

        // Simple duplicate check by Name or ID
        const exists = roomData.restaurants.find(r => r.name === newData.name || r.id === newData.id);
        if (exists) {
            // Already exists, just return current list or maybe notify? 
            // For now, let's fail silently or return existing.
            return res.json(roomData);
        }

        roomData.restaurants.push(newData);
        await writeRoom(roomId, roomData);
        res.json(roomData);

    } catch (error) {
        console.error('Add failed:', error);
        res.status(500).json({ error: 'Failed to add restaurant' });
    }
});

// 3.5 Delete Restaurant (Owner Only)
app.delete('/api/rooms/:roomId/restaurants/:restaurantId', async (req, res) => {
    const { roomId, restaurantId } = req.params;
    const { userId } = req.body;

    if (!userId) return res.status(400).json({ error: 'User ID required' });

    try {
        const roomData = await readRoom(roomId);
        if (!roomData) return res.status(404).json({ error: 'Room not found' });

        const index = roomData.restaurants.findIndex(r => r.id === restaurantId);
        if (index === -1) return res.status(404).json({ error: 'Restaurant not found' });

        const restaurant = roomData.restaurants[index];

        // Verify Ownership
        // Allow if ownerId matches OR if it's an old item without ownerId (optional: maybe just restrict?)
        // Let's restrict to owner only.
        if (restaurant.ownerId && restaurant.ownerId !== userId) {
            return res.status(403).json({ error: 'Only the author can delete this' });
        }

        // Remove it
        roomData.restaurants.splice(index, 1);
        await writeRoom(roomId, roomData);
        res.json(roomData);

    } catch (error) {
        console.error('Delete failed:', error);
        res.status(500).json({ error: 'Delete failed' });
    }
});

// 4. Vote (with user tracking and toggle)
app.post('/api/rooms/:roomId/vote', async (req, res) => {
    const { roomId } = req.params;
    const { restaurantId, type, userId, reason, nickname } = req.body; // type: 'up' or 'down', userId from frontend

    if (!userId) return res.status(400).json({ error: 'userId required' });

    try {
        const roomData = await readRoom(roomId);
        if (!roomData) return res.status(404).json({ error: 'Room not found' });

        const restaurant = roomData.restaurants.find(r => r.id === restaurantId);
        if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });

        // Initialize vote tracking structures
        if (!restaurant.userVotes) restaurant.userVotes = {};
        if (!restaurant.dislikeReasons) restaurant.dislikeReasons = [];

        const existingVote = restaurant.userVotes[userId];

        // Toggle logic
        if (existingVote === type) {
            // User is toggling off their vote
            delete restaurant.userVotes[userId];

            // Decrement count
            if (type === 'up') {
                restaurant.likes = Math.max(0, (restaurant.likes || 0) - 1);
            } else if (type === 'down') {
                restaurant.dislikes = Math.max(0, (restaurant.dislikes || 0) - 1);
                // Remove their reason if exists
                restaurant.dislikeReasons = restaurant.dislikeReasons.filter(r => r.userId !== userId);
            }
        } else {
            // User is voting (new vote or changing vote)

            // If changing vote, decrement old count
            if (existingVote) {
                if (existingVote === 'up') {
                    restaurant.likes = Math.max(0, (restaurant.likes || 0) - 1);
                } else if (existingVote === 'down') {
                    restaurant.dislikes = Math.max(0, (restaurant.dislikes || 0) - 1);
                    restaurant.dislikeReasons = restaurant.dislikeReasons.filter(r => r.userId !== userId);
                }
            }

            // Set new vote
            restaurant.userVotes[userId] = type;

            // Increment new count
            if (type === 'up') {
                restaurant.likes = (restaurant.likes || 0) + 1;
            } else if (type === 'down') {
                restaurant.dislikes = (restaurant.dislikes || 0) + 1;
                // Store reason if provided
                if (reason) {
                    restaurant.dislikeReasons.push({
                        userId,
                        nickname: nickname || '익명',
                        reason,
                        timestamp: new Date().toISOString()
                    });
                }
            }
        }

        await writeRoom(roomId, roomData);
        res.json(roomData);
    } catch (error) {
        console.error('Vote failed:', error);
        res.status(500).json({ error: 'Vote failed' });
    }
});

// Legacy Endpoint for direct parsing (keep for backward compatibility or testing)
app.post('/api/parse', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ error: 'URL is required' });

        const data = await parseUrl(url);
        res.json(data);
    } catch (error) {
        console.error('Error parsing URL:', error.message);
        res.status(500).json({ error: 'Failed to parse URL', details: error.message });
    }
});

// 6. Ad Click Tracking
app.post('/api/ads/:adId/click', async (req, res) => {
    const { adId } = req.params;
    try {
        // adId format: "ad_OBJECTID"
        const realId = adId.replace('ad_', '');
        await AdCampaign.updateOne({ _id: realId }, { $inc: { clicks: 1 } });
        res.status(200).json({ status: 'ok' });
    } catch (error) {
        console.error('Ad click ref failed:', error);
        res.status(500).json({ error: 'Track failed' });
    }
});

// --- ADMIN APIs ---

// 7. Admin Login
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token });
    } else {
        res.status(401).json({ error: 'Invalid password' });
    }
});

// 8. Get All Campaigns (Protected)
app.get('/api/admin/campaigns', authMiddleware, async (req, res) => {
    try {
        const campaigns = await AdCampaign.find().sort({ createdAt: -1 }).lean();

        // Calculate CTR for each
        const withStats = campaigns.map(c => ({
            ...c,
            ctr: c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(1) : '0.0'
        }));

        res.json(withStats);
    } catch (error) {
        res.status(500).json({ error: 'Fetch failed' });
    }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Proxy server running on http://localhost:${PORT}`);
});
