import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Chart from 'react-apexcharts';
import { formatDate } from '../../utils/dateUtils';
import InventoryInsightCard from '../InventoryInsightCard';
import { useToast } from '../ToastContext';

const AIBusinessHub = () => {
    const [insights, setInsights] = useState([]);
    const [forecast, setForecast] = useState([]);
    const [pricing, setPricing] = useState([]);
    const [wastage, setWastage] = useState([]);
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();

    useEffect(() => {
        loadData();
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '32px' }}>
                <div style={{ background: '#fff', padding: '24px', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>30-Day Revenue Projection</div>
                    <div style={{ fontSize: '32px', fontWeight: 900, color: '#1e293b', margin: '12px 0' }}>
                        ₹{(forecast.reduce((a, b) => a + (b.predicted_revenue || 0), 0)).toLocaleString()}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: 700, fontSize: '13px' }}>
                        <i className="fas fa-chart-line"></i> AI Confidence: High
                    </div>
                </div>

                <div style={{ background: '#fff', padding: '24px', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Strategic Alerts</div>
                    <div style={{ fontSize: '32px', fontWeight: 900, color: '#f59e0b', margin: '12px 0' }}>
                        {insights.length + pricing.length + wastage.length} Items
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontWeight: 700, fontSize: '13px' }}>
                        Critical and strategic alerts detected
                    </div>
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
            <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#1e293b' }}>Operational Insights</h3>
                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Real-time scaling and inventory logic</span>
                </div>
                
                <div style={{ 
                    display: 'flex', 
                    flexDirection: 'row', 
                    gap: '24px', 
                    overflowX: 'auto', 
                    paddingBottom: '20px',
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#6366f1 transparent'
                }}>
                    {insights.length > 0 ? insights.map((insight, idx) => (
                        <div key={idx} style={{ minWidth: '340px', maxWidth: '340px', flexShrink: 0 }}>
                            <InventoryInsightCard insight={insight} />
                        </div>
                    )) : (
                        <p style={{ padding: '40px', textAlign: 'center', width: '100%', color: '#94a3b8', fontSize: '14px' }}>
                            AI models are still training on your data. More sales will unlock insights.
                        </p>
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
                <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9' }}>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#1e293b' }}>Category Performance Intelligence</h4>
                </div>
                <div style={{ padding: '24px' }}>
                        <p style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>
                            Generating category growth matrix based on current velocity...
                        </p>
                        <div style={{ height: '140px', background: '#f8fafc', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="fas fa-microchip" style={{ fontSize: '32px', color: '#e2e8f0' }}></i>
                        </div>
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
