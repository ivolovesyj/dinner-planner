// Room API - Promise-based for React Query compatibility

import client from './client';

/**
 * Create a new room
 * @returns {Promise<{roomId: string}>}
 */
export const createRoom = async () => {
    const response = await client.post('/api/rooms');
    return response.data;
};

/**
 * Get room data by ID
 * @param {string} roomId 
 * @param {string} userId 
 * @param {string} nickname 
 * @returns {Promise<Object>}
 */
export const getRoom = async (roomId, userId = null, nickname = null) => {
    const params = {};
    if (userId) params.userId = userId;
    if (nickname) params.nickname = nickname;

    const response = await client.get(`/api/rooms/${roomId}`, { params });
    return response.data;
};

export default {
    createRoom,
    getRoom
};
