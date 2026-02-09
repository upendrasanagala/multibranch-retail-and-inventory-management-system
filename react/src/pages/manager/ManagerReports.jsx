import { useEffect, useState } from "react";

export default function ManagerReports() {
  const [sales, setSales] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
  const branch = loggedInUser?.branch;

  /* ================= LOAD SALES ================= */
  useEffect(() => {
    const storedSales = JSON.parse(localStorage.getItem("sales")) || [];
    const branchSales = storedSales.filter(s => s.branch === branch);

    setSales(branchSales);
    setFilteredSales(branchSales);
  }, [branch]);

  /* ================= GENERATE REPORT ================= */
  const generateReport = () => {
    if (!fromDate || !toDate) {
      alert("Please select both dates");
      return;
    }

    const result = sales.filter(s =>
      s.date >= fromDate && s.date <= toDate
    );

    setFilteredSales(result);
  };

  /* ================= TOTAL CALCULATION ================= */
  const totalAmount = filteredSales.reduce(
    (sum, s) => sum + s.amount,
    0
  );

  return (
    <div>

      <h2 style={{ marginBottom: "20px" }}>Branch Reports</h2>

      {/* ================= FILTER ================= */}
      <div className="chart-card" style={{ marginBottom: "30px" }}>
        <h3>Generate Report</h3>

        <div style={{ display: "flex", gap: "20px", marginBottom: "15px" }}>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />

          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>

        <button onClick={generateReport}>
          Generate Report
        </button>
      </div>

      {/* ================= REPORT RESULT ================= */}
      <div className="table-card">
        <h3>Report Results</h3>

        {filteredSales.length === 0 ? (
          <p>No records found</p>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Payment</th>
                  <th>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((s, i) => (
                  <tr key={i}>
                    <td>{s.date}</td>
                    <td>{s.product}</td>
                    <td>{s.quantity}</td>
                    <td>{s.paymentMethod}</td>
                    <td>₹{s.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h3 style={{ marginTop: "20px" }}>
              Total Sales: ₹{totalAmount}
            </h3>
          </>
        )}
      </div>

    </div>
  );
}
