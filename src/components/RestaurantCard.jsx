import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import './RestaurantCard.css';
import { ThumbsUp, ThumbsDown, ChevronDown, ChevronUp, MapPin, Trash2 } from 'lucide-react';
import CustomModal from './CustomModal';

const RestaurantCard = ({ data, rank, userId, onVote, onDelete }) => {
    const [showReasons, setShowReasons] = useState(false);
    const [showMenu, setShowMenu] = useState(false); // Validated separate state
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [touchStart, setTouchStart] = useState(0);
    const [touchEnd, setTouchEnd] = useState(0);
    const [showDislikeConfirm, setShowDislikeConfirm] = useState(false);

    const isOwner = userId && data.ownerId && userId === data.ownerId;

    const images = data.images && data.images.length > 0 ? data.images : [data.image];

    const nextImage = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
    };

    const prevImage = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    const openModal = (e) => {
        e.preventDefault();
        setIsModalOpen(true);
    };

    const closeModal = (e) => {
        e.stopPropagation();
        setIsModalOpen(false);
    };

    const handleDislike = () => {
        // If already voted down, toggle off directly
        if (userVote === 'down') {
            onVote(data.id, 'down');
            return;
        }
        setShowDislikeConfirm(true);
    };

    const handleConfirmDislike = () => {
        setShowDislikeConfirm(false);
        const reason = prompt("무엇이 별로인지 알려주세요!");
        if (reason !== null) {
            onVote(data.id, 'down', reason || '이유 없음');
        }
    };

    const handleCancelDislike = () => {
        setShowDislikeConfirm(false);
        onVote(data.id, 'down');
    };

    const handleLike = () => {
        onVote(data.id, 'up');
    };

    // Determine user's vote status
    const userVote = (userId && data.userVotes) ? data.userVotes[userId] : null;

    // Touch handlers for swipe
    const handleTouchStart = (e) => {
        setTouchStart(e.targetTouches[0].clientX);
    };

    const handleTouchMove = (e) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const handleTouchEnd = (e) => {
        if (!touchStart || !touchEnd) return;

        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > 50;
        const isRightSwipe = distance < -50;

        if (isLeftSwipe) {
            nextImage();
        }
        if (isRightSwipe) {
            prevImage();
        }

        // Reset
        setTouchStart(0);
        setTouchEnd(0);
    };

    // Rank badge styling
    const getRankClass = () => {
        if (rank === 1) return 'rank-gold';
        if (rank === 2) return 'rank-silver';
        if (rank === 3) return 'rank-bronze';
        return 'rank-default';
    };

    // --- Sponsored Card Render ---
    if (data.isSponsored) {
        const handleAdClick = (e) => {
            // Track Click
            try {
                // Determine API BASE using the same logic as App.jsx or relative path
                // For safety/simplicity, using full path if needed, or just relative /api
                // We'll use relative /api assuming proxy/CORS setup or hardcode for now
                const API_BASE = 'https://gooddinner.fly.dev/api';
                axios.post(`${API_BASE}/ads/${data.id}/click`);
            } catch (err) {
                // Ignore tracking errors
            }
        };

        return (
            <div className="card sponsored-card">
                <a
                    href={data.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="card-link-wrapper"
                    onClick={handleAdClick}
                >
                    <div className="card-image-container">
                        <div className="sponsored-badge">추천 (광고)</div>
                        <img src={data.image} alt={data.name} className="card-image" />
                    </div>
                    <div className="card-info-clickable">
                        <div className="card-header">
                            <h3 className="card-title">{data.name}</h3>
                            <div className="card-meta-row">
                                <span className="card-sponsor-name">Sponsored by {data.sponsorName}</span>
                            </div>
                        </div>
                        <div className="card-content">
                            <p className="sponsored-desc">{data.description}</p>
                        </div>
                    </div>
                </a>
            </div>
        );
    }

    return (
        <div className="card">
            {/* Lightbox Modal - Rendered outside card via Portal */}
            {isModalOpen && createPortal(
                <div className="lightbox-overlay" onClick={closeModal}>
                    <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
                        <button className="lightbox-close" onClick={closeModal}>×</button>

                        <div className="lightbox-image-container">
                            <img src={images[currentImageIndex]} alt={data.name} className="lightbox-image" />

                            {images.length > 1 && (
                                <>
                                    <button className="lightbox-btn prev" onClick={prevImage}>
                                        <ChevronDown size={32} style={{ transform: 'rotate(90deg)' }} />
                                    </button>
                                    <button className="lightbox-btn next" onClick={nextImage}>
                                        <ChevronDown size={32} style={{ transform: 'rotate(-90deg)' }} />
                                    </button>
                                </>
                            )}
                        </div>
                        <div className="lightbox-counter">
                            {currentImageIndex + 1} / {images.length}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            <div className="card-image-container" onClick={openModal}>
                {/* Rank Badge - shown only when votes exist */}
                {((data.likes || 0) + (data.dislikes || 0) > 0) && (
                    <div className={`rank-badge ${getRankClass()}`}>
                        {rank === 1 && '🥇'}
                        {rank === 2 && '🥈'}
                        {rank === 3 && '🥉'}
                        {rank > 3 && `${rank}위`}
                    </div>
                )}

                <div
                    className="card-image"
                    style={{ backgroundImage: `url(${images[currentImageIndex]})` }}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                />

                {images.length > 1 && (
                    <>
                        <button className="carousel-btn prev" onClick={prevImage}>
                            <ChevronDown size={20} style={{ transform: 'rotate(90deg)' }} />
                        </button>
                        <button className="carousel-btn next" onClick={nextImage}>
                            <ChevronDown size={20} style={{ transform: 'rotate(-90deg)' }} />
                        </button>
                        <div className="carousel-indicators">
                            {images.map((_, idx) => (
                                <span
                                    key={idx}
                                    className={`indicator ${idx === currentImageIndex ? 'active' : ''}`}
                                />
                            ))}
                        </div>
                    </>
                )}

                {/* Delete Button - Top Right */}
                {isOwner && (
                    <button
                        className="delete-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(data.id);
                        }}
                    >
                        <Trash2 size={16} />
                    </button>
                )}

                {/* Top Left: Rank Medal (Big & Clear) - Only show if voted */}
                {rank <= 3 && (data.likes || 0) > 0 && (
                    <div className={`rank-badge rank-${rank === 1 ? 'gold' : rank === 2 ? 'silver' : 'bronze'}`}>
                        <span className="rank-num">{rank}</span>
                        <span className="rank-label">위</span>
                    </div>
                )}

                {/* Top Right: Image Counter */}
                {images.length > 1 && (
                    <div className="image-counter">
                        {currentImageIndex + 1} / {images.length}
                    </div>
                )}

                {/* Bottom Left: Category Badge */}
                <div className="card-badge">{data.category}</div>

                {/* Bottom Right: Delete Button (If Owner) */}
                {isOwner && (
                    <button
                        className="delete-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(data.id);
                        }}
                    >
                        <Trash2 size={16} />
                    </button>
                )}
            </div>

            <a href={data.url} target="_blank" rel="noopener noreferrer" className="card-link">
                <div className="card-info-clickable">
                    <div className="card-header">
                        <h3 className="card-title">{data.name}</h3>
                        <div className="card-meta-row">
                            {/* <span className="card-price">{data.priceRange}</span> Removed per user request */}
                            {data.author && <span className="card-author">추천: {data.author}</span>}
                        </div>
                    </div>
                    <div className="card-location-row">
                        {data.station && (
                            <div className="card-station">
                                🚇 <span>{data.station}</span>
                            </div>
                        )}
                        {data.location && (
                            <div className="card-location">
                                <MapPin size={14} className="location-icon" />
                                <span>{data.location}</span>
                            </div>
                        )}
                    </div>
                </div>
            </a>

            <div className="card-content">
                <div className="card-tags">
                    {data.tags.map((tag, idx) => (
                        <span key={idx} className="tag">#{tag}</span>
                    ))}
                </div>

                {data.menu && (
                    <div className="card-menu-section">
                        <ul className="menu-list">
                            {data.menu.split(', ').slice(0, showMenu ? undefined : 3).map((item, idx) => (
                                <li key={idx} className="menu-item">
                                    <span className="menu-dot">•</span>
                                    {item}
                                </li>
                            ))}
                        </ul>
                        {data.menu.split(', ').length > 3 && (
                            <button
                                className="menu-more-btn"
                                onClick={(e) => {
                                    e.preventDefault();
                                    setShowMenu(!showMenu);
                                }}
                            >
                                {showMenu ? '접기' : `+ ${data.menu.split(', ').length - 3}개 더보기`}
                            </button>
                        )}
                    </div>
                )}

                <div className="card-actions">
                    <button
                        className={`action-btn like ${userVote === 'up' ? 'active' : ''}`}
                        onClick={handleLike}
                    >
                        <ThumbsUp size={18} />
                        <span>여기 좋다! 가자!</span>
                        {data.likes > 0 && <span className="vote-count">({data.likes})</span>}
                    </button>

                    <button
                        className={`action-btn dislike ${userVote === 'down' ? 'active' : ''}`}
                        onClick={handleDislike}
                    >
                        <ThumbsDown size={18} />
                        <span>여긴 별로.. 패스!</span>
                        {data.dislikes > 0 && <span className="vote-count">({data.dislikes})</span>}
                    </button>
                </div>

                {data.dislikeReasons && data.dislikeReasons.length > 0 && (
                    <div className="reasons-section">
                        <button
                            className="toggle-reasons"
                            onClick={(e) => {
                                e.preventDefault();
                                setShowReasons(!showReasons);
                            }}
                        >
                            {showReasons ? '별로인 이유 숨기기' : `별로인 이유 보기 (${data.dislikeReasons.length})`}
                            {showReasons ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>

                        {showReasons && (
                            <ul className="reasons-list">
                                {data.dislikeReasons.map((item, idx) => (
                                    <li key={idx}>
                                        <span className="reason-text">• {item.reason}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>

            <CustomModal
                isOpen={showDislikeConfirm}
                title="별로인 이유를 남기시겠어요?"
                message={`작성해주신 피드백은 익명으로 전달되어\n추천한 친구가 알 수 없습니다.`}
                onConfirm={handleConfirmDislike}
                onCancel={handleCancelDislike}
                confirmText="네"
                cancelText="아니요"
            />
        </div >
    );
};

export default RestaurantCard;
