// useRoom Hook - Room state management

import { useState, useCallback, useEffect } from 'react';
import { getRoom, createRoom as createRoomApi } from '../api/roomApi';
import { addRestaurant, deleteRestaurant, voteRestaurant, voteAd } from '../api/restaurantApi';
import { triggerLadder, startLadder, completeLadder, resetLadder } from '../api/ladderApi';
import { usePolling } from './usePolling';
import { POLLING_INTERVAL, STORAGE_KEYS } from '../constants';

/**
 * Custom hook for room state management
 * @param {string} initialRoomId - Initial room ID from URL
 * @returns {Object} - Room state and handlers
 */
export const useRoom = (initialRoomId = null) => {
    const [roomId, setRoomId] = useState(initialRoomId);
    const [roomData, setRoomData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Get user info from localStorage
    const getUserId = () => localStorage.getItem(STORAGE_KEYS.USER_ID);
    const getNickname = () => localStorage.getItem(STORAGE_KEYS.NICKNAME);

    // Fetch room data
    const fetchRoom = useCallback(async (silent = false) => {
        if (!roomId) return;

        if (!silent) setLoading(true);
        setError(null);

        try {
            const data = await getRoom(roomId, getUserId(), getNickname());
            setRoomData(data);
        } catch (err) {
            setError(err.message);
            console.error('Failed to fetch room:', err);
        } finally {
            if (!silent) setLoading(false);
        }
    }, [roomId]);

    // Create new room
    const createRoom = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const { roomId: newRoomId } = await createRoomApi();
            setRoomId(newRoomId);
            return newRoomId;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    // Add restaurant handler
    const handleAddRestaurant = useCallback(async (url) => {
        if (!roomId) return;

        setLoading(true);
        try {
            const data = await addRestaurant(roomId, url, getNickname(), getUserId());
            setRoomData(data);
            return data;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [roomId]);

    // Delete restaurant handler
    const handleDeleteRestaurant = useCallback(async (restaurantId) => {
        if (!roomId) return;

        try {
            const data = await deleteRestaurant(roomId, restaurantId, getUserId());
            setRoomData(data);
            return data;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, [roomId]);

    // Vote handler
    const handleVote = useCallback(async (restaurantId, type, reason = null) => {
        if (!roomId) return;

        try {
            if (String(restaurantId).startsWith('ad_')) {
                await voteAd(restaurantId, type, getUserId());
                await fetchRoom(true);
                return roomData;
            }
            const data = await voteRestaurant(roomId, restaurantId, type, getUserId(), getNickname(), reason);
            setRoomData(data);
            return data;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, [roomId, fetchRoom, roomData]);

    // Ladder handlers
    const handleLadderTrigger = useCallback(async (candidateIds) => {
        if (!roomId) return;

        try {
            const ladderGame = await triggerLadder(roomId, candidateIds, getNickname());
            setRoomData(prev => ({ ...prev, ladderGame }));
            return ladderGame;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, [roomId]);

    const handleLadderStart = useCallback(async () => {
        if (!roomId) return;

        try {
            const result = await startLadder(roomId);
            setRoomData(prev => prev?.ladderGame
                ? { ...prev, ladderGame: { ...prev.ladderGame, status: result.status || 'running' } }
                : prev
            );
            return result;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, [roomId]);

    const handleLadderComplete = useCallback(async () => {
        if (!roomId) return;

        // Optimistic update
        setRoomData(prev => ({
            ...prev,
            ladderGame: { ...prev?.ladderGame, status: 'completed' }
        }));

        try {
            await completeLadder(roomId);
        } catch (err) {
            console.error('Ladder complete failed:', err);
        }
    }, [roomId]);

    const handleLadderReset = useCallback(async () => {
        if (!roomId) return;

        try {
            await resetLadder(roomId);
            setRoomData(prev => ({ ...prev, ladderGame: null }));
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, [roomId]);

    // Setup polling
    usePolling(
        () => fetchRoom(true),
        POLLING_INTERVAL,
        !!roomId
    );

    // Fetch on roomId change
    useEffect(() => {
        if (roomId) {
            fetchRoom();
        }
    }, [roomId, fetchRoom]);

    return {
        roomId,
        setRoomId,
        roomData,
        loading,
        error,
        fetchRoom,
        createRoom,
        handleAddRestaurant,
        handleDeleteRestaurant,
        handleVote,
        handleLadderTrigger,
        handleLadderStart,
        handleLadderComplete,
        handleLadderReset
    };
};

export default useRoom;
