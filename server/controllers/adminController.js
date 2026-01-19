// Admin Controller - Admin Dashboard Endpoints
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/constants.js';
import Room from '../models/Room.js';
import AdCampaign from '../models/AdCampaign.js';
import Advertiser from '../models/Advertiser.js';
import Feedback from '../models/Feedback.js';

/**
 * POST /api/admin/login - Admin login
 */
export const login = async (req, res) => {
    const { username, password } = req.body;

    try {
        const targetUser = username
            ? await Advertiser.findOne({ username })
            : await Advertiser.findOne({ username: 'admin' });

        if (!targetUser) {
            return res.status(401).json({ error: 'User not found' });
        }

        if (targetUser.password === password) {
            const token = jwt.sign({
                id: targetUser._id,
                username: targetUser.username,
                role: targetUser.role
            }, JWT_SECRET, { expiresIn: '24h' });

            res.json({ token, role: targetUser.role, name: targetUser.companyName });
        } else {
            res.status(401).json({ error: 'Invalid password' });
        }
    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ error: 'Login failed' });
    }
};

/**
 * GET /api/admin/campaigns - Get all campaigns (Protected)
 */
export const getCampaigns = async (req, res) => {
    try {
        const campaigns = await AdCampaign.find().sort({ createdAt: -1 }).lean();

        const withStats = campaigns.map(c => ({
            ...c,
            ctr: c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(1) : '0.0'
        }));

        res.json(withStats);
    } catch (error) {
        res.status(500).json({ error: 'Fetch failed' });
    }
};

/**
 * GET /api/admin/feedbacks - Get feedbacks (Admin only)
 */
export const getFeedbacks = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin only' });
        }
        const feedbacks = await Feedback.find().sort({ createdAt: -1 }).lean();
        res.json(feedbacks);
    } catch (error) {
        res.status(500).json({ error: 'Fetch failed' });
    }
};

/**
 * GET /api/admin/rooms - Get all rooms (Admin only)
 */
export const getRooms = async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ error: "Admin only" });
        }
        const rooms = await Room.find().sort({ lastAccessedAt: -1 }).lean();

        // Process rooms to add accurate member counts
        const processedRooms = rooms.map(room => {
            const nicknames = new Set();

            // 1. From participants array
            if (room.participants) {
                room.participants.forEach(p => {
                    if (p.nickname && p.nickname !== "익명" && p.nickname !== "null") {
                        nicknames.add(p.nickname);
                    }
                });
            }

            // 2. From restaurants authors
            if (room.restaurants) {
                room.restaurants.forEach(r => {
                    if (r.author && r.author !== "익명" && r.author !== "null") {
                        nicknames.add(r.author);
                    }
                });
            }

            // 3. From dislike reasons
            if (room.restaurants) {
                room.restaurants.forEach(r => {
                    if (r.dislikeReasons) {
                        r.dislikeReasons.forEach(dr => {
                            if (dr.nickname && dr.nickname !== "익명" && dr.nickname !== "null") {
                                nicknames.add(dr.nickname);
                            }
                        });
                    }
                });
            }

            return {
                ...room,
                identifiedMemberCount: nicknames.size,
                nicknameList: Array.from(nicknames)
            };
        });

        res.json(processedRooms);
    } catch (error) {
        console.error("Fetch rooms failed:", error);
        res.status(500).json({ error: "Fetch failed" });
    }
};

/**
 * PUT /api/admin/rooms/:roomId/memo - Update room memo (Admin only)
 */
export const updateMemo = async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ error: "Admin only" });
        }
        const { roomId } = req.params;
        const { memo } = req.body;

        await Room.updateOne({ roomId }, { $set: { adminMemo: memo } }).exec();
        res.json({ success: true });
    } catch (error) {
        console.error("Update memo failed:", error);
        res.status(500).json({ error: "Update failed" });
    }
};

/**
 * DELETE /api/admin/rooms/:roomId - Delete room (Admin only)
 */
export const deleteRoom = async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ error: "Admin only" });
        }
        const { roomId } = req.params;
        const result = await Room.deleteOne({ roomId });
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: "Room not found" });
        }
        res.json({ status: "ok", message: "Room deleted successfully" });
    } catch (error) {
        console.error("Delete room failed:", error);
        res.status(500).json({ error: "Delete failed" });
    }
};

/**
 * POST /api/ads/:adId/click - Track ad click
 */
export const trackAdClick = async (req, res) => {
    const { adId } = req.params;
    try {
        const realId = adId.replace('ad_', '');
        await AdCampaign.updateOne({ _id: realId }, { $inc: { clicks: 1 } });
        res.status(200).json({ status: 'ok' });
    } catch (error) {
        console.error('Ad click ref failed:', error);
        res.status(500).json({ error: 'Track failed' });
    }
};

/**
 * POST /api/feedback - Submit feedback
 */
export const submitFeedback = async (req, res) => {
    const { content, contact } = req.body;
    if (!content) return res.status(400).json({ error: 'Content required' });

    try {
        await Feedback.create({ content, contact });
        res.json({ status: 'ok' });
    } catch (error) {
        console.error('Feedback failed:', error);
        res.status(500).json({ error: 'Save failed' });
    }
};

export default {
    login, getCampaigns, getFeedbacks, getRooms,
    updateMemo, deleteRoom, trackAdClick, submitFeedback
};
