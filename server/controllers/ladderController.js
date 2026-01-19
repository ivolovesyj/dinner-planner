// Ladder Controller - Ladder Game Endpoints
import { triggerLadderGame, completeLadderGame, resetLadderGame } from '../services/ladderService.js';

/**
 * POST /api/rooms/:roomId/ladder/trigger - Trigger new ladder game
 */
export const trigger = async (req, res) => {
    const { roomId } = req.params;
    const { candidateIds, nickname } = req.body;

    if (!candidateIds || candidateIds.length < 2) {
        return res.status(400).json({ error: "At least 2 candidates required" });
    }

    try {
        const ladderGame = await triggerLadderGame(roomId, candidateIds, nickname);
        res.json(ladderGame);
    } catch (err) {
        console.error("Ladder trigger failed:", err);
        if (err.message === "Room not found") {
            return res.status(404).json({ error: "Room not found" });
        }
        res.status(500).json({ error: "Failed to trigger ladder game" });
    }
};

/**
 * PATCH /api/rooms/:roomId/ladder/complete - Complete ladder game
 */
export const complete = async (req, res) => {
    try {
        const { roomId } = req.params;
        const result = await completeLadderGame(roomId);
        res.json(result);
    } catch (err) {
        console.error("Ladder complete failed:", err);
        if (err.message === "Game not found") {
            return res.status(404).json({ error: "Game not found" });
        }
        res.status(500).json({ error: "Failed to complete game" });
    }
};

/**
 * DELETE /api/rooms/:roomId/ladder - Reset ladder game
 */
export const reset = async (req, res) => {
    const { roomId } = req.params;
    try {
        const result = await resetLadderGame(roomId);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: "Reset failed" });
    }
};

export default { trigger, complete, reset };
