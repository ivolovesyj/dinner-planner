import React, { useEffect, useMemo, useState } from 'react';
import {
    chargePoints,
    createCampaign,
    deleteRoom,
    getCampaigns,
    getFeedbacks,
    getMe,
    getRooms,
    parseCampaignLink,
    reviewCampaign,
    submitCampaign,
    updateCampaign,
    updateCampaignStatus,
    updateMemo
} from '../../api/adminApi';
import RestaurantCard from '../restaurant/RestaurantCard';

const STATION_OPTIONS = [
    '강남역', '역삼역', '선릉역', '삼성역', '잠실역', '신천역', '석촌역', '송파역',
    '홍대입구역', '합정역', '상수역', '신촌역', '이대역', '연남동', '망원역',
    '을지로입구역', '을지로3가역', '종각역', '광화문역', '시청역', '서울역',
    '성수역', '뚝섬역', '건대입구역', '왕십리역', '한양대역',
    '신림역', '서울대입구역', '봉천역', '사당역', '교대역',
    '여의도역', '샛강역', '당산역', '영등포구청역',
    '용산역', '이태원역', '한남역', '압구정로데오역', '압구정역',
    '마포역', '공덕역', '충무로역', '혜화역', '종로3가역'
];
const SORTED_STATION_OPTIONS = [...new Set(STATION_OPTIONS)].sort((a, b) => a.localeCompare(b, 'ko'));

const emptyForm = {
    id: null,
    sourceUrl: '',
    parsedSource: null,
    targetStations: [],
    title: '',
    description: '',
    imageUrls: ['', '', '', '', ''],
    menuPreview: '',
    tagsText: '',
    linkUrl: '',
    budgetPoints: 10000,
    impressionCost: 4,
    clickCost: 250
};

const makeEmptyForm = () => ({
    ...emptyForm,
    targetStations: [...emptyForm.targetStations],
    imageUrls: [...emptyForm.imageUrls]
});

const normalizeFiveImages = (imagesLike) => {
    const list = Array.isArray(imagesLike) ? [...imagesLike] : [];
    const trimmed = list.slice(0, 5);
    while (trimmed.length < 5) trimmed.push('');
    return trimmed;
};

const mergeFirstFiveImages = (existingImages, parsedImages) => {
    const merged = [
        ...(Array.isArray(existingImages) ? existingImages : []),
        ...(Array.isArray(parsedImages) ? parsedImages : [])
    ]
        .map((v) => (v || '').trim())
        .filter(Boolean)
        .filter((v, idx, arr) => arr.indexOf(v) === idx)
        .slice(0, 5);
    return normalizeFiveImages(merged);
};

const AdminDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('campaigns');
    const [profile, setProfile] = useState(null);
    const [campaigns, setCampaigns] = useState([]);
    const [feedbacks, setFeedbacks] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [campaignForm, setCampaignForm] = useState(makeEmptyForm);
    const [campaignFormLoading, setCampaignFormLoading] = useState(false);
    const [linkParsing, setLinkParsing] = useState(false);
    const [chargeAmount, setChargeAmount] = useState(10000);
    const [reviewReasonMap, setReviewReasonMap] = useState({});
    const [stationSearch, setStationSearch] = useState('');

    const role = profile?.role || localStorage.getItem('adminRole') || 'advertiser';
    const isAdmin = role === 'admin';

    const loadDashboardData = async () => {
        const [me, campaignList] = await Promise.all([getMe(), getCampaigns()]);
        setProfile(me);
        setCampaigns(campaignList);
        setActiveTab(me.role === 'admin' ? 'rooms' : 'campaigns');

        if (me.role === 'admin') {
            const [roomList, feedbackList] = await Promise.all([getRooms(), getFeedbacks()]);
            setRooms(roomList);
            setFeedbacks(feedbackList);
        } else {
            setRooms([]);
            setFeedbacks([]);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
        if (!token) {
            window.location.href = '/admin/login';
            return;
        }

        (async () => {
            try {
                await loadDashboardData();
            } catch (err) {
                console.error('Dashboard load failed', err);
                if ([401, 403].includes(err.response?.status)) {
                    localStorage.removeItem('adminToken');
                    localStorage.removeItem('admin_token');
                    localStorage.removeItem('adminName');
                    localStorage.removeItem('adminRole');
                    window.location.href = '/admin/login';
                    return;
                }
                alert(err.response?.data?.error || '대시보드 데이터를 불러오지 못했습니다.');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const logout = () => {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('admin_token');
        localStorage.removeItem('adminName');
        localStorage.removeItem('adminRole');
        localStorage.removeItem('adminPointsBalance');
        window.location.href = '/admin/login';
    };

    const resetCampaignForm = () => setCampaignForm(makeEmptyForm());

    const onSelectCampaign = (campaign) => {
        setCampaignForm({
            id: campaign._id,
            sourceUrl: campaign.source?.naverMapUrl || '',
            parsedSource: campaign.source?.parsedRestaurant || null,
            targetStations: campaign.targetStations || [],
            title: campaign.creative?.title || campaign.title || '',
            description: campaign.creative?.description || campaign.description || '',
            imageUrls: normalizeFiveImages(
                campaign.creative?.imageUrls?.length
                    ? campaign.creative.imageUrls
                    : (campaign.source?.parsedRestaurant?.images?.length
                        ? campaign.source.parsedRestaurant.images
                        : [campaign.creative?.imageUrl || campaign.imageUrl || ''])
            ),
            menuPreview: campaign.creative?.menuPreview || '',
            tagsText: (campaign.creative?.tags || campaign.source?.parsedRestaurant?.tags || []).join(', '),
            linkUrl: campaign.creative?.linkUrl || campaign.linkUrl || '',
            budgetPoints: campaign.budget?.totalPointsLimit || 10000,
            impressionCost: campaign.pricing?.impressionCost || 4,
            clickCost: campaign.pricing?.clickCost || 250
        });
        setActiveTab('campaigns');
    };

    const handleParseLink = async () => {
        if (!campaignForm.sourceUrl) return;
        try {
            setLinkParsing(true);
            const parsed = await parseCampaignLink(campaignForm.sourceUrl);
            setCampaignForm(prev => ({
                ...prev,
                parsedSource: {
                    name: parsed.name || '',
                    category: parsed.category || '',
                    image: parsed.image || parsed.images?.[0] || '',
                    images: parsed.images || [],
                    tags: parsed.tags || [],
                    location: parsed.location || '',
                    station: parsed.station || '',
                    menu: parsed.menu || '',
                    description: parsed.description || ''
                },
                title: prev.title || parsed.name || '',
                description: prev.description || parsed.description || '',
                imageUrls: mergeFirstFiveImages(prev.imageUrls, parsed.images || [parsed.image].filter(Boolean)),
                menuPreview: prev.menuPreview || parsed.menu || '',
                tagsText: prev.tagsText || (Array.isArray(parsed.tags) ? parsed.tags.join(', ') : ''),
                linkUrl: prev.linkUrl || parsed.url || prev.sourceUrl,
                targetStations: (prev.targetStations && prev.targetStations.length > 0) ? prev.targetStations : (parsed.station ? [parsed.station.split(' ')[0]] : [])
            }));
        } catch (err) {
            alert(err.response?.data?.error || '링크 파싱 실패');
        } finally {
            setLinkParsing(false);
        }
    };

    const buildCampaignPayload = () => {
        const targetStations = (campaignForm.targetStations || []).map(s => s.trim()).filter(Boolean);
        const imageUrls = normalizeFiveImages(campaignForm.imageUrls).filter(Boolean);
        const tags = campaignForm.tagsText
            .split(',')
            .map((t) => t.trim().replace(/^#/, ''))
            .filter(Boolean);

        return {
            source: {
                naverMapUrl: campaignForm.sourceUrl,
                parsedRestaurant: campaignForm.parsedSource || {}
            },
            targetStations,
            creative: {
                title: campaignForm.title,
                description: campaignForm.description,
                imageUrl: imageUrls[0] || '',
                imageUrls,
                menuPreview: campaignForm.menuPreview,
                tags,
                linkUrl: campaignForm.linkUrl || campaignForm.sourceUrl
            },
            title: campaignForm.title,
            description: campaignForm.description,
            imageUrl: imageUrls[0] || '',
            linkUrl: campaignForm.linkUrl || campaignForm.sourceUrl,
            sponsorName: profile?.companyName || localStorage.getItem('adminName') || '',
            budget: { totalPointsLimit: Number(campaignForm.budgetPoints) || 10000 },
            pricing: {
                impressionCost: Number(campaignForm.impressionCost) || 4,
                clickCost: Number(campaignForm.clickCost) || 250
            }
        };
    };

    const handleSaveCampaign = async () => {
        try {
            setCampaignFormLoading(true);
            const payload = buildCampaignPayload();
            if (campaignForm.id) {
                await updateCampaign(campaignForm.id, payload);
            } else {
                const created = await createCampaign(payload);
                setCampaignForm(prev => ({ ...prev, id: created._id }));
            }
            await loadDashboardData();
            alert('캠페인이 저장되었습니다.');
        } catch (err) {
            alert(err.response?.data?.error || '캠페인 저장 실패');
        } finally {
            setCampaignFormLoading(false);
        }
    };

    const handleSubmitCampaign = async () => {
        if (!campaignForm.id) {
            alert('먼저 저장해주세요.');
            return;
        }
        try {
            await submitCampaign(campaignForm.id);
            await loadDashboardData();
            alert('광고 심사 신청이 완료되었습니다.');
        } catch (err) {
            alert(err.response?.data?.error || '심사 신청 실패');
        }
    };

    const handleToggleCampaignStatus = async (campaign, status) => {
        try {
            await updateCampaignStatus(campaign._id, status);
            await loadDashboardData();
        } catch (err) {
            alert(err.response?.data?.error || '상태 변경 실패');
        }
    };

    const handleReview = async (campaign, action) => {
        try {
            await reviewCampaign(campaign._id, action, reviewReasonMap[campaign._id] || '');
            await loadDashboardData();
        } catch (err) {
            alert(err.response?.data?.error || '심사 처리 실패');
        }
    };

    const handleChargePoints = async () => {
        try {
            await chargePoints(Number(chargeAmount), null, '광고주 테스트 충전');
            await loadDashboardData();
            alert('포인트가 충전되었습니다.');
        } catch (err) {
            alert(err.response?.data?.error || '포인트 충전 실패');
        }
    };

    const handleUpdateMemo = async (roomId, newMemo) => {
        try {
            await updateMemo(roomId, newMemo);
            setRooms(prev => prev.map(r => r.roomId === roomId ? { ...r, adminMemo: newMemo } : r));
        } catch (err) {
            alert(err.response?.data?.error || '메모 저장 실패');
        }
    };

    const handleDeleteRoom = async (roomId) => {
        if (!window.confirm('정말 이 방을 삭제하시겠습니까?')) return;
        try {
            await deleteRoom(roomId);
            setRooms(prev => prev.filter(r => r.roomId !== roomId));
        } catch (err) {
            alert(err.response?.data?.error || '방 삭제 실패');
        }
    };

    const campaignSummary = useMemo(() => ({
        total: campaigns.length,
        active: campaigns.filter(c => c.status === 'active').length,
        submitted: campaigns.filter(c => c.status === 'submitted').length,
        impressions: campaigns.reduce((a, b) => a + (b.impressions || 0), 0),
        clicks: campaigns.reduce((a, b) => a + (b.clicks || 0), 0),
        spentPoints: campaigns.reduce((a, b) => a + (b.spentPoints || 0), 0),
        advertiserCount: new Set(campaigns.map(c => c.ownerUsername).filter(Boolean)).size
    }), [campaigns]);

    const userStats = useMemo(() => {
        const now = Date.now();
        return {
            rooms: rooms.length,
            activeRooms24h: rooms.filter(r => r.lastAccessedAt && (now - new Date(r.lastAccessedAt).getTime()) < 24 * 60 * 60 * 1000).length,
            participants: rooms.reduce((sum, r) => sum + (r.participants?.length || 0), 0),
            identifiedUsers: rooms.reduce((sum, r) => sum + (r.identifiedMemberCount || 0), 0),
            restaurants: rooms.reduce((sum, r) => sum + (r.restaurants?.length || 0), 0)
        };
    }, [rooms]);

    const livePreviewCard = useMemo(() => {
        const parsed = campaignForm.parsedSource || {};
        const rawImages = [
            ...(campaignForm.imageUrls || []),
            ...(Array.isArray(parsed.images) ? parsed.images : []),
            parsed.image
        ].filter(Boolean);
        const images = rawImages.filter((img, idx) => rawImages.indexOf(img) === idx);
        const targetStation = (campaignForm.targetStations || [])[0] || '';
        const previewTags = campaignForm.tagsText
            .split(',')
            .map((t) => t.trim().replace(/^#/, ''))
            .filter(Boolean);

        return {
            id: 'ad_preview',
            isSponsored: true,
            isPreview: true,
            name: campaignForm.title || parsed.name || '광고 제목 미리보기',
            description: campaignForm.description || parsed.description || '',
            image: images[0] || '',
            images,
            url: campaignForm.linkUrl || campaignForm.sourceUrl || '#',
            category: parsed.category || '광고',
            station: parsed.station || targetStation,
            location: parsed.location || '',
            menu: campaignForm.menuPreview || parsed.menu || '메뉴/혜택 문구가 여기에 표시됩니다.',
            tags: previewTags.length ? previewTags : (parsed.tags?.length ? parsed.tags : (parsed.category ? [parsed.category] : [])),
            likes: 0,
            dislikes: 0,
            userVotes: {},
            ownerId: 'preview-user'
        };
    }, [campaignForm]);

    if (loading) return <div style={{ padding: 24 }}>Loading dashboard...</div>;

    return (
        <div style={{ minHeight: '100vh', background: 'var(--ios-bg)', padding: '16px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <Header profile={profile} onLogout={logout} />

            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                <TabButton active={activeTab === 'campaigns'} onClick={() => setActiveTab('campaigns')}>
                    캠페인 관리
                </TabButton>
                {isAdmin && (
                    <>
                        <TabButton active={activeTab === 'rooms'} onClick={() => setActiveTab('rooms')}>
                            방 관리
                        </TabButton>
                        <TabButton active={activeTab === 'feedback'} onClick={() => setActiveTab('feedback')}>
                            건의함
                        </TabButton>
                    </>
                )}
            </div>

            {activeTab === 'campaigns' && (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))', gap: 12, marginBottom: 16 }}>
                        {isAdmin ? (
                            <>
                                <StatCard title="광고주 수" value={campaignSummary.advertiserCount} />
                                <StatCard title="전체 캠페인" value={campaignSummary.total} />
                                <StatCard title="집행중 캠페인" value={campaignSummary.active} />
                                <StatCard title="심사대기" value={campaignSummary.submitted} />
                                <StatCard title="광고매출(소진P)" value={`${campaignSummary.spentPoints.toLocaleString()} P`} />
                                <StatCard title="총 노출 / 클릭" value={`${campaignSummary.impressions.toLocaleString()} / ${campaignSummary.clicks.toLocaleString()}`} />
                                <StatCard title="총 방 수" value={userStats.rooms} />
                                <StatCard title="24시간 활성 방" value={userStats.activeRooms24h} />
                                <StatCard title="누적 참여자(합산)" value={userStats.participants} />
                                <StatCard title="식별 사용자(합산)" value={userStats.identifiedUsers} />
                                <StatCard title="등록 식당 수(합산)" value={userStats.restaurants} />
                                <StatCard title="건의함 수" value={feedbacks.length} />
                            </>
                        ) : (
                            <>
                                <StatCard title="내 포인트" value={`${(profile?.pointsBalance || 0).toLocaleString()} P`} />
                                <StatCard title="캠페인" value={campaignSummary.total} />
                                <StatCard title="집행중" value={campaignSummary.active} />
                                <StatCard title="심사대기" value={campaignSummary.submitted} />
                            </>
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: isAdmin ? '1fr' : 'minmax(360px, 520px) 1fr', gap: 16, alignItems: 'start' }}>
                        {!isAdmin && (
                        <div style={panelStyle}>
                            <h3 style={{ marginTop: 0 }}>광고 캠페인 작성 / 수정</h3>
                            <p style={mutedText}>네이버지도 링크를 넣고 자동으로 가져온 뒤, 광고용 사진/메뉴/문구를 수정해서 신청하세요.</p>
                            <Field label="광고 대상 식당 링크 (네이버/카카오)">
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <input style={inputStyle} value={campaignForm.sourceUrl} onChange={(e) => setCampaignForm(prev => ({ ...prev, sourceUrl: e.target.value }))} />
                                    <button style={secondaryBtn} onClick={handleParseLink} disabled={linkParsing}>
                                        {linkParsing ? '파싱중' : '자동불러오기'}
                                    </button>
                                </div>
                            </Field>
                            {campaignForm.parsedSource && (
                                <div style={{ marginBottom: 12, border: '1px dashed #d1d5db', borderRadius: 10, padding: 10, background: '#fafafa' }}>
                                    <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>원본 식당 정보 (자동 수집)</div>
                                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{campaignForm.parsedSource.name || '-'}</div>
                                    <div style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>
                                        {campaignForm.parsedSource.station || '-'} {campaignForm.parsedSource.category ? `· ${campaignForm.parsedSource.category}` : ''}
                                    </div>
                                    <div style={{ fontSize: 12, color: '#777', whiteSpace: 'pre-wrap', lineHeight: 1.35 }}>
                                        {campaignForm.parsedSource.menu || '메뉴 정보 없음'}
                                    </div>
                                </div>
                            )}
                            <Field label="타겟 역">
                                <StationMultiSelect
                                    selected={campaignForm.targetStations}
                                    onChange={(next) => setCampaignForm(prev => ({ ...prev, targetStations: next }))}
                                    search={stationSearch}
                                    onSearchChange={setStationSearch}
                                    autoStation={campaignForm.parsedSource?.station ? campaignForm.parsedSource.station.split(' ')[0] : ''}
                                />
                            </Field>
                            <Field label="광고 제목">
                                <input style={inputStyle} value={campaignForm.title} onChange={(e) => setCampaignForm(prev => ({ ...prev, title: e.target.value }))} />
                            </Field>
                            <Field label="광고 설명 (카드 펼침 상단 소개 문구)">
                                <textarea style={{ ...inputStyle, minHeight: 70 }} value={campaignForm.description} onChange={(e) => setCampaignForm(prev => ({ ...prev, description: e.target.value }))} placeholder="예: 점심 특선 / 예약 혜택 / 매장 분위기 소개" />
                            </Field>
                            <Field label="광고 이미지 URL (최대 5개)">
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6 }}>
                                    {normalizeFiveImages(campaignForm.imageUrls).map((img, idx) => (
                                        <input
                                            key={idx}
                                            style={inputStyle}
                                            value={img}
                                            placeholder={`이미지 URL ${idx + 1}`}
                                            onChange={(e) => setCampaignForm(prev => {
                                                const next = normalizeFiveImages(prev.imageUrls);
                                                next[idx] = e.target.value;
                                                return { ...prev, imageUrls: next };
                                            })}
                                        />
                                    ))}
                                </div>
                            </Field>
                            <Field label="메뉴/혜택 문구">
                                <textarea style={{ ...inputStyle, minHeight: 70 }} value={campaignForm.menuPreview} onChange={(e) => setCampaignForm(prev => ({ ...prev, menuPreview: e.target.value }))} />
                            </Field>
                            <Field label="태그 (쉼표 구분)">
                                <input style={inputStyle} value={campaignForm.tagsText} onChange={(e) => setCampaignForm(prev => ({ ...prev, tagsText: e.target.value }))} placeholder="조개요리, 해산물, 술집" />
                            </Field>
                            <Field label="랜딩 링크">
                                <input style={inputStyle} value={campaignForm.linkUrl} onChange={(e) => setCampaignForm(prev => ({ ...prev, linkUrl: e.target.value }))} />
                            </Field>

                            <div style={{ display: 'grid', gridTemplateColumns: isAdmin ? '1fr 1fr 1fr' : '1fr', gap: 8 }}>
                                <Field label="예산 포인트">
                                    <input type="number" style={inputStyle} value={campaignForm.budgetPoints} onChange={(e) => setCampaignForm(prev => ({ ...prev, budgetPoints: e.target.value }))} />
                                </Field>
                                {isAdmin ? (
                                    <>
                                        <Field label="노출당 포인트">
                                            <input type="number" style={inputStyle} value={campaignForm.impressionCost} onChange={(e) => setCampaignForm(prev => ({ ...prev, impressionCost: e.target.value }))} />
                                        </Field>
                                        <Field label="클릭당 포인트">
                                            <input type="number" style={inputStyle} value={campaignForm.clickCost} onChange={(e) => setCampaignForm(prev => ({ ...prev, clickCost: e.target.value }))} />
                                        </Field>
                                    </>
                                ) : (
                                    <div style={{ marginTop: 2 }}>
                                        <div style={{ ...miniTagStyle, background: '#eef6ff', color: '#0369a1', marginBottom: 6 }}>
                                            노출당 {Number(campaignForm.impressionCost || 4)}P / 클릭당 {Number(campaignForm.clickCost || 250)}P (운영 기준)
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                                <button style={primaryBtn} onClick={handleSaveCampaign} disabled={campaignFormLoading}>
                                    {campaignFormLoading ? '저장중...' : (campaignForm.id ? '캠페인 저장' : '새 캠페인 생성')}
                                </button>
                                <button style={secondaryBtn} onClick={handleSubmitCampaign} disabled={!campaignForm.id}>
                                    심사 신청
                                </button>
                                <button style={secondaryBtn} onClick={resetCampaignForm}>
                                    폼 초기화
                                </button>
                            </div>

                            {!isAdmin && (
                                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #eee' }}>
                                    <h4 style={{ margin: '0 0 8px 0' }}>포인트 충전 (토스 연동 전 임시)</h4>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <input type="number" style={inputStyle} value={chargeAmount} onChange={(e) => setChargeAmount(e.target.value)} />
                                        <button style={secondaryBtn} onClick={handleChargePoints}>수동 충전</button>
                                    </div>
                                    <p style={mutedText}>향후 토스페이먼츠 결제 완료 후 이 API 대신 결제 콜백으로 포인트를 적립하는 구조로 교체하면 됩니다.</p>
                                </div>
                            )}
                        </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {!isAdmin && (
                                <div style={panelStyle}>
                                    <h3 style={{ marginTop: 0, marginBottom: 6 }}>실시간 노출 미리보기</h3>
                                    <p style={mutedText}>작성/수정한 내용이 실제 이용자 카드 형태로 바로 반영됩니다.</p>
                                    <div style={{ marginTop: 10 }}>
                                        <RestaurantCard
                                            data={livePreviewCard}
                                            rank={1}
                                            userId="preview-user"
                                            onVote={() => {}}
                                            onDelete={() => {}}
                                        />
                                    </div>
                                </div>
                            )}

                            <div style={panelStyle}>
                                <h3 style={{ marginTop: 0 }}>{isAdmin ? '전체 광고 캠페인 관제' : '내 광고 캠페인'}</h3>
                                {isAdmin && (
                                    <p style={mutedText}>
                                        모든 광고주의 캠페인을 조회하고 심사/승인/반려/집행 상태를 관리합니다. 매출 현황은 소진 포인트 기준으로 집계됩니다.
                                    </p>
                                )}
                                <CampaignTable
                                    campaigns={campaigns}
                                    isAdmin={isAdmin}
                                    onSelect={onSelectCampaign}
                                    onToggleStatus={handleToggleCampaignStatus}
                                    onReview={handleReview}
                                    reviewReasonMap={reviewReasonMap}
                                    setReviewReasonMap={setReviewReasonMap}
                                />
                            </div>
                        </div>
                    </div>

                    {!isAdmin && profile?.recentTransactions?.length > 0 && (
                        <div style={{ ...panelStyle, marginTop: 16 }}>
                            <h3 style={{ marginTop: 0 }}>최근 포인트 변동</h3>
                            <table style={tableStyle}>
                                <thead>
                                    <tr>
                                        <th style={thStyle}>시각</th>
                                        <th style={thStyle}>유형</th>
                                        <th style={thStyle}>금액</th>
                                        <th style={thStyle}>잔액</th>
                                        <th style={thStyle}>메모</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {profile.recentTransactions.map((tx) => (
                                        <tr key={tx._id}>
                                            <td style={tdStyle}>{formatTime(tx.createdAt)}</td>
                                            <td style={tdStyle}>{tx.type}</td>
                                            <td style={{ ...tdStyle, color: tx.amount >= 0 ? '#166534' : '#b91c1c', fontWeight: 700 }}>
                                                {tx.amount > 0 ? '+' : ''}{tx.amount?.toLocaleString()}P
                                            </td>
                                            <td style={tdStyle}>{tx.balanceAfter?.toLocaleString()}P</td>
                                            <td style={tdStyle}>{tx.memo || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {isAdmin && activeTab === 'rooms' && (
                <div style={panelStyle}>
                    <h3 style={{ marginTop: 0 }}>방 관리</h3>
                    <table style={tableStyle}>
                        <thead>
                            <tr>
                                <th style={thStyle}>방</th>
                                <th style={thStyle}>생성일</th>
                                <th style={thStyle}>최근 접속</th>
                                <th style={thStyle}>멤버 수</th>
                                <th style={thStyle}>식당</th>
                                <th style={thStyle}>메모</th>
                                <th style={thStyle}>관리</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rooms.map((room) => (
                                <tr key={room._id}>
                                    <td style={tdStyle}><a href={`/room/${room.roomId}`} target="_blank" rel="noreferrer">{room.roomId.slice(0, 8)}...</a></td>
                                    <td style={tdStyle}>{formatTime(room.createdAt)}</td>
                                    <td style={tdStyle}>{formatTime(room.lastAccessedAt)}</td>
                                    <td style={tdStyle}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            <span
                                                style={miniTagStyle}
                                                title="접속한 적이 있는 전체 고유 사용자 수"
                                            >
                                                👥 총 {(room.participants?.length || 0)}명
                                            </span>
                                            <span
                                                style={{ ...miniTagStyle, background: '#e8f3ff', color: '#007AFF' }}
                                                title={(room.nicknameList && room.nicknameList.length > 0) ? room.nicknameList.join(', ') : '닉네임 없음'}
                                            >
                                                👤 식별 {(room.identifiedMemberCount || 0)}명
                                            </span>
                                        </div>
                                    </td>
                                    <td style={tdStyle}>{room.restaurants?.length || 0}</td>
                                    <td style={tdStyle}>
                                        <textarea
                                            defaultValue={room.adminMemo || ''}
                                            style={{ ...inputStyle, minHeight: 58 }}
                                            onBlur={(e) => handleUpdateMemo(room.roomId, e.target.value)}
                                        />
                                    </td>
                                    <td style={tdStyle}>
                                        <button style={dangerBtn} onClick={() => handleDeleteRoom(room.roomId)}>삭제</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {isAdmin && activeTab === 'feedback' && (
                <div style={panelStyle}>
                    <h3 style={{ marginTop: 0 }}>건의함</h3>
                    {feedbacks.length === 0 ? (
                        <p style={mutedText}>아직 접수된 건의사항이 없습니다.</p>
                    ) : (
                        <table style={tableStyle}>
                            <thead>
                                <tr>
                                    <th style={thStyle}>일시</th>
                                    <th style={thStyle}>연락처</th>
                                    <th style={thStyle}>내용</th>
                                </tr>
                            </thead>
                            <tbody>
                                {feedbacks.map((msg) => (
                                    <tr key={msg._id}>
                                        <td style={tdStyle}>{formatTime(msg.createdAt)}</td>
                                        <td style={tdStyle}>{msg.contact || '-'}</td>
                                        <td style={{ ...tdStyle, whiteSpace: 'pre-wrap' }}>{msg.content}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
        </div>
    );
};

const Header = ({ profile, onLogout }) => (
    <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        gap: 12,
        padding: '14px 16px',
        borderRadius: 16,
        background: 'rgba(242, 242, 247, 0.82)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(0,0,0,0.04)',
        boxShadow: 'var(--shadow-ios)'
    }}>
        <div>
            <h1 style={{ margin: 0, fontSize: '1.25rem', letterSpacing: '-0.02em' }}>광고 운영 대시보드</h1>
            <div style={{ color: 'var(--ios-gray-text)', fontSize: 13 }}>
                {profile?.companyName || profile?.username} ({profile?.role || 'advertiser'})
            </div>
        </div>
        <button style={secondaryBtn} onClick={onLogout}>로그아웃</button>
    </div>
);

const CampaignTable = ({ campaigns, isAdmin, onSelect, onToggleStatus, onReview, reviewReasonMap, setReviewReasonMap }) => (
    <div style={{ overflowX: 'auto' }}>
        <table style={tableStyle}>
            <thead>
                <tr>
                    <th style={thStyle}>캠페인</th>
                    <th style={thStyle}>타겟 역</th>
                    <th style={thStyle}>상태</th>
                    <th style={thStyle}>노출/클릭</th>
                    <th style={thStyle}>소진 포인트</th>
                    <th style={thStyle}>작업</th>
                </tr>
            </thead>
            <tbody>
                {campaigns.map((c) => (
                    <tr key={c._id}>
                        <td style={tdStyle}>
                            <div style={{ fontWeight: 700 }}>{c.title || c.creative?.title || '(제목 없음)'}</div>
                            <div style={{ color: '#666', fontSize: 12 }}>{c.sponsorName} / {c.ownerUsername || '-'}</div>
                        </td>
                        <td style={tdStyle}>{(c.targetStations || []).join(', ') || '-'}</td>
                        <td style={tdStyle}><StatusBadge status={c.status} /></td>
                        <td style={tdStyle}>{(c.impressions || 0).toLocaleString()} / {(c.clicks || 0).toLocaleString()} (CTR {c.ctr}%)</td>
                        <td style={tdStyle}>{(c.spentPoints || 0).toLocaleString()}P</td>
                        <td style={tdStyle}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    <button style={secondaryBtnSmall} onClick={() => onSelect(c)}>불러오기</button>
                                    {['approved', 'paused', 'active'].includes(c.status) && (
                                        <button
                                            style={secondaryBtnSmall}
                                            onClick={() => onToggleStatus(c, c.status === 'active' ? 'paused' : 'active')}
                                        >
                                            {c.status === 'active' ? '중지' : '집행 시작'}
                                        </button>
                                    )}
                                </div>
                                {isAdmin && c.status === 'submitted' && (
                                    <>
                                        <input
                                            style={inputStyleSmall}
                                            placeholder="반려 사유 (선택)"
                                            value={reviewReasonMap[c._id] || ''}
                                            onChange={(e) => setReviewReasonMap(prev => ({ ...prev, [c._id]: e.target.value }))}
                                        />
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button style={secondaryBtnSmall} onClick={() => onReview(c, 'approve')}>승인</button>
                                            <button style={dangerBtnSmall} onClick={() => onReview(c, 'reject')}>반려</button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const StationMultiSelect = ({ selected = [], onChange, search, onSearchChange, autoStation }) => {
    const mergedOptions = useMemo(
        () => [...new Set([...SORTED_STATION_OPTIONS, ...(autoStation ? [autoStation] : []), ...selected])].sort((a, b) => a.localeCompare(b, 'ko')),
        [autoStation, selected]
    );

    const keyword = (search || '').trim();
    const filtered = keyword
        ? mergedOptions.filter((station) => station.toLowerCase().includes(keyword.toLowerCase()))
        : mergedOptions;

    const toggleStation = (station) => {
        const has = selected.includes(station);
        onChange(has ? selected.filter((s) => s !== station) : [...selected, station]);
    };

    return (
        <div style={{ border: '1px solid var(--ios-border)', borderRadius: 12, padding: 10, background: '#fff' }}>
            <input
                style={{ ...inputStyle, marginBottom: 8 }}
                placeholder="역 검색 (예: 강남, 홍대)"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
            />

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8, minHeight: 28 }}>
                {selected.length > 0 ? selected.map((station) => (
                    <button
                        key={station}
                        type="button"
                        onClick={() => toggleStation(station)}
                        style={{
                            border: '1px solid rgba(0,122,255,0.15)',
                            background: 'rgba(0,122,255,0.08)',
                            color: 'var(--ios-blue)',
                            borderRadius: 999,
                            padding: '4px 8px',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer'
                        }}
                    >
                        {station} ×
                    </button>
                )) : (
                    <span style={{ ...mutedText, marginTop: 2 }}>선택한 역이 없습니다.</span>
                )}
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: 6,
                maxHeight: 220,
                overflowY: 'auto',
                paddingRight: 4
            }}>
                {filtered.map((station) => {
                    const active = selected.includes(station);
                    return (
                        <button
                            key={station}
                            type="button"
                            onClick={() => toggleStation(station)}
                            style={{
                                textAlign: 'left',
                                border: active ? '1px solid rgba(0,122,255,0.2)' : '1px solid rgba(0,0,0,0.06)',
                                background: active ? 'rgba(0,122,255,0.08)' : '#fff',
                                color: active ? 'var(--ios-blue)' : '#1f2937',
                                borderRadius: 10,
                                padding: '8px 10px',
                                fontSize: 12,
                                fontWeight: active ? 700 : 600,
                                cursor: 'pointer'
                            }}
                        >
                            {station}
                        </button>
                    );
                })}
                {filtered.length === 0 && (
                    <div style={{ ...mutedText, gridColumn: '1 / -1', padding: '6px 2px' }}>검색 결과가 없습니다.</div>
                )}
            </div>
        </div>
    );
};

const StatusBadge = ({ status }) => {
    const colorMap = {
        draft: ['#f0f0f0', '#555'],
        submitted: ['#fff3cd', '#8a6d3b'],
        approved: ['#dbeafe', '#1d4ed8'],
        active: ['#dcfce7', '#166534'],
        paused: ['#fee2e2', '#991b1b'],
        rejected: ['#fce7f3', '#9d174d'],
        completed: ['#e0e7ff', '#3730a3']
    };
    const [bg, fg] = colorMap[status] || ['#eee', '#333'];
    return <span style={{ background: bg, color: fg, padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700 }}>{status}</span>;
};

const Field = ({ label, children }) => (
    <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>{label}</div>
        {children}
    </div>
);

const StatCard = ({ title, value }) => (
    <div style={panelStyle}>
        <div style={{ color: 'var(--ios-gray-text)', fontSize: 12, fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6, color: '#111827', letterSpacing: '-0.03em' }}>{value}</div>
    </div>
);

const formatTime = (isoString) => {
    if (!isoString) return '-';
    const d = new Date(isoString);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

const panelStyle = {
    background: 'var(--ios-card-bg)',
    border: '1px solid rgba(0,0,0,0.05)',
    borderRadius: 16,
    padding: 16,
    boxShadow: 'var(--shadow-ios)'
};

const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left'
};

const thStyle = {
    padding: '10px 8px',
    borderBottom: '1px solid rgba(0,0,0,0.06)',
    color: 'var(--ios-gray-text)',
    fontSize: 12,
    fontWeight: 700
};

const tdStyle = {
    padding: '10px 8px',
    borderBottom: '1px solid rgba(0,0,0,0.035)',
    verticalAlign: 'top',
    fontSize: 13,
    color: '#1f2937'
};

const mutedText = { color: 'var(--ios-gray-text)', fontSize: 12, lineHeight: 1.4, marginTop: 4 };
const miniTagStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    background: '#f1f2f5',
    color: '#4b5563',
    borderRadius: 999,
    padding: '3px 8px',
    fontSize: 11,
    fontWeight: 600,
    width: 'fit-content'
};

const inputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid var(--ios-border)',
    borderRadius: 12,
    padding: '10px 12px',
    fontSize: 13,
    fontFamily: 'inherit',
    background: '#fff'
};

const inputStyleSmall = {
    ...inputStyle,
    padding: '8px 10px',
    fontSize: 12
};

const primaryBtn = {
    border: 'none',
    background: 'var(--ios-blue)',
    color: '#fff',
    borderRadius: 14,
    padding: '10px 12px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 10px rgba(0, 122, 255, 0.2)'
};

const secondaryBtn = {
    border: '1px solid rgba(0,0,0,0.07)',
    background: '#fff',
    color: '#222',
    borderRadius: 14,
    padding: '10px 12px',
    fontWeight: 600,
    cursor: 'pointer'
};

const secondaryBtnSmall = {
    ...secondaryBtn,
    padding: '6px 8px',
    fontSize: 12
};

const dangerBtn = {
    border: 'none',
    background: 'var(--ios-red)',
    color: '#fff',
    borderRadius: 12,
    padding: '8px 12px',
    cursor: 'pointer'
};

const dangerBtnSmall = {
    ...dangerBtn,
    padding: '6px 8px',
    fontSize: 12
};

const TabButton = ({ active, onClick, children }) => (
    <button
        onClick={onClick}
        style={{
            ...secondaryBtn,
            background: active ? 'rgba(0, 122, 255, 0.08)' : '#fff',
            borderColor: active ? 'rgba(0, 122, 255, 0.22)' : 'rgba(0,0,0,0.07)',
            color: active ? 'var(--ios-blue)' : '#333'
        }}
    >
        {children}
    </button>
);

export default AdminDashboard;
