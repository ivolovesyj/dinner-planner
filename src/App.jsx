// App.jsx - Refactored with Layered Architecture
import { useState, useEffect } from 'react';
import './App.css';
import { Loader2, Share, RotateCw } from 'lucide-react';

// Domain-organized components
import { RestaurantCard } from './components/restaurant';
import { LadderGame } from './components/ladder';
import { NicknameModal } from './components/room';
import { AdminLogin, AdminDashboard } from './components/admin';
import { Footer } from './components/layout';
import { MapView } from './components/map';

// Hooks
import { useRoom } from './hooks/useRoom';

// Utils
import { logEvent, logPageView } from './utils/ga4';

// Constants
import { STORAGE_KEYS, APP_CONFIG, API_BASE_URL } from './constants';

// Custom Ladder Icon
const LadderIcon = ({ size = 20, style = {}, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M8 3v18" />
    <path d="M16 3v18" />
    <path d="M8 7h8" />
    <path d="M8 12h8" />
    <path d="M8 17h8" />
  </svg>
);

function App() {
  // --- Simple Router ---
  const path = window.location.pathname;
  if (path === '/admin/login') return <AdminLogin />;
  if (path === '/admin/dashboard') return <AdminDashboard />;

  // Get roomId from URL PATH (not query string)
  // Format: /room/{roomId} instead of /?room={roomId}
  const pathMatch = path.match(/^\/room\/([a-f0-9-]+)$/i);
  const initialRoomId = pathMatch ? pathMatch[1] : null;

  // Use custom hook for room management
  const {
    roomId,
    setRoomId,
    roomData,
    loading,
    createRoom,
    handleAddRestaurant,
    handleDeleteRestaurant,
    handleVote,
    handleLadderTrigger,
    handleLadderComplete,
    handleLadderReset,
    fetchRoom
  } = useRoom(initialRoomId);

  // Local state
  const [inputVal, setInputVal] = useState("");
  const [showLadder, setShowLadder] = useState(false);
  const [nickname, setNickname] = useState(null);
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [userId, setUserId] = useState(null);
  const [roomError, setRoomError] = useState(null);

  // Map State
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  const restaurants = roomData?.restaurants || [];

  // Initialize userId and nickname from localStorage
  useEffect(() => {
    let storedUserId = localStorage.getItem(STORAGE_KEYS.USER_ID);
    if (!storedUserId) {
      storedUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(STORAGE_KEYS.USER_ID, storedUserId);
    }
    setUserId(storedUserId);

    // Initialize nickname for room
    if (initialRoomId) {
      const roomNickname = localStorage.getItem(`nickname_${initialRoomId}`);
      const globalNickname = localStorage.getItem(STORAGE_KEYS.NICKNAME);
      const initialNickname = roomNickname || globalNickname;
      if (initialNickname) {
        setNickname(initialNickname);
      }
    }
  }, [initialRoomId]);

  // PRE-LOAD Naver Map Script on App Mount (Test: Does early loading help with auth?)
  useEffect(() => {
    const scriptId = 'naver-map-script';
    if (document.getElementById(scriptId)) return; // Already loaded

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${import.meta.env.VITE_NAVER_MAP_CLIENT_ID || 'r942ztr0hi'}`;
    script.async = true;
    document.head.appendChild(script);
  }, []);

  // --- Stable Sort Logic ---
  const [stableRestaurants, setStableRestaurants] = useState([]);
  const [hasPendingSort, setHasPendingSort] = useState(false);

  // Sync Data but Keep Order
  useEffect(() => {
    if (!restaurants) return;

    if (stableRestaurants.length === 0 && restaurants.length > 0) {
      // Initial Load: Sort by Score
      const sorted = [...restaurants].sort((a, b) =>
        ((b.likes || 0) - (b.dislikes || 0)) - ((a.likes || 0) - (a.dislikes || 0))
      );
      setStableRestaurants(sorted);
    } else if (restaurants.length > 0) {
      // Update: Keep Order, Update Values, Append New
      setStableRestaurants(prev => {
        const next = [...prev];
        const currentIds = new Set(next.map(r => r.id));

        // 1. Update existing items in-place & 2. Add new items
        restaurants.forEach(freshItem => {
          const idx = next.findIndex(item => item.id === freshItem.id);
          if (idx !== -1) {
            next[idx] = freshItem; // Update data
          } else {
            next.push(freshItem); // Append new
          }
        });

        // 3. Remove deleted items
        const freshIds = new Set(restaurants.map(r => r.id));
        return next.filter(item => freshIds.has(item.id));
      });
    } else {
      setStableRestaurants([]);
    }
  }, [restaurants]);

  // Check if re-sort is needed
  useEffect(() => {
    const currentOrderIds = stableRestaurants.map(r => r.id).join(',');
    const scoreSorted = [...stableRestaurants].sort((a, b) =>
      ((b.likes || 0) - (b.dislikes || 0)) - ((a.likes || 0) - (a.dislikes || 0))
    );
    const idealOrderIds = scoreSorted.map(r => r.id).join(',');

    setHasPendingSort(currentOrderIds !== idealOrderIds);
  }, [stableRestaurants]);

  const handleRefreshOrder = () => {
    const sorted = [...stableRestaurants].sort((a, b) =>
      ((b.likes || 0) - (b.dislikes || 0)) - ((a.likes || 0) - (a.dislikes || 0))
    );
    setStableRestaurants(sorted);
    setHasPendingSort(false);
    // alert("순서가 업데이트되었습니다! 🔄");
  };

  // GA4 Page View
  useEffect(() => {
    logPageView();
  }, [window.location.pathname]);

  // Nickname handlers
  const handleSaveNickname = (name) => {
    localStorage.setItem(STORAGE_KEYS.NICKNAME, name);
    if (userId && roomId) {
      localStorage.setItem(`nickname_${roomId}`, name);
    }
    setNickname(name);
    setShowNicknameModal(false);
  };

  // Room creation with URL update
  const handleCreateRoom = async () => {
    try {
      const newRoomId = await createRoom();
      const newUrl = `/room/${newRoomId}`;
      window.history.pushState({ path: newUrl }, '', newUrl);
      logEvent('Room', 'Create', newRoomId);
    } catch (err) {
      alert("모임 생성 실패: " + err.message);
    }
  };

  // Input handlers
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && inputVal) {
      handleAddLink(inputVal);
    }
  };

  const handleAddLink = async (url) => {
    if (!url || !roomId) return;

    const isDuplicate = restaurants.some(r => r.url === url);
    if (isDuplicate) {
      alert("이미 등록된 식당입니다!");
      setInputVal("");
      return;
    }

    const isKakao = url.includes('kakao.com') || url.includes('kko.to');
    if (isKakao) {
      await new Promise(resolve => setTimeout(resolve, 50));
      alert("카카오맵 링크는 변환 작업으로 인해 10초 정도 걸릴 수 있습니다. 잠시만 기다려주세요! 🕒");
    }

    try {
      await handleAddRestaurant(url);
      logEvent('Participation', 'Add Restaurant', url);
      setInputVal("");
      // Expand map when first restaurant added
      if (restaurants.length === 0) {
        setIsMapExpanded(true);
      }
    } catch (error) {
      alert("식당 추가 실패. 링크를 확인해주세요.");
    }
  };

  const handlePaste = (e) => {
    const pastedData = e.clipboardData.getData('text');
    const urlMatch = pastedData.match(/(https?:\/\/[^\s]+)/);
    if (urlMatch) {
      e.preventDefault();
      const extractedUrl = urlMatch[0];
      setInputVal(extractedUrl);
      if (roomId) handleAddLink(extractedUrl);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("링크가 복사되었습니다! 친구들에게 공유하세요 😆");
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      alert("링크가 복사되었습니다! 친구들에게 공유하세요 🔗");
      logEvent('Participation', 'Share', 'Copy Link');
    });
  };

  // Vote wrapper
  const onVote = async (id, type, reason) => {
    if (!userId) return;
    try {
      await handleVote(id, type, reason);
      logEvent('Participation', 'Vote', type);
    } catch (err) {
      console.error("Vote failed", err);
    }
  };

  // Delete wrapper
  const onDeleteRestaurant = async (restaurantId) => {
    if (!window.confirm("정말 이 식당을 삭제하시겠습니까?")) return;
    try {
      await handleDeleteRestaurant(restaurantId);
    } catch (err) {
      alert("삭제 실패: 본인이 등록한 식당만 삭제할 수 있습니다.");
    }
  };

  // Ladder handlers
  const onLadderTrigger = async (candidateIds) => {
    try {
      await handleLadderTrigger(candidateIds);
      fetchRoom(true);
    } catch (err) {
      alert("사다리 생성 실패");
      throw err;
    }
  };

  const onLadderReset = async () => {
    try {
      await handleLadderReset();
    } catch (err) {
      alert("리셋 실패");
    }
  };

  // Map Marker Click Handler
  const handleMarkerClick = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('highlight-card');
      setTimeout(() => el.classList.remove('highlight-card'), 2000);
    }
  };

  // --- Landing Page Animation ---
  const [currentIcon, setCurrentIcon] = useState('🍔');
  const [isIconPop, setIsIconPop] = useState(false);

  useEffect(() => {
    if (roomId) return;

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

  // --- Render: Landing Page ---
  if (!roomId) {
    return (
      <div className="landing-container">
        {/* ... (Same landing page content) ... */}
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
            <button className="btn-primary" onClick={handleCreateRoom} disabled={loading}>
              {loading ? <Loader2 className="animate-spin" size={20} /> : <>투표방 만들고 친구 초대하기 <span id="changing-icon" className={isIconPop ? 'icon-pop' : ''}>{currentIcon}</span></>}
            </button>
          </div>
        </section>
        <section className="process-section">
          <h2 className="section-title">누구나 쉽고 빠르게</h2>
          <div className="steps-container">
            <div className="step-item">
              <span className="step-badge">STEP 1</span>
              <div className="step-icon-box"><img src="/assets/step_1.png" alt="방 만들기" /></div>
              <div className="step-title">방 만들기</div>
              <div className="step-desc">투표방을 만들고<br />링크를 친구에게 공유해보세요.</div>
            </div>
            <div className="step-item">
              <span className="step-badge">STEP 2</span>
              <div className="step-icon-box"><img src="/assets/step_2.png" alt="후보 추가" /></div>
              <div className="step-title">후보 추가</div>
              <div className="step-desc">네이버 지도 링크만 붙여넣으면<br />간편하게 후보가 등록돼요.</div>
            </div>
            <div className="step-item">
              <span className="step-badge">STEP 3</span>
              <div className="step-icon-box"><img src="/assets/step_3.png" alt="투표 하기" /></div>
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
          <h1 onClick={() => window.location.href = '/'} style={{ cursor: 'pointer' }}>{APP_CONFIG.APP_NAME}</h1>
          <div className="header-actions">
            {nickname && (
              <button className="nickname-badge" onClick={() => setShowNicknameModal(true)}>👤 {nickname}</button>
            )}
            <button className="icon-btn" onClick={handleCopyLink} title="링크 공유">
              <Share size={20} />
            </button>
          </div>
        </div>
        <div className="header-input-container">
          {loading ? (
            <div className="loading-message"><Loader2 className="animate-spin" size={16} /> 정보를 불러오는 중입니다...</div>
          ) : (
            <>
              <input
                type="text" className="header-input" placeholder="식당 네이버/카카오 링크 붙여넣기"
                value={inputVal} onChange={(e) => setInputVal(e.target.value)}
                onPaste={handlePaste} onKeyDown={handleKeyDown}
              />
              <button className={`header-submit-btn ${inputVal ? 'visible' : ''}`} onClick={() => handleAddLink(inputVal)} disabled={!inputVal}>추가</button>
            </>
          )}
        </div>
      </header>


      <main className="app-content">
        {restaurants.length === 0 ? (
          <div className="empty-state">
            <p>상단에 링크를 붙여넣어 투표을 시작하세요!</p>
            <div className="share-hint" onClick={handleShare}>친구 초대하기 🔗</div>
          </div>
        ) : (
          <div className="restaurant-list">
            {/* Sticky container for feature-bar and map */}
            <div className="sticky-feature-container">
              <div className="feature-bar">
                <button className={`feature-btn ${showLadder ? 'active' : ''}`} onClick={() => setShowLadder(!showLadder)}>
                  <LadderIcon size={16} color={showLadder ? "#fff" : "#4e5968"} style={{ marginRight: '6px' }} /> 사다리 타기
                </button>
                <button className={`feature-btn ${isMapExpanded ? 'active' : ''}`} onClick={() => setIsMapExpanded(!isMapExpanded)}>
                  🗺️ 지도 {isMapExpanded ? '접기' : '보기'}
                </button>
                {hasPendingSort && (
                  <button className="feature-btn refresh-btn" onClick={handleRefreshOrder} style={{ color: '#3182f6', background: '#e8f3ff' }}>
                    <RotateCw size={16} /> 순서 업데이트
                  </button>
                )}
              </div>
              {/* Map View - Below feature bar buttons */}
              <MapView
                restaurants={restaurants}
                isExpanded={isMapExpanded}
                onMarkerClick={handleMarkerClick}
              />
            </div>
            {stableRestaurants.map((rest, index) => {
              // Calculate rank based on SCORE, not index in stable list
              // We need the sorted array to determine true rank
              const sortedForRank = [...stableRestaurants].sort((a, b) =>
                ((b.likes || 0) - (b.dislikes || 0)) - ((a.likes || 0) - (a.dislikes || 0))
              );
              const score = (rest.likes || 0) - (rest.dislikes || 0);
              // Finding rank: index in sorted array where score matches
              const rank = sortedForRank.findIndex(r => ((r.likes || 0) - (r.dislikes || 0)) === score) + 1;

              return <RestaurantCard key={rest.id} data={rest} rank={rank} userId={userId} onVote={onVote} onDelete={onDeleteRestaurant} />;
            })}
          </div>
        )
        }
        {
          showLadder && (
            <LadderGame
              roomData={roomData || { restaurants }}
              onTrigger={onLadderTrigger}
              onReset={onLadderReset}
              onClose={() => setShowLadder(false)}
              onComplete={handleLadderComplete}
              apiBase={API_BASE_URL}
              nickname={nickname}
            />
          )
        }
      </main >
      {(showNicknameModal || !nickname) && (
        <NicknameModal onSave={handleSaveNickname} onClose={nickname ? () => setShowNicknameModal(false) : null} initialValue={nickname || ""} />
      )}
      <Footer />
    </div >
  );
}

export default App;
