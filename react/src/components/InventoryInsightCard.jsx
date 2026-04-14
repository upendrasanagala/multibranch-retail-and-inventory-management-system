import React from 'react';

const InventoryInsightCard = ({ insight }) => {
  const getStyles = (type) => {
    switch (type) {
      case 'critical':
        return {
          bg: 'rgba(255, 241, 242, 0.7)',
          border: 'rgba(254, 205, 211, 0.5)',
          accent: '#ef4444',
          glow: 'rgba(239, 68, 68, 0.1)',
          icon: 'fa-triangle-exclamation',
          label: 'Critical Alert'
        };
      case 'warning':
        return {
          bg: 'rgba(255, 251, 235, 0.7)',
          border: 'rgba(253, 230, 138, 0.5)',
          accent: '#f59e0b',
          glow: 'rgba(245, 158, 11, 0.1)',
          icon: 'fa-bolt-lightning',
          label: 'Immediate Action'
        };
      case 'insight':
        return {
          bg: 'rgba(240, 249, 255, 0.7)',
          border: 'rgba(186, 230, 253, 0.5)',
          accent: '#4338ca',
          glow: 'rgba(67, 56, 202, 0.1)',
          icon: 'fa-wand-magic-sparkles',
          label: 'SMART INSIGHT'
        };
      default:
        return {
          bg: 'rgba(248, 250, 252, 0.7)',
          border: 'rgba(226, 232, 240, 0.5)',
          accent: '#64748b',
          glow: 'rgba(100, 116, 139, 0.1)',
          icon: 'fa-circle-info',
          label: 'NOTE'
        };
    }
  };

  const style = getStyles(insight.type);

  return (
    <div style={{
      background: style.bg,
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: `1px solid ${style.border}`,
      borderRadius: '28px',
      padding: '28px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'default',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
      height: '100%'
    }}
    className="insight-card-premium"
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-6px) scale(1.01)';
      e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0) scale(1)';
      e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)';
    }}
    >
      {/* Decorative Blur Circle */}
      <div style={{
        position: 'absolute',
        top: '-15%',
        right: '-10%',
        width: '120px',
        height: '120px',
        background: style.accent,
        opacity: 0.1,
        borderRadius: '50%',
        filter: 'blur(40px)',
        zIndex: 0
      }}></div>

      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', // Changed from flex-start to center for better balance
        position: 'relative', 
        zIndex: 1 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div style={{
            background: '#fff',
            width: '52px',
            height: '52px',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: style.accent,
            fontSize: '22px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
            border: `1px solid ${style.border}`,
            flexShrink: 0
          }}>
            <i className={`fas ${style.icon}`}></i>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ 
                fontSize: '9px', 
                fontWeight: 900, 
                color: style.accent,
                textTransform: 'uppercase',
                letterSpacing: '1.2px',
                background: style.glow,
                padding: '2px 8px',
                borderRadius: '6px'
              }}>
                {style.label}
              </span>
            </div>
            <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#1e293b', letterSpacing: '-0.3px', lineHeight: '1.2' }}>
              {insight.product}
            </h4>
          </div>
        </div>
        <div style={{ 
          background: 'rgba(255,255,255,0.7)', 
          padding: '8px 14px', 
          borderRadius: '14px', 
          fontSize: '11px', 
          fontWeight: 800, 
          color: '#64748b',
          border: '1px solid rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexShrink: 0
        }}>
          <i className="fas fa-location-dot" style={{ fontSize: '10px', color: style.accent }}></i>
          {insight.branch}
        </div>
      </div>

      <p style={{ 
        margin: 0, 
        fontSize: '14px', 
        color: '#475569', 
        lineHeight: '1.6', 
        fontWeight: 500,
        position: 'relative',
        zIndex: 1,
        flex: 1 // This ensures the paragraph takes up available space, pushing the AI Strategy box to the bottom
      }}>
        {insight.message}
      </p>

      <div style={{ 
        background: 'linear-gradient(135deg, rgba(67, 56, 202, 0.05), rgba(99, 102, 241, 0.1))', 
        padding: '20px', 
        borderRadius: '20px', 
        border: '1px solid rgba(67, 56, 202, 0.1)',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#4338ca', fontWeight: 900, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
          <i className="fas fa-rocket-launch" style={{ color: '#6366f1' }}></i>
          Next-Gen AI Strategy
        </div>
        <div style={{ 
          fontSize: '14px', 
          lineHeight: '1.5', 
          fontWeight: 700, 
          color: '#1e293b',
          background: 'linear-gradient(to right, #1e293b, #475569)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          {insight.recommendation}
        </div>
      </div>
    </div>
  );
};

export default InventoryInsightCard;
