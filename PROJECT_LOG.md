# Project Log: 뭐먹을래? (Dinner Planner)

## 📌 Project Overview
- **Goal**: A simple lunch/dinner voting app where users can add restaurant links (Naver Place) and vote.
- **Stack**: React, Vite, Node.js (planned for backend).
- **Current Status**: Frontend prototype with Mock Data.

## 📝 Change Log

### 2026-01-13 (Resume & Cleanup)
- **Cleanup**: Moved accumulated log files (`*.log`) and temporary debug scripts to `_archive/` folder.
- **Environment**: Fixed `vite.config.js` (`allowedHosts: true`) to resolve "Blocked Request" errors in Lightning Studio. Switched to using Studio's **Port Viewer** (Port 5173) instead of unstable localtunnel.
- **Feature**: Implemented **Smart Link Extraction** in `App.jsx`.
    - Pasting text with a URL (e.g., Naver Map shared text) automatically extracts and inputs only the URL.
- **Status Check**: 
    - Frontend is functional.
    - **Backend (Port 3000)** is running and handling `/api/parse` requests for scraping.
    - UI allows adding links and voting (local state only).
    - **Deep KakaoMap Support**: Implemented "Smart Conversion" to Naver Map.
        - Resolved generic name issues (e.g., "골수") by using address-based retry logic.
        - Supports both `/restaurant/` and `/place/` URL formats.
        - Successfully extracting full menu and images from Kakao links.

### Pre-2026
- Initial project setup with Vite.
- Developed `RestaurantCard` component.
- Implemented basic voting logic (Likes/Dislikes).
- Added `MockCrawler` to simulate fetching data from Naver Place.

## 🚀 Next Steps
- [ ] Connect to a real Backend API.
- [ ] Implement actual Web Scraping (Naver Place).
- [ ] Add User Authentication (optional).
