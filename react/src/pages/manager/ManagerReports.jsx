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
        branch_id: branchId // Locked to manager's branch
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
      'body{font-family:"Segoe UI",Arial,sans-serif;padding:20px;color:#111;font-size:12px}' +
      '.hdr{text-align:center;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:15px}' +
      '.hdr h2{margin:0;font-size:18px;letter-spacing:1px}.hdr h3{margin:5px 0;font-size:14px;text-decoration:underline}' +
      '.hdr p{margin:2px 0;font-size:11px;color:#333}' +
      '.meta{display:flex;justify-content:space-between;margin-bottom:10px;font-size:11px;border-bottom:1px dashed #000;padding-bottom:8px}' +
      'table{width:100%;border-collapse:collapse;margin:10px 0;font-size:11px}' +
      'th{background:#f3f4f6;border:1px solid #ddd;padding:6px;text-align:left;font-size:10px;text-transform:uppercase}' +
      'td{border:1px solid #ddd;padding:5px}' +
      '.r{text-align:right}.c{text-align:center}.b{font-weight:bold}' +
      '.section{margin:15px 0;page-break-inside:avoid}' +
      '.section h4{font-size:13px;border-bottom:1px solid #000;padding-bottom:4px;margin-bottom:8px}' +
      '.summary{display:flex;gap:15px;margin:10px 0;flex-wrap:wrap}' +
      '.summary .box{flex:1;min-width:120px;border:1px solid #ddd;padding:8px;text-align:center;border-radius:4px}' +
      '.summary .box .val{font-size:16px;font-weight:bold;margin-top:4px}' +
      '.summary .box .lbl{font-size:9px;color:#666;text-transform:uppercase}' +
      '.ftr{margin-top:30px;border-top:1px solid #000;padding-top:10px;font-size:10px}' +
      '.sig-row{display:flex;justify-content:space-between;margin-top:30px}' +
      '.sig-box{text-align:center;width:40%}.sig-box .line{border-top:1px solid #000;margin-top:40px;padding-top:4px}' +
      '.low{color:#dc2626;font-weight:bold}.warn{color:#d97706}.ok{color:#16a34a}' +
      '@media print{body{padding:10px}}' +
      '</style>';

    const header = '<div class="hdr">' +
      '<h2>RETAIL STORE</h2>' +
      '<p>4-143, Srinagar Colony, Vijayawada - 520001</p>' +
      '<h3>SALES REPORT</h3>' +
      '</div>' +
      '<div class="meta">' +
      '<div><b>Branch:</b> ' + branchName + '</div>' +
      '<div><b>Period:</b> ' + periodLabel + '</div>' +
      '<div><b>Generated:</b> ' + formatDate(now) + '</div>' +
      '</div>';

    const footer = '<div class="ftr">' +
      '<div class="sig-row">' +
      '<div class="sig-box"><div class="line">Branch Manager</div></div>' +
      '<div class="sig-box"><div class="line">Authorized Signatory</div></div>' +
      '</div>' +
      '</div>';

    let body = '<div class="summary">' +
      '<div class="box"><div class="lbl">Revenue</div><div class="val">Rs.' + (reportData.total_revenue?.toFixed(2) || '0') + '</div></div>' +
      '<div class="box"><div class="lbl">Transactions</div><div class="val">' + (reportData.total_transactions || 0) + '</div></div>' +
      '<div class="box"><div class="lbl">Avg Ticket</div><div class="val">Rs.' + (reportData.avg_ticket_size?.toFixed(2) || '0') + '</div></div>' +
      '</div>';

    if (reportData.payment_breakdown?.length > 0) {
      body += '<div class="section"><h4>Payment Breakdown</h4><table>' +
        '<tr><th>Mode</th><th class="r">Transactions</th><th class="r">Amount (Rs.)</th></tr>';
      reportData.payment_breakdown.forEach(p => {
        body += '<tr><td>' + p.method + '</td><td class="r">' + p.count + '</td><td class="r">' + p.total.toFixed(2) + '</td></tr>';
      });
      body += '</table></div>';
    }

    if (reportData.gst_summary?.length > 0) {
      body += '<div class="section"><h4>GST Summary</h4><table>' +
        '<tr><th>Slab</th><th class="r">Taxable (Rs.)</th><th class="r">CGST</th><th class="r">SGST</th><th class="r">Total Tax</th></tr>';
      reportData.gst_summary.forEach(g => {
        body += '<tr><td>' + g.slab + '</td><td class="r">' + g.taxable.toFixed(2) + '</td><td class="r">' + g.cgst.toFixed(2) + '</td><td class="r">' + g.sgst.toFixed(2) + '</td><td class="r">' + g.total_tax.toFixed(2) + '</td></tr>';
      });
      body += '</table></div>';
    }

    if (reportData.top_products?.length > 0) {
      body += '<div class="section"><h4>Top Selling Products</h4><table>' +
        '<tr><th>Product</th><th class="r">Qty</th><th class="r">Revenue (Rs.)</th></tr>';
      reportData.top_products.forEach(p => {
        body += '<tr><td>' + p.product_name + '</td><td class="r">' + p.total_quantity + '</td><td class="r">' + p.total_revenue.toFixed(2) + '</td></tr>';
      });
      body += '</table></div>';
    }

    w.document.write('<html><head><title>Branch Report</title>' + styles + '</head><body>' + header + body + footer + '</body></html>');
    w.document.close();
    w.print();
  };

  return (
    <div className="chart-card">
      <h2 style={{ marginBottom: "20px" }}>Branch Performance Report</h2>
      <p style={{ color: '#64748b', marginBottom: '20px' }}>Analyzing data for <b>{branchName}</b></p>

      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <label>Report Period:</label>
          <select value={period} onChange={e => {
            setPeriod(e.target.value);
            if (e.target.value === "custom" && !startDate) {
              const today = new Date().toISOString().split('T')[0];
              setStartDate(today); setEndDate(today);
            }
          }}>
            <option value="0">Today</option>
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="custom">📅 Custom Range</option>
          </select>
        </div>

        {period === "custom" && (
          <>
            <div><label>Start:</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
            <div><label>End:</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
          </>
        )}

        <button onClick={printFullReport} disabled={loading || !reportData} style={{ background: '#6366f1', color: 'white', padding: '10px 20px', fontWeight: 600 }}>
          Print Report
        </button>
      </div>

      {loading ? <p>Analyzing branch data...</p> : reportData ? (
        <>
          {/* ANALYTICAL CHARTS */}
          <div className="dashboard-grid" style={{ gridTemplateColumns: '1.5fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div className="table-card" style={{ margin: 0 }}>
              <h4>📈 Sales Trend</h4>
              <div style={{ minHeight: '300px' }}>
                <Chart
                  type="area"
                  height={300}
                  series={[{
                    name: 'Revenue',
                    data: reportData.daily_breakdown?.map(d => d.total) || []
                  }]}
                  options={{
                    chart: { toolbar: { show: false }, zoom: { enabled: false } },
                    dataLabels: { enabled: false },
                    stroke: { curve: 'smooth', width: 3 },
                    colors: ['#6366f1'],
                    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.45, opacityTo: 0.05 } },
                    xaxis: { categories: reportData.daily_breakdown?.map(d => d.date) || [] },
                    yaxis: { labels: { formatter: (v) => `₹${v.toFixed(0)}` } },
                    grid: { borderColor: '#f1f5f9' },
                    tooltip: { theme: 'light' }
                  }}
                />
              </div>
            </div>

            <div className="table-card" style={{ margin: 0 }}>
              <h4> Revenue Mix</h4>
              <div style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Chart
                  type="donut"
                  width={300}
                  series={reportData.payment_breakdown?.map(p => p.total) || []}
                  options={{
                    labels: reportData.payment_breakdown?.map(p => p.method) || [],
                    colors: ['#6366f1', '#10b981', '#f59e0b', '#64748b'],
                    legend: { position: 'bottom' },
                    dataLabels: { enabled: true, formatter: (val) => `${val.toFixed(1)}%` },
                    plotOptions: { pie: { donut: { size: '65%' } } }
                  }}
                />
              </div>
            </div>
          </div>

          <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="table-card" style={{ margin: 0 }}>
              <h4>💳 Payment Summary</h4>
              <div className="table-responsive">
                <table>
                  <thead><tr><th>Mode</th><th>Total (₹)</th></tr></thead>
                  <tbody>
                    {reportData.payment_breakdown?.map((p, i) => (
                      <tr key={i}><td>{p.method}</td><td style={{ fontWeight: 700 }}>₹{p.total.toFixed(2)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="table-card" style={{ margin: 0 }}>
              <h4>🏆 Top Products</h4>
              <div className="table-responsive">
                <table>
                  <thead><tr><th>Product</th><th>Qty</th></tr></thead>
                  <tbody>
                    {reportData.top_products?.slice(0, 5).map((p, i) => (
                      <tr key={i}><td>{p.product_name}</td><td style={{ fontWeight: 700 }}>{p.total_quantity}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : (
        <p>No data found for this period</p>
      )}
    </div>
  );
}
