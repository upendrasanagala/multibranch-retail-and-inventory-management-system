import React from 'react';

const SmartRebalanceGrid = ({ suggestions }) => {
  if (!suggestions || suggestions.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '30px', background: '#f8fafc', borderRadius: '12px', color: '#64748b' }}>
        <i className="fas fa-check-double" style={{ fontSize: '24px', marginBottom: '10px', color: '#10b981' }}></i>
        <p style={{ margin: 0, fontSize: '14px' }}>Inventory is perfectly balanced across all branches.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {suggestions.map((s, idx) => (
        <div key={idx} style={{
          background: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          transition: 'box-shadow 0.2s ease'
        }}
        onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}
        onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
        >
          <div style={{
            background: s.urgency === 'high' ? '#fff1f2' : '#f0f9ff',
            color: s.urgency === 'high' ? '#e11d48' : '#0284c7',
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <i className="fas fa-exchange-alt"></i>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>{s.product}</span>
              <span style={{ 
                fontSize: '11px', 
                fontWeight: 700, 
                color: 'white', 
                background: '#6366f1', 
                padding: '2px 8px', 
                borderRadius: '8px' 
              }}>
                Move {s.quantity} units
              </span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748b' }}>
              <span>{s.from_branch}</span>
              <i className="fas fa-long-arrow-alt-right" style={{ color: '#94a3b8' }}></i>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>{s.to_branch}</span>
            </div>
            
            <p style={{ margin: '8px 0 0', fontSize: '11.5px', color: '#475569', fontStyle: 'italic' }}>
              "{s.reason}"
            </p>
          </div>
          
          <button style={{
            background: '#f1f5f9',
            border: 'none',
            color: '#475569',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer'
          }}>
            Create Transfer
          </button>
        </div>
      ))}
    </div>
  );
};

export default SmartRebalanceGrid;
