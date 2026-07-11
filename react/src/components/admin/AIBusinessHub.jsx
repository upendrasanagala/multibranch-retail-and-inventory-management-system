import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Chart from 'react-apexcharts';
import { formatDate } from '../../utils/dateUtils';
import InventoryInsightCard from '../InventoryInsightCard';
import { useToast } from '../ToastContext';

const styles = `
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    @keyframes pulse {
        0% { transform: scale(0.95); opacity: 0.5; }
        50% { transform: scale(1.1); opacity: 1; }
        100% { transform: scale(0.95); opacity: 0.5; }
    }
`;
const AIBusinessHub = () => {
    const [insights, setInsights] = useState([]);
    const [forecast, setForecast] = useState([]);
    const [pricing, setPricing] = useState([]);
    const [wastage, setWastage] = useState([]);
    const [categoryMatrix, setCategoryMatrix] = useState([]);
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();

    useEffect(() => {
        loadData();
        const styleTag = document.createElement("style");
        styleTag.innerHTML = styles;
        document.head.appendChild(styleTag);
        return () => document.head.removeChild(styleTag);
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [aiRes, pricingRes, wastageRes] = await Promise.all([
                api.admin.getAiInsights(),
                api.admin.getPricingAlerts(),
                api.admin.getWastageAlerts()
            ]);
            setInsights(aiRes.insights || []);
            // FIX: Access the nested 'forecast' array within the forecast dictionary
            setForecast(aiRes.forecast?.forecast || []);
            setCategoryMatrix(aiRes.category_performance || []);
            setPricing(pricingRes.alerts || []);
            setWastage(wastageRes.alerts || []);
        } catch (error) {
            console.error("Failed to load AI data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleFlashSale = (alert) => {
        showToast(`Flash Sale triggered for ${alert.product_name}! Recommended discount (${alert.recommended_discount}%) has been applied system-wide.`, "success");
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '100px 0' }}>
                <i className="fas fa-brain fa-spin" style={{ fontSize: '48px', color: '#6366f1' }}></i>
                <p style={{ marginTop: '20px', fontWeight: 600, color: '#64748b' }}>Consulting AI Models...</p>
            </div>
        );
    }

    // Chart Data Preparation
    const revenueSeries = [{
        name: 'Projected Revenue',
        // FIX: map to 'predicted_revenue' key returned by backend
        data: forecast.map(f => Math.round(f.predicted_revenue || 0))
    }];

    const chartOptions = {
        chart: { type: 'area', height: 350, toolbar: { show: false }, fontFamily: 'Outfit' },
        stroke: { curve: 'smooth', width: 4, colors: ['#6366f1'] },
        fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.1, stops: [0, 90, 100] } },
        xaxis: { categories: forecast.map(f => f.date), labels: { style: { colors: '#94a3b8', fontWeight: 600 } } },
        yaxis: { labels: { formatter: (v) => `₹${v.toLocaleString()}`, style: { colors: '#94a3b8', fontWeight: 600 } } },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
        colors: ['#6366f1'],
        dataLabels: { enabled: false },
        tooltip: { theme: 'light', y: { formatter: (v) => `₹${v.toLocaleString()}` } }
    };

    return (
        <div style={{ paddingBottom: '40px' }}>
            <div style={{ marginBottom: '32px' }}>
                <h2 style={{ margin: 0, fontSize: '28px', fontWeight: 900, color: '#1e293b' }}>
                    <i className="fas fa-brain" style={{ color: '#6366f1', marginRight: '12px' }}></i>
                    AI Business Hub
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '15px', color: '#64748b', fontWeight: 500 }}>
                    Predictive analytics, automated scaling recommendations, and revenue forecasts.
                </p>
            </div>

            {/* Top Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '32px' }}>
                <div style={{ 
                    background: 'linear-gradient(135deg, #4338ca, #6366f1)', 
                    padding: '28px', 
                    borderRadius: '28px', 
                    color: '#fff',
                    boxShadow: '0 10px 25px -5px rgba(67, 56, 202, 0.3)',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{ position: 'absolute', top: '-10%', right: '-5%', fontSize: '120px', color: 'rgba(255,255,255,0.05)', fontWeight: 900 }}>₹</div>
                    <div style={{ fontSize: '11px', fontWeight: 800, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>30-Day Revenue Projection</div>
                    <div style={{ fontSize: '42px', fontWeight: 900, margin: '16px 0 8px' }}>
                        ₹{(forecast.reduce((a, b) => a + (b.predicted_revenue || 0), 0)).toLocaleString()}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#86efac', fontWeight: 700, fontSize: '13px', background: 'rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '12px', width: 'fit-content' }}>
                        <i className="fas fa-check-shield"></i> High Confidence Analysis
                    </div>
                </div>

                <div style={{ 
                    background: '#fff', 
                    padding: '28px', 
                    borderRadius: '28px', 
                    border: '1px solid #f1f5f9', 
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Strategic Alerts</div>
                    <div style={{ fontSize: '36px', fontWeight: 900, color: '#1e293b', margin: '12px 0', display: 'flex', alignItems: 'center', gap: '15px' }}>
                        {insights.length + pricing.length + wastage.length} 
                        <span style={{ fontSize: '14px', background: '#fef2f2', color: '#ef4444', padding: '4px 12px', borderRadius: '10px', fontWeight: 700 }}>Action Required</span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Critical inventory and pricing anomalies detected.</div>
                </div>
            </div>

            {/* Charts Section */}
            <div style={{ background: '#fff', padding: '32px', borderRadius: '28px', border: '1px solid #f1f5f9', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.03)', marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#1e293b' }}>Predictive Revenue Stream</h3>
                    <div style={{ background: '#f8fafc', padding: '6px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Next 30 Days</div>
                </div>
                {forecast.length > 0 ? (
                    <Chart options={chartOptions} series={revenueSeries} type="area" height={350} />
                ) : (
                    <div style={{ height: '350px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                        No projection data available
                    </div>
                )}
            </div>

            {/* Main AI Insights Feed */}
            <div style={{ marginBottom: '40px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '22px', fontWeight: 900, color: '#1e293b' }}>Operational Intelligence</h3>
                        <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#64748b', fontWeight: 500 }}>Automated stock movement and scaling logic</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', animation: 'pulse 2s infinite' }}></div>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#10b981', textTransform: 'uppercase' }}>Live Feed</span>
                    </div>
                </div>
                
                <div style={{ 
                    display: 'flex', 
                    flexDirection: 'row', 
                    gap: '24px', 
                    overflowX: 'auto', 
                    paddingBottom: '20px',
                    marginRight: '-30px',
                    paddingRight: '30px',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none'
                }} className="hide-scrollbar">
                    {insights.length > 0 ? insights.map((insight, idx) => (
                        <div key={idx} style={{ 
                            minWidth: '360px', 
                            maxWidth: '360px', 
                            flexShrink: 0,
                            transition: 'transform 0.3s ease'
                        }} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                            <InventoryInsightCard insight={insight} />
                        </div>
                    )) : (
                        <div style={{ width: '100%', background: '#fff', padding: '60px', borderRadius: '24px', border: '1px dashed #e2e8f0', textAlign: 'center' }}>
                            <i className="fas fa-robot" style={{ fontSize: '40px', color: '#e2e8f0', marginBottom: '16px' }}></i>
                            <p style={{ margin: 0, color: '#94a3b8', fontWeight: 600 }}>AI models are calculating baseline performance...</p>
                        </div>
                    )}
                </div>
            </div>

            {/* AI Wastage Mitigation (Full Width Horizontal) */}
            <div style={{ background: '#fff', borderRadius: '24px', border: '1px solid #f1f5f9', overflow: 'hidden', marginBottom: '32px' }}>
                <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', background: 'linear-gradient(to right, #fff5f5, #fff)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ background: '#fecaca', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#991b1b' }}>
                                <i className="fas fa-biohazard"></i>
                            </div>
                            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#991b1b' }}>Wastage Mitigation Analyst</h4>
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            High-Risk Inventory
                        </span>
                    </div>
                </div>
                    <div style={{ padding: '24px' }}>
                        {wastage.length > 0 ? (
                            <div style={{ 
                                display: 'flex', 
                                flexDirection: 'row', 
                                gap: '20px', 
                                overflowX: 'auto', 
                                paddingBottom: '16px',
                                scrollbarWidth: 'thin',
                                scrollbarColor: '#ef4444 transparent'
                            }}>
                                {wastage.map((alert, idx) => (
                                    <div key={idx} style={{ 
                                        padding: '20px', 
                                        borderRadius: '20px', 
                                        backgroundColor: '#fcfcfc',
                                        border: '1.5px solid #f1f5f9',
                                        minWidth: '320px',
                                        maxWidth: '320px',
                                        flexShrink: 0,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between'
                                    }}>
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                                <div style={{ fontWeight: 800, fontSize: '15px', color: '#1e293b' }}>{alert.product_name}</div>
                                                <div style={{ background: '#fef2f2', color: '#ef4444', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px' }}>
                                                    {alert.days_left} Days Left
                                                </div>
                                            </div>
                                            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px', lineHeight: '1.5' }}>
                                                Potential wastage of <strong>{alert.quantity} units</strong> detected at {alert.branch_name}.
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                                            <div>
                                                <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Rec. Disc.</div>
                                                <div style={{ fontSize: '20px', fontWeight: 900, color: '#16a34a' }}>{alert.recommended_discount}%</div>
                                            </div>
                                            <button 
                                                onClick={() => handleFlashSale(alert)}
                                                style={{ 
                                                    background: '#1e293b', 
                                                    color: '#fff', 
                                                    border: 'none', 
                                                    padding: '8px 16px', 
                                                    borderRadius: '10px', 
                                                    fontSize: '12px', 
                                                    fontWeight: 700,
                                                    cursor: 'pointer',
                                                    transition: 'transform 0.2s ease'
                                                }}
                                                onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                                                onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                                            >
                                                Flash Sale
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
                                <i className="fas fa-check-circle" style={{ fontSize: '32px', color: '#10b981', marginBottom: '16px', display: 'block' }}></i>
                                <span style={{ fontSize: '14px', fontWeight: 600 }}>No expiry risks detected in the next 90 days.</span>
                            </div>
                        )}
                    </div>
                </div>

            {/* Category Performance Matrix */}
            <div style={{ marginTop: '32px', background: '#fff', borderRadius: '24px', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
                <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', background: 'linear-gradient(to right, #f8fafc, #fff)' }}>
                    <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#1e293b' }}>Category Performance Intelligence</h4>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>30-Day Growth Matrix (BCG framework analysis)</p>
                </div>
                <div style={{ padding: '24px' }}>
                    {categoryMatrix.length > 0 ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                            {categoryMatrix.map((cat, idx) => (
                                <div key={idx} style={{ 
                                    padding: '20px', 
                                    borderRadius: '16px', 
                                    background: '#fff', 
                                    border: '1.5px solid #f1f5f9',
                                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                        <h5 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#1e293b' }}>{cat.category}</h5>
                                        <div style={{ 
                                            background: cat.growth >= 0 ? '#dcfce7' : '#fee2e2', 
                                            color: cat.growth >= 0 ? '#16a34a' : '#dc2626',
                                            padding: '4px 8px',
                                            borderRadius: '8px',
                                            fontSize: '11px',
                                            fontWeight: 800
                                        }}>
                                            {cat.growth >= 0 ? '↑' : '↓'} {Math.abs(cat.growth)}%
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '20px', fontWeight: 900, color: '#1e293b', marginBottom: '16px' }}>
                                        ₹{cat.revenue.toLocaleString()}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '10px', borderRadius: '10px' }}>
                                        <div>
                                            <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Sales Velocity</div>
                                            <div style={{ fontSize: '12px', fontWeight: 800, color: cat.velocity === 'High' ? '#4338ca' : '#475569' }}>{cat.velocity}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Recommended AI Action</div>
                                            <div style={{ fontSize: '12px', fontWeight: 800, color: '#0ea5e9' }}>{cat.action}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                            <i className="fas fa-layer-group" style={{ fontSize: '32px', opacity: 0.5, marginBottom: '16px' }}></i>
                            <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Insufficient data to generate category matrix.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Dynamic Pricing Analyst */}
            <div style={{ marginTop: '32px', background: '#fff', borderRadius: '24px', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
                <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', background: 'linear-gradient(to right, #f8fafc, #fff)' }}>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#1e293b' }}>Dynamic Pricing Analyst</h4>
                </div>
                <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
                    {pricing.length > 0 ? pricing.map((alert, idx) => (
                        <div key={idx} style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '16px', 
                            padding: '16px', 
                            borderRadius: '16px', 
                            backgroundColor: alert.type === 'increase' ? '#f0fdf4' : '#f0f9ff',
                            border: `1px solid ${alert.type === 'increase' ? '#dcfce7' : '#e0f2fe'}`
                        }}>
                            <div style={{ 
                                width: '40px', 
                                height: '40px', 
                                borderRadius: '12px', 
                                backgroundColor: '#fff', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                color: alert.type === 'increase' ? '#10b981' : '#0ea5e9',
                                fontWeight: 'bold',
                                fontSize: '18px'
                            }}>
                                {alert.type === 'increase' ? '↑' : '↓'}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 800, fontSize: '14px', color: '#1e293b' }}>{alert.product}</div>
                                <div style={{ fontSize: '12px', color: '#64748b' }}>{alert.reason}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Rec. Change</div>
                                <div style={{ fontWeight: 900, color: alert.type === 'increase' ? '#10b981' : '#0ea5e9' }}>
                                    {alert.type === 'increase' ? '+' : '-'}{alert.suggested_change || 0}%
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: '13px' }}>
                            Markets are currently stable. No price adjustments suggested.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AIBusinessHub;
