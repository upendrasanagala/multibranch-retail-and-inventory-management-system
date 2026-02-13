import { useEffect, useState } from "react";
import api from "../../services/api";
import { formatDate } from "../../utils/dateUtils";

export default function ManagerTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || {};
  const branchId = loggedInUser.branch_id;

  /* ================= LOAD TRANSACTIONS ================= */
  useEffect(() => {
    const loadTransactions = async () => {
      if (!branchId) return;

      setLoading(true);
      try {
        const res = await api.sales.getByBranch(branchId);

        const mapped = res.transactions.map(t => ({
          date: formatDate(t.transaction_date),
          product: t.items ? t.items.map(i => i.product_name).join(", ") : "Item Details",
          quantity: t.items ? t.items.reduce((sum, i) => sum + i.quantity, 0) : 0,
          amount: t.total_amount,
          paymentMethod: t.payment_method
        }));

        setTransactions(mapped);
      } catch (err) {
        console.error("Failed to load transactions", err);
      }
      setLoading(false);
    };

    loadTransactions();
  }, [branchId]);

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
