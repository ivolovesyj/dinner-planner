// Ladder API - Promise-based for React Query compatibility

import client from './client';

/**
 * Trigger ladder game
 * @param {string} roomId 
 * @param {string[]} candidateIds 
 * @param {string} nickname 
 * @returns {Promise<Object>}
 */
export const triggerLadder = async (roomId, candidateIds, nickname) => {
    const response = await client.post(`/api/rooms/${roomId}/ladder/trigger`, {
        candidateIds,
        nickname
    });
    return response.data;
};

/**
 * Complete ladder game
 * @param {string} roomId 
 * @returns {Promise<Object>}
 */
export const completeLadder = async (roomId) => {
    const response = await client.patch(`/api/rooms/${roomId}/ladder/complete`);
    return response.data;
};

/**
 * Mark ladder game as running
 * @param {string} roomId
 * @returns {Promise<Object>}
 */
export const startLadder = async (roomId) => {
    const response = await client.patch(`/api/rooms/${roomId}/ladder/start`);
    return response.data;
};

/**
 * Reset ladder game
 * @param {string} roomId 
 * @returns {Promise<Object>}
 */
export const resetLadder = async (roomId) => {
    const response = await client.delete(`/api/rooms/${roomId}/ladder`);
    return response.data;
};

export default {
    triggerLadder,
    startLadder,
    completeLadder,
    resetLadder
};
