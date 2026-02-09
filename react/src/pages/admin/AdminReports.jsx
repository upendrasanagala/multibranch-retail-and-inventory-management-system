import { useEffect, useState } from "react";
import api from "../../services/api";

export default function AdminReports() {
  const [reportData, setReportData] = useState([]);
  const [reportType, setReportType] = useState("sales");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchReport();
  }, [reportType]);

  const fetchReport = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.admin.getReports(reportType, {
        start_date: fromDate,
        end_date: toDate
      });
      setReportData(response.data || []);
    } catch (err) {
      console.error("Failed to fetch report:", err);
      setError("Failed to load report data");
    }
    setLoading(false);
  };

  /* ================= FILTER LOGIC ================= */
  const filteredSales = sales.filter(s => {
    if (!fromDate && !toDate) return true;
    if (fromDate && toDate) return s.date >= fromDate && s.date <= toDate;
    if (fromDate) return s.date >= fromDate;
    if (toDate) return s.date <= toDate;
    return true;
  });

  const totalRevenue = filteredSales.reduce((sum, s) => sum + s.amount, 0);
  const totalTransactions = filteredSales.length;

  /* ================= PRINT SINGLE ================= */
  const printSingle = (sale) => {
    const w = window.open("", "_blank");
    w.document.write(`
      <html>
        <head>
          <title>Sales Report</title>
          <style>
            body { font-family: Arial; padding: 20px; }
            h2 { text-align: center; }
            p { margin: 6px 0; }
          </style>
        </head>
        <body>
          <h2>Sales Report</h2>
          <p><strong>Date:</strong> ${sale.date}</p>
          <p><strong>Branch:</strong> ${sale.branch}</p>
          <p><strong>Product:</strong> ${sale.product}</p>
          <p><strong>Amount:</strong> ₹${sale.amount}</p>
        </body>
      </html>
    `);
    w.document.close();
    w.print();
  };

  /* ================= PRINT FULL ================= */
  const printFullReport = () => {
    const w = window.open("", "_blank");
    w.document.write(`
      <html>
        <head>
          <title>System Sales Report</title>
          <style>
            body { font-family: Arial; padding: 20px; }
            h2 { text-align: center; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; }
            th { background: #f3f4f6; }
          </style>
        </head>
        <body>
          <h2>Sales Report</h2>
          <p><strong>From:</strong> ${fromDate || "All"} |
             <strong>To:</strong> ${toDate || "All"}</p>
          <p><strong>Total Revenue:</strong> ₹${totalRevenue}</p>
          <p><strong>Total Transactions:</strong> ${totalTransactions}</p>

          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Branch</th>
                <th>Product</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${filteredSales.map(s => `
                <tr>
                  <td>${s.date}</td>
                  <td>${s.branch}</td>
                  <td>${s.product}</td>
                  <td>₹${s.amount}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </body>
      </html>
    `);
    w.document.close();
    w.print();
  };

  return (
    <div className="chart-card">
      <h3>System Reports</h3>

      {/* ================= DATE FILTER ================= */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", alignItems: 'flex-end' }}>
        <div>
          <label>Report Type:</label>
          <select value={reportType} onChange={e => setReportType(e.target.value)}>
            <option value="sales">Sales Summary</option>
            <option value="inventory">Inventory Summary</option>
          </select>
        </div>

        <div>
          <label>From:</label>
          <input
            type="date"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
          />
        </div>

        <div>
          <label>To:</label>
          <input
            type="date"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
          />
        </div>

        <button onClick={fetchReport} disabled={loading}>
          {loading ? "Loading..." : "Generate"}
        </button>

        <button onClick={printFullReport} disabled={loading || reportData.length === 0}>
          Print Report
        </button>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {/* ================= TABLE ================= */}
      {reportData.length === 0 ? (
        <p>{loading ? "Loading data..." : "No data available for selected period"}</p>
      ) : reportType === 'sales' ? (
        <table>
          <thead>
            <tr>
              <th>Branch</th>
              <th>Transactions</th>
              <th>Revenue (₹)</th>
              <th>Avg Sale (₹)</th>
            </tr>
          </thead>
          <tbody>
            {reportData.map((d, i) => (
              <tr key={i}>
                <td>{d.branch}</td>
                <td>{d.total_transactions}</td>
                <td>₹{d.total_revenue.toFixed(2)}</td>
                <td>₹{d.average_sale.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Branch</th>
              <th>Products</th>
              <th>Total Stock</th>
              <th>Inventory Value (₹)</th>
              <th>Low Stock Items</th>
            </tr>
          </thead>
          <tbody>
            {reportData.map((d, i) => (
              <tr key={i}>
                <td>{d.branch}</td>
                <td>{d.total_products}</td>
                <td>{d.total_stock}</td>
                <td>₹{d.total_value.toFixed(2)}</td>
                <td>{d.low_stock_items}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
