// Admin API - Promise-based for React Query compatibility

import client from './client';
import { STORAGE_KEYS } from '../constants';

/**
 * Get auth header with token
 * @returns {Object}
 */
const getAuthHeader = () => {
    const token = localStorage.getItem(STORAGE_KEYS.ADMIN_TOKEN);
    return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Admin login
 * @param {string} username 
 * @param {string} password 
 * @returns {Promise<{token: string, role: string, name: string}>}
 */
export const login = async (username, password) => {
    const response = await client.post('/api/admin/login', { username, password });
    return response.data;
};

/**
 * Get all campaigns (protected)
 * @returns {Promise<Object[]>}
 */
export const getCampaigns = async () => {
    const response = await client.get('/api/admin/campaigns', {
        headers: getAuthHeader()
    });
    return response.data;
};

/**
 * Get all feedbacks (admin only)
 * @returns {Promise<Object[]>}
 */
export const getFeedbacks = async () => {
    const response = await client.get('/api/admin/feedbacks', {
        headers: getAuthHeader()
    });
    return response.data;
};

/**
 * Get all rooms (admin only)
 * @returns {Promise<Object[]>}
 */
export const getRooms = async () => {
    const response = await client.get('/api/admin/rooms', {
        headers: getAuthHeader()
    });
    return response.data;
};

/**
 * Update room memo (admin only)
 * @param {string} roomId 
 * @param {string} memo 
 * @returns {Promise<Object>}
 */
export const updateMemo = async (roomId, memo) => {
    const response = await client.put(`/api/admin/rooms/${roomId}/memo`,
        { memo },
        { headers: getAuthHeader() }
    );
    return response.data;
};

/**
 * Delete room (admin only)
 * @param {string} roomId 
 * @returns {Promise<Object>}
 */
export const deleteRoom = async (roomId) => {
    const response = await client.delete(`/api/admin/rooms/${roomId}`, {
        headers: getAuthHeader()
    });
    return response.data;
};

/**
 * Track ad click
 * @param {string} adId 
 * @returns {Promise<Object>}
 */
export const trackAdClick = async (adId) => {
    const response = await client.post(`/api/ads/${adId}/click`);
    return response.data;
};

/**
 * Submit feedback
 * @param {string} content 
 * @param {string} contact 
 * @returns {Promise<Object>}
 */
export const submitFeedback = async (content, contact = null) => {
    const response = await client.post('/api/feedback', { content, contact });
    return response.data;
};

export default {
    login,
    getCampaigns,
    getFeedbacks,
    getRooms,
    updateMemo,
    deleteRoom,
    trackAdClick,
    submitFeedback
};
