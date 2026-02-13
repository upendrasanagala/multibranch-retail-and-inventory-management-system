import { useEffect, useState } from "react";
import api from "../../services/api";
import { formatDate } from "../../utils/dateUtils";

export default function ManagerReports() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filteredSales, setFilteredSales] = useState([]);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
  const branchId = loggedInUser?.branch_id;

  /* ================= LOAD SALES ================= */
  const loadSales = async () => {
    if (!branchId) return;

    setLoading(true);
    try {
      const params = {};
      if (fromDate) params.date_from = fromDate;
      if (toDate) params.date_to = toDate;

      const res = await api.sales.getByBranch(branchId, params);

      // Map API response to component format
      const mappedSales = res.transactions.map(t => ({
        date: formatDate(t.transaction_date),
        // For reports, we might need item details, but the search endpoint gives summary
        // We'll use the summary for now or fetch details if needed
        products: t.items ? t.items.map(i => i.product_name).join(", ") : "View Details",
        quantity: t.items ? t.items.reduce((sum, i) => sum + i.quantity, 0) : 0,
        paymentMethod: t.payment_method,
        amount: t.total_amount
      }));

      setSales(mappedSales);
      setFilteredSales(mappedSales);
    } catch (err) {
      console.error("Failed to load sales", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    // Initial load (optional, or wait for generate)
    loadSales();
  }, [branchId]);

  /* ================= GENERATE REPORT ================= */
  const generateReport = () => {
    if (!fromDate || !toDate) {
      alert("Please select both dates");
      return;
    }
    loadSales();
  };

  /* ================= TOTAL CALCULATION ================= */
  const totalAmount = filteredSales.reduce(
    (sum, s) => sum + Number(s.amount),
    0
  );

  return (
    <div>

      <h2 style={{ marginBottom: "20px" }}>Branch Reports</h2>

      {/* ================= FILTER ================= */}
      <div className="chart-card" style={{ marginBottom: "30px" }}>
        <h3>Generate Report</h3>

        <div style={{ display: "flex", gap: "20px", marginBottom: "15px" }}>
          <div className="input-group">
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px' }}>From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px' }}>To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
        </div>

        <button className="primary-btn" onClick={generateReport} disabled={loading}>
          {loading ? "Generating..." : "Generate Report"}
        </button>
      </div>

      {/* ================= REPORT RESULT ================= */}
      <div className="table-card" id="printable-area">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3>Report Results</h3>
          {filteredSales.length > 0 && (
            <button
              onClick={() => window.print()}
              style={{
                background: '#475569',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              Print Report
            </button>
          )}
        </div>

        {filteredSales.length === 0 ? (
          <p style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
            {loading ? "Loading..." : "No records found for the selected period"}
          </p>
        ) : (
          <>
            <div className="print-header" style={{ display: 'none', marginBottom: '20px', textAlign: 'center' }}>
              <h2>Sales Report</h2>
              <p>Branch: {JSON.parse(localStorage.getItem("loggedInUser"))?.branch_name || "N/A"}</p>
              <p>Period: {formatDate(fromDate)} to {formatDate(toDate)}</p>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Products</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Qty</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Payment</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((s, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px' }}>{s.date}</td>
                    <td style={{ padding: '10px' }}>{s.products}</td>
                    <td style={{ padding: '10px' }}>{s.quantity}</td>
                    <td style={{ padding: '10px' }}>{s.paymentMethod}</td>
                    <td style={{ padding: '10px' }}>₹{s.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h3 style={{ marginTop: "20px", textAlign: 'right', paddingRight: '20px' }}>
              Total Sales: ₹{totalAmount.toLocaleString()}
            </h3>
          </>
        )}
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-area, #printable-area * {
            visibility: visible;
          }
          #printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          button {
            display: none !important;
          }
          .print-header {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}
