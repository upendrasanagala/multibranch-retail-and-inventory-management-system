import { useEffect, useState } from "react";

export default function ManagerTransactions() {
  const [transactions, setTransactions] = useState([]);

  const loggedInUser =
    JSON.parse(localStorage.getItem("loggedInUser")) || {};

  const branch = loggedInUser.branch || "";

  /* ================= LOAD TRANSACTIONS ================= */
  useEffect(() => {
    const sales =
      JSON.parse(localStorage.getItem("sales")) || [];

    // ✅ only this branch sales
    const branchSales = sales.filter(
      s => s.branch === branch
    );

    // ✅ latest first (safe copy)
    const sorted = [...branchSales].reverse();

    setTransactions(sorted);
  }, [branch]);

  return (
    <div>

      <h2 style={{ marginBottom: "20px" }}>
        Branch Transactions
      </h2>

      {/* ================= SALES TABLE ================= */}
      <div className="table-card">
        <h3>Recent Sales</h3>

        {transactions.length === 0 ? (
          <p>No transactions available</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Product</th>
                <th>Qty</th>
                <th>Amount (₹)</th>
                <th>Payment</th>
              </tr>
            </thead>

            <tbody>
              {transactions.map((t, i) => (
                <tr key={i}>
                  <td>{t.date}</td>
                  <td>{t.product}</td>
                  <td>{t.quantity}</td>
                  <td>₹{Number(t.amount || 0)}</td>
                  <td>{t.paymentMethod}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ================= STAFF ACTIVITY ================= */}
      <div
        className="chart-card"
        style={{ marginTop: "30px" }}
      >
        <h3>Staff Activity Summary</h3>

        {transactions.length === 0 ? (
          <p>No staff activity recorded yet</p>
        ) : (
          <ul style={{ lineHeight: "1.8" }}>
            {transactions.slice(0, 5).map((t, i) => (
              <li key={i}>
                Sale of <strong>{t.product}</strong>{" "}
                (Qty: {t.quantity}) on{" "}
                <strong>{t.date}</strong> via{" "}
                <strong>{t.paymentMethod}</strong>
              </li>
            ))}
          </ul>
        )}
      </div>

    </div>
  );
}
    