import React from 'react';
import './CustomModal.css';

const CustomModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText = "네", cancelText = "아니요" }) => {
    if (!isOpen) return null;

    return (
        <div className="custom-modal-overlay" onClick={onCancel}>
            <div className="custom-modal-card" onClick={(e) => e.stopPropagation()}>
                <h2 className="custom-modal-title">{title}</h2>
                <p className="custom-modal-message">{message}</p>
                <div className="custom-modal-actions">
                    <button className="btn-confirm" onClick={onConfirm}>{confirmText}</button>
                    <button className="btn-cancel" onClick={onCancel}>{cancelText}</button>
                </div>
            </div>
        </div>
    );
};

export default CustomModal;
