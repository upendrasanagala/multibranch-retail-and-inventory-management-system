import React from 'react';

const StaffPerformanceInsight = ({ metrics }) => {
  if (!metrics || metrics.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '20px', color: '#64748b', fontSize: '13px' }}>
        No performance data available for this branch yet.
      </div>
    );
  }

  const getScoreColor = (score) => {
    if (score >= 8) return '#059669';
    if (score >= 5) return '#d97706';
    return '#dc2626';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {metrics.map((staff, idx) => (
        <div key={idx} style={{
          background: '#f8fafc',
          borderRadius: '12px',
          padding: '14px',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>{staff.name}</span>
            <div style={{ 
              background: getScoreColor(staff.scores.overall), 
              color: 'white', 
              padding: '2px 8px', 
              borderRadius: '6px', 
              fontSize: '11px', 
              fontWeight: 800 
            }}>
              {staff.scores.overall} / 10
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              <div style={{ marginBottom: '2px' }}>Revenue Contribution</div>
              <div style={{ color: '#0f172a', fontWeight: 600 }}>₹{staff.metrics.revenue.toLocaleString()}</div>
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              <div style={{ marginBottom: '2px' }}>Avg Items/Sale</div>
              <div style={{ color: '#0f172a', fontWeight: 600 }}>{staff.metrics.avg_items}</div>
            </div>
          </div>

          <div style={{ 
            fontSize: '11px', 
            color: '#4338ca', 
            background: '#e0e7ff', 
            padding: '6px 10px', 
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <i className="fas fa-comment-alt-lines" style={{ opacity: 0.7 }}></i>
            <strong>AI Insight:</strong> {staff.insight}
          </div>
        </div>
      ))}
    </div>
  );
};

export default StaffPerformanceInsight;
