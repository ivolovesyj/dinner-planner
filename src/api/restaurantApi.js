// Restaurant API - Promise-based for React Query compatibility

import client from './client';

/**
 * Add restaurant to room
 * @param {string} roomId 
 * @param {string} url 
 * @param {string} author 
 * @param {string} userId 
 * @returns {Promise<Object>}
 */
export const addRestaurant = async (roomId, url, author, userId) => {
    const response = await client.post(`/api/rooms/${roomId}/restaurants`, {
        url,
        author,
        userId
    });
    return response.data;
};

/**
 * Delete restaurant from room
 * @param {string} roomId 
 * @param {string} restaurantId 
 * @param {string} userId 
 * @returns {Promise<Object>}
 */
export const deleteRestaurant = async (roomId, restaurantId, userId) => {
    const response = await client.delete(`/api/rooms/${roomId}/restaurants/${restaurantId}`, {
        data: { userId }
    });
    return response.data;
};

/**
 * Vote for restaurant
 * @param {string} roomId 
 * @param {string} restaurantId 
 * @param {string} type - 'up' or 'down'
 * @param {string} userId 
 * @param {string} nickname 
 * @param {string} reason - optional reason for downvote
 * @returns {Promise<Object>}
 */
export const voteRestaurant = async (roomId, restaurantId, type, userId, nickname, reason = null) => {
    const response = await client.post(`/api/rooms/${roomId}/vote`, {
        restaurantId,
        type,
        userId,
        nickname,
        reason
    });
    return response.data;
};

/**
 * Parse URL (legacy endpoint)
 * @param {string} url 
 * @returns {Promise<Object>}
 */
export const parseUrl = async (url) => {
    const response = await client.post('/api/parse', { url });
    return response.data;
};

export default {
    addRestaurant,
    deleteRestaurant,
    voteRestaurant,
    parseUrl
};
