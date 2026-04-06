import React, { useState, useEffect } from 'react';
import { adminApi } from '../../services/api';
import { useToast } from '../ToastContext';

const AIProfitSimulator = () => {
  const [priceChange, setPriceChange] = useState(0);
  const [discountChange, setDiscountChange] = useState(0);
  const [simulation, setSimulation] = useState(null);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const runSimulation = async () => {
    setLoading(true);
    try {
      const result = await adminApi.simulateProfit({
        price_change: priceChange,
        discount_change: discountChange
      });
      setSimulation(result);
    } catch (error) {
      showToast('Simulation failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Debounced simulation could be added here, but for now just a button
  useEffect(() => {
    runSimulation();
  }, []);

  return (
    <div style={{ 
      backgroundColor: '#fff', 
      borderRadius: '16px', 
      padding: '24px', 
      border: '1px solid #e2e8f0', 
      borderLeft: '5px solid #2563eb', 
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      marginBottom: '20px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '24px' }}>📊</span> Profit "What-If" Simulator
        </h3>
        <span style={{ 
          backgroundColor: '#eff6ff', 
          color: '#2563eb', 
          fontSize: '10px', 
          fontWeight: 700, 
          padding: '4px 12px', 
          borderRadius: '9999px', 
          border: '1px solid #dbeafe',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          AI Projection
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px' }}>
        {/* Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>Base Price Change</label>
              <span style={{ fontSize: '14px', fontWeight: 'bold', color: priceChange >= 0 ? '#10b981' : '#f43f5e' }}>
                {priceChange > 0 ? '+' : ''}{priceChange}%
              </span>
            </div>
            <input
              type="range"
              min="-20"
              max="20"
              value={priceChange}
              onChange={(e) => setPriceChange(parseInt(e.target.value))}
              style={{ width: '100%', height: '8px', cursor: 'pointer', accentColor: '#2563eb' }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>Discount Adjustment</label>
              <span style={{ fontSize: '14px', fontWeight: 'bold', color: discountChange >= 0 ? '#d97706' : '#10b981' }}>
                {discountChange > 0 ? '+' : ''}{discountChange}%
              </span>
            </div>
            <input
              type="range"
              min="-10"
              max="10"
              value={discountChange}
              onChange={(e) => setDiscountChange(parseInt(e.target.value))}
              style={{ width: '100%', height: '8px', cursor: 'pointer', accentColor: '#d97706' }}
            />
          </div>

          <button
            onClick={runSimulation}
            disabled={loading}
            style={{ 
              width: '100%', 
              padding: '14px', 
              backgroundColor: loading ? '#94a3b8' : '#2563eb', 
              color: '#fff', 
              border: 'none', 
              borderRadius: '12px', 
              fontWeight: 'bold', 
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 6px rgba(37, 99, 235, 0.2)',
              transition: 'transform 0.1s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}
            onMouseDown={(e) => !loading && (e.currentTarget.style.transform = 'scale(0.98)')}
            onMouseUp={(e) => !loading && (e.currentTarget.style.transform = 'scale(1)')}
          >
            {loading ? 'Calculating...' : 'Update Projection'}
          </button>
        </div>

        {/* Results */}
        <div style={{ 
          backgroundColor: '#f8fafc', 
          borderRadius: '12px', 
          padding: '20px', 
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: '16px'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontSize: '14px', fontWeight: 500 }}>Projected Revenue</span>
                <span style={{ fontSize: '22px', fontWeight: 900, color: '#1e293b' }}>
                  ₹{(simulation?.projected_revenue ?? 0).toLocaleString()}
                </span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontSize: '14px', fontWeight: 500 }}>Revenue Change</span>
                <span style={{ 
                  fontWeight: 'bold', 
                  fontSize: '13px',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  backgroundColor: simulation?.revenue_change >= 0 ? '#dcfce7' : '#fee2e2',
                  color: simulation?.revenue_change >= 0 ? '#15803d' : '#b91c1c'
                }}>
                    {simulation?.revenue_change >= 0 ? '↑' : '↓'} {Math.abs(simulation?.revenue_change ?? 0).toFixed(1)}%
                </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                <span style={{ color: '#64748b', fontSize: '14px', fontWeight: 500 }}>Projected Volume</span>
                <span style={{ fontWeight: 'bold', color: '#2563eb', fontSize: '16px' }}>
                  {(simulation?.projected_volume ?? 0).toLocaleString()} units
                </span>
            </div>
            
            {(simulation?.current_revenue === 1000) && (
              <div style={{ marginTop: '8px', padding: '10px', backgroundColor: '#fff7ed', borderRadius: '8px', border: '1px solid #ffedd5' }}>
                <p style={{ fontSize: '11px', color: '#9a3412', margin: 0, lineHeight: 1.4 }}>
                  ⚠️ Note: No actual sales found in last 180 days. Using system baseline.
                </p>
              </div>
            )}

            <div style={{ marginTop: '8px', padding: '12px', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #dbeafe' }}>
                <p style={{ fontSize: '11px', color: '#1e40af', margin: 0, fontStyle: 'italic' }}>
                    * AI Model assumes common price elasticity coefficient (-1.5).
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AIProfitSimulator;
