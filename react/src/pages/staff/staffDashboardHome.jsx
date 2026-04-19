import { useEffect, useState } from "react";
import api from "../../services/api";
import Chart from "react-apexcharts";
import { formatDate } from "../../utils/dateUtils";

export default function StaffDashboardHome() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recentSales, setRecentSales] = useState([]);
  const [filterDate, setFilterDate] = useState(() => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now - offset).toISOString().split("T")[0];
  });

  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
  const branchId = loggedInUser?.branch_id;

  const loadStats = async () => {
    if (!branchId) return;
    setLoading(true);
    try {
      const res = await api.sales.getDailySummary(branchId, filterDate);

      // Map back to the expected structure for existing UI components
      const mappedStats = {
        total_revenue: res.total_sales || 0,
        total_transactions: res.transaction_count || 0,
        avg_ticket_size: res.average_transaction || 0,
        payment_breakdown: Object.entries(res.payment_breakdown || {}).map(([method, data]) => ({
          method: method,
          total: data.total || 0,
          count: data.count || 0
        }))
      };

      setStats(mappedStats);
      const salesRes = await api.manager.getTransactions();
      setRecentSales((salesRes.transactions || []).slice(0, 5));
    } catch (err) {
      console.error("Failed to load staff dash stats", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadStats();
  }, [branchId, filterDate]);

  const printHandoverReport = () => {
    if (!stats) return;
    const win = window.open("", "_blank");
    const dateStr = formatDate(filterDate);

    const styles = `
      <style>
        body { font-family: 'Inter', sans-serif; padding: 40px; color: #0f172a; line-height: 1.5; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1e293b; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { margin: 0; font-size: 22px; font-weight: 900; letter-spacing: -0.5px; }
        .summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 40px; }
        .card { background: #fff; border: 1.5px solid #e2e8f0; padding: 20px; border-radius: 16px; }
        .card h4 { margin: 0; font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: 800; letter-spacing: 1px; }
        .card .val { margin-top: 8px; font-size: 24px; font-weight: 900; }
        table { width: 100%; border-collapse: separate; border-spacing: 0; }
        td { padding: 12px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; font-weight: 600; }
        .total-row { border-top: 2px solid #e2e8f0; font-size: 18px; font-weight: 900; }
        .sig-box { border-top: 2px solid #1e293b; margin-top: 60px; padding-top: 10px; width: 220px; text-align: center; font-size: 11px; font-weight: 800; text-transform: uppercase; }
      </style>
    `;

    const content = `
      <div class="header">
        <div>
          <h1>DAILY SHIFT REPORT</h1>
          <p style="margin:5px 0 0; font-size:12px; font-weight:700; color:#64748b;">Staff Member: ${loggedInUser?.name} | ID: ${loggedInUser?.employee_id || 'N/A'}</p>
        </div>
        <div style="text-align:right;">
          <div style="padding:4px 12px; background:#f1f5f9; border-radius:100px; font-size:10px; font-weight:800; color:#475569;">B: ${loggedInUser?.branch_name}</div>
          <p style="margin:10px 0 0; font-size:11px; font-weight:700; color:#94a3b8;">D: ${dateStr}</p>
        </div>
      </div>

      <div class="summary-grid">
        <div class="card"><h4>Declared Revenue</h4><div class="val">₹${stats.total_revenue?.toFixed(2)}</div></div>
        <div class="card"><h4>Transaction Volume</h4><div class="val">${stats.total_transactions}</div></div>
      </div>

      <h4 style="font-size:12px; font-weight:900; color:#1e293b; margin-bottom:15px; border-bottom:2px solid #f1f5f9; padding-bottom:8px;">TERMINAL SETTLEMENTS</h4>
      <table>
        ${stats.payment_breakdown?.map(p => `<tr><td>${p.method.toUpperCase()} COLLECTION</td><td style="text-align:right;">₹${p.total.toFixed(2)}</td></tr>`).join('')}
        <tr class="total-row"><td>TOTAL REMITTANCE</td><td style="text-align:right;">₹${stats.total_revenue?.toFixed(2)}</td></tr>
      </table>

      <div style="display:flex; justify-content:space-between; margin-top:40px;">
        <div class="sig-box">Staff Auditor Signature</div>
        <div class="sig-box">Manager Certification</div>
      </div>
    `;

    win.document.write(`<html><head><title>Handover_${dateStr}</title>${styles}</head><body>${content}</body></html>`);
    win.document.close();
    win.print();
  };

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>

      {/* ================= HEADER & CONTROLS ================= */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', background: '#fff', padding: '16px 24px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#1e293b' }}>Operational Overview</h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px', fontWeight: 600 }}>Shift performance logs for Terminal #01</p>
        </div>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '10px', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Shift Date</span>
            <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} style={{ border: 'none', background: 'transparent', fontSize: '14px', fontWeight: 800, color: '#4338ca', outline: 'none', cursor: 'pointer' }} />
          </div>
          <div style={{ width: '1px', height: '30px', background: '#f1f5f9' }}></div>
          <button onClick={printHandoverReport} style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', padding: '10px 20px', borderRadius: '12px', fontSize: '12px', fontWeight: 800, color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fas fa-print"></i> Download Shift Report
          </button>
        </div>
      </div>

      {/* ================= QUICK STATS ================= */}
      {/* ================= SUMMARY STATS ================= */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        <div style={{ background: '#fff', padding: '24px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Today's Sales</div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#1e293b', marginTop: '4px' }}>₹{stats?.total_revenue?.toFixed(2) || '0.00'}</div>
          <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 700, marginTop: '4px' }}><i className="fas fa-caret-up"></i> Live</div>
        </div>
        <div style={{ background: '#fff', padding: '24px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Bills</div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#1e293b', marginTop: '4px' }}>{stats?.total_transactions || 0}</div>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, marginTop: '4px' }}>Bills Completed</div>
        </div>
        <div style={{ background: '#fff', padding: '24px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Average Sale</div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#1e293b', marginTop: '4px' }}>₹{stats?.avg_ticket_size?.toFixed(0) || 0}</div>
          <div style={{ fontSize: '11px', color: '#4338ca', fontWeight: 700, marginTop: '4px' }}>Per Customer</div>
        </div>

      </div>

      {/* ================= PAYMENT BREAKDOWN STRIP ================= */}
      {stats?.payment_breakdown?.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '40px', animation: 'slideUp 0.6s ease-out' }}>
          {stats.payment_breakdown.map((pm, i) => {
            const config = {
              cash: { icon: 'fa-money-bill-wave', color: '#059669', bg: '#ecfdf5' },
              upi: { icon: 'fa-mobile-alt', color: '#4338ca', bg: '#e0e7ff' },
              card: { icon: 'fa-credit-card', color: '#2563eb', bg: '#eff6ff' },
              qr: { icon: 'fa-qrcode', color: '#0d9488', bg: '#f0fdfa' },
              other: { icon: 'fa-wallet', color: '#64748b', bg: '#f1f5f9' }
            }[pm.method.toLowerCase()] || { icon: 'fa-wallet', color: '#64748b', bg: '#f1f5f9' };

            return (
              <div key={i} style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>{pm.method} COLLECTION</p>
                    <h2 style={{ margin: '8px 0 2px', fontSize: '20px', fontWeight: 900, color: '#1e293b' }}>₹{pm.total?.toFixed(2)}</h2>
                    <p style={{ margin: 0, fontSize: '11px', color: '#64748b', fontWeight: 600 }}>{pm.count} Bills Total</p>
                  </div>
                  <div style={{ backgroundColor: config.bg, color: config.color, width: '38px', height: '38px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                    <i className={`fas ${config.icon}`}></i>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}


      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>

        {/* ACTIVE SESSION SALES */}
        <div style={{ background: '#fff', padding: '30px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 25px 0', fontSize: '16px', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="fas fa-history" style={{ color: '#4338ca' }}></i> Recent Store Sales
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentSales.map((sale, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: '#f8fafc', borderRadius: '18px', border: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '14px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0', color: '#4338ca' }}>
                    <i className="fas fa-receipt"></i>
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '14px' }}>INV-{sale.bill_number}</div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8' }}>{sale.payment_method?.toUpperCase()} • {new Date(sale.sale_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 900, color: '#4338ca', fontSize: '16px' }}>₹{sale.total_amount?.toFixed(2)}</div>
                  <div style={{ fontSize: '10px', fontWeight: 800, color: '#10b981', textTransform: 'uppercase' }}>DECLARED</div>
                </div>
              </div>
            ))}
            <button onClick={() => window.location.hash = '#receipts'} style={{ marginTop: '10px', padding: '14px', background: 'transparent', border: '2px dashed #e2e8f0', color: '#64748b', fontSize: '13px', fontWeight: 700, borderRadius: '14px', cursor: 'pointer' }}>View Transaction History</button>
          </div>
        </div>

        {/* SETTLEMENT MIX */}
        <div style={{ background: '#fff', padding: '30px', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
          <h4 style={{ margin: '0 0 25px 0', fontSize: '16px', fontWeight: 800, color: '#1e293b' }}>Payment Mode Distribution</h4>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Chart
              type="donut"
              width={340}
              series={stats?.payment_breakdown?.map(p => p.total) || []}
              options={{
                labels: stats?.payment_breakdown?.map(p => p.method.toUpperCase()) || [],
                colors: ['#4338ca', '#10b981', '#f59e0b', '#ef4444'],
                stroke: { width: 0 },
                legend: { position: 'bottom', fontSize: '11px', fontWeight: 700, labels: { colors: '#64748b' } },
                dataLabels: { enabled: true, style: { fontSize: '10px', fontWeight: 800 } },
                plotOptions: { pie: { donut: { size: '75%', labels: { show: true, total: { show: true, label: 'SESSION', formatter: () => `₹${stats?.total_revenue?.toFixed(0) || 0}` } } } } }
              }}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
