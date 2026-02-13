import { useEffect, useState } from "react";
import api from "../../services/api";
import { getCurrentUser } from "../../services/authService";

export default function StaffDashboardHome() {
  const user = getCurrentUser();
  const branchId = user?.branch_id;

  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({
    totalAmount: 0,
    totalTransactions: 0,
    cash: 0,
    card: 0,
    upi: 0,
    qr: 0
  });

  // Use local date instead of UTC to avoid "yesterday" issues in IST
  const [filterDate, setFilterDate] = useState(() => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now - offset).toISOString().split("T")[0];
  });

  useEffect(() => {
    if (branchId) {
      loadDashboardData();
    }
  }, [branchId, filterDate]); // Reload when date changes

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const dateToFetch = filterDate || new Date().toISOString().split("T")[0];

      const [summaryRes, transRes] = await Promise.all([
        api.sales.getDailySummary(branchId, dateToFetch),
        // Fetch recent history (first page, default 20, maybe increase to 50?)
        api.sales.getByBranch(branchId, { per_page: 50 })
      ]);

      const breakdown = summaryRes.payment_breakdown || {};

      setSummary({
        totalAmount: summaryRes.total_sales || 0,
        totalTransactions: summaryRes.transaction_count || 0,
        cash: breakdown.cash?.total || 0,
        card: breakdown.card?.total || 0,
        upi: breakdown.upi?.total || 0,
        qr: breakdown.qr?.total || 0
      });

      setTransactions(transRes.transactions || []);
    } catch (err) {
      console.error("Failed to load dashboard data", err);
    }
    setLoading(false);
  };

  const avgTransaction = summary.totalTransactions > 0
    ? (summary.totalAmount / summary.totalTransactions).toFixed(2)
    : "0.00";

  // Helper to group transactions by date
  const groupTransactionsByDate = (txns) => {
    const groups = {};
    txns.forEach(t => {
      if (!t.transaction_date) return;
      const dateKey = new Date(t.transaction_date).toLocaleDateString('en-IN', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(t);
    });
    return groups;
  };

  const groupedTransactions = groupTransactionsByDate(transactions);

  return (
    <div>

      {/* Welcome Header with Employee ID */}
      <header className="topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0 }}>👋 Welcome, {user?.firstName || user?.name || 'Staff'}</h2>
          {user?.employee_id && (
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
              Employee ID: <code style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>{user.employee_id}</code>
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="primary-btn" onClick={loadDashboardData} disabled={loading}>
            {loading ? "Refreshing..." : "🔄 Refresh"}
          </button>
        </div>
      </header>

      {/* STATS FILTER SECTION */}
      <div style={{ background: '#fff', padding: '15px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '16px' }}>📊 Stats Overview</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', color: '#64748b' }}>Filter Date:</span>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
          />
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="dashboard-grid">
        <div className="data-box" style={{ borderLeft: '4px solid #22c55e' }}>
          <h4>💰 Total Sales</h4>
          <div className="value">₹{summary.totalAmount.toFixed(2)}</div>
        </div>

        <div className="data-box" style={{ borderLeft: '4px solid #3b82f6' }}>
          <h4>🧾 Transactions</h4>
          <div className="value">{summary.totalTransactions}</div>
        </div>

        <div className="data-box" style={{ borderLeft: '4px solid #a855f7' }}>
          <h4>📊 Avg Sale</h4>
          <div className="value">₹{avgTransaction}</div>
        </div>

        <div className="data-box" style={{ borderLeft: '4px solid #f59e0b' }}>
          <h4>💵 Cash</h4>
          <div className="value">₹{summary.cash.toFixed(2)}</div>
        </div>

        <div className="data-box" style={{ borderLeft: '4px solid #6366f1' }}>
          <h4>📱 UPI</h4>
          <div className="value">₹{summary.upi.toFixed(2)}</div>
        </div>

        <div className="data-box" style={{ borderLeft: '4px solid #ec4899' }}>
          <h4>💳 Card</h4>
          <div className="value">₹{summary.card.toFixed(2)}</div>
        </div>
      </div>

      {/* SALES HISTORY */}
      <div style={{ marginTop: "30px" }}>
        <h3 style={{ marginBottom: '15px' }}>🕒 Sales History</h3>

        {Object.keys(groupedTransactions).length === 0 ? (
          <div className="table-card">
            <p style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>
              {loading ? "Loading history..." : "No recent sales found."}
            </p>
          </div>
        ) : (
          Object.keys(groupedTransactions).map(dateKey => (
            <div key={dateKey} style={{ marginBottom: '25px' }}>
              <div style={{
                background: '#f1f5f9',
                padding: '8px 16px',
                borderRadius: '8px',
                fontWeight: '700',
                color: '#475569',
                marginBottom: '10px',
                fontSize: '13px',
                display: 'inline-block',
                border: '1px solid #e2e8f0'
              }}>
                📅 {dateKey}
              </div>

              <div className="table-card" style={{ marginBottom: '0' }}>
                <div className="table-responsive">
                  <table>
                    <thead>
                      <tr>
                        <th>Invoice</th>
                        <th>Time</th>
                        <th>Payment</th>
                        <th>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedTransactions[dateKey].map((s) => (
                        <tr key={s.transaction_id}>
                          <td>TRNS-{s.transaction_id}</td>
                          <td>{s.transaction_date ? new Date(s.transaction_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</td>
                          <td>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: 600,
                              background: s.payment_method === 'cash' ? '#dcfce7' : (s.payment_method === 'upi' ? '#ede9fe' : '#fce7f3'),
                              color: s.payment_method === 'cash' ? '#166534' : (s.payment_method === 'upi' ? '#5b21b6' : '#9d174d')
                            }}>
                              {s.payment_method?.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600 }}>₹{s.total_amount.toFixed(2)}</td>
                          <td>
                            <span style={{
                              color: s.status === 'completed' ? 'green' : 'red',
                              textTransform: 'capitalize'
                            }}>
                              {s.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
