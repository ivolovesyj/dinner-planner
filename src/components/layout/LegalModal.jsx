import React from 'react';
import { X } from 'lucide-react';

const LegalModal = ({ title, content, onClose }) => {
    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px'
        }}>
            <div style={{
                background: 'white', width: '100%', maxWidth: '600px',
                height: '80vh', borderRadius: '16px', display: 'flex', flexDirection: 'column',
                boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px', borderBottom: '1px solid #eee',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <h3 style={{ margin: 0, fontSize: '18px' }}>{title}</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                        <X size={24} color="#666" />
                    </button>
                </div>

                {/* Content */}
                <div style={{
                    padding: '24px', overflowY: 'auto', flex: 1,
                    fontSize: '14px', lineHeight: '1.6', color: '#333', whiteSpace: 'pre-wrap'
                }}>
                    {content}
                </div>
            </div>
        </div>
    );
};

export default LegalModal;

export const TERMS_TEXT = `[이용약관]

제1조 (목적)
본 약관은 '뭐먹을래?'(이하 "서비스")를 이용함에 있어 이용자와 서비스 제공자의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.

제2조 (서비스의 제공)
1. 서비스는 사용자가 생성한 모임방을 통해 식당 정보를 공유하고 투표하는 기능을 제공합니다.
2. 서비스는 연중무휴 1일 24시간 제공함을 원칙으로 합니다.

제3조 (면책조항)
1. 서비스에서 제공하는 식당 정보(네이버 지도 등)는 외부에서 수집된 정보이며, 그 정확성을 보증하지 않습니다.
2. 서비스 이용 중 발생하는 데이터 손실이나 기타 문제는 회사의 고의나 중과실이 없는 한 책임지지 않습니다.

제4조 (광고의 게재)
서비스는 운영을 위해 서비스 내에 광고를 게재할 수 있습니다.

부칙
본 약관은 2026년 1월 13일부터 시행합니다.`;

export const PRIVACY_TEXT = `[개인정보처리방침]

'뭐먹을래?'는 이용자의 개인정보를 소중히 다루며, 다음과 같이 처리합니다.

1. 수집하는 개인정보 항목
- 방 생성 및 참여 시: 닉네임 (익명 가능), IP주소 (부정 이용 방지 및 통계)
- 서비스 이용 기록: 쿠키(Cookie), 방문 일시, 불량 이용 기록

2. 개인정보의 수집 및 이용 목적
- 서비스 제공 및 본인 확인
- 광고 게재 및 성과 분석
- 서비스 개선 및 신규 서비스 개발

3. 개인정보의 보유 및 이용 기간
- 이용 목적 달성 시까지 보유하며, 법령에 따른 보존 의무가 있는 경우 해당 기간 동안 보존합니다.

4. 개인정보의 제3자 제공
- 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다. 다만, 법령의 규정에 의거하거나 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우 예외로 합니다.

5. 연락처
- 이메일: ci0515@naver.com`;
