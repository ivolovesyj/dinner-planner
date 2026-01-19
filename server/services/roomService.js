// Room Service - Room CRUD + Ad Injection Logic
import Room from '../models/Room.js';
import AdCampaign from '../models/AdCampaign.js';
import { randomUUID } from 'crypto';

/**
 * Read room data with ad injection
 * @param {string} roomId 
 * @returns {Promise<Object|null>}
 */
export const readRoom = async (roomId) => {
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
        const targetStation = sortedStations[0];

        if (targetStation) {
            // 2. Fetch Active Ads for this station
            const ad = await AdCampaign.findOne({
                active: true,
                targetStations: targetStation
            }).lean();

            // 3. Inject Ad
            if (ad) {
                const injectionIndex = Math.min(room.restaurants.length, 1);

                const adData = {
                    id: `ad_${ad._id}`,
                    isSponsored: true,
                    name: ad.title,
                    description: ad.description,
                    image: ad.imageUrl,
                    url: ad.linkUrl,
                    sponsorName: ad.sponsorName,
                    likes: 0, dislikes: 0, tags: ['Sponsored'],
                    category: 'Advertisement',
                    menu: 'Sponsored'
                };

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

/**
 * Write room data
 * @param {string} roomId 
 * @param {Object} data 
 */
export const writeRoom = async (roomId, data) => {
    try {
        await Room.findOneAndUpdate({ roomId }, data, { upsert: true, new: true });
    } catch (error) {
        console.error(`Write failed for ${roomId}:`, error);
        throw error;
    }
};

/**
 * Create a new room
 * @returns {Promise<string>} roomId
 */
export const createRoom = async () => {
    const roomId = randomUUID();
    const initialData = {
        roomId,
        createdAt: new Date().toISOString(),
        restaurants: []
    };
    await writeRoom(roomId, initialData);
    return roomId;
};

/**
 * Track participant access
 * @param {string} roomId 
 * @param {string} userId 
 * @param {string} nickname 
 */
export const trackParticipant = async (roomId, userId, nickname) => {
    try {
        if (userId) {
            const roomDoc = await Room.findOne({ roomId });
            if (roomDoc) {
                if (!roomDoc.participants) roomDoc.participants = [];
                const participant = roomDoc.participants.find(p => p.userId === userId);

                if (participant) {
                    participant.lastActive = new Date();
                    if (nickname && nickname !== "null" && nickname !== "undefined" && nickname !== "") {
                        participant.nickname = nickname;
                    }
                } else {
                    roomDoc.participants.push({
                        userId,
                        nickname: (nickname && nickname !== "null" && nickname !== "undefined" && nickname !== "") ? nickname : "익명",
                        lastActive: new Date()
                    });
                }
                roomDoc.lastAccessedAt = new Date();
                await roomDoc.save();
            }
        } else {
            await Room.updateOne({ roomId }, { $set: { lastAccessedAt: new Date() } }).exec();
        }
    } catch (err) {
        console.error("Participant track failed:", err);
    }
};

/**
 * Update room participants when adding restaurant or voting
 * @param {Object} roomData 
 * @param {string} userId 
 * @param {string} nickname 
 */
export const updateParticipants = (roomData, userId, nickname) => {
    if (!userId) return;

    if (!roomData.participants) roomData.participants = [];
    const idx = roomData.participants.findIndex(p => p.userId === userId);

    if (idx > -1) {
        roomData.participants[idx].lastActive = new Date();
        if (nickname) roomData.participants[idx].nickname = nickname;
    } else {
        roomData.participants.push({
            userId,
            nickname: nickname || "익명",
            lastActive: new Date()
        });
    }
};

export default { readRoom, writeRoom, createRoom, trackParticipant, updateParticipants };
