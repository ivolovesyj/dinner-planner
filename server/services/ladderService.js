// Ladder Service - Ladder Game Logic
import Room from '../models/Room.js';

/**
 * Generate and trigger a new ladder game
 * @param {string} roomId 
 * @param {string[]} candidateIds 
 * @param {string} nickname 
 * @returns {Promise<Object>}
 */
export const triggerLadderGame = async (roomId, candidateIds, nickname) => {
    const room = await Room.findOne({ roomId });
    if (!room) {
        throw new Error("Room not found");
    }

    // Generate Ladder Logic on Server for consistency
    const cols = candidateIds.length;
    const bridges = [];
    const canvasHeight = 450;
    const minBridgeY = 70;
    const maxBridgeY = canvasHeight - 80;

    // 1. Guaranteed Connectivity: Force at least 2 bridges for every adjacent column pair
    for (let i = 0; i < cols - 1; i++) {
        for (let k = 0; k < 2; k++) {
            const y = minBridgeY + Math.random() * (maxBridgeY - minBridgeY);
            bridges.push({ colFrom: i, colTo: i + 1, y });
        }
    }

    // 2. Random Scatter: Add extra random bridges for complexity
    const extraBridgesCount = Math.floor(cols * 1.5);
    for (let i = 0; i < extraBridgesCount; i++) {
        const col = Math.floor(Math.random() * (cols - 1));
        const y = minBridgeY + Math.random() * (maxBridgeY - minBridgeY);
        if (!bridges.some(b => b.colFrom === col && Math.abs(b.y - y) < 10)) {
            bridges.push({ colFrom: col, colTo: col + 1, y });
        }
    }

    // 3. Sort by Y (Critical for traversal logic)
    bridges.sort((a, b) => a.y - b.y);

    const startCol = Math.floor(Math.random() * cols);

    room.ladderGame = {
        candidateIds,
        startCol,
        bridges,
        triggeredBy: nickname || "익명",
        createdAt: new Date()
    };

    await room.save();
    return room.ladderGame;
};

/**
 * Mark ladder game as completed
 * @param {string} roomId 
 * @returns {Promise<Object>}
 */
export const completeLadderGame = async (roomId) => {
    const room = await Room.findOne({ roomId });
    if (!room || !room.ladderGame) {
        throw new Error("Game not found");
    }

    room.ladderGame.status = 'completed';
    await room.save();
    return { success: true };
};

/**
 * Reset (delete) ladder game
 * @param {string} roomId 
 * @returns {Promise<Object>}
 */
export const resetLadderGame = async (roomId) => {
    await Room.updateOne({ roomId }, { $unset: { ladderGame: "" } });
    return { status: "ok" };
};

export default { triggerLadderGame, completeLadderGame, resetLadderGame };
