import React, { useState, useEffect, useRef, useCallback } from 'react';
import './LadderGame.css';
import { X } from 'lucide-react';

const LadderIcon = ({ size = 20, style = {}, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
        <path d="M8 3v18" />
        <path d="M16 3v18" />
        <path d="M8 7h8" />
        <path d="M8 12h8" />
        <path d="M8 17h8" />
    </svg>
);

function LadderGame({ roomData, onTrigger, onReset, onClose, nickname }) {
    const canvasRef = useRef(null);
    const [isFinished, setIsFinished] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const isValidGame = roomData?.ladderGame && roomData.ladderGame.candidateIds && roomData.ladderGame.candidateIds.length >= 2;
    const [showSelector, setShowSelector] = useState(!isValidGame);
    const [selectedIds, setSelectedIds] = useState([]);

    // Guard: if roomData isn't ready
    if (!roomData) return null;

    const ladderData = roomData.ladderGame;

    // Fix: Define candidates in strictly mapped order of candidateIds to ensure visual/logical match
    const candidates = ladderData ? ladderData.candidateIds.map(id =>
        (roomData.restaurants || []).find(r => String(r.id) === String(id) || String(r._id) === String(id))
    ).filter(Boolean) : [];

    // Smart Close Logic
    const handleClose = useCallback(() => {
        // If game is playing (has data but not finished), reset it.
        // If game is completed or not started, just close.
        if (ladderData && ladderData.status !== 'completed' && !isFinished) {
            onReset();
        }
        onClose();
    }, [ladderData, isFinished, onReset, onClose]);

    // Check for completed status on mount/update
    useEffect(() => {
        if (ladderData?.status === 'completed') {
            setIsFinished(true); // Show result immediately
            setShowSelector(false); // Ensure selector is hidden
        }
    }, [ladderData]);

    // Auto-selection removed per user request for cleaner reset
    // Fix: Valid candidates persists until cleared. We must force clear selectedIds when game resets.
    useEffect(() => {
        if (!ladderData) {
            setSelectedIds([]);
        }
    }, [ladderData]);

    // Canvas drawing logic
    const drawStaticLadder = useCallback((context, data, highlightSegments = []) => {
        const canvas = canvasRef.current;
        if (!canvas || !data) return;

        // Match candidates by looking at both .id and ._id for robustness
        const candidates = (roomData.restaurants || []).filter(r =>
            data.candidateIds?.some(cid => String(cid) === String(r.id) || String(cid) === String(r._id))
        );
        if (candidates.length < 2) {
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.fillStyle = '#ff4757';
            context.font = '12px monospace';
            context.textAlign = 'left';

            // Debug Info
            const debugInfo = [
                "⚠️ Debug Info:",
                `Rests: ${(roomData.restaurants || []).length}`,
                `Cands: ${data.candidateIds?.length || 0}`,
                `Matches: ${candidates.length}`,
                `R[0]: ${(roomData.restaurants?.[0]?.id || '').substring(0, 8)}`,
                `C[0]: ${(data.candidateIds?.[0] || '').substring(0, 8)}`,
                "잠시만 기다려주세요..."
            ];

            debugInfo.forEach((text, i) => {
                context.fillText(text, 20, 100 + (i * 20));
            });
            return;
        }

        const cols = candidates.length;
        const spacing = canvas.width / (cols + 1);
        const verticalLines = Array.from({ length: cols }, (_, i) => spacing * (i + 1));

        context.clearRect(0, 0, canvas.width, canvas.height);

        // 1. Vertical Lines
        context.strokeStyle = '#dee2e6';
        context.lineWidth = 4;
        context.lineCap = 'round';
        verticalLines.forEach(x => {
            context.beginPath();
            context.moveTo(x, 40);
            context.lineTo(x, canvas.height - 60);
            context.stroke();
        });

        // 2. Bridges
        (data.bridges || []).forEach(b => {
            const x1 = verticalLines[b.colFrom];
            const x2 = verticalLines[b.colTo];
            if (x1 !== undefined && x2 !== undefined) {
                context.beginPath();
                context.moveTo(x1, b.y);
                context.lineTo(x2, b.y);
                context.stroke();
            }
        });

        // 3. Dots & Labels
        verticalLines.forEach((x, i) => {
            if (i === data.startCol) {
                context.fillStyle = '#ff4757';
                context.beginPath(); context.arc(x, 40, 7, 0, Math.PI * 2); context.fill();
                context.strokeStyle = '#fff'; context.lineWidth = 2; context.stroke();
            } else {
                context.fillStyle = '#adb5bd';
                context.beginPath(); context.arc(x, 40, 6, 0, Math.PI * 2); context.fill();
            }

            context.fillStyle = '#1a1f36';
            context.font = 'bold 12px sans-serif';
            context.textAlign = 'center';
            const name = candidates[i]?.name || 'Unknown';
            const label = name.length > 5 ? name.substring(0, 4) + '..' : name;
            context.fillText(label, x, canvas.height - 35);
        });

        // 4. Highlight Path
        if (highlightSegments.length > 0) {
            context.strokeStyle = '#ff4757';
            context.lineWidth = 6;
            context.lineJoin = 'round';
            context.beginPath();
            context.moveTo(highlightSegments[0].x, highlightSegments[0].y);
            for (let i = 1; i < highlightSegments.length; i++) {
                context.lineTo(highlightSegments[i].x, highlightSegments[i].y);
            }
            context.stroke();

            const last = highlightSegments[highlightSegments.length - 1];
            context.fillStyle = '#ff4757';
            context.beginPath(); context.arc(last.x, last.y, 6, 0, Math.PI * 2); context.fill();
        }
    }, [roomData]); // Depend on full roomData to ensure updates trigger re-draw

    const startLadder = useCallback(async () => {
        if (!ladderData || isAnimating) return;
        setIsAnimating(true);
        setIsFinished(false);

        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        const cols = (ladderData.candidateIds || []).length;
        const spacing = canvas.width / (cols + 1);
        const verticalLines = Array.from({ length: cols }, (_, i) => spacing * (i + 1));

        let currentCol = ladderData.startCol;
        let currentY = 40;
        const path = [{ x: verticalLines[currentCol], y: currentY, col: currentCol }];

        while (true) {
            const nextBridge = (ladderData.bridges || []).find(b => b.y > currentY && (b.colFrom === currentCol || b.colTo === currentCol));
            if (nextBridge) {
                path.push({ x: verticalLines[currentCol], y: nextBridge.y, col: currentCol });
                const targetCol = nextBridge.colFrom === currentCol ? nextBridge.colTo : nextBridge.colFrom;
                path.push({ x: verticalLines[targetCol], y: nextBridge.y, col: targetCol });
                currentCol = targetCol;
                currentY = nextBridge.y;
            } else {
                path.push({ x: verticalLines[currentCol], y: canvas.height - 60, col: currentCol });
                break;
            }
        }

        for (let i = 0; i < path.length - 1; i++) {
            const p1 = path[i];
            const p2 = path[i + 1];
            const duration = Math.abs(p1.x - p2.x) > 0 ? 300 : 500;
            await new Promise(resolve => {
                const startTime = performance.now();
                const step = (t) => {
                    const elapsed = t - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    const curX = p1.x + (p2.x - p1.x) * progress;
                    const curY = p1.y + (p2.y - p1.y) * progress;
                    drawStaticLadder(context, ladderData, [...path.slice(0, i + 1), { x: curX, y: curY }]);
                    if (progress < 1) requestAnimationFrame(step);
                    else resolve();
                };
                requestAnimationFrame(step);
            });
        }

        setIsAnimating(false);
        setIsFinished(true);

        // Mark as completed on server
        if (roomData.roomId) {
            // We use fetch here to avoid needing to pass axios or define it
            fetch(`/api/rooms/${roomData.roomId}/ladder/complete`, { method: 'PATCH' }).catch(console.error);
        }
    }, [ladderData, isAnimating, drawStaticLadder, roomData.roomId]);

    // View Switching Logic
    useEffect(() => {
        if (isValidGame) {
            setShowSelector(false);
        } else {
            setShowSelector(true);
            setIsFinished(false);
        }
    }, [isValidGame]);

    // Drawing Logic
    useEffect(() => {
        if (!showSelector && ladderData && canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');

            let highlightPath = [];
            // If game is finished or completed, calculate and draw the full path
            if (isFinished || ladderData.status === 'completed') {
                const cols = (ladderData.candidateIds || []).length;
                const spacing = canvasRef.current.width / (cols + 1);
                const verticalLines = Array.from({ length: cols }, (_, i) => spacing * (i + 1));

                let currentCol = ladderData.startCol;
                let currentY = 40;
                highlightPath.push({ x: verticalLines[currentCol], y: currentY });

                while (true) {
                    const nextBridge = (ladderData.bridges || []).find(b => b.y > currentY && (b.colFrom === currentCol || b.colTo === currentCol));
                    if (nextBridge) {
                        highlightPath.push({ x: verticalLines[currentCol], y: nextBridge.y });
                        const targetCol = nextBridge.colFrom === currentCol ? nextBridge.colTo : nextBridge.colFrom;
                        highlightPath.push({ x: verticalLines[targetCol], y: nextBridge.y });
                        currentCol = targetCol;
                        currentY = nextBridge.y;
                    } else {
                        highlightPath.push({ x: verticalLines[currentCol], y: canvasRef.current.height - 60 });
                        break;
                    }
                }
            }

            drawStaticLadder(ctx, ladderData, highlightPath);
        }
    }, [showSelector, ladderData, drawStaticLadder, isFinished]);

    const toggleCandidate = (id) => {
        setSelectedIds(prev => {
            if (prev.includes(id)) return prev.filter(i => i !== id);
            if (prev.length >= 6) { return prev; }
            return [...prev, id];
        });
    };

    const handleShareResult = () => {
        const winnerName = document.getElementById('ladder-winner-name')?.innerText;
        alert(`[뭐먹을래? 사다리 타기 결과]\n오늘의 맛집은 "${winnerName}"입니다! 🍗\n링크: ${window.location.href}`);
    };

    return (
        <div className="ladder-overlay">
            <div className="ladder-container">
                <button className="btn-close-ladder" onClick={handleClose} title="닫기">
                    <X size={20} />
                </button>

                <div className="ladder-header">
                    <h2><LadderIcon size={22} color="#3392ff" style={{ verticalAlign: 'middle', marginRight: '8px' }} />운명의 사다리 타기</h2>
                </div>

                {showSelector ? (
                    <div className="candidate-selector">
                        <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '12px' }}>
                            사다리 탈 후보를 골라주세요 (2~6개)
                        </p>
                        <div className="candidate-list">
                            {(roomData.restaurants || []).map(res => (
                                <div
                                    key={res.id}
                                    className={`candidate-item ${selectedIds.includes(res.id) ? 'selected' : ''}`}
                                    onClick={() => toggleCandidate(res.id)}
                                >
                                    <div className="candidate-check"></div>
                                    {res.image ? (
                                        <img src={res.image} alt="res" className="candidate-image" onError={(e) => e.target.style.display = 'none'} />
                                    ) : (
                                        <div className="candidate-image-placeholder">🍽️</div>
                                    )}
                                    <span className="candidate-name">{res.name}</span>
                                </div>
                            ))}
                        </div>
                        <button
                            className="btn btn-primary"
                            disabled={selectedIds.length < 2 || isCreating}
                            onClick={async () => {
                                setIsCreating(true);
                                try {
                                    await onTrigger(selectedIds);
                                } catch (e) {
                                    alert("사다리 생성 실패: " + e.message);
                                } finally {
                                    setIsCreating(false);
                                }
                            }}
                        >
                            {isCreating ? '사다리 준비 중...' : '사다리 준비 완료'}
                        </button>
                    </div>
                ) : (
                    <div id="game-view" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        {/* ladder-sync-notice removed per user request */}

                        <div className="ladder-canvas-wrapper">
                            <canvas ref={canvasRef} id="ladderCanvas" width="340" height="420" className="ladder-canvas"></canvas>
                        </div>

                        {/* Fallback Reset Button for Debug/Stuck State */}
                        {!isFinished && !isAnimating && candidates.length < 2 && (
                            <div style={{ marginTop: '10px' }}>
                                <button className="btn btn-ladder-reset" onClick={onReset} style={{ background: '#ff4757', color: 'white' }}>
                                    오류 발생: 게임 리셋하기
                                </button>
                            </div>
                        )}

                        {!isFinished && !isAnimating && candidates.length >= 2 && (
                            <button className="btn btn-primary" onClick={startLadder}>사다리 시작!</button>
                        )}

                        {isFinished && (
                            <div className="ladder-result-overlay">
                                <div className="ladder-winner-tag">🎉 오늘의 맛집 당첨!</div>
                                <div className="ladder-winner-name" id="ladder-winner-name">
                                    {ladderData && roomData.restaurants?.find(r => {
                                        let currentCol = ladderData.startCol;
                                        let y = 40;
                                        while (true) {
                                            const bridge = (ladderData.bridges || []).find(b => b.y > y && (b.colFrom === currentCol || b.colTo === currentCol));
                                            if (bridge) {
                                                currentCol = bridge.colFrom === currentCol ? bridge.colTo : bridge.colFrom;
                                                y = bridge.y;
                                            } else break;
                                        }
                                        return String(r.id) === String(ladderData.candidateIds?.[currentCol]) || String(r._id) === String(ladderData.candidateIds?.[currentCol]);
                                    })?.name || '결과를 불러올 수 없습니다'}
                                </div>
                                <div className="ladder-result-actions">
                                    <button className="btn btn-kakao-share" onClick={handleShareResult}>
                                        카카오톡 공유하기
                                    </button>
                                    <button className="btn btn-ladder-reset" onClick={onReset}>
                                        다시 시작하기
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default LadderGame;
