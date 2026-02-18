import { useEffect, useState } from "react";
import api from "../../services/api";

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
    if (reportType === "sales") {
      w.document.write(`
        <html>
          <head>
            <title>Sales Report</title>
            <style>
              body { font-family: Arial; padding: 20px; }
              h2 { text-align: center; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background: #f3f4f6; }
              .summary { margin: 10px 0; }
            </style>
          </head>
          <body>
            <h2>Sales Report ${period === 'custom' ? `(${startDate} to ${endDate})` : `(Last ${reportData.period_days} Days)`}</h2>
            ${selectedBranch ? `<p><strong>Branch:</strong> ${branches.find(b => b.branch_id == selectedBranch)?.name || 'Unknown'}</p>` : ''}
            <p class="summary"><strong>Total Revenue:</strong> ₹${reportData.total_revenue?.toFixed(2) || 0}</p>
            <p class="summary"><strong>Total Transactions:</strong> ${reportData.total_transactions || 0}</p>
            <p class="summary"><strong>Average Per Day:</strong> ₹${reportData.average_per_day?.toFixed(2) || 0}</p>

            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Transactions</th>
                  <th>Revenue (₹)</th>
                </tr>
              </thead>
              <tbody>
                ${(reportData.daily_breakdown || []).map(d => `
                  <tr>
                    <td>${d.date}</td>
                    <td>${d.count}</td>
                    <td>₹${d.total?.toFixed(2)}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>

            ${reportData.branch_breakdown?.length > 0 ? `
              <h3>Sales by Branch</h3>
              <table>
                <thead>
                  <tr>
                    <th>Branch</th>
                    <th>Transactions</th>
                    <th>Sales (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  ${reportData.branch_breakdown.map(b => `
                    <tr>
                      <td>${b.branch}</td>
                      <td>${b.count || 0}</td>
                      <td>₹${b.total?.toFixed(2)}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            ` : ''}
          </body>
        </html>
      `);
    } else {
      w.document.write(`
        <html>
          <head>
            <title>Inventory Report</title>
            <style>
              body { font-family: Arial; padding: 20px; }
              h2 { text-align: center; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background: #f3f4f6; }
              .summary { margin: 10px 0; }
            </style>
          </head>
          <body>
            <h2>Inventory Report</h2>
            <p class="summary"><strong>Total Items:</strong> ${reportData.total_items || 0}</p>
            <p class="summary"><strong>Total Stock Value:</strong> ₹${reportData.total_stock_value?.toFixed(2) || 0}</p>
            <p class="summary"><strong>Low Stock Items:</strong> ${reportData.low_stock_count || 0}</p>

            ${reportData.low_stock_items?.length > 0 ? `
              <h3>Low Stock Items</h3>
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
                  ${reportData.low_stock_items.map(item => `
                    <tr>
                      <td>${item.product_name}</td>
                      <td>${item.branch_id}</td>
                      <td>${item.quantity}</td>
                      <td>${item.min_threshold}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            ` : "<p>No low stock items</p>"}
          </body>
        </html>
      `);
    }
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
                <h4>Avg/Day</h4>
                <div className="value">₹{reportData.average_per_day?.toFixed(2) || 0}</div>
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
            </div>

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
          </>
        )
      }
    </div >
  );
}
