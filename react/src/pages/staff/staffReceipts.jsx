import { useEffect, useState, useRef } from "react";
import api from "../../services/api";
import { getCurrentUser } from "../../services/authService";
import { formatDate } from "../../utils/dateUtils";

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

  /* ================= PRINT RECEIPT ================= */
  const printReceipt = (sale) => {
    const win = window.open("", "_blank", "width=400,height=600");

    if (!win) {
      alert("⚠️ Receipt printing was blocked by your browser.\nPlease allow popups for this site.");
      return;
    }

    const transaction_id = sale.transaction_id || "ERR";
    const transaction_date = sale.transaction_date ? new Date(sale.transaction_date) : new Date();
    const total_amount = Number(sale.total_amount || 0);
    const discount = Number(sale.discount || 0);
    const paymentMethod = sale.payment_method;

    // --- 1. Group items by GST Rate ---
    const gstGroups = {};
    const gstBreakup = {};

    (sale.items || []).forEach(item => {
      // Backend now returns gst_percent
      const rate = item.gst_percent || 0;
      if (!gstGroups[rate]) gstGroups[rate] = [];
      gstGroups[rate].push(item);

      if (!gstBreakup[rate]) gstBreakup[rate] = { taxable: 0, cgst: 0, sgst: 0, total: 0 };

      // History items use 'unit_price' and 'quantity'
      const price = Number(item.unit_price || 0);
      const qty = Number(item.quantity || 0);
      const itemTotal = price * qty;

      // Back-calculate taxable
      const taxable = itemTotal / (1 + rate / 100);
      const taxAmt = itemTotal - taxable;

      gstBreakup[rate].taxable += taxable;
      gstBreakup[rate].cgst += taxAmt / 2;
      gstBreakup[rate].sgst += taxAmt / 2;
      gstBreakup[rate].total += itemTotal;
    });

    // Discount breakdown might not be fully available in history if not stored JSON, 
    // but we can show total savings if discount > 0
    const totalSavings = discount;

    win.document.write(`
      <html>
        <head>
          <title>Invoice #${transaction_id}</title>
          <style>
            body { font-family: 'Courier New', monospace; font-size: 11px; padding: 10px; margin: 0; width: 300px; }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            
            .header img { width: 100px; margin-bottom: 5px; } 
            .header h2 { margin: 2px 0; font-size: 16px; }
            .header p { margin: 1px 0; font-size: 10px; }
            
            .meta { margin: 10px 0; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 5px 0; display: flex; justify-content: space-between; flex-wrap: wrap; }
            .meta div { width: 48%; }
            
            table { width: 100%; border-collapse: collapse; margin-bottom: 5px; }
            th { border-bottom: 1px dashed #000; text-align: left; font-size: 10px; padding: 2px 0; }
            td { padding: 2px 0; vertical-align: top; font-size: 10px; }
            
            .group-header { font-weight: bold; text-decoration: underline; margin-top: 5px; font-size: 10px; }
            
            .totals { border-top: 1px dashed #000; padding-top: 5px; margin-top: 5px; }
            .totals p { margin: 2px 0; display: flex; justify-content: space-between; }
            .grand-total { font-size: 14px; font-weight: bold; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 0; margin: 5px 0; }
            
            .gst-table { border-top: 1px dashed #000; margin-top: 10px; }
            .gst-table th { font-size: 9px; text-align: right; }
            .gst-table th:first-child { text-align: left; }
            .gst-table td { font-size: 9px; text-align: right; }
            .gst-table td:first-child { text-align: left; }
            
            .savings { text-align: center; margin: 10px 0; font-weight: bold; font-size: 12px; border: 1px dashed #000; padding: 5px; }
            .footer { text-align: center; margin-top: 15px; font-size: 10px; }
            .barcode { margin: 10px auto; height: 30px; background: #000; width: 80%; display: block; } 
          </style>
        </head>
        <body>
          <div class="header">
            <h2>RETAIL STORE</h2>
            <p>Branch: ${user?.branch_name || 'Main'}</p>
            <p>Phone: +91 98765 43210</p>
            <br/>
            <h3 style="margin:0; text-decoration: underline;">TAX INVOICE</h3>
          </div>

          <div class="meta">
            <div>Bill No: ${transaction_id}</div>
            <div class="right">Date: ${formatDate(transaction_date)}</div>
            <div>Cashier: ${user?.name || 'Staff'}</div>
            <div class="right">Time: ${new Date(transaction_date).toLocaleTimeString()}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 50%">Particulars</th>
                <th class="center" style="width: 15%">Qty</th>
                <th class="right" style="width: 15%">Rate</th>
                <th class="right" style="width: 20%">Value</th>
              </tr>
            </thead>
            <tbody>
              ${Object.keys(gstGroups).map((rate, idx) => `
                <tr>
                  <td colspan="4" class="group-header">
                    ${idx + 1}) CGST @ ${(rate / 2).toFixed(2)}%, SGST @ ${(rate / 2).toFixed(2)}%
                  </td>
                </tr>
                ${gstGroups[rate].map(i => `
                  <tr>
                    <td>
                      ${i.product_name}
                      ${i.is_b1g1 ? '<br/>(B1G1 Free)' : ''}
                      ${(i.size || i.unit) ? `<br/><span style="font-size:9px">${i.size || ''}${i.unit || ''}</span>` : ''}
                    </td>
                    <td class="center">${i.quantity}</td>
                    <td class="right">${Number(i.unit_price).toFixed(2)}</td>
                    <td class="right">${(Number(i.unit_price) * Number(i.quantity)).toFixed(2)}</td>
                  </tr>
                `).join('')}
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            <p><span>Total Items: ${(sale.items || []).length}</span> <span>Total Qty: ${(sale.items || []).reduce((s, i) => s + i.quantity, 0)}</span></p>
            
            <p style="border-top: 1px dotted #000; margin-top: 5px; padding-top: 2px;">
              <span>Gross Amount:</span> <span>₹${(total_amount + discount).toFixed(2)}</span>
            </p>
            
            ${discount > 0 ? `<p><span>Less: Discount:</span> <span>-₹${discount.toFixed(2)}</span></p>` : ''}
            
            <p class="grand-total"><span>Grand Total:</span> <span>₹${total_amount.toFixed(2)}</span></p>
          </div>

          <table class="gst-table">
            <thead>
              <tr>
                <th>GST%</th>
                <th>Taxable</th>
                <th>CGST</th>
                <th>SGST</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${Object.keys(gstBreakup).map(rate => `
                <tr>
                  <td>${rate}%</td>
                  <td>${gstBreakup[rate].taxable.toFixed(2)}</td>
                  <td>${gstBreakup[rate].cgst.toFixed(2)}</td>
                  <td>${gstBreakup[rate].sgst.toFixed(2)}</td>
                  <td>${gstBreakup[rate].total.toFixed(2)}</td>
                </tr>
              `).join('')}
              <tr style="border-top: 1px solid #000; font-weight: bold;">
                <td>Tot</td>
                <td>${Object.values(gstBreakup).reduce((s, g) => s + g.taxable, 0).toFixed(2)}</td>
                <td>${Object.values(gstBreakup).reduce((s, g) => s + g.cgst, 0).toFixed(2)}</td>
                <td>${Object.values(gstBreakup).reduce((s, g) => s + g.sgst, 0).toFixed(2)}</td>
                <td>${Object.values(gstBreakup).reduce((s, g) => s + g.total, 0).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <p style="margin-top: 10px; border-bottom: 1px dashed #000; padding-bottom: 5px;">
            Payment Mode: ${paymentMethod ? paymentMethod.toUpperCase() : 'CASH'}
            <span class="right" style="float:right">₹${total_amount.toFixed(2)}</span>
          </p>

          ${totalSavings > 0 ? `
            <div class="savings">
              * * Saved Rs. ${totalSavings.toFixed(2)} On MRP * *
            </div>
          ` : ''}

          <div class="footer">
            <div class="barcode" style="text-align:center; color:white; line-height:30px;">|||||||||||||||||||</div>
            <p>This is a computer generated invoice</p>
          </div>
        </body>
      </html>
    `);

    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 250);
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
                      <div>{formatDate(r.transaction_date)}</div>
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
