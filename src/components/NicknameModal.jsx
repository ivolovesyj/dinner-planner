import { useState } from 'react';
import './NicknameModal.css';

function NicknameModal({ onSave, onClose, initialValue = "" }) {
    const [name, setName] = useState(initialValue);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (name.trim()) {
            onSave(name.trim());
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ position: 'relative' }}>
                {onClose && (
                    <button
                        onClick={onClose}
                        style={{
                            position: 'absolute', right: '15px', top: '15px',
                            background: 'none', border: 'none', fontSize: '1.2rem',
                            cursor: 'pointer', color: '#999'
                        }}
                    >
                        ✕
                    </button>
                )}
                <h2 className="modal-title">반가워요! 👋</h2>
                <p className="modal-subtitle">함께 구분할 수 있도록 닉네임을 알려주세요.</p>

                <form onSubmit={handleSubmit} className="modal-form">
                    <input
                        type="text"
                        className="modal-input"
                        placeholder="예: 맛집킬러, 철수"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoFocus
                    />
                    <button
                        type="submit"
                        disabled={!name.trim()}
                        className="modal-submit-btn"
                    >
                        {initialValue ? '수정 완료' : '시작하기'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default NicknameModal;
