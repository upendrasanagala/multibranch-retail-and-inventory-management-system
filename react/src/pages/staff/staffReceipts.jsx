import { useEffect, useState, useRef } from "react";
import api from "../../services/api";
import { getCurrentUser } from "../../services/authService";

export default function StaffReceipts() {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterDate, setFilterDate] = useState("");
  const [summary, setSummary] = useState({ count: 0, total: 0 });

  const user = getCurrentUser();
  const branchId = user?.branch_id;

  useEffect(() => {
    if (branchId) {
      loadReceipts();
    }
  }, [branchId, filterDate]);

  const loadReceipts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterDate) params.date = filterDate;

      // Fetch transactions and daily summary in parallel
      const [salesRes, summaryRes] = await Promise.all([
        api.sales.getByBranch(branchId, params),
        api.sales.getDailySummary(branchId, filterDate || new Date().toISOString().split('T')[0])
      ]);

      setReceipts(salesRes.transactions || []);

      // Update summary based on the fetched data regarding the filter
      if (filterDate) {
        // If filtered by date, use the summary from the transaction list or calc locally
        setSummary({
          count: salesRes.transactions?.length || 0,
          total: salesRes.transactions?.reduce((sum, t) => sum + t.total_amount, 0) || 0
        });
      } else {
        // If no filter, show today's summary or total? 
        // unexpected behavior might occur if getDailySummary returns only today's data while getByBranch returns all.
        // Let's stick to showing the summary of the VIEWED data.
        setSummary({
          count: salesRes.transactions?.length || 0,
          total: salesRes.transactions?.reduce((sum, t) => sum + t.total_amount, 0) || 0
        });
      }

    } catch (err) {
      console.error("Failed to load receipts", err);
    }
    setLoading(false);
  };

  const printReceipt = (sale) => {
    const win = window.open("", "_blank", "width=400,height=600");

    // Calculate GST if not explicitly provided
    const total = Number(sale.total_amount || 0);
    const subtotal = Number(sale.subtotal || (total / 1.05)) || 0;
    const gst = Number(sale.tax || (total - subtotal)) || 0;
    const discount = Number(sale.discount || 0);

    win.document.write(`
      <html>
        <head>
          <title>Receipt #${sale.transaction_id}</title>
          <style>
            body { font-family: 'Courier New', monospace; padding: 20px; text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
            td, th { padding: 4px 0; text-align: left; }
            .right { text-align: right; }
            .center { text-align: center; }
            .border-bottom { border-bottom: 1px dashed #000; }
            .border-top { border-top: 1px dashed #000; }
            .total-row { font-weight: bold; font-size: 14px; border-top: 1px solid #000; margin-top: 5px; padding-top: 5px; }
            h3, p { margin: 2px 0; }
          </style>
        </head>
        <body>
          <div style="margin-bottom: 10px;">
            <h3>RETAIL STORE</h3>
            <p>Branch: ${user?.branch_name || 'Main'}</p>
            <p>${new Date(sale.transaction_date).toLocaleString()}</p>
            <p>Receipt: #${sale.transaction_id}</p>
          </div>
          
          <table class="border-bottom">
            <thead>
              <tr class="border-bottom">
                <th>Item</th>
                <th class="center">Qty</th>
                <th class="right">Rate</th>
                <th class="right">Amt</th>
              </tr>
            </thead>
            <tbody>
              ${sale.items?.map(i => `
                <tr>
                  <td>${i.product_name}</td>
                  <td class="center">${i.quantity}</td>
                  <td class="right">${Number(i.unit_price).toFixed(2)}</td>
                  <td class="right">${(Number(i.unit_price) * Number(i.quantity)).toFixed(2)}</td>
                </tr>
              `).join('') || ''}
            </tbody>
          </table>
          
            <div style="border-top: 1px dashed #000; margin-top: 5px; padding-top: 5px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <tr>
                  <td colspan="3">Taxable:</td>
                  <td class="right">₹${subtotal.toFixed(2)}</td>
                </tr>
                <tr>
                  <td colspan="3">CGST (2.5%):</td>
                  <td class="right">₹${(gst / 2).toFixed(2)}</td>
                </tr>
                <tr>
                  <td colspan="3">SGST (2.5%):</td>
                  <td class="right">₹${(gst / 2).toFixed(2)}</td>
                </tr>
                ${discount > 0 ? `
                <tr>
                  <td colspan="3">Discount:</td>
                  <td class="right">-₹${discount.toFixed(2)}</td>
                </tr>` : ''}
                <tr>
                  <td colspan="3" class="total-row">Grand Total:</td>
                  <td class="right total-row">₹${total.toFixed(2)}</td>
                </tr>
              </table>
            </div>
          
          <div style="margin-top: 15px; font-size: 10px;">
            <p>Payment: ${sale.payment_method?.toUpperCase()}</p>
            <p>*** Thank You! Visit Again ***</p>
          </div>
        </body>
      </html>
    `);
    win.document.close();
    win.print();
  };

  return (
    <div style={{ padding: '0 20px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>🧾 Sales Receipts</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          />
          <button className="primary-btn" onClick={loadReceipts} disabled={loading}>
            {loading ? "Refreshing..." : "🔄 Refresh"}
          </button>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="dashboard-grid" style={{ marginBottom: '25px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="data-box" style={{ borderLeft: '4px solid #10b981' }}>
          <h4>💰 Period Revenue</h4>
          <div className="value">₹{summary.total.toFixed(2)}</div>
        </div>
        <div className="data-box" style={{ borderLeft: '4px solid #3b82f6' }}>
          <h4>🧾 Transactions</h4>
          <div className="value">{summary.count}</div>
        </div>
      </div>

      <div className="table-card">
        {receipts.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            <i className="fas fa-receipt" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}></i>
            <p>No receipts found for this period.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Date & Time</th>
                  <th>Payment</th>
                  <th>Items</th>
                  <th>Amount</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map(r => (
                  <tr key={r.transaction_id}>
                    <td><span style={{ fontWeight: 600 }}>#{r.transaction_id}</span></td>
                    <td>
                      <div>{new Date(r.transaction_date).toLocaleDateString()}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{new Date(r.transaction_date).toLocaleTimeString()}</div>
                    </td>
                    <td>
                      <span className={`stock-badge ${r.payment_method === 'cash' ? 'ok' : 'low'}`}
                        style={{ textTransform: 'uppercase', fontSize: '11px' }}>
                        {r.payment_method}
                      </span>
                    </td>
                    <td>{r.items?.length || 0} items</td>
                    <td style={{ fontWeight: 700 }}>₹{r.total_amount.toFixed(2)}</td>
                    <td>
                      <button
                        className="secondary-btn"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => printReceipt(r)}
                      >
                        <i className="fas fa-print"></i> Print
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
