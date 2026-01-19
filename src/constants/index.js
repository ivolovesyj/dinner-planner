// API Configuration Constants
// Using VITE_ prefix for Vite environment variables

export const API_BASE_URL = import.meta.env.VITE_API_URL ||
    (import.meta.env.PROD
        ? 'https://gooddinner.fly.dev'
        : 'http://localhost:8080');

// Polling Configuration
export const POLLING_INTERVAL = 3000; // 3 seconds

// Local Storage Keys - Keep consistent with existing app
export const STORAGE_KEYS = {
    USER_ID: 'dinnerPlannerUserId',
    NICKNAME: 'dinnerPlannerNickname',
    ADMIN_TOKEN: 'admin_token'
};

// App Configuration
export const APP_CONFIG = {
    APP_NAME: '뭐먹을래?',
    MAX_RESTAURANTS: 20,
    KAKAO_SDK_KEY: '48d2b69cdffc16d0a49b3bcee425db5a'
};
