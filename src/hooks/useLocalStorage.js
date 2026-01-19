// useLocalStorage Hook - Persist state to localStorage

import { useState, useEffect } from 'react';

/**
 * Custom hook for localStorage with React state sync
 * @param {string} key - localStorage key
 * @param {*} initialValue - default value if key doesn't exist
 * @returns {[*, Function]} - [value, setValue]
 */
export const useLocalStorage = (key, initialValue) => {
    // Get from localStorage or use initial value
    const [storedValue, setStoredValue] = useState(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(`Error reading localStorage key "${key}":`, error);
            return initialValue;
        }
    });

    // Update localStorage when state changes
    useEffect(() => {
        try {
            window.localStorage.setItem(key, JSON.stringify(storedValue));
        } catch (error) {
            console.error(`Error setting localStorage key "${key}":`, error);
        }
    }, [key, storedValue]);

    return [storedValue, setStoredValue];
};

export default useLocalStorage;
