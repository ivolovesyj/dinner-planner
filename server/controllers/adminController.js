// Admin Controller - Admin Dashboard Endpoints
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/constants.js';
import Room from '../models/Room.js';
import AdCampaign from '../models/AdCampaign.js';
import Advertiser from '../models/Advertiser.js';
import Feedback from '../models/Feedback.js';
import PointTransaction from '../models/PointTransaction.js';
import { parseUrl } from '../services/parseService.js';

const DEFAULT_PRICING = {
    baseStartFee: 10000,
    impressionCost: 4,
    clickCost: 250
};

const getEffectiveRole = (userLike) => {
    if (!userLike) return 'advertiser';
    if (userLike.username === 'admin') return 'admin';
    return userLike.role || 'advertiser';
};

const sanitizeCampaignForResponse = (campaign) => {
    const c = campaign.toObject ? campaign.toObject() : campaign;
    const ctr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(1) : '0.0';
    const spentPoints = c.budget?.spentPoints || 0;
    return {
        ...c,
        ctr,
        spentPoints,
        remainingBudgetPoints: Math.max((c.budget?.totalPointsLimit || 0) - spentPoints, 0)
    };
};

const requireAdmin = (req, res) => {
    if (getEffectiveRole(req.user) !== 'admin') {
        res.status(403).json({ error: 'Admin only' });
        return false;
    }
    return true;
};

const canManageCampaign = (req, campaign) => {
    if (getEffectiveRole(req.user) === 'admin') return true;
    return String(campaign.ownerId) === String(req.user?.id);
};

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
            let resolvedRole = getEffectiveRole(targetUser);
            if (targetUser.username === 'admin' && targetUser.role !== 'admin') {
                targetUser.role = 'admin';
                await targetUser.save();
                resolvedRole = 'admin';
            }

            const token = jwt.sign({
                id: targetUser._id,
                username: targetUser.username,
                role: resolvedRole
            }, JWT_SECRET, { expiresIn: '24h' });

            res.json({
                token,
                role: resolvedRole,
                name: targetUser.companyName,
                username: targetUser.username,
                pointsBalance: targetUser.pointsBalance || 0
            });
        } else {
            res.status(401).json({ error: 'Invalid password' });
        }
    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ error: 'Login failed' });
    }
};

/**
 * POST /api/admin/signup - Advertiser self signup
 */
export const signup = async (req, res) => {
    const { username, password, companyName, contactName, contactEmail, phone } = req.body;

    if (!username || !password || !companyName || !phone) {
        return res.status(400).json({ error: 'username, password, companyName, phone are required' });
    }

    try {
        const exists = await Advertiser.findOne({ username });
        if (exists) {
            return res.status(409).json({ error: 'Username already exists' });
        }

        const advertiser = await Advertiser.create({
            username,
            password,
            companyName,
            role: 'advertiser',
            billingProfile: {
                contactName: contactName || '',
                contactEmail: contactEmail || '',
                phone
            }
        });

        res.status(201).json({
            id: advertiser._id,
            username: advertiser.username,
            companyName: advertiser.companyName
        });
    } catch (err) {
        console.error('Signup Error:', err);
        res.status(500).json({ error: 'Signup failed' });
    }
};

/**
 * GET /api/admin/campaigns - Get all campaigns (Protected)
 */
export const getCampaigns = async (req, res) => {
    try {
        const query = getEffectiveRole(req.user) === 'admin'
            ? {}
            : { ownerId: req.user.id };
        const campaigns = await AdCampaign.find(query).sort({ createdAt: -1 }).lean();
        const withStats = campaigns.map(sanitizeCampaignForResponse);

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
        if (getEffectiveRole(req.user) !== 'admin') {
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
        if (getEffectiveRole(req.user) !== "admin") {
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
        if (getEffectiveRole(req.user) !== "admin") {
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
        if (getEffectiveRole(req.user) !== "admin") {
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
 * GET /api/admin/me - Current advertiser/admin profile
 */
export const me = async (req, res) => {
    try {
        const user = await Advertiser.findById(req.user.id).lean();
        if (!user) return res.status(404).json({ error: 'User not found' });

        const recentTransactions = await PointTransaction.find({ advertiserId: user._id })
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();

        res.json({
            id: user._id,
            username: user.username,
            companyName: user.companyName,
            role: getEffectiveRole(user),
            pointsBalance: user.pointsBalance || 0,
            pointsPending: user.pointsPending || 0,
            billingProfile: user.billingProfile || {},
            pricingDefaults: DEFAULT_PRICING,
            recentTransactions
        });
    } catch (error) {
        console.error('Fetch profile failed:', error);
        res.status(500).json({ error: 'Fetch failed' });
    }
};

/**
 * POST /api/admin/campaigns/parse-link - Parse naver/kakao map link for ad source
 */
export const parseCampaignLink = async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL required' });

    try {
        const parsed = await parseUrl(url);
        res.json(parsed);
    } catch (error) {
        console.error('Campaign link parse failed:', error);
        res.status(500).json({ error: 'Parse failed' });
    }
};

/**
 * POST /api/admin/campaigns - Create campaign (advertiser/admin)
 */
export const createCampaign = async (req, res) => {
    try {
        const ownerId = getEffectiveRole(req.user) === 'admin' && req.body.ownerId ? req.body.ownerId : req.user.id;
        const owner = await Advertiser.findById(ownerId);
        if (!owner) return res.status(404).json({ error: 'Owner not found' });

        const payload = req.body || {};
        const campaign = await AdCampaign.create({
            title: payload.title || payload.creative?.title || '광고 캠페인',
            description: payload.description || payload.creative?.description || '',
            imageUrl: payload.imageUrl || payload.creative?.imageUrl || '',
            linkUrl: payload.linkUrl || payload.creative?.linkUrl || '',
            sponsorName: payload.sponsorName || owner.companyName,
            ownerId: owner._id,
            ownerUsername: owner.username,
            targetStations: payload.targetStations || [],
            radius: payload.radius || 1000,
            source: payload.source || { naverMapUrl: '', parsedRestaurant: {} },
            creative: payload.creative || {},
            pricing: { ...DEFAULT_PRICING, ...(payload.pricing || {}) },
            budget: {
                totalPointsLimit: payload.budget?.totalPointsLimit || DEFAULT_PRICING.baseStartFee,
                spentPoints: payload.budget?.spentPoints || 0
            },
            schedule: payload.schedule || {},
            active: payload.active ?? false,
            status: payload.status || 'draft',
            priority: payload.priority || 0
        });

        res.status(201).json(sanitizeCampaignForResponse(campaign));
    } catch (error) {
        console.error('Create campaign failed:', error);
        res.status(500).json({ error: 'Create failed' });
    }
};

/**
 * PUT /api/admin/campaigns/:campaignId - Update campaign (owner/admin)
 */
export const updateCampaign = async (req, res) => {
    try {
        const { campaignId } = req.params;
        const campaign = await AdCampaign.findById(campaignId);
        if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
        if (!canManageCampaign(req, campaign)) return res.status(403).json({ error: 'Forbidden' });

        const payload = req.body || {};

        // Prevent advertisers from editing approved/active campaign pricing after approval
        const isAdmin = getEffectiveRole(req.user) === 'admin';
        if (!isAdmin && ['approved', 'active'].includes(campaign.status)) {
            return res.status(409).json({ error: 'Approved/active campaign cannot be edited. Pause or duplicate campaign.' });
        }

        if (payload.source) campaign.source = { ...campaign.source?.toObject?.(), ...payload.source };
        if (payload.creative) campaign.creative = { ...campaign.creative?.toObject?.(), ...payload.creative };
        if (payload.pricing) campaign.pricing = { ...campaign.pricing?.toObject?.(), ...payload.pricing };
        if (payload.budget) campaign.budget = { ...campaign.budget?.toObject?.(), ...payload.budget };
        if (payload.schedule) campaign.schedule = { ...campaign.schedule?.toObject?.(), ...payload.schedule };

        ['title', 'description', 'imageUrl', 'linkUrl', 'sponsorName', 'radius', 'priority'].forEach((key) => {
            if (payload[key] !== undefined) campaign[key] = payload[key];
        });
        if (Array.isArray(payload.targetStations)) campaign.targetStations = payload.targetStations;

        // Keep top-level ad fields in sync with creative for rendering compatibility
        campaign.title = campaign.creative?.title || campaign.title;
        campaign.description = campaign.creative?.description || campaign.description;
        campaign.imageUrl = campaign.creative?.imageUrl || campaign.imageUrl;
        campaign.linkUrl = campaign.creative?.linkUrl || campaign.linkUrl;

        if (!isAdmin && campaign.status === 'rejected') {
            campaign.status = 'draft';
            if (campaign.review) {
                campaign.review.rejectionReason = '';
            }
        }

        await campaign.save();
        res.json(sanitizeCampaignForResponse(campaign));
    } catch (error) {
        console.error('Update campaign failed:', error);
        res.status(500).json({ error: 'Update failed' });
    }
};

/**
 * PATCH /api/admin/campaigns/:campaignId/submit - Submit campaign for approval
 */
export const submitCampaign = async (req, res) => {
    try {
        const { campaignId } = req.params;
        const campaign = await AdCampaign.findById(campaignId);
        if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
        if (!canManageCampaign(req, campaign)) return res.status(403).json({ error: 'Forbidden' });

        if (!campaign.targetStations?.length) return res.status(400).json({ error: 'At least one target station required' });
        if (!(campaign.creative?.title || campaign.title)) return res.status(400).json({ error: 'Title required' });
        if (!(campaign.creative?.imageUrl || campaign.imageUrl)) return res.status(400).json({ error: 'Image required' });
        if (!(campaign.creative?.linkUrl || campaign.linkUrl)) return res.status(400).json({ error: 'Link required' });

        campaign.status = 'submitted';
        campaign.active = false;
        await campaign.save();
        res.json(sanitizeCampaignForResponse(campaign));
    } catch (error) {
        console.error('Submit campaign failed:', error);
        res.status(500).json({ error: 'Submit failed' });
    }
};

/**
 * PATCH /api/admin/campaigns/:campaignId/review - Approve or reject (admin)
 */
export const reviewCampaign = async (req, res) => {
    if (!requireAdmin(req, res)) return;

    try {
        const { campaignId } = req.params;
        const { action, rejectionReason } = req.body;
        const campaign = await AdCampaign.findById(campaignId);
        if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

        if (action === 'approve') {
            campaign.status = 'approved';
            campaign.review = {
                reviewedBy: req.user.username || 'admin',
                reviewedAt: new Date(),
                rejectionReason: ''
            };
        } else if (action === 'reject') {
            campaign.status = 'rejected';
            campaign.active = false;
            campaign.review = {
                reviewedBy: req.user.username || 'admin',
                reviewedAt: new Date(),
                rejectionReason: rejectionReason || '승인 보류'
            };
        } else {
            return res.status(400).json({ error: 'action must be approve or reject' });
        }

        await campaign.save();
        res.json(sanitizeCampaignForResponse(campaign));
    } catch (error) {
        console.error('Review campaign failed:', error);
        res.status(500).json({ error: 'Review failed' });
    }
};

/**
 * PATCH /api/admin/campaigns/:campaignId/status - Activate/pause campaign
 */
export const updateCampaignStatus = async (req, res) => {
    try {
        const { campaignId } = req.params;
        const { status } = req.body;
        const campaign = await AdCampaign.findById(campaignId);
        if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
        if (!canManageCampaign(req, campaign)) return res.status(403).json({ error: 'Forbidden' });

        const advertiser = await Advertiser.findById(campaign.ownerId);
        if (!advertiser) return res.status(404).json({ error: 'Advertiser not found' });

        if (status === 'active') {
            if (!['approved', 'paused', 'active'].includes(campaign.status)) {
                return res.status(409).json({ error: 'Only approved/paused campaigns can be activated' });
            }
            if ((advertiser.pointsBalance || 0) < (campaign.pricing?.baseStartFee || DEFAULT_PRICING.baseStartFee)) {
                return res.status(400).json({ error: 'Insufficient points to start campaign (minimum start balance required)' });
            }
            campaign.status = 'active';
            campaign.active = true;
        } else if (status === 'paused') {
            campaign.status = 'paused';
            campaign.active = false;
        } else {
            return res.status(400).json({ error: 'status must be active or paused' });
        }

        await campaign.save();
        res.json(sanitizeCampaignForResponse(campaign));
    } catch (error) {
        console.error('Update campaign status failed:', error);
        res.status(500).json({ error: 'Status update failed' });
    }
};

/**
 * POST /api/admin/points/charge - Manual point charge (Toss-ready placeholder)
 */
export const chargePoints = async (req, res) => {
    try {
        const { amount, advertiserId, memo, orderId } = req.body;
        if (!amount || amount <= 0) return res.status(400).json({ error: 'Positive amount required' });

        const targetId = getEffectiveRole(req.user) === 'admin' && advertiserId ? advertiserId : req.user.id;
        const advertiser = await Advertiser.findById(targetId);
        if (!advertiser) return res.status(404).json({ error: 'Advertiser not found' });

        advertiser.pointsBalance = (advertiser.pointsBalance || 0) + Number(amount);
        await advertiser.save();

        const tx = await PointTransaction.create({
            advertiserId: advertiser._id,
            advertiserUsername: advertiser.username,
            type: 'charge',
            amount: Number(amount),
            balanceAfter: advertiser.pointsBalance,
            memo: memo || 'Manual charge (Toss integration-ready placeholder)',
            paymentProvider: 'manual',
            paymentStatus: 'done',
            orderId: orderId || ''
        });

        res.json({
            pointsBalance: advertiser.pointsBalance,
            transaction: tx
        });
    } catch (error) {
        console.error('Charge points failed:', error);
        res.status(500).json({ error: 'Charge failed' });
    }
};

/**
 * POST /api/ads/:adId/click - Track ad click
 */
export const trackAdClick = async (req, res) => {
    const { adId } = req.params;
    try {
        const realId = adId.replace('ad_', '');
        const campaign = await AdCampaign.findById(realId);
        if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

        campaign.clicks = (campaign.clicks || 0) + 1;
        const clickCost = campaign.pricing?.clickCost || DEFAULT_PRICING.clickCost;
        campaign.budget = {
            ...(campaign.budget?.toObject?.() || campaign.budget || {}),
            spentPoints: (campaign.budget?.spentPoints || 0) + clickCost
        };

        const advertiser = campaign.ownerId ? await Advertiser.findById(campaign.ownerId) : null;
        if (advertiser) {
            if ((advertiser.pointsBalance || 0) < clickCost) {
                campaign.active = false;
                campaign.status = 'paused';
            } else {
                advertiser.pointsBalance = Math.max((advertiser.pointsBalance || 0) - clickCost, 0);
                await advertiser.save();

                await PointTransaction.create({
                    advertiserId: advertiser._id,
                    advertiserUsername: advertiser.username,
                    type: 'click_charge',
                    amount: -clickCost,
                    balanceAfter: advertiser.pointsBalance,
                    campaignId: campaign._id,
                    memo: `Ad click charge (${campaign.title || campaign.sponsorName})`,
                    paymentProvider: 'none'
                });
            }
        }

        await campaign.save();
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
    login, signup, me,
    getCampaigns, createCampaign, updateCampaign, submitCampaign, reviewCampaign, updateCampaignStatus, parseCampaignLink,
    chargePoints,
    getFeedbacks, getRooms,
    updateMemo, deleteRoom, trackAdClick, trackAdVote, submitFeedback
};

/**
 * POST /api/ads/:adId/vote - Track ad like/dislike vote
 */
export const trackAdVote = async (req, res) => {
    const { adId } = req.params;
    const { userId, type } = req.body;

    if (!userId) return res.status(400).json({ error: 'userId required' });
    if (!['up', 'down'].includes(type)) return res.status(400).json({ error: 'type must be up or down' });

    try {
        const realId = adId.replace('ad_', '');
        const campaign = await AdCampaign.findById(realId);
        if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

        if (!campaign.userVotes) campaign.userVotes = new Map();
        const prevVote = campaign.userVotes.get(userId);

        const dec = (voteType) => {
            if (voteType === 'up') campaign.likes = Math.max((campaign.likes || 0) - 1, 0);
            if (voteType === 'down') campaign.dislikes = Math.max((campaign.dislikes || 0) - 1, 0);
        };
        const inc = (voteType) => {
            if (voteType === 'up') campaign.likes = (campaign.likes || 0) + 1;
            if (voteType === 'down') campaign.dislikes = (campaign.dislikes || 0) + 1;
        };

        if (prevVote === type) {
            dec(prevVote);
            campaign.userVotes.delete(userId);
        } else {
            if (prevVote) dec(prevVote);
            inc(type);
            campaign.userVotes.set(userId, type);
        }

        await campaign.save();
        res.json({ status: 'ok', likes: campaign.likes || 0, dislikes: campaign.dislikes || 0 });
    } catch (error) {
        console.error('Ad vote failed:', error);
        res.status(500).json({ error: 'Ad vote failed' });
    }
};
