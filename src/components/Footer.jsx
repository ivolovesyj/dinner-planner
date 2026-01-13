import React, { useState } from 'react';
import LegalModal, { TERMS_TEXT, PRIVACY_TEXT } from './LegalModal';
import { Copy, Check, Send, Loader2 } from 'lucide-react';
import axios from 'axios';

// FORCE Fly.io API for now
const API_BASE = 'https://gooddinner.fly.dev/api';

const Footer = () => {
    const [legalModal, setLegalModal] = useState(null); // 'terms' | 'privacy'
    const [contactModal, setContactModal] = useState(null); // 'dev' | 'ad'
    const [copied, setCopied] = useState(false);

    // Feedback Form State
    const [feedbackContent, setFeedbackContent] = useState('');
    const [feedbackContact, setFeedbackContact] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [sentSuccess, setSentSuccess] = useState(false);

    const EMAIL = "ci0515@naver.com";

    const linkStyle = {
        color: '#666', textDecoration: 'none', cursor: 'pointer', margin: '0 8px', fontSize: '11px'
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(EMAIL);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSendFeedback = async () => {
        if (!feedbackContent.trim()) return;
        setIsSending(true);
        try {
            await axios.post(`${API_BASE}/feedback`, {
                content: feedbackContent,
                contact: feedbackContact
            });
            setSentSuccess(true);
            setFeedbackContent('');
            setFeedbackContact('');
        } catch (error) {
            alert('전송에 실패했습니다. 잠시 후 다시 시도해주세요.');
        } finally {
            setIsSending(false);
        }
    };

    const resetFeedback = () => {
        setSentSuccess(false);
        setContactModal(null);
    };

    return (
        <>
            <footer style={{
                padding: '12px 20px', textAlign: 'center', background: '#f9f9f9',
                borderTop: '1px solid #eee', marginTop: '120px', color: '#888'
            }}>
                <div style={{ marginBottom: '8px' }}>
                    <span onClick={() => setLegalModal('terms')} style={linkStyle}>이용약관</span>
                    |
                    <span onClick={() => setLegalModal('privacy')} style={{ ...linkStyle, fontWeight: 'bold' }}>개인정보처리방침</span>
                    |
                    <span onClick={() => { setContactModal('dev'); setSentSuccess(false); }} style={linkStyle}>개발자에게 요청하기</span>
                    |
                    <span onClick={() => setContactModal('ad')} style={linkStyle}>광고 제휴 문의</span>
                </div>
                <div style={{ fontSize: '10px', lineHeight: '1.4' }}>
                    &copy; 2026 뭐먹을래? All rights reserved. <br />
                    Contact: {EMAIL}
                </div>
            </footer>

            {/* Legal Modals */}
            {legalModal === 'terms' && (
                <LegalModal title="이용약관" content={TERMS_TEXT} onClose={() => setLegalModal(null)} />
            )}
            {legalModal === 'privacy' && (
                <LegalModal title="개인정보처리방침" content={PRIVACY_TEXT} onClose={() => setLegalModal(null)} />
            )}

            {/* Contact Modal */}
            {contactModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }} onClick={resetFeedback}>
                    <div style={{
                        background: 'white', padding: '30px', borderRadius: '16px',
                        textAlign: 'center', width: '320px',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
                    }} onClick={e => e.stopPropagation()}>

                        {/* Header */}
                        <h3 style={{ marginTop: 0, marginBottom: '10px' }}>
                            {contactModal === 'ad' ? '광고 제휴 문의' : '무엇을 도와드릴까요?'}
                        </h3>

                        {/* Body Logic */}
                        {contactModal === 'ad' ? (
                            // --- AD INQUIRY (Email Copy) ---
                            <>
                                <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
                                    아래 이메일로 연락주시면<br />빠르게 답변 드리겠습니다.
                                </p>
                                <div style={{
                                    background: '#f5f5f7', padding: '12px', borderRadius: '8px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    marginBottom: '20px', fontWeight: 'bold', color: '#333'
                                }}>
                                    {EMAIL}
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button onClick={handleCopy} style={{
                                        flex: 1, padding: '12px', borderRadius: '8px', border: 'none',
                                        background: copied ? '#4CD964' : '#007AFF', color: 'white',
                                        fontWeight: 'bold', cursor: 'pointer', display: 'flex',
                                        alignItems: 'center', justifyContent: 'center', gap: '6px'
                                    }}>
                                        {copied ? <><Check size={16} />복사 완료!</> : <><Copy size={16} />이메일 복사</>}
                                    </button>
                                    <button onClick={() => setContactModal(null)} style={{
                                        flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ddd',
                                        background: 'white', color: '#333', cursor: 'pointer'
                                    }}>
                                        닫기
                                    </button>
                                </div>
                            </>
                        ) : (
                            // --- DEV REQUEST (Feedback Form) ---
                            sentSuccess ? (
                                <div style={{ padding: '20px 0' }}>
                                    <div style={{
                                        width: '60px', height: '60px', borderRadius: '50%', background: '#4CD964', color: 'white',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'
                                    }}>
                                        <Check size={32} />
                                    </div>
                                    <h4 style={{ margin: '0 0 10px' }}>소중한 의견 감사합니다!</h4>
                                    <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
                                        보내주신 의견은 꼼꼼히 읽어보고<br />서비스 개선에 반영하겠습니다. 🙇‍♂️
                                    </p>
                                    <button onClick={resetFeedback} style={{
                                        width: '100%', padding: '12px', borderRadius: '8px', border: 'none',
                                        background: '#007AFF', color: 'white', fontWeight: 'bold', cursor: 'pointer'
                                    }}>
                                        확인
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>
                                        버그 제보나 기능 요청, 무엇이든 환영합니다!
                                    </p>

                                    <textarea
                                        placeholder="내용을 입력해주세요..."
                                        value={feedbackContent}
                                        onChange={(e) => setFeedbackContent(e.target.value)}
                                        style={{
                                            width: '100%', height: '100px', padding: '12px', borderRadius: '12px',
                                            border: '1px solid #eee', background: '#f9f9f9', marginBottom: '10px',
                                            resize: 'none', fontSize: '14px', boxSizing: 'border-box'
                                        }}
                                    />

                                    <input
                                        type="text"
                                        placeholder="연락처 (선택: 이메일 등)"
                                        value={feedbackContact}
                                        onChange={(e) => setFeedbackContact(e.target.value)}
                                        style={{
                                            width: '100%', padding: '12px', borderRadius: '12px',
                                            border: '1px solid #eee', background: '#f9f9f9', marginBottom: '20px',
                                            fontSize: '14px', boxSizing: 'border-box'
                                        }}
                                    />

                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button onClick={handleSendFeedback} disabled={isSending || !feedbackContent.trim()} style={{
                                            flex: 2, padding: '12px', borderRadius: '8px', border: 'none',
                                            background: isSending ? '#ccc' : '#007AFF', color: 'white',
                                            fontWeight: 'bold', cursor: isSending ? 'not-allowed' : 'pointer', display: 'flex',
                                            alignItems: 'center', justifyContent: 'center', gap: '6px'
                                        }}>
                                            {isSending ? <Loader2 size={16} className="animate-spin" /> : <><Send size={16} />보내기</>}
                                        </button>
                                        <button onClick={resetFeedback} style={{
                                            flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ddd',
                                            background: 'white', color: '#333', cursor: 'pointer'
                                        }}>
                                            취소
                                        </button>
                                    </div>
                                </>
                            )
                        )}

                    </div>
                </div>
            )}
        </>
    );
};

export default Footer;
