import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';
import { Search, Loader2, Share2, Users, RefreshCw } from 'lucide-react';
import RestaurantCard from './components/RestaurantCard';
import { crawlNaverPlace } from './utils/mockCrawler';

function App() {
  const [restaurants, setRestaurants] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputVal, setInputVal] = useState("");

  const [roomId, setRoomId] = useState(null);
  const [roomError, setRoomError] = useState(null);
  const [userId, setUserId] = useState(null);
  const pollIntervalRef = useRef(null);

  // API Base URL - FORCE Fly.io/api for now to bypass stale Vercel env var
  const API_BASE = 'https://gooddinner.fly.dev/api';

  // Generate or retrieve userId
  useEffect(() => {
    let storedUserId = localStorage.getItem('dinnerPlannerUserId');
    if (!storedUserId) {
      storedUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('dinnerPlannerUserId', storedUserId);
    }
    setUserId(storedUserId);
  }, []);

  // 1. Check URL for Room ID on Mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');

    if (roomParam) {
      setRoomId(roomParam);
      fetchRoomData(roomParam);
      // Start Polling
      startPolling(roomParam);
    }

    return () => stopPolling();
  }, []);

  const startPolling = (id) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(() => {
      fetchRoomData(id, true); // Silent fetch
    }, 3000); // Poll every 3 seconds
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
  };

  const fetchRoomData = async (id, silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/rooms/${id}`);
      setRestaurants(res.data.restaurants || []);
      setRoomError(null);
    } catch (err) {
      console.error("Failed to fetch room:", err);
      if (err.response && err.response.status === 404) {
        setRoomError("존재하지 않는 모임입니다.");
        setRoomId(null);
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const createRoom = async () => {
    setIsLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/rooms`);
      const newRoomId = res.data.roomId;

      // Update URL without reload
      const newUrl = `${window.location.pathname}?room=${newRoomId}`;
      window.history.pushState({ path: newUrl }, '', newUrl);

      setRoomId(newRoomId);
      setRestaurants([]);
      startPolling(newRoomId);
    } catch (err) {
      alert("모임 생성 실패: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddLink = async (url) => {
    if (!url || !roomId) return;

    // Check local duplicate (optional, server checks too)
    const isDuplicate = restaurants.some(r => r.url === url);
    if (isDuplicate) {
      alert("이미 등록된 식당입니다!");
      setInputVal("");
      return;
    }

    setIsLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/rooms/${roomId}/restaurants`, { url });
      // Server returns updated room data, but we can also just let polling catch it.
      // For immediate feedback, let's use the result if it returns the list or the full object.
      // Our implementation returns 'roomData' (which allows immediate update).
      // However, to keep it simple we can just trigger a fetch.
      fetchRoomData(roomId, true);
      setInputVal("");
    } catch (error) {
      alert("식당 추가 실패. 링크를 확인해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      alert("링크가 복사되었습니다! 친구들에게 공유하세요 🔗");
    });
  };

  const handlePaste = (e) => {
    const pastedData = e.clipboardData.getData('text');
    const urlMatch = pastedData.match(/(https?:\/\/[^\s]+)/);

    if (urlMatch) {
      e.preventDefault();
      const extractedUrl = urlMatch[0];
      setInputVal(extractedUrl);

      // Auto-submit if in a room
      if (roomId) {
        setTimeout(() => handleAddLink(extractedUrl), 100);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleAddLink(inputVal);
    }
  };

  const handleVote = async (id, type, reason) => {
    if (!userId) return; // Wait for userId to be initialized

    try {
      await axios.post(`${API_BASE}/rooms/${roomId}/vote`, {
        restaurantId: id,
        type,
        userId,
        reason
      });
      fetchRoomData(roomId, true); // Immediate refresh
    } catch (err) {
      console.error("Vote failed", err);
    }
  };

  // --- Render: Landing Page ---
  if (!roomId) {
    return (
      <div className="landing-container">
        <h1 className="landing-title">뭐먹을래?</h1>
        <p className="landing-subtitle">친구들과 함께 결정하는 오늘의 메뉴</p>
        {roomError && <div className="error-badge">{roomError}</div>}

        <button className="create-room-btn" onClick={createRoom} disabled={isLoading}>
          {isLoading ? <Loader2 className="animate-spin" /> : <Users size={20} />}
          새 모임 만들기
        </button>
      </div>
    );
  }

  // --- Render: Room View ---
  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-top">
          <h1 onClick={() => window.location.href = '/'} style={{ cursor: 'pointer' }}>뭐먹을래?</h1>
          <div className="header-actions">
            <button className="icon-btn" onClick={handleShare} title="링크 공유">
              <Share2 size={20} />
            </button>
          </div>
        </div>

        <div className="header-input-container">
          {isLoading ? (
            <div className="loading-message">
              <Loader2 className="animate-spin" size={16} /> 정보를 불러오는 중입니다...
            </div>
          ) : (
            <>
              <input
                type="text"
                className="header-input"
                placeholder="식당 네이버/카카오 링크 붙여넣기"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onPaste={handlePaste}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
              />
              {/* <Search className="search-icon" size={18} /> */}
              <button
                className={`header-submit-btn ${inputVal ? 'visible' : ''}`}
                onClick={() => handleAddLink(inputVal)}
                disabled={!inputVal || isLoading}
              >
                추가
              </button>
            </>
          )}
        </div>
      </header>

      <main className="app-content">
        {restaurants.length === 0 ? (
          <div className="empty-state">
            <p>상단에 링크를 붙여넣어 투표를 시작하세요!</p>
            <div className="share-hint" onClick={handleShare}>
              친구 초대하기 🔗
            </div>
          </div>
        ) : (
          <div className="restaurant-list">
            {[...restaurants]
              .sort((a, b) => {
                const scoreA = (a.likes || 0) - (a.dislikes || 0);
                const scoreB = (b.likes || 0) - (b.dislikes || 0);
                return scoreB - scoreA;
              })
              .map((rest, index) => (
                <RestaurantCard
                  key={rest.id}
                  data={rest}
                  rank={index + 1}
                  userId={userId}
                  onVote={handleVote}
                />
              ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
