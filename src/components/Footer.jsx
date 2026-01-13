import React, { useState } from 'react';
import LegalModal, { TERMS_TEXT, PRIVACY_TEXT } from './LegalModal';
import { Copy, Check } from 'lucide-react';

const Footer = () => {
    const [legalModal, setLegalModal] = useState(null); // 'terms' | 'privacy'
    const [contactModal, setContactModal] = useState(null); // 'dev' | 'ad'
    const [copied, setCopied] = useState(false);

    const EMAIL = "ci0515@naver.com";

    const linkStyle = {
        color: '#666', textDecoration: 'none', cursor: 'pointer', margin: '0 8px', fontSize: '11px'
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(EMAIL);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <>
            <footer style={{
                padding: '20px', textAlign: 'center', background: '#f9f9f9',
                borderTop: '1px solid #eee', marginTop: '30px', color: '#888'
            }}>
                <div style={{ marginBottom: '8px' }}>
                    <span onClick={() => setLegalModal('terms')} style={linkStyle}>이용약관</span>
                    |
                    <span onClick={() => setLegalModal('privacy')} style={{ ...linkStyle, fontWeight: 'bold' }}>개인정보처리방침</span>
                    |
                    <span onClick={() => setContactModal('dev')} style={linkStyle}>개발자에게 요청하기</span>
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
                }} onClick={() => setContactModal(null)}>
                    <div style={{
                        background: 'white', padding: '30px', borderRadius: '16px',
                        textAlign: 'center', width: '300px',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
                    }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginTop: 0, marginBottom: '10px' }}>
                            {contactModal === 'ad' ? '광고 제휴 문의' : '개발자에게 요청하기'}
                        </h3>
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
                    </div>
                </div>
            )}
        </>
    );
};

export default Footer;
