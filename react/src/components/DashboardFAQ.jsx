import React, { useState } from 'react';

const DashboardFAQ = ({ faqs }) => {
    const [activeIndex, setActiveIndex] = useState(null);

    const toggleFAQ = (index) => {
        setActiveIndex(activeIndex === index ? null : index);
    };

    return (
        <div className="dashboard-faq-section" style={{ marginTop: '40px', marginBottom: '40px' }}>
            <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                <i className="fas fa-question-circle" style={{ color: 'var(--primary)' }}></i>
                Dashboard Quick Help & FAQ
            </h3>
            <div className="dashboard-faq-container">
                {faqs.map((faq, index) => (
                    <div
                        key={index}
                        className={`dashboard-faq-item ${activeIndex === index ? 'active' : ''}`}
                        style={{
                            background: 'white',
                            borderRadius: '16px',
                            padding: '16px 20px',
                            marginBottom: '12px',
                            boxShadow: 'var(--shadow-sm)',
                            border: '1px solid var(--border-light)',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease'
                        }}
                        onClick={() => toggleFAQ(index)}
                    >
                        <div className="dashboard-faq-question" style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontWeight: 600,
                            color: 'var(--text-dark)',
                            fontSize: '15px'
                        }}>
                            <span>{faq.question}</span>
                            <i className={`fas fa-chevron-${activeIndex === index ? 'up' : 'down'}`} style={{ fontSize: '12px', color: 'var(--text-muted)' }}></i>
                        </div>
                        {activeIndex === index && (
                            <div className="dashboard-faq-answer" style={{
                                marginTop: '12px',
                                color: 'var(--text-muted)',
                                fontSize: '14px',
                                lineHeight: '1.6',
                                borderTop: '1px solid #f1f5f9',
                                paddingTop: '12px',
                                animation: 'fadeIn 0.3s ease'
                            }}>
                                {faq.answer}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DashboardFAQ;
