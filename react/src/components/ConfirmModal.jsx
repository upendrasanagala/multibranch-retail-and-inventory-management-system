import React from 'react';

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText = "Logout", cancelText = "Cancel" }) => {
    if (!isOpen) return null;

    return (
        <div className="profile-overlay" style={{ zIndex: 10000 }} onClick={onCancel}>
            <div className="profile-modal" style={{ maxWidth: '400px', textAlign: 'center', padding: '40px 30px' }} onClick={(e) => e.stopPropagation()}>
                <div style={{
                    width: '64px',
                    height: '64px',
                    background: '#fee2e2',
                    color: '#ef4444',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    margin: '0 auto 20px'
                }}>
                    <i className="fas fa-sign-out-alt"></i>
                </div>

                <h2 style={{ fontSize: '20px', marginBottom: '10px' }}>{title}</h2>
                <p style={{ color: '#64748b', marginBottom: '30px', fontSize: '15px', lineHeight: '1.5' }}>{message}</p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <button
                        onClick={onCancel}
                        style={{
                            background: '#f1f5f9',
                            color: '#475569',
                            padding: '12px',
                            borderRadius: '12px',
                            fontWeight: '700'
                        }}
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        style={{
                            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                            color: 'white',
                            padding: '12px',
                            borderRadius: '12px',
                            fontWeight: '700',
                            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)'
                        }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
