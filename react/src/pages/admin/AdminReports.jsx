import { useEffect, useState } from "react";
import api from "../../services/api";
import { formatDate } from "../../utils/dateUtils";
import Chart from "react-apexcharts";

export default function AdminReports() {
  const [reportData, setReportData] = useState(null);
  const [reportType, setReportType] = useState("sales");
  const [period, setPeriod] = useState("30");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [reportType, selectedBranch, period, startDate, endDate]);

  const loadBranches = async () => {
    try {
      const data = await api.branches.getAll();
      setBranches(data.branches || []);
    } catch (err) {
      console.error("Failed to load branches", err);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.admin.getReports(reportType, {
        period,
        start_date: period === "custom" ? startDate : null,
        end_date: period === "custom" ? endDate : null,
        branch_id: selectedBranch
      });
      setReportData(response);
    } catch (err) {
      console.error("Failed to fetch report:", err);
      setError("Failed to load report data: " + (err.message || "Unknown error"));
      setReportData(null);
    }
    setLoading(false);
  };

  /* ================= PRINT FULL REPORT ================= */
  const printFullReport = () => {
    if (!reportData) return;
    const w = window.open("", "_blank");
    const now = new Date();
    const branchLabel = selectedBranch ? (branches.find(b => b.branch_id == selectedBranch)?.name || 'Unknown') : 'All Branches';
    const periodLabel = period === 'custom' ? (startDate + ' to ' + endDate) : ('Last ' + (reportData.period_days || period) + ' Days');

    // Common styles
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

    // Header HTML
    const header = '<div class="hdr">' +
      '<h2>RETAIL STORE</h2>' +
      '<p>4-143, Srinagar Colony, Vijayawada - 520001</p>' +
      '<p>GSTIN: 37XXXXX0000X1ZX</p>' +
      '<h3>' + (reportType === 'sales' ? 'SALES REPORT' : 'INVENTORY STATUS REPORT') + '</h3>' +
      '</div>' +
      '<div class="meta">' +
      '<div><b>Branch:</b> ' + branchLabel + '</div>' +
      (reportType === 'sales' ? '<div><b>Period:</b> ' + periodLabel + '</div>' : '') +
      '<div><b>Generated:</b> ' + formatDate(now) + ', ' + now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) + '</div>' +
      '</div>';

    // Footer HTML
    const footer = '<div class="ftr">' +
      '<div class="sig-row">' +
      '<div class="sig-box"><div class="line">Prepared By</div></div>' +
      '<div class="sig-box"><div class="line">Approved By</div></div>' +
      '</div>' +
      '<p style="text-align:center;margin-top:15px;color:#666">Confidential — Computer Generated Report</p>' +
      '</div>';

    let body = '';

    if (reportType === 'sales') {
      // Summary boxes
      body += '<div class="summary">' +
        '<div class="box"><div class="lbl">Total Revenue</div><div class="val">Rs.' + (reportData.total_revenue?.toFixed(2) || '0') + '</div></div>' +
        '<div class="box"><div class="lbl">Transactions</div><div class="val">' + (reportData.total_transactions || 0) + '</div></div>' +
        '<div class="box"><div class="lbl">Avg Ticket</div><div class="val">Rs.' + (reportData.avg_ticket_size?.toFixed(2) || '0') + '</div></div>' +
        '<div class="box"><div class="lbl">Avg/Day</div><div class="val">Rs.' + (reportData.average_per_day?.toFixed(2) || '0') + '</div></div>' +
        '</div>';

      // Payment breakdown
      if (reportData.payment_breakdown?.length > 0) {
        body += '<div class="section"><h4>Payment Mode Summary</h4><table>' +
          '<tr><th>Mode</th><th class="r">Transactions</th><th class="r">Amount (Rs.)</th><th class="r">%</th></tr>';
        reportData.payment_breakdown.forEach(p => {
          body += '<tr><td>' + p.method + '</td><td class="r">' + p.count + '</td><td class="r">' + p.total.toFixed(2) + '</td><td class="r">' + p.percentage + '%</td></tr>';
        });
        body += '</table></div>';
      }

      // Daily breakdown
      if (reportData.daily_breakdown?.length > 0) {
        body += '<div class="section"><h4>Daily Sales Breakdown</h4><table>' +
          '<tr><th>Date</th><th class="r">Transactions</th><th class="r">Revenue (Rs.)</th></tr>';
        reportData.daily_breakdown.forEach(d => {
          body += '<tr><td>' + d.date + '</td><td class="r">' + d.count + '</td><td class="r">' + d.total?.toFixed(2) + '</td></tr>';
        });
        body += '</table></div>';
      }

      // Branch breakdown
      if (reportData.branch_breakdown?.length > 0) {
        body += '<div class="section"><h4>Branch-wise Sales</h4><table>' +
          '<tr><th>Branch</th><th class="r">Transactions</th><th class="r">Sales (Rs.)</th></tr>';
        reportData.branch_breakdown.forEach(b => {
          body += '<tr><td>' + b.branch + '</td><td class="r">' + (b.count || 0) + '</td><td class="r">' + b.total?.toFixed(2) + '</td></tr>';
        });
        body += '</table></div>';
      }

      // Top products
      if (reportData.top_products?.length > 0) {
        body += '<div class="section"><h4>Top Selling Products</h4><table>' +
          '<tr><th>#</th><th>Product</th><th class="r">Qty Sold</th><th class="r">Revenue (Rs.)</th><th class="c">GST%</th></tr>';
        reportData.top_products.forEach((p, i) => {
          body += '<tr><td>' + (i + 1) + '</td><td>' + p.product_name + '</td><td class="r">' + p.total_quantity + '</td><td class="r">' + p.total_revenue.toFixed(2) + '</td><td class="c">' + (p.gst_percent || 0) + '%</td></tr>';
        });
        body += '</table></div>';
      }

      // GST summary
      if (reportData.gst_summary?.length > 0) {
        body += '<div class="section"><h4>GST Summary</h4><table>' +
          '<tr><th>GST Slab</th><th class="r">Taxable (Rs.)</th><th class="r">CGST (Rs.)</th><th class="r">SGST (Rs.)</th><th class="r">Total Tax (Rs.)</th></tr>';
        let totTaxable = 0, totCGST = 0, totSGST = 0, totTax = 0;
        reportData.gst_summary.forEach(g => {
          totTaxable += g.taxable; totCGST += g.cgst; totSGST += g.sgst; totTax += g.total_tax;
          body += '<tr><td>' + g.slab + '</td><td class="r">' + g.taxable.toFixed(2) + '</td><td class="r">' + g.cgst.toFixed(2) + '</td><td class="r">' + g.sgst.toFixed(2) + '</td><td class="r">' + g.total_tax.toFixed(2) + '</td></tr>';
        });
        body += '<tr class="b"><td>Total</td><td class="r">' + totTaxable.toFixed(2) + '</td><td class="r">' + totCGST.toFixed(2) + '</td><td class="r">' + totSGST.toFixed(2) + '</td><td class="r">' + totTax.toFixed(2) + '</td></tr>';
        body += '</table></div>';
      }
    } else {
      // INVENTORY REPORT
      body += '<div class="summary">' +
        '<div class="box"><div class="lbl">Total Items</div><div class="val">' + (reportData.total_items || 0) + '</div></div>' +
        '<div class="box"><div class="lbl">Stock Value</div><div class="val">Rs.' + (reportData.total_stock_value?.toFixed(2) || '0') + '</div></div>' +
        '<div class="box"><div class="lbl">Low Stock</div><div class="val low">' + (reportData.low_stock_count || 0) + '</div></div>' +
        '<div class="box"><div class="lbl">Out of Stock</div><div class="val low">' + (reportData.out_of_stock_count || 0) + '</div></div>' +
        '</div>';

      // Category breakdown
      if (reportData.category_breakdown?.length > 0) {
        body += '<div class="section"><h4>Category Breakdown</h4><table>' +
          '<tr><th>Category</th><th class="r">Items</th><th class="r">Total Qty</th><th class="r">Value (Rs.)</th></tr>';
        reportData.category_breakdown.forEach(c => {
          body += '<tr><td>' + c.category + '</td><td class="r">' + c.items + '</td><td class="r">' + c.total_qty + '</td><td class="r">' + c.total_value.toFixed(2) + '</td></tr>';
        });
        body += '</table></div>';
      }

      // Full inventory table
      if (reportData.all_items?.length > 0) {
        body += '<div class="section"><h4>Full Inventory</h4><table>' +
          '<tr><th>#</th><th>SKU</th><th>Product</th><th>Category</th><th>Branch</th><th class="r">Qty</th><th class="r">Price</th><th class="r">Value</th><th class="c">Status</th></tr>';
        reportData.all_items.forEach((item, i) => {
          const cls = item.severity === 'out_of_stock' ? 'low' : item.severity === 'critical' ? 'low' : item.severity === 'warning' ? 'warn' : 'ok';
          const label = item.severity === 'out_of_stock' ? 'OUT' : item.severity === 'critical' ? 'LOW' : item.severity === 'warning' ? 'WARN' : 'OK';
          body += '<tr><td>' + (i + 1) + '</td><td>' + (item.sku || '-') + '</td><td>' + item.product_name + '</td><td>' + item.category + '</td><td>' + item.branch_name + '</td><td class="r">' + item.quantity + '</td><td class="r">' + item.unit_price.toFixed(2) + '</td><td class="r">' + item.stock_value.toFixed(2) + '</td><td class="c ' + cls + '">' + label + '</td></tr>';
        });
        body += '</table></div>';
      }
    }

    w.document.write('<!DOCTYPE html><html><head><title>' + (reportType === 'sales' ? 'Sales' : 'Inventory') + ' Report</title>' + styles + '</head><body>' + header + body + footer + '</body></html>');
    w.document.close();
    w.print();
  };

  return (
    <div className="chart-card">
      <h3>System Reports</h3>

      {/* ================= FILTERS ================= */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <label>Filter by Branch:</label>
          <select value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)}>
            <option value="">All Branches</option>
            {branches.map(b => (
              <option key={b.branch_id} value={b.branch_id}>{b.name} (ID: {b.branch_id})</option>
            ))}
          </select>
        </div>

        <div>
          <label>Report Type:</label>
          <select value={reportType} onChange={e => setReportType(e.target.value)}>
            <option value="sales">Sales Summary</option>
            <option value="inventory">Inventory Summary</option>
          </select>
        </div>

        {reportType === "sales" && (
          <div>
            <label>Period:</label>
            <select
              value={period}
              onChange={e => {
                setPeriod(e.target.value);
                if (e.target.value === "custom" && !startDate) {
                  const today = new Date().toISOString().split('T')[0];
                  setStartDate(today);
                  setEndDate(today);
                }
              }}
            >
              <option value="0">Today</option>
              <option value="1">Yesterday / Last 24h</option>
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
              <option value="365">Last Year</option>
              <option value="custom">📅 Custom Range</option>
            </select>
          </div>
        )}

        {reportType === "sales" && period === "custom" && (
          <>
            <div>
              <label>Start Date:</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <label>End Date:</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </>
        )}


        <button onClick={printFullReport} disabled={loading || !reportData} style={{ background: '#f1f5f9', color: '#475569', padding: '10px 20px', fontWeight: 700 }}>
          Print Report
        </button>
      </div>

      {error && <p style={{ color: 'red', marginBottom: 10 }}>{error}</p>}

      {/* ================= REPORTS VIEW ================= */}
      {
        loading ? (
          <p>Loading data...</p>
        ) : !reportData ? (
          <p>Click "Generate" to load report data</p>
        ) : reportType === "sales" ? (
          <>
            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <div className="data-box" style={{ flex: 1, minWidth: '150px' }}>
                <h4>Total Revenue</h4>
                <div className="value">₹{reportData.total_revenue?.toFixed(2) || 0}</div>
              </div>
              <div className="data-box" style={{ flex: 1, minWidth: '150px' }}>
                <h4>Transactions</h4>
                <div className="value">{reportData.total_transactions || 0}</div>
              </div>
              <div className="data-box" style={{ flex: 1, minWidth: '150px' }}>
                <h4>Avg Ticket Size</h4>
                <div className="value">₹{reportData.avg_ticket_size?.toFixed(2) || 0}</div>
              </div>
              <div className="data-box" style={{ flex: 1, minWidth: '150px' }}>
                <h4>Total Discount</h4>
                <div className="value" style={{ color: '#dc2626' }}>₹{reportData.total_discount?.toFixed(2) || 0}</div>
              </div>
            </div>

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
                <h4>🍩 Revenue Mix (by Mode)</h4>
                <div style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Chart
                    type="donut"
                    width={320}
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
              {/* DAILY BREAKDOWN */}
              <div className="table-card" style={{ margin: 0 }}>
                <h4>📅 Daily Sales</h4>
                {reportData.daily_breakdown?.length > 0 ? (
                  <div className="table-responsive">
                    <table>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Revenue (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.daily_breakdown.slice(-10).reverse().map((d, i) => (
                          <tr key={i}>
                            <td>{d.date}</td>
                            <td><span style={{ fontWeight: 700 }}>₹{d.total?.toFixed(2)}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p>No daily data</p>}
              </div>

              {/* BRANCH BREAKDOWN */}
              <div className="table-card" style={{ margin: 0 }}>
                <h4>🏢 Sales by Branch</h4>
                {reportData.branch_breakdown?.length > 0 ? (
                  <div className="table-responsive">
                    <table>
                      <thead>
                        <tr>
                          <th>Branch</th>
                          <th>Sales (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.branch_breakdown.map((b, i) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 600 }}>{b.branch}</td>
                            <td><span style={{ fontWeight: 700 }}>₹{b.total?.toFixed(2)}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p>No branch data</p>}
              </div>

              {/* PAYMENT BREAKDOWN */}
              {reportData.payment_breakdown?.length > 0 && (
                <div className="table-card" style={{ margin: 0 }}>
                  <h4>💳 Payment Mode Summary</h4>
                  <div className="table-responsive">
                    <table>
                      <thead>
                        <tr>
                          <th>Mode</th>
                          <th>Transactions</th>
                          <th>Amount (₹)</th>
                          <th>%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.payment_breakdown.map((p, i) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 600 }}>{p.method}</td>
                            <td>{p.count}</td>
                            <td style={{ fontWeight: 700 }}>₹{p.total.toFixed(2)}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ flex: 1, height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                                  <div style={{ width: p.percentage + '%', height: '100%', background: '#6366f1', borderRadius: '3px' }}></div>
                                </div>
                                <span style={{ fontSize: '12px', fontWeight: 600 }}>{p.percentage}%</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* TOP SELLING PRODUCTS */}
            {reportData.top_products?.length > 0 && (
              <div className="table-card" style={{ marginTop: '20px' }}>
                <h4>🏆 Top Selling Products</h4>
                <div className="table-responsive">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Product</th>
                        <th>Qty Sold</th>
                        <th>Revenue</th>
                        <th>GST%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.top_products.map((p, i) => (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td style={{ fontWeight: 600 }}>{p.product_name}</td>
                          <td>{p.total_quantity}</td>
                          <td style={{ fontWeight: 700 }}>₹{p.total_revenue.toFixed(2)}</td>
                          <td>{p.gst_percent || 0}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* GST SUMMARY */}
            {reportData.gst_summary?.length > 0 && (
              <div className="table-card" style={{ marginTop: '20px' }}>
                <h4>📋 GST Tax Summary</h4>
                <div className="table-responsive">
                  <table>
                    <thead>
                      <tr>
                        <th>GST Slab</th>
                        <th>Taxable (₹)</th>
                        <th>CGST (₹)</th>
                        <th>SGST (₹)</th>
                        <th>Total Tax (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.gst_summary.map((g, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{g.slab}</td>
                          <td>₹{g.taxable.toFixed(2)}</td>
                          <td>₹{g.cgst.toFixed(2)}</td>
                          <td>₹{g.sgst.toFixed(2)}</td>
                          <td style={{ fontWeight: 700 }}>₹{g.total_tax.toFixed(2)}</td>
                        </tr>
                      ))}
                      <tr style={{ borderTop: '2px solid #000', fontWeight: 700, background: '#f8fafc' }}>
                        <td>Total</td>
                        <td>₹{reportData.gst_summary.reduce((s, g) => s + g.taxable, 0).toFixed(2)}</td>
                        <td>₹{reportData.gst_summary.reduce((s, g) => s + g.cgst, 0).toFixed(2)}</td>
                        <td>₹{reportData.gst_summary.reduce((s, g) => s + g.sgst, 0).toFixed(2)}</td>
                        <td>₹{reportData.gst_summary.reduce((s, g) => s + g.total_tax, 0).toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* DETAILED TRANSACTIONS */}
            <div className="table-card" style={{ marginTop: '20px' }}>
              <h4>🧾 Transaction History</h4>
              {reportData.transactions?.length > 0 ? (
                <div className="table-responsive">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Date & Time</th>
                        <th>Branch</th>
                        <th>Amount</th>
                        <th>Payment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.transactions.slice(0, 50).map((t, i) => (
                        <tr key={i}>
                          <td>{t.invoice_number || `#${t.transaction_id}`}</td>
                          <td>{t.transaction_date}</td>
                          <td>
                            <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                              {t.branch_name}
                            </code>
                          </td>
                          <td style={{ fontWeight: 700 }}>₹{t.total_amount.toFixed(2)}</td>
                          <td>
                            <span className={`stock-badge ${t.payment_method === 'cash' ? 'ok' : 'low'}`}>
                              {t.payment_method?.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p>No transactions found</p>}
            </div>
          </>
        ) : (
          /* ================= INVENTORY REPORT ================= */
          <>
            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <div className="data-box" style={{ flex: 1, minWidth: '150px' }}>
                <h4>Total Items</h4>
                <div className="value">{reportData.total_items || 0}</div>
              </div>
              <div className="data-box" style={{ flex: 1, minWidth: '150px' }}>
                <h4>Stock Value</h4>
                <div className="value">₹{reportData.total_stock_value?.toFixed(2) || 0}</div>
              </div>
              <div className="data-box" style={{ flex: 1, minWidth: '150px' }}>
                <h4>Low Stock</h4>
                <div className="value" style={{ color: reportData.low_stock_count > 0 ? '#dc2626' : 'green' }}>
                  {reportData.low_stock_count || 0}
                </div>
              </div>
              <div className="data-box" style={{ flex: 1, minWidth: '150px' }}>
                <h4>Out of Stock</h4>
                <div className="value" style={{ color: reportData.out_of_stock_count > 0 ? '#dc2626' : 'green' }}>
                  {reportData.out_of_stock_count || 0}
                </div>
              </div>
            </div>

            {reportData.low_stock_items?.length > 0 ? (
              <div className="table-responsive">
                <h4 style={{ fontSize: '15px', color: '#0f172a', margin: '20px 0 12px' }}>Low Stock Items</h4>
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Branch ID</th>
                      <th>Quantity</th>
                      <th>Min Threshold</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.low_stock_items.map((item, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{item.product_name}</td>
                        <td>
                          <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                            {item.branch_name || `ID: ${item.branch_id}`}
                          </code>
                        </td>
                        <td>
                          <span className="stock-badge low">
                            {item.quantity}
                          </span>
                        </td>
                        <td>{item.min_threshold}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: '#10b981', fontWeight: 700, marginTop: '20px' }}>✅ All items are above minimum stock levels</p>
            )}

            {/* CATEGORY BREAKDOWN */}
            {reportData.category_breakdown?.length > 0 && (
              <div className="table-responsive" style={{ marginTop: '20px' }}>
                <h4 style={{ fontSize: '15px', color: '#0f172a', margin: '0 0 12px' }}>📦 Category Breakdown</h4>
                <table>
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Items</th>
                      <th>Total Qty</th>
                      <th>Value (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.category_breakdown.map((c, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{c.category}</td>
                        <td>{c.items}</td>
                        <td>{c.total_qty}</td>
                        <td style={{ fontWeight: 700 }}>₹{c.total_value.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )
      }
    </div>
  );
}
