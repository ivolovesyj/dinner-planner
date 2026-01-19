// usePolling Hook - Interval-based data fetching

import { useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for polling data at intervals
 * @param {Function} fetchFn - Async function to call
 * @param {number} interval - Polling interval in ms
 * @param {boolean} enabled - Whether polling is active
 * @param {Array} deps - Dependencies to restart polling
 */
export const usePolling = (fetchFn, interval, enabled = true, deps = []) => {
    const intervalRef = useRef(null);
    const fetchRef = useRef(fetchFn);

    // Keep fetch function reference updated
    useEffect(() => {
        fetchRef.current = fetchFn;
    }, [fetchFn]);

    const startPolling = useCallback(() => {
        if (intervalRef.current) return;

        intervalRef.current = setInterval(() => {
            fetchRef.current();
        }, interval);
    }, [interval]);

    const stopPolling = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (enabled) {
            startPolling();
        } else {
            stopPolling();
        }

        return () => stopPolling();
    }, [enabled, startPolling, stopPolling, ...deps]);

    return { startPolling, stopPolling };
};

export default usePolling;
