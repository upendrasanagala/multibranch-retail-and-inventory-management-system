import { useEffect, useState } from "react";

export default function StaffDashboardHome() {
  const [todaySales, setTodaySales] = useState([]);
  const [summary, setSummary] = useState({
    totalAmount: 0,
    totalTransactions: 0,
    cash: 0,
    card: 0,
    upi: 0
  });

  useEffect(() => {
    const allSales = JSON.parse(localStorage.getItem("sales")) || [];
    const today = new Date().toISOString().split("T")[0];

    const filtered = allSales.filter(s => s.date === today);

    let total = 0;
    let cash = 0, card = 0, upi = 0;

    filtered.forEach(s => {
      total += s.amount;
      if (s.paymentMethod === "cash") cash += s.amount;
      if (s.paymentMethod === "card") card += s.amount;
      if (s.paymentMethod === "upi") upi += s.amount;
    });

    setTodaySales(filtered);
    setSummary({
      totalAmount: total,
      totalTransactions: filtered.length,
      cash,
      card,
      upi
    });
  }, []);

  return (
    <div>

      <h2>Today’s Sales Summary</h2>

      {/* SUMMARY CARDS */}
      <div className="dashboard-grid">
        <div className="data-box">
          <h4>Total Sales</h4>
          <div className="value">₹{summary.totalAmount}</div>
        </div>

        <div className="data-box">
          <h4>Transactions</h4>
          <div className="value">{summary.totalTransactions}</div>
        </div>

        <div className="data-box">
          <h4>Cash</h4>
          <div className="value">₹{summary.cash}</div>
        </div>

        <div className="data-box">
          <h4>Card / UPI</h4>
          <div className="value">₹{summary.card + summary.upi}</div>
        </div>
      </div>

      {/* SALES LIST */}
      <div className="table-card" style={{ marginTop: "30px" }}>
        <h3>Recent Transactions</h3>

        {todaySales.length === 0 ? (
          <p>No sales today</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Qty</th>
                <th>Payment</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {todaySales.map((s, i) => (
                <tr key={i}>
                  <td>{s.product}</td>
                  <td>{s.quantity}</td>
                  <td>{s.paymentMethod}</td>
                  <td>₹{s.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
