import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';
import { Search, Loader2, Share, Users, RefreshCw } from 'lucide-react';
import RestaurantCard from './components/RestaurantCard';
import LadderGame from './components/LadderGame';
import NicknameModal from './components/NicknameModal'; // Import Modal
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import Footer from './components/Footer'; // Import Footer
import { crawlNaverPlace } from './utils/mockCrawler';
import { logEvent, logPageView } from './utils/ga4'; // GA4 Imports

function App() {
  // --- Simple Router ---
  const path = window.location.pathname;
  if (path === '/admin/login') return <AdminLogin />;
  if (path === '/admin/dashboard') return <AdminDashboard />;

  const [restaurants, setRestaurants] = useState([]);
  const [roomData, setRoomData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [inputVal, setInputVal] = useState("");

  const [roomId, setRoomId] = useState(null);
  const [roomError, setRoomError] = useState(null);
  const [userId, setUserId] = useState(null);
  const [nickname, setNickname] = useState(null); // Nickname State
  const [showNicknameModal, setShowNicknameModal] = useState(false); // Modal control
  const pollIntervalRef = useRef(null);

  // API Base URL - FORCE Fly.io/api for now to bypass stale Vercel env var
  const API_BASE = 'https://gooddinner.fly.dev/api';

  // Generate or retrieve userId
  useEffect(() => {
    // UserId
    let storedUserId = localStorage.getItem('dinnerPlannerUserId');
    if (!storedUserId) {
      storedUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('dinnerPlannerUserId', storedUserId);
    }
    setUserId(storedUserId);
  }, []);

  const handleSaveNickname = (name) => {
    // Save to global (as default for future new rooms)
    localStorage.setItem('dinnerPlannerNickname', name);
    // Save to room-specific key
    if (userId && roomId) {
      localStorage.setItem(`nickname_${roomId}`, name);
    }
    setNickname(name);
    setShowNicknameModal(false);
  };

  // 1. Check URL for Room ID on Mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');

    if (roomParam) {
      setRoomId(roomParam);

      // Initialize nickname for this room
      const roomNickname = localStorage.getItem(`nickname_${roomParam}`);
      const globalNickname = localStorage.getItem('dinnerPlannerNickname');

      const initialNickname = roomNickname || globalNickname;

      if (initialNickname) {
        setNickname(initialNickname);
      }

      fetchRoomData(roomParam, false, initialNickname);
      // Start Polling
      startPolling(roomParam);
    }

    return () => stopPolling();
  }, []);

  // GA4 Page View Tracking
  useEffect(() => {
    logPageView();
  }, [window.location.pathname, window.location.search]);

  const startPolling = (id) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(() => {
      fetchRoomData(id, true); // Silent fetch
    }, 3000); // Poll every 3 seconds
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
  };
  const fetchRoomData = async (id, silent = false, forcedNickname = null) => {
    if (!silent) setIsLoading(true);
    try {
      const params = {};
      if (userId) params.userId = userId;

      // Use forcedNickname if provided (for first load), otherwise use state
      const currentNickname = forcedNickname || nickname;
      if (currentNickname) params.nickname = currentNickname;

      const res = await axios.get(`${API_BASE}/rooms/${id}`, { params });
      setRoomData(res.data);
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

      // Track Create Room
      logEvent('Room', 'Create', newRoomId);

      startPolling(newRoomId);
    } catch (err) {
      alert("모임 생성 실패: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddLink = async (url) => {
    if (!url || !roomId) return;

    setIsLoading(true); // Start loading immediately

    // Check local duplicate (optional, server checks too)
    const isDuplicate = restaurants.some(r => r.url === url);
    if (isDuplicate) {
      setIsLoading(false); // Reset loading state
      alert("이미 등록된 식당입니다!");
      setInputVal("");
      return;
    }

    const isKakao = url.includes('kakao.com') || url.includes('kko.to');
    if (isKakao) {
      // Allow UI to update to "Loading..." before alert blocks
      await new Promise(resolve => setTimeout(resolve, 50));
      alert("카카오맵 링크는 변환 작업으로 인해 10초 정도 걸릴 수 있습니다. 잠시만 기다려주세요! 🕒");
    }

    try {
      // Send author (nickname) and userId along with URL
      const res = await axios.post(`${API_BASE}/rooms/${roomId}/restaurants`, {
        url,
        author: nickname, // Pass nickname
        userId // Pass userId for ownership
      });

      // Track Add Restaurant
      logEvent('Participation', 'Add Restaurant', url);

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
      logEvent('Participation', 'Share', 'Copy Link');
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
        handleAddLink(extractedUrl);
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
        reason, // Dislike reason
        nickname // Pass nickname for identity tracking
      });

      // Track Vote
      logEvent('Participation', 'Vote', type);

      fetchRoomData(roomId, true); // Immediate refresh
    } catch (err) {
      console.error("Vote failed", err);
    }
  };

  const handleDeleteRestaurant = async (restaurantId) => {
    if (!window.confirm("정말 이 식당을 삭제하시겠습니까?")) return;

    try {
      await axios.delete(`${API_BASE}/rooms/${roomId}/restaurants/${restaurantId}`, {
        data: { userId } // Pass userId for ownership verification
      });
      fetchRoomData(roomId, true);
    } catch (err) {
      alert("삭제 실패: 본인이 등록한 식당만 삭제할 수 있습니다.");
    }
  };

  const handleLadderTrigger = async (candidateIds) => {
    try {
      await axios.post(`${API_BASE}/rooms/${roomId}/ladder/trigger`, {
        candidateIds,
        nickname
      });
      fetchRoomData(roomId, true);
    } catch (err) {
      alert("사다리 생성 실패");
    }
  };

  const handleLadderReset = async () => {
    try {
      await axios.delete(`${API_BASE}/rooms/${roomId}/ladder`);
      fetchRoomData(roomId, true);
    } catch (err) {
      alert("리셋 실패");
    }
  };

  // Initial fetch
  useEffect(() => {
    if (roomId) {
      fetchRoomData(roomId);
    }
  }, [roomId]);



  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("링크가 복사되었습니다! 친구들에게 공유하세요 😆");
  };

  // --- Render: Landing Page ---
  // Rotating Icon Logic
  const [currentIcon, setCurrentIcon] = useState('🍔');
  const [isIconPop, setIsIconPop] = useState(false);

  useEffect(() => {
    if (roomId) return;

    // Warm up the server AND Database (wake up Fly.io & Mongo)
    // We request a non-existent room to force a DB query
    axios.get(`${API_BASE}/rooms/warmup_ping`).catch(() => { });

    // Icon rotation logic
    const icons = ['🍔', '🍕', '🍣', '🍜', '🥘', '🍖', '🍤', '🥓', '🍝', '🌮'];
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % icons.length;
      setIsIconPop(false);
      setTimeout(() => {
        setCurrentIcon(icons[index]);
        setIsIconPop(true);
      }, 50);
    }, 700);
    return () => clearInterval(interval);
  }, [roomId]);

  if (!roomId) {
    return (
      <div className="landing-container">

        {/* Hero Section */}
        <section className="hero">
          <span style={{
            display: 'inline-block', background: '#e5e8eb', color: '#4e5968',
            padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '600', marginBottom: '20px'
          }}>
            ✨ 간편한 모임 장소 결정
          </span>

          <h1>이번 모임은 어디서?<br />
            <span className="mobile-block">후보 올리고</span> <span className="mobile-block highlight">투표로 정하자!</span>
          </h1>

          <p>친구들과 함께 식당을 고르고<br />다수결로 결정하세요.</p>
          {roomError && <div className="error-badge">{roomError}</div>}

          <div style={{ width: '100%', marginTop: '20px' }}>
            <button className="btn-primary" onClick={createRoom} disabled={isLoading} style={{ opacity: isLoading ? 0.7 : 1 }}>
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  모임방 만드는 중...
                </>
              ) : (
                <>
                  투표방 만들고 친구 초대하기
                  <span id="changing-icon" className={isIconPop ? 'icon-pop' : ''}>{currentIcon}</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* Process Section */}
        <section className="process-section">
          <h2 className="section-title">누구나 쉽고 빠르게</h2>

          <div className="steps-container">
            {/* Step 1 */}
            <div className="step-item">
              <span className="step-badge">STEP 1</span>
              <div className="step-icon-box">
                <img src="/assets/step_1.png" alt="방 만들기" />
              </div>
              <div className="step-title">방 만들기</div>
              <div className="step-desc">투표방을 만들고<br />링크를 친구에게 공유해보세요.</div>
            </div>

            {/* Step 2 */}
            <div className="step-item">
              <span className="step-badge">STEP 2</span>
              <div className="step-icon-box">
                <img src="/assets/step_2.png" alt="후보 추가" />
              </div>
              <div className="step-title">후보 추가</div>
              <div className="step-desc">네이버 지도 링크만 붙여넣으면<br />간편하게 후보가 등록돼요.</div>
            </div>

            {/* Step 3 */}
            <div className="step-item">
              <span className="step-badge">STEP 3</span>
              <div className="step-icon-box">
                <img src="/assets/step_3.png" alt="투표 하기" />
              </div>
              <div className="step-title">투표 및 결정</div>
              <div className="step-desc">실시간으로 투표하고<br />가장 인기 있는 곳을 확정해요!</div>
            </div>
          </div>
        </section>

        <Footer />
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
            {nickname && (
              <button
                className="nickname-badge"
                onClick={() => setShowNicknameModal(true)}
                title="닉네임 변경"
              >
                👤 {nickname}
              </button>
            )}
            <button className="icon-btn" onClick={handleCopyLink} title="링크 공유">
              <Share size={20} />
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
        {restaurants.length > 0 && (
          <LadderGame
            roomData={roomData || { restaurants }}
            onTrigger={handleLadderTrigger}
            onReset={handleLadderReset}
            nickname={nickname}
          />
        )}

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
              .map((rest, index, array) => {
                // Calculate Rank: Standard Competition Ranking (1, 1, 3)
                const score = (rest.likes || 0) - (rest.dislikes || 0);
                const firstIndex = array.findIndex(r =>
                  ((r.likes || 0) - (r.dislikes || 0)) === score
                );
                const rank = firstIndex + 1;

                return (
                  <RestaurantCard
                    key={rest.id}
                    data={rest}
                    rank={rank}
                    userId={userId}
                    onVote={handleVote}
                    onDelete={handleDeleteRestaurant} // Pass delete handler
                  />
                );
              })}
          </div>
        )}
      </main>

      {/* Nickname Modal - Force input if no nickname, or show for manual change */}
      {(showNicknameModal || !nickname) && (
        <NicknameModal
          onSave={handleSaveNickname}
          onClose={nickname ? () => setShowNicknameModal(false) : null}
          initialValue={nickname || ""}
        />
      )}
      <Footer />
    </div>
  );
}

export default App;
