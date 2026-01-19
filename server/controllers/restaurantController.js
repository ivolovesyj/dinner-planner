// Restaurant Controller - Restaurant CRUD and Vote Endpoints
import { readRoom, writeRoom, updateParticipants } from '../services/roomService.js';
import { parseUrl } from '../services/parseService.js';
import { processVote } from '../services/voteService.js';

/**
 * POST /api/rooms/:roomId/restaurants - Add restaurant
 */
export const add = async (req, res) => {
    const { roomId } = req.params;
    const { url, author, userId } = req.body;

    if (!url) return res.status(400).json({ error: 'URL required' });

    try {
        const roomData = await readRoom(roomId);
        if (!roomData) return res.status(404).json({ error: 'Room not found' });

        const newData = await parseUrl(url);

        // Add author info
        newData.author = author || '익명';
        newData.ownerId = userId;

        // Simple duplicate check by Name or ID
        const exists = roomData.restaurants.find(r => r.name === newData.name || r.id === newData.id);
        if (exists) {
            return res.json(roomData);
        }

        roomData.restaurants.push(newData);

        // Update Participants
        updateParticipants(roomData, userId, author);

        await writeRoom(roomId, roomData);
        res.json(roomData);

    } catch (error) {
        console.error('Add failed:', error);
        res.status(500).json({ error: 'Failed to add restaurant' });
    }
};

/**
 * DELETE /api/rooms/:roomId/restaurants/:restaurantId - Delete restaurant (Owner Only)
 */
export const remove = async (req, res) => {
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
};

/**
 * POST /api/rooms/:roomId/vote - Vote for restaurant
 */
export const vote = async (req, res) => {
    const { roomId } = req.params;
    const { restaurantId, type, userId, reason, nickname } = req.body;

    if (!userId) return res.status(400).json({ error: 'userId required' });

    try {
        const roomData = await readRoom(roomId);
        if (!roomData) return res.status(404).json({ error: 'Room not found' });

        const restaurant = roomData.restaurants.find(r => r.id === restaurantId);
        if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });

        // Process vote
        processVote(restaurant, userId, type, reason, nickname);

        // Update Participants
        updateParticipants(roomData, userId, nickname);

        await writeRoom(roomId, roomData);
        res.json(roomData);
    } catch (error) {
        console.error('Vote failed:', error);
        res.status(500).json({ error: 'Vote failed' });
    }
};

/**
 * POST /api/parse - Legacy endpoint for direct parsing
 */
export const parse = async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ error: 'URL is required' });

        const data = await parseUrl(url);
        res.json(data);
    } catch (error) {
        console.error('Error parsing URL:', error.message);
        res.status(500).json({ error: 'Failed to parse URL', details: error.message });
    }
};

export default { add, remove, vote, parse };
