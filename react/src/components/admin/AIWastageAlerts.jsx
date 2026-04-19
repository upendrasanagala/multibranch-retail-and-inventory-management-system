import React, { useState, useEffect } from "react";
import { adminApi } from "../../services/api";
import { useToast } from "../ToastContext";

const AIWastageAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await adminApi.getWastageAlerts();
      setAlerts(response.alerts || []);
    } catch (error) {
      showToast("Failed to fetch wastage alerts", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleFlashSale = async (alert) => {
    try {
      showToast(`Flash sale triggered for ${alert.product_name}!`, "success");
    } catch (error) {
      showToast("Failed to trigger flash sale", "error");
    }
  };

  if (loading) return <div className="p-4 text-gray-400">Loading wastage alerts...</div>;

  return (
    <div style={{ 
      backgroundColor: '#fff', 
      borderRadius: '16px', 
      padding: '24px', 
      border: '1px solid #e2e8f0', 
      boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
      marginBottom: '20px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#ef4444' }}>⚠️</span> AI Wastage Prevention
        </h3>
        <span style={{ 
          backgroundColor: '#f8fafc', 
          color: '#64748b', 
          fontSize: '11px', 
          fontWeight: 700, 
          padding: '4px 12px', 
          borderRadius: '9999px', 
          border: '1px solid #e2e8f0', 
          textTransform: 'uppercase', 
          letterSpacing: '0.05em' 
        }}>
          Expiry Risk Analysis
        </span>
      </div>

      {alerts.length === 0 ? (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          items: 'center', 
          justifyContent: 'center', 
          padding: '40px 20px', 
          backgroundColor: '#f8fafc', 
          borderRadius: '12px', 
          border: '1px dashed #e2e8f0',
          textAlign: 'center'
        }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            backgroundColor: '#dcfce7', 
            color: '#16a34a', 
            borderRadius: '50%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            margin: '0 auto 12px' 
          }}>
            <i className="fas fa-shield-alt" style={{ fontSize: '20px' }}></i>
          </div>
          <p style={{ margin: 0, color: '#475569', fontWeight: 'bold', fontSize: '14px' }}>All Inventory Safe</p>
          <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '12px' }}>
            No items are expiring within the next 90 days.
          </p>
        </div>
      ) : (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'row', 
          gap: '16px', 
          overflowX: 'auto', 
          paddingBottom: '12px',
          scrollbarWidth: 'thin',
          scrollbarColor: '#cbd5e1 transparent'
        }}>
          {alerts.map((alert, index) => (
            <div key={index} style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              padding: '16px', 
              backgroundColor: '#f8fafc', 
              borderRadius: '12px', 
              border: '1px solid #e2e8f0', 
              transition: 'border-color 0.2s ease',
              gap: '12px',
              minWidth: '300px',
              maxWidth: '300px',
              flexShrink: 0
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <h4 style={{ margin: 0, color: '#1e293b', fontWeight: 700, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{alert.product_name}</h4>
                  <span style={{ fontSize: '9px', color: '#6366f1', backgroundColor: '#eef2ff', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>{alert.category}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase' }}>Branch</p>
                    <p style={{ margin: 0, fontSize: '11px', color: '#334155', fontWeight: 600 }}>{alert.branch_name}</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase' }}>Expires</p>
                    <p style={{ margin: 0, fontSize: '11px', color: '#b45309', fontWeight: 700 }}>{alert.expiry_date}</p>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: 'auto' }}>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ margin: 0, fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase' }}>Rec. Disc.</p>
                  <p style={{ margin: 0, fontSize: '16px', fontWeight: '900', color: '#16a34a' }}>{alert.recommended_discount}%</p>
                </div>
                <button
                  onClick={() => handleFlashSale(alert)}
                  style={{ 
                    padding: '6px 12px', 
                    background: 'linear-gradient(135deg, #ef4444, #f97316)', 
                    color: '#fff', 
                    border: 'none', 
                    borderRadius: '8px', 
                    fontWeight: '800', 
                    fontSize: '11px', 
                    cursor: 'pointer',
                    boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.2)'
                  }}
                >
                  Flash Sale
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AIWastageAlerts;
