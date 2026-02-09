import { useEffect, useState } from "react";

export default function ManagerDashboardHome() {
  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
  const branch = loggedInUser?.branch;

  const [inventory, setInventory] = useState([]);
  const [sales, setSales] = useState([]);

  /* ================= LOAD DATA ================= */
  useEffect(() => {
    const products = JSON.parse(localStorage.getItem("products")) || [];
    const allSales = JSON.parse(localStorage.getItem("sales")) || [];

    setInventory(products);
    setSales(allSales.filter(s => s.branch === branch));
  }, [branch]);

  /* ================= CALCULATIONS ================= */
  const totalSalesAmount = sales.reduce((sum, s) => sum + s.amount, 0);
  const totalTransactions = sales.length;

  const lowStockItems = inventory.filter(p => p.stock <= 5);
  const recentSales = sales.slice(-5).reverse();

  /* Staff activity (group by staff email if present) */
  const staffActivity = {};
  sales.forEach(s => {
    if (!staffActivity[s.staff]) staffActivity[s.staff] = 0;
    staffActivity[s.staff] += s.amount;
  });

  return (
    <div>

      {/* ================= OVERVIEW CARDS ================= */}
      <div className="dashboard-grid">

        <div className="data-box">
          <h4>Total Branch Sales</h4>
          <div className="value">₹{totalSalesAmount}</div>
        </div>

        <div className="data-box">
          <h4>Total Transactions</h4>
          <div className="value">{totalTransactions}</div>
        </div>

        <div className="data-box">
          <h4>Low Stock Items</h4>
          <div className="value">{lowStockItems.length}</div>
        </div>

        <div className="data-box">
          <h4>Active Products</h4>
          <div className="value">{inventory.length}</div>
        </div>

      </div>

      {/* ================= INVENTORY ALERTS ================= */}
      <div className="table-card" style={{ marginTop: "30px" }}>
        <h3>Low Stock Alerts</h3>

        {lowStockItems.length === 0 ? (
          <p>No low stock alerts</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Stock</th>
              </tr>
            </thead>
            <tbody>
              {lowStockItems.map(item => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td style={{ color: "red", fontWeight: 600 }}>
                    {item.stock}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ================= RECENT TRANSACTIONS ================= */}
      <div className="table-card" style={{ marginTop: "30px" }}>
        <h3>Recent Transactions</h3>

        {recentSales.length === 0 ? (
          <p>No transactions yet</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Product</th>
                <th>Qty</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {recentSales.map((s, i) => (
                <tr key={i}>
                  <td>{s.date}</td>
                  <td>{s.product}</td>
                  <td>{s.quantity}</td>
                  <td>₹{s.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ================= STAFF ACTIVITY ================= */}
      <div className="table-card" style={{ marginTop: "30px" }}>
        <h3>Staff Activity</h3>

        {Object.keys(staffActivity).length === 0 ? (
          <p>No staff activity recorded</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Staff</th>
                <th>Total Sales (₹)</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(staffActivity).map(([staff, amount]) => (
                <tr key={staff}>
                  <td>{staff || "Unknown"}</td>
                  <td>₹{amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
