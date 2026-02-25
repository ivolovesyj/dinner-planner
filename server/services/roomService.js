// Room Service - Room CRUD + Ad Injection Logic
import Room from '../models/Room.js';
import AdCampaign from '../models/AdCampaign.js';
import Advertiser from '../models/Advertiser.js';
import PointTransaction from '../models/PointTransaction.js';
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
                status: 'active',
                targetStations: targetStation
            }).sort({ priority: -1, createdAt: -1 });

            // 3. Inject Ad
            if (ad) {
                const impressionCost = ad.pricing?.impressionCost || 4;
                if (ad.ownerId) {
                    const advertiser = await Advertiser.findById(ad.ownerId).lean();
                    if (!advertiser || (advertiser.pointsBalance || 0) < impressionCost) {
                        await AdCampaign.updateOne({ _id: ad._id }, { $set: { active: false, status: 'paused' } }).exec();
                        return room;
                    }
                }

                const injectionIndex = Math.min(room.restaurants.length, 1);

                const adData = {
                    id: `ad_${ad._id}`,
                    isSponsored: true,
                    name: ad.creative?.title || ad.title,
                    description: ad.creative?.description || ad.description,
                    image: ad.creative?.imageUrl || ad.imageUrl,
                    url: ad.creative?.linkUrl || ad.linkUrl,
                    sponsorName: ad.sponsorName,
                    likes: 0, dislikes: 0, tags: ['Sponsored'],
                    category: 'Advertisement',
                    menu: ad.creative?.menuPreview || 'Sponsored'
                };

                room.restaurants.splice(injectionIndex, 0, adData);

                // Track Impression + point charge (async)
                (async () => {
                    try {
                        ad.impressions = (ad.impressions || 0) + 1;
                        ad.budget = {
                            ...(ad.budget?.toObject?.() || ad.budget || {}),
                            spentPoints: (ad.budget?.spentPoints || 0) + impressionCost
                        };
                        await ad.save();

                        if (ad.ownerId) {
                            const advertiser = await Advertiser.findById(ad.ownerId);
                            if (advertiser) {
                                if ((advertiser.pointsBalance || 0) < impressionCost) {
                                    ad.active = false;
                                    ad.status = 'paused';
                                } else {
                                    advertiser.pointsBalance = Math.max((advertiser.pointsBalance || 0) - impressionCost, 0);
                                    await advertiser.save();

                                    await PointTransaction.create({
                                        advertiserId: advertiser._id,
                                        advertiserUsername: advertiser.username,
                                        type: 'impression_charge',
                                        amount: -impressionCost,
                                        balanceAfter: advertiser.pointsBalance,
                                        campaignId: ad._id,
                                        memo: `Ad impression charge (${ad.title || ad.sponsorName})`,
                                        paymentProvider: 'none'
                                    });
                                }
                            }
                        }
                    } catch (trackErr) {
                        console.error('Ad impression tracking failed:', trackErr);
                    }
                })();
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
