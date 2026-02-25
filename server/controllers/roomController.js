// Room Controller - Room Related Endpoints
import { readRoom, writeRoom, createRoom, trackParticipant } from '../services/roomService.js';

/**
 * POST /api/rooms - Create new room
 */
export const create = async (req, res) => {
    try {
        const roomId = await createRoom();
        res.json({ roomId });
    } catch (error) {
        console.error('Create room failed:', error);
        res.status(500).json({ error: 'Failed to create room' });
    }
};

/**
 * GET /api/rooms/:roomId - Get room data
 */
export const get = async (req, res) => {
    const { roomId } = req.params;
    const { userId, nickname } = req.query;

    // Track participant
    await trackParticipant(roomId, userId, nickname);

    const data = await readRoom(roomId, {
        injectAds: true,
        viewerUserId: userId || null,
        chargeAdImpression: true
    });
    if (!data) {
        return res.status(404).json({ error: "Room not found" });
    }
    res.json(data);
};

export default { create, get };
