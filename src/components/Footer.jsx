import React, { useState } from 'react';
import LegalModal, { TERMS_TEXT, PRIVACY_TEXT } from './LegalModal'; // Import Modal & Text

const Footer = () => {
    const [modal, setModal] = useState(null); // 'terms' | 'privacy' | null

    const linkStyle = {
        color: '#666', textDecoration: 'none', cursor: 'pointer', margin: '0 8px', fontSize: '12px'
    };

    return (
        <>
            <footer style={{
                padding: '40px 20px', textAlign: 'center', background: '#f9f9f9',
                borderTop: '1px solid #eee', marginTop: '60px', color: '#888'
            }}>
                <div style={{ marginBottom: '12px' }}>
                    <span onClick={() => setModal('terms')} style={linkStyle}>이용약관</span>
                    |
                    <span onClick={() => setModal('privacy')} style={{ ...linkStyle, fontWeight: 'bold' }}>개인정보처리방침</span>
                    |
                    <a href="mailto:ci0515@naver.com?subject=[뭐먹을래] 문의사항" style={linkStyle}>개발자에게 요청하기</a>
                    |
                    <a href="mailto:ci0515@naver.com?subject=[뭐먹을래] 광고 문의" style={linkStyle}>광고 제휴 문의</a>
                </div>
                <div style={{ fontSize: '11px' }}>
                    &copy; 2026 뭐먹을래? All rights reserved. <br />
                    Contact: ci0515@naver.com
                </div>
            </footer>

            {/* Modals */}
            {modal === 'terms' && (
                <LegalModal title="이용약관" content={TERMS_TEXT} onClose={() => setModal(null)} />
            )}
            {modal === 'privacy' && (
                <LegalModal title="개인정보처리방침" content={PRIVACY_TEXT} onClose={() => setModal(null)} />
            )}
        </>
    );
};

export default Footer;
