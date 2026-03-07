import { useEffect, useState } from "react";
import { formatDate } from "../../utils/dateUtils";
import api from "../../services/api";
import { getCurrentUser } from "../../services/authService";
import DashboardFAQ from "../../components/DashboardFAQ";

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
      const dateKey = formatDate(t.transaction_date);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(t);
    });
    return groups;
  };

  const groupedTransactions = groupTransactionsByDate(transactions);

  /* ================= PRINT HANDOVER REPORT ================= */
  const printHandoverReport = () => {
    const win = window.open("", "_blank", "width=800,height=600");
    if (!win) return;

    const now = new Date();
    const dateStr = formatDate(filterDate || now);

    const styles = `
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
        .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { margin: 0; color: #0f172a; font-size: 24px; text-transform: uppercase; }
        .header p { margin: 5px 0; color: #64748b; font-size: 14px; }
        .section { margin-bottom: 30px; }
        .section-title { font-size: 14px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #f1f5f9; padding-bottom: 5px; margin-bottom: 15px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .stat-card { background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; }
        .stat-card span { display: block; font-size: 12px; color: #64748b; margin-bottom: 5px; }
        .stat-card b { font-size: 22px; color: #0f172a; }
        .payment-table { width: 100%; border-collapse: collapse; }
        .payment-table td { padding: 12px 0; border-bottom: 1px solid #f1f5f9; }
        .payment-table td:last-child { text-align: right; font-weight: 700; color: #0f172a; }
        .footer { margin-top: 50px; padding-top: 20px; border-top: 1px dashed #cbd5e1; text-align: center; font-size: 12px; color: #94a3b8; }
        .signature-area { margin-top: 60px; display: flex; justify-content: space-between; }
        .sig-box { border-top: 1px solid #1e293b; width: 200px; text-align: center; padding-top: 8px; font-size: 13px; font-weight: 600; }
        @media print { body { padding: 20px; } }
      </style>
    `;

    const content = `
      <div class="header">
        <h1>Daily Sales Handover Report</h1>
        <p><b>Branch:</b> ${user?.branch_name || 'Main'}</p>
        <p><b>Staff Name:</b> ${user?.firstName || user?.name || 'Staff'}</p>
        <p><b>Employee ID:</b> ${user?.employee_id || 'N/A'}</p>
        <p><b>Reporting Date:</b> ${dateStr}</p>
      </div>

      <div class="section">
        <div class="section-title">Summary Overview</div>
        <div class="grid">
          <div class="stat-card">
            <span>Total Revenue Recognized</span>
            <b>₹${summary.totalAmount.toFixed(2)}</b>
          </div>
          <div class="stat-card">
            <span>Volume of Transactions</span>
            <b>${summary.totalTransactions}</b>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Collection Breakdown</div>
        <table class="payment-table">
          <tr><td>💵 Cash Collection (Tendered)</td><td>₹${summary.cash.toFixed(2)}</td></tr>
          <tr><td>📱 UPI / QR Payments</td><td>₹${(summary.upi + summary.qr).toFixed(2)}</td></tr>
          <tr><td>💳 Card Settlements</td><td>₹${summary.card.toFixed(2)}</td></tr>
          <tr style="border-top: 2px solid #e2e8f0; font-size: 18px;">
            <td style="padding-top: 20px;">TOTAL HANDOVER AMOUNT</td>
            <td style="padding-top: 20px;">₹${summary.totalAmount.toFixed(2)}</td>
          </tr>
        </table>
      </div>

      <div class="signature-area">
        <div class="sig-box">Staff Signature</div>
        <div class="sig-box">Manager/Receiver Signature</div>
      </div>

      <div class="footer">
        Generated on ${now.toLocaleString()} | Computer Generated Document
      </div>
    `;

    win.document.write(`<html><head><title>Handover_Report_${dateStr}</title>${styles}</head><body>${content}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 500);
  };

  return (
    <div>

      {/* Welcome Header with Employee ID */}
      <header className="topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0 }}>👋 Welcome, {user?.firstName || user?.name || 'Staff'}</h2>
          <div style={{ display: 'flex', gap: '15px', marginTop: '8px' }}>
            {user?.employee_id && (
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                Employee ID: <code style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>{user.employee_id}</code>
              </p>
            )}
            <p style={{ margin: 0, fontSize: '13px', color: '#059669', fontWeight: 700 }}>
              🚀 Today's Sale #{summary.totalTransactions}
            </p>
          </div>
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
      <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '25px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0 }}>📋 My Daily Handover Summary</h3>
          <button
            className="secondary-btn"
            style={{ padding: '8px 15px', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={printHandoverReport}
          >
            <i className="fas fa-print"></i> Print Handover Report
          </button>
        </div>
        <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
          <div style={{ background: '#fff', padding: '15px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: '4px solid #22c55e' }}>
            <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Total Sales</span>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#1e293b' }}>₹{summary.totalAmount.toFixed(2)}</div>
          </div>
          <div style={{ background: '#fff', padding: '15px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: '4px solid #3b82f6' }}>
            <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Transactions</span>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#1e293b' }}>{summary.totalTransactions}</div>
          </div>
          <div style={{ background: '#fff', padding: '15px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: '4px solid #f59e0b' }}>
            <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Cash in Hand</span>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#1e293b' }}>₹{summary.cash.toFixed(2)}</div>
          </div>
          <div style={{ background: '#fff', padding: '15px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: '4px solid #8b5cf6' }}>
            <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Online/Card</span>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#1e293b' }}>₹{(summary.upi + summary.card + summary.qr).toFixed(2)}</div>
          </div>
        </div>
        <p style={{ marginTop: '15px', fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
          * This summary is restricted to sales made by you today for handover to management.
        </p>
      </div>

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

        <div className="data-box" style={{ borderLeft: '4px solid #14b8a6' }}>
          <h4>📷 QR Scan</h4>
          <div className="value">₹{summary.qr.toFixed(2)}</div>
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
                          <td>
                            <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                              {s.invoice_number || `TRNS-${s.transaction_id}`}
                            </code>
                          </td>
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

      <DashboardFAQ faqs={[
        {
          question: "How do I process a sale?",
          answer: "Navigate to the 'POS' section in the sidebar, scan or search for products to add them to the cart, then select a payment method and click 'Checkout'."
        },
        {
          question: "How do I print a receipt for a past sale?",
          answer: "Go to the 'Receipts' section, locate the transaction in the history list, and click the 'Print' icon to generate the receipt."
        },
        {
          question: "How do I check if an item is in stock?",
          answer: "Use the 'Inventory' tab to search for products. The list shows real-time availability for your specific branch."
        },
        {
          question: "How do I update my profile?",
          answer: "Click on the 'Profile' tab in the sidebar to view your employee information and update your system credentials."
        },
        {
          question: "How do I search for a customer in POS?",
          answer: "In the POS screen, use the customer search bar to find existing customers by mobile number or name before processing the bill."
        },
        {
          question: "What if I make a mistake on an invoice?",
          answer: "If an invoice is finalized with errors, please contact your Branch Manager to void or edit the transaction in the system."
        },
        {
          question: "Can I see my total sales for today?",
          answer: "Yes, the 'Welcome' header on this home page displays your current sales count, and the 'Total Sales' card shows the total revenue processed for the selected date."
        },
        {
          question: "How do I add items without a scanner?",
          answer: "You can click on the 'Search Products' field in the POS and type the product name or SKU to manually add items to the cart."
        }
      ]} />
    </div>
  );
}
