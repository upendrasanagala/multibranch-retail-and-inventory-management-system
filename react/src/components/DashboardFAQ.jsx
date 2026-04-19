import React, { useState } from 'react';

const DashboardFAQ = ({ faqs }) => {
    const [activeIndex, setActiveIndex] = useState(null);

    const toggleFAQ = (index) => {
        setActiveIndex(activeIndex === index ? null : index);
    };

    return (
        <div style={{ marginTop: '48px', marginBottom: '48px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px', fontSize: '20px', fontWeight: '800', color: '#1e293b' }}>
                    <div style={{ 
                        background: '#eef2ff', 
                        color: '#4f46e5', 
                        width: '36px', 
                        height: '36px', 
                        borderRadius: '10px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center' 
                    }}>
                        <i className="fas fa-question-circle"></i>
                    </div>
                    FAQ
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, backgroundColor: '#f1f5f9', padding: '4px 12px', borderRadius: '8px' }}>
                    Support
                </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {faqs.map((faq, index) => (
                    <div
                        key={index}
                        onClick={() => toggleFAQ(index)}
                        style={{
                            backgroundColor: activeIndex === index ? '#f8faff' : '#fff',
                            borderRadius: '16px',
                            padding: '20px 24px',
                            border: '1px solid',
                            borderColor: activeIndex === index ? '#6366f1' : '#e2e8f0',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: activeIndex === index ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
                        }}
                    >
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontWeight: 700,
                            color: activeIndex === index ? '#4338ca' : '#1e293b',
                            fontSize: '15.5px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <i className="fas fa-arrow-right" style={{ 
                                    fontSize: '12px', 
                                    opacity: activeIndex === index ? 1 : 0.3, 
                                    transform: activeIndex === index ? 'rotate(90deg)' : 'none',
                                    transition: 'all 0.3s ease'
                                }}></i>
                                <span>{faq.question}</span>
                            </div>
                            <i className={`fas fa-chevron-${activeIndex === index ? 'up' : 'down'}`} style={{ fontSize: '13px', opacity: 0.5 }}></i>
                        </div>
                        
                        <div style={{
                            maxHeight: activeIndex === index ? '500px' : '0',
                            overflow: 'hidden',
                            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                            opacity: activeIndex === index ? 1 : 0
                        }}>
                            <div style={{
                                marginTop: '16px',
                                color: '#475569',
                                fontSize: '14px',
                                lineHeight: '1.7',
                                borderTop: '1px solid rgba(99, 102, 241, 0.1)',
                                paddingTop: '16px'
                            }}>
                                {faq.answer}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DashboardFAQ;
