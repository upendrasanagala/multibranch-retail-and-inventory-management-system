import { useEffect, useState } from "react";
import api from "../../services/api";
import { formatDate } from "../../utils/dateUtils";
import Chart from "react-apexcharts";

export default function ManagerReports() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("30");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
  const branchId = loggedInUser?.branch_id;
  const branchName = loggedInUser?.branch_name || "This Branch";

  const fetchReport = async () => {
    if (!branchId) return;
    setLoading(true);
    setError("");
    try {
      const response = await api.admin.getReports("sales", {
        period,
        start_date: period === "custom" ? startDate : null,
        end_date: period === "custom" ? endDate : null,
        branch_id: branchId
      });
      setReportData(response);
    } catch (err) {
      console.error("Failed to fetch report:", err);
      setError("Failed to load report data");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReport();
  }, [branchId, period, startDate, endDate]);

  const printFullReport = () => {
    if (!reportData) return;
    const w = window.open("", "_blank");
    const now = new Date();
    const periodLabel = period === 'custom' ? (startDate + ' to ' + endDate) : ('Last ' + (reportData.period_days || period) + ' Days');

    const styles = '<style>' +
      'body{font-family:"Inter",-apple-system,sans-serif;padding:40px;color:#0f172a;line-height:1.5}' +
      '.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1e293b;padding-bottom:20px;margin-bottom:30px}' +
      '.header-left h1{margin:0;font-size:24px;font-weight:900;letter-spacing:-0.5px;color:#1e293b}' +
      '.header-left p{margin:5px 0 0;color:#64748b;font-size:13px;font-weight:600}' +
      '.header-right{text-align:right}' +
      '.badge{display:inline-block;padding:4px 12px;background:#f1f5f9;border-radius:100px;font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:1px}' +
      '.summary-grid{display:grid;grid-template-columns:repeat(3, 1fr);gap:20px;margin-bottom:40px}' +
      '.summary-card{background:#fff;border:1.5px solid #e2e8f0;padding:20px;border-radius:16px;text-align:center}' +
      '.summary-card h4{margin:0;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:800}' +
      '.summary-card .val{margin-top:8px;font-size:24px;font-weight:900;color:#1e293b}' +
      'table{width:100%;border-collapse:separate;border-spacing:0;margin-bottom:30px}' +
      'th{background:#f8fafc;padding:12px 16px;text-align:left;font-size:10px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #e2e8f0}' +
      'td{padding:12px 16px;font-size:13px;color:#334155;border-bottom:1px solid #f1f5f9}' +
      '.section-title{font-size:15px;font-weight:900;color:#1e293b;margin:0 0 15px;display:flex;align-items:center;gap:10px}' +
      '.section-title::after{content:"";flex:1;height:2px;background:#f1f5f9}' +
      '.footer{margin-top:60px;display:grid;grid-template-columns:1fr 1fr;gap:100px}' +
      '.sig-line{border-top:2.5px solid #1e293b;margin-top:50px;padding-top:10px;text-align:center;font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px}' +
      '.r{text-align:right} .c{text-align:center}' +
      '</style>';

    const content = `
      <div class="header">
        <div class="header-left">
          <h1>RETAIL COMMAND CENTER</h1>
          <p>Branch Performance Audit Report</p>
        </div>
        <div class="header-right">
          <div class="badge">Internal Audit</div>
          <p style="margin:10px 0 0;font-size:11px;font-weight:700;color:#94a3b8">B: ${branchName}</p>
          <p style="margin:2px 0 0;font-size:11px;font-weight:700;color:#94a3b8">D: ${periodLabel}</p>
        </div>
      </div>

      <div class="summary-grid">
        <div class="summary-card"><h4>Gross Revenue</h4><div class="val">₹${reportData.total_revenue?.toFixed(2)}</div></div>
        <div class="summary-card"><h4>Transactions</h4><div class="val">${reportData.total_transactions}</div></div>
        <div class="summary-card"><h4>Avg Ticket Size</h4><div class="val">₹${reportData.avg_ticket_size?.toFixed(2)}</div></div>
      </div>

      <h3 class="section-title">Analytical Breakdown: Payments</h3>
      <table>
        <thead><tr><th>Method</th><th class="c">Usage Count</th><th class="r">Total Settled (₹)</th></tr></thead>
        <tbody>
          ${reportData.payment_breakdown?.map(p => `<tr><td style="font-weight:700">${p.method.toUpperCase()}</td><td class="c">${p.count}</td><td class="r" style="font-weight:800">₹${p.total.toFixed(2)}</td></tr>`).join('')}
        </tbody>
      </table>

      <h3 class="section-title">Strategic Insight: Top Assets</h3>
      <table>
        <thead><tr><th>Product Line</th><th class="c">Units Moved</th><th class="r">Yield Generated (₹)</th></tr></thead>
        <tbody>
          ${reportData.top_products?.map(p => `<tr><td style="font-weight:700">${p.product_name}</td><td class="c">${p.total_quantity}</td><td class="r" style="font-weight:800">₹${p.total_revenue.toFixed(2)}</td></tr>`).join('')}
        </tbody>
      </table>

      <div class="footer">
        <div class="sig-line">Branch Manager Certification</div>
        <div class="sig-line">Corporate Auditor Approval</div>
      </div>
    `;

    w.document.write(`<html><head><title>Performance_Audit_${formatDate(now)}</title>${styles}</head><body>${content}</body></html>`);
    w.document.close();
    w.print();
  };

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      
      {/* ================= CONTROLS ================= */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', background: '#fff', padding: '12px 24px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '10px', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Analysis Period</span>
            <select 
              value={period} 
              onChange={e => {
                setPeriod(e.target.value);
                if (e.target.value === "custom" && !startDate) {
                  const today = new Date().toISOString().split('T')[0];
                  setStartDate(today); setEndDate(today);
                }
              }}
              style={{ border: 'none', background: 'transparent', fontSize: '14px', fontWeight: 700, color: '#1e293b', outline: 'none', cursor: 'pointer' }}
            >
              <option value="0">Current Day</option>
              <option value="7">Last 7 Cycles</option>
              <option value="30">Last 30 Cycles</option>
              <option value="custom">📅 Custom Epoch</option>
            </select>
          </div>

          {period === "custom" && (
            <div style={{ display: 'flex', gap: '15px', paddingLeft: '20px', borderLeft: '2px solid #f1f5f9' }}>
               <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ border: 'none', background: '#f8fafc', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700 }} />
               <i className="fas fa-arrow-right" style={{ alignSelf: 'center', color: '#94a3b8', fontSize: '12px' }}></i>
               <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ border: 'none', background: '#f8fafc', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700 }} />
            </div>
          )}
        </div>

        <button 
          onClick={printFullReport} 
          disabled={loading || !reportData}
          style={{ 
            background: '#4338ca', 
            color: 'white', 
            border: 'none', 
            padding: '12px 24px', 
            borderRadius: '14px', 
            fontSize: '13px', 
            fontWeight: 800, 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 10px 15px -3px rgba(67, 56, 202, 0.3)'
          }}
        >
          <i className="fas fa-print"></i> Generate Full Audit
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center' }}>
          <i className="fas fa-circle-notch fa-spin" style={{ fontSize: '32px', color: '#4338ca', marginBottom: '15px' }}></i>
          <p style={{ fontWeight: 700, color: '#64748b' }}>Crunching branch analytics...</p>
        </div>
      ) : reportData ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* TOP ANALYTICS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
             <div style={{ background: '#fff', borderRadius: '24px', padding: '30px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                   <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#1e293b' }}>📈 Performance Velocity</h4>
                </div>
                <Chart
                  type="area"
                  height={320}
                  series={[{ name: 'Revenue', data: reportData.daily_breakdown?.map(d => d.total) || [] }]}
                  options={{
                    chart: { toolbar: { show: false }, zoom: { enabled: false }, fontFamily: 'Inter, sans-serif' },
                    dataLabels: { enabled: false },
                    stroke: { curve: 'smooth', width: 4, colors: ['#4338ca'] },
                    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05 } },
                    xaxis: { categories: reportData.daily_breakdown?.map(d => d.date) || [], labels: { style: { colors: '#94a3b8', fontSize: '10px', fontWeight: 600 } } },
                    yaxis: { labels: { style: { colors: '#94a3b8', fontSize: '10px', fontWeight: 600 }, formatter: (v) => `₹${v.toFixed(0)}` } },
                    grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
                    markers: { size: 4, colors: ['#4338ca'], strokeWidth: 3, strokeColors: '#fff' }
                  }}
                />
             </div>

             <div style={{ background: '#fff', borderRadius: '24px', padding: '30px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <h4 style={{ margin: '0 0 25px 0', fontSize: '16px', fontWeight: 800, color: '#1e293b' }}>Settlement Mix</h4>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Chart
                    type="donut"
                    width={320}
                    series={reportData.payment_breakdown?.map(p => p.total) || []}
                    options={{
                      labels: reportData.payment_breakdown?.map(p => p.method.toUpperCase()) || [],
                      colors: ['#4338ca', '#10b981', '#f59e0b', '#ef4444'],
                      legend: { position: 'bottom', fontSize: '11px', fontWeight: 700, labels: { colors: '#64748b' } },
                      stroke: { width: 0 },
                      dataLabels: { enabled: true, style: { fontSize: '10px', fontWeight: 800 } },
                      plotOptions: { pie: { donut: { size: '75%', labels: { show: true, total: { show: true, label: 'TOTAL', formatter: () => `₹${reportData.total_revenue?.toFixed(0)}` } } } } }
                    }}
                  />
                </div>
             </div>
          </div>

          {/* SECONDARY GRIDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
             <div style={{ background: '#fff', borderRadius: '24px', padding: '24px', border: '1px solid #e2e8f0', minWidth: 0 }}>
               <h4 style={{ margin: '0 0 20px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
                 <i className="fas fa-credit-card" style={{ color: '#4338ca' }}></i> Financial Settlement
               </h4>
               <div style={{ overflowX: 'auto' }}>
                 <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '400px' }}>
                   <thead>
                     <tr style={{ borderBottom: '1.5px solid #f1f5f9' }}>
                       <th style={{ textAlign: 'left', padding: '12px 0', fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Mode</th>
                       <th style={{ textAlign: 'right', padding: '12px 0', fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Total Amount</th>
                     </tr>
                   </thead>
                   <tbody>
                     {reportData.payment_breakdown?.map((p, i) => (
                       <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                         <td style={{ padding: '14px 0', fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>{p.method.toUpperCase()}</td>
                         <td style={{ padding: '14px 0', textAlign: 'right', fontSize: '14px', fontWeight: 800, color: '#4338ca' }}>₹{p.total.toFixed(2)}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             </div>

             <div style={{ background: '#fff', borderRadius: '24px', padding: '24px', border: '1px solid #e2e8f0', minWidth: 0 }}>
               <h4 style={{ margin: '0 0 20px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
                 <i className="fas fa-trophy" style={{ color: '#f59e0b' }}></i> High Yield Inventory
               </h4>
               <div style={{ overflowX: 'auto' }}>
                 <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
                   <thead>
                     <tr style={{ borderBottom: '1.5px solid #f1f5f9' }}>
                       <th style={{ textAlign: 'left', padding: '12px 0', fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Product Name</th>
                       <th style={{ textAlign: 'center', padding: '12px 0', fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Volume Sold</th>
                       <th style={{ textAlign: 'right', padding: '12px 0', fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Net Revenue</th>
                     </tr>
                   </thead>
                   <tbody>
                     {reportData.top_products?.slice(0, 5).map((p, i) => (
                       <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                         <td style={{ padding: '14px 0', fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>{p.product_name}</td>
                         <td style={{ padding: '14px 0', textAlign: 'center', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>{p.total_quantity}</td>
                         <td style={{ padding: '14px 0', textAlign: 'right', fontSize: '14px', fontWeight: 800, color: '#10b981' }}>₹{p.total_revenue.toFixed(2)}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             </div>
          </div>
        </div>
      ) : (
        <div style={{ padding: '100px', textAlign: 'center', background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
           <i className="fas fa-layer-group" style={{ fontSize: '48px', color: '#e2e8f0', marginBottom: '20px' }}></i>
           <p style={{ fontWeight: 700, color: '#64748b' }}>No audit data available for the selected cycle.</p>
        </div>
      )}
    </div>
  );
}
