import React from 'react';

const InventoryInsightCard = ({ insight }) => {
  const getStyles = (type) => {
    switch (type) {
      case 'critical':
        return {
          bg: '#fff1f2',
          border: '1px solid #fecdd3',
          accent: '#ef4444',
          icon: 'fa-exclamation-circle',
          label: 'Action'
        };
      case 'warning':
        return {
          bg: '#fffbeb',
          border: '1px solid #fde68a',
          accent: '#f59e0b',
          icon: 'fa-history',
          label: 'Priority'
        };
      case 'insight':
        return {
          bg: '#f0f9ff',
          border: '1px solid #bae6fd',
          accent: '#06b6d4',
          icon: 'fa-brain',
          label: 'Analysis'
        };
      default:
        return {
          bg: '#f8fafc',
          border: '1px solid #e2e8f0',
          accent: '#64748b',
          icon: 'fa-info-circle',
          label: 'Note'
        };
    }
  };

  const style = getStyles(insight.type);

  return (
    <div style={{
      background: '#fff',
      border: `1px solid ${style.border === 'none' ? '#e2e8f0' : style.border}`,
      borderLeft: `5px solid ${style.accent}`,
      borderRadius: '20px',
      padding: '24px',
      marginBottom: '20px',
      display: 'flex',
      gap: '24px',
      alignItems: 'flex-start',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'default',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-4px)';
      e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)';
    }}
    >
      <div style={{
        background: style.bg,
        width: '52px',
        height: '52px',
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: style.accent,
        fontSize: '24px',
        flexShrink: 0,
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
      }}>
        <i className={`fas ${style.icon}`}></i>
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h4 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#1e293b' }}>
              {insight.product}
            </h4>
            <span style={{ 
              fontSize: '10px', 
              fontWeight: 800, 
              color: style.accent, 
              background: style.bg, 
              padding: '2px 10px', 
              borderRadius: '9999px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              {style.label}
            </span>
          </div>
          <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', background: '#f1f5f9', padding: '4px 10px', borderRadius: '8px' }}>
            <i className="fas fa-location-dot" style={{ marginRight: '6px', fontSize: '10px' }}></i>
            {insight.branch}
          </span>
        </div>

        <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#475569', lineHeight: '1.6' }}>
          {insight.message}
        </p>

        <div style={{ 
          background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)', 
          padding: '16px', 
          borderRadius: '14px', 
          border: '1px solid #e2e8f0',
          fontSize: '13px', 
          color: '#334155',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4338ca', fontWeight: 800, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <i className="fas fa-magic" style={{ fontSize: '14px' }}></i>
            AI Recommendation
          </div>
          <span style={{ lineHeight: '1.5', fontWeight: 600 }}>{insight.recommendation}</span>
          {/* Subtle glow effect */}
          <div style={{ 
            position: 'absolute', 
            top: '-20px', 
            right: '-20px', 
            width: '60px', 
            height: '60px', 
            background: style.accent, 
            opacity: 0.05, 
            borderRadius: '50%',
            filter: 'blur(20px)'
          }}></div>
        </div>
      </div>
    </div>
  );
};

export default InventoryInsightCard;
