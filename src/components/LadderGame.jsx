import React, { useState, useEffect, useRef, useCallback } from 'react';
import './LadderGame.css';
import { Share, RefreshCw, X } from 'lucide-react';

const COLORS = ['#FF4757', '#3742FA', '#2ED573', '#FFA502', '#747D8C', '#A4B0BE'];

function LadderGame({ roomData, onTrigger, onReset, nickname }) {
    const canvasRef = useRef(null);
    const [isFinished, setIsFinished] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [showSelector, setShowSelector] = useState(!roomData.ladderGame);
    const [selectedIds, setSelectedIds] = useState([]);

    const ladderData = roomData.ladderGame;

    // Initialize selected IDs if tied winners exist
    useEffect(() => {
        if (!ladderData) {
            const restaurants = roomData.restaurants || [];
            const topScore = restaurants.length > 0
                ? Math.max(...restaurants.map(r => (r.likes || 0) - (r.dislikes || 0)))
                : -999;

            const tiedWinnerIds = restaurants
                .filter(r => (r.likes || 0) - (r.dislikes || 0) === topScore && topScore > 0)
                .map(r => r.id);

            setSelectedIds(tiedWinnerIds.slice(0, 6));
        }
    }, [roomData, ladderData]);

    // Canvas drawing logic
    const drawStaticLadder = useCallback((context, data, highlightSegments = []) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const candidates = roomData.restaurants.filter(r => data.candidateIds.includes(r.id));
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
        data.bridges.forEach(b => {
            const x1 = verticalLines[b.colFrom];
            const x2 = verticalLines[b.colTo];
            context.beginPath();
            context.moveTo(x1, b.y);
            context.lineTo(x2, b.y);
            context.stroke();
        });

        // 3. Dots & Labels
        verticalLines.forEach((x, i) => {
            // Start Dots
            if (i === data.startCol) {
                context.fillStyle = '#ff4757';
                context.beginPath(); context.arc(x, 40, 7, 0, Math.PI * 2); context.fill();
                context.strokeStyle = '#fff'; context.lineWidth = 2; context.stroke();
            } else {
                context.fillStyle = '#adb5bd';
                context.beginPath(); context.arc(x, 40, 6, 0, Math.PI * 2); context.fill();
            }

            // Candidate Labels
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
    }, [roomData.restaurants]);

    // Interaction: Start Game
    const startLadder = useCallback(async () => {
        if (!ladderData || isAnimating) return;
        setIsAnimating(true);
        setIsFinished(false);

        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        const cols = ladderData.candidateIds.length;
        const spacing = canvas.width / (cols + 1);
        const verticalLines = Array.from({ length: cols }, (_, i) => spacing * (i + 1));

        // Calculate full path
        let currentCol = ladderData.startCol;
        let currentY = 40;
        const path = [{ x: verticalLines[currentCol], y: currentY, col: currentCol }];

        // Precise logic
        while (true) {
            const nextBridge = ladderData.bridges.find(b => b.y > currentY && (b.colFrom === currentCol || b.colTo === currentCol));
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

        // Animate
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
    }, [ladderData, isAnimating, drawStaticLadder]);

    // Redraw when data changes
    useEffect(() => {
        if (ladderData && canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            drawStaticLadder(ctx, ladderData);
            setShowSelector(false);
        } else {
            setShowSelector(true);
            setIsFinished(false);
        }
    }, [ladderData, drawStaticLadder]);

    const toggleCandidate = (id) => {
        setSelectedIds(prev => {
            if (prev.includes(id)) return prev.filter(i => i !== id);
            if (prev.length >= 6) {
                alert("최대 6개까지만 선택 가능합니다.");
                return prev;
            }
            return [...prev, id];
        });
    };

    const handleShareResult = () => {
        const winnerName = document.getElementById('ladder-winner-name')?.innerText;
        alert(`[뭐먹을래? 사다리 타기 결과]\n오늘의 맛집은 "${winnerName}"입니다! 🍗\n링크: ${window.location.href}`);
    };

    return (
        <div className="ladder-container">
            <div className="ladder-header">
                <h2>🪜 운명의 사다리 타기</h2>
            </div>

            {showSelector ? (
                <div className="candidate-selector">
                    <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '12px' }}>
                        사다리 탈 후보를 골라주세요 (2~6개)
                    </p>
                    {roomData.restaurants.map(res => (
                        <div
                            key={res.id}
                            className={`candidate-item ${selectedIds.includes(res.id) ? 'selected' : ''}`}
                            onClick={() => toggleCandidate(res.id)}
                        >
                            <div className="candidate-check"></div>
                            <span>{res.name}</span>
                        </div>
                    ))}
                    <button
                        className="btn btn-primary"
                        disabled={selectedIds.length < 2}
                        onClick={() => onTrigger(selectedIds)}
                    >
                        사다리 준비 완료
                    </button>
                </div>
            ) : (
                <div id="game-view" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div className="ladder-sync-notice">
                        🌐 {ladderData.triggeredBy}님이 사다리를 준비했습니다!
                    </div>

                    <div className="ladder-canvas-wrapper">
                        <canvas ref={canvasRef} id="ladderCanvas" width="340" height="420" className="ladder-canvas"></canvas>
                    </div>

                    {!isFinished && !isAnimating && (
                        <button className="btn btn-primary" onClick={startLadder}>사다리 시작!</button>
                    )}

                    {isFinished && (
                        <div className="ladder-result-overlay">
                            <div className="ladder-winner-tag">🎉 오늘의 맛집 당첨!</div>
                            <div className="ladder-winner-name" id="ladder-winner-name">
                                {roomData.restaurants.find(r => {
                                    // Find final col logic matching startLadder
                                    let currentCol = ladderData.startCol;
                                    let y = 40;
                                    while (true) {
                                        const bridge = ladderData.bridges.find(b => b.y > y && (b.colFrom === currentCol || b.colTo === currentCol));
                                        if (bridge) {
                                            currentCol = bridge.colFrom === currentCol ? bridge.colTo : bridge.colFrom;
                                            y = bridge.y;
                                        } else break;
                                    }
                                    const candidatesIdx = ladderData.candidateIds;
                                    return r.id === candidatesIdx[currentCol];
                                })?.name}
                            </div>
                            <button className="btn btn-kakao-share" onClick={handleShareResult}>카카오톡 결과 공유</button>
                            <button className="btn btn-ladder-reset" onClick={onReset}>새 게임 준비하기</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default LadderGame;
