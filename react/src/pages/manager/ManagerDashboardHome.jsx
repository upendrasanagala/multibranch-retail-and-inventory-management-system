import { useEffect, useState } from "react";
import api from "../../services/api";

export default function ManagerDashboardHome() {
  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
  const branchId = loggedInUser?.branch_id;
  const branchName = loggedInUser?.branch_name || loggedInUser?.branch || "My Branch";

  const [inventory, setInventory] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [reportData, setReportData] = useState(null);
  const [stats, setStats] = useState({ totalSales: 0, transactionCount: 0 });

  /* ================= LOAD DATA FROM BACKEND ================= */
  useEffect(() => {
    loadDashboardData();
  }, [branchId]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError("");
    try {
      const results = await Promise.allSettled([
        branchId ? api.inventory.getByBranch(branchId) : api.inventory.getAll(),
        branchId ? api.inventory.getLowStock(branchId) : api.inventory.getLowStock(),
        // Fetch recent sales (paginated)
        api.sales.getAll(branchId ? { branch_id: branchId, per_page: 5 } : { per_page: 5 }),
        // Fetch total summary
        api.sales.getSummary(branchId ? { branch_id: branchId } : {}),
        // Fetch Daily Sales Report
        api.admin.getReports('sales', { branch_id: branchId, period: 30 })
      ]);

      // Inventory
      if (results[0].status === "fulfilled") {
        const invData = results[0].value;
        setInventory(invData.inventory || []);
      }

      // Low stock
      if (results[1].status === "fulfilled") {
        const lowData = results[1].value;
        setLowStockItems(lowData.low_stock_items || []);
      }

      // Recent Sales
      if (results[2].status === "fulfilled") {
        const salesData = results[2].value;
        setSales(salesData.transactions || salesData.sales || []);
      }

      // Sales Summary (Totals)
      if (results[3].status === "fulfilled") {
        const summaryData = results[3].value;
        setStats({
          totalSales: summaryData.total_sales || 0,
          transactionCount: summaryData.transaction_count || 0
        });
      }

      // Daily Sales Report
      if (results[4].status === "fulfilled") {
        setReportData(results[4].value);
      }

      // Check for any errors
      const errors = results.filter(r => r.status === "rejected");
      if (errors.length > 0) {
        console.error("Some dashboard data failed to load:", errors);
      }
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
      setError("Failed to load dashboard data");
    }
    setLoading(false);
  };

  /* ================= CALCULATIONS ================= */
  // Use stats from state instead of calculating from recent sales
  const totalSalesAmount = stats.totalSales;
  const totalTransactions = stats.transactionCount;
  const recentSales = sales; // sales now only contains recent ones

  return (
    <div>
      <header className="topbar">
        <h1>{branchName} — Dashboard</h1>
        {loading && <span style={{ marginLeft: '10px', color: '#666' }}>Loading...</span>}
      </header>

      {error && <p style={{ color: 'red', padding: '10px' }}>{error}</p>}

      {/* ================= OVERVIEW CARDS ================= */}
      <div className="dashboard-grid">

        <div className="data-box">
          <h4>Total Branch Sales</h4>
          <div className="value">₹{totalSalesAmount.toFixed(2)}</div>
        </div>

        <div className="data-box">
          <h4>Total Transactions</h4>
          <div className="value">{totalTransactions}</div>
        </div>

        <div className="data-box">
          <h4>Low Stock Items</h4>
          <div className="value" style={{ color: lowStockItems.length > 0 ? '#dc2626' : 'green' }}>
            {lowStockItems.length}
          </div>
        </div>

        <div className="data-box">
          <h4>Products in Stock</h4>
          <div className="value">{inventory.length}</div>
        </div>

      </div>

      {/* ================= DAILY SALES TABLE ================= */}
      {reportData && reportData.daily_breakdown && (
        <div className="table-card" style={{ marginTop: "30px" }}>
          <h3>Day-to-Day Sales</h3>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Transactions</th>
                <th>Total Sales</th>
              </tr>
            </thead>
            <tbody>
              {reportData.daily_breakdown.map((d, i) => (
                <tr key={i}>
                  <td>{d.date}</td>
                  <td>{d.count}</td>
                  <td>₹{d.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ================= INVENTORY ALERTS ================= */}

      {/* ================= INVENTORY ALERTS ================= */}
      <div className="table-card" style={{ marginTop: "30px" }}>
        <h3>⚠️ Low Stock Alerts</h3>

        {lowStockItems.length === 0 ? (
          <p style={{ color: 'green' }}>✅ All items are above minimum stock levels</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Current Stock</th>
                <th>Min Threshold</th>
              </tr>
            </thead>
            <tbody>
              {lowStockItems.map((item, i) => (
                <tr key={item.inventory_id || i}>
                  <td>{item.product_name || item.name}</td>
                  <td>{item.sku || 'N/A'}</td>
                  <td style={{ color: "red", fontWeight: 600 }}>
                    {item.quantity || item.stock || 0}
                  </td>
                  <td>{item.min_threshold || 10}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ================= RECENT TRANSACTIONS REMOVED AS REQUESTED ================= */}

      {/* ================= BRANCH INVENTORY REMOVED AS REQUESTED ================= */}

    </div>
  );
}
