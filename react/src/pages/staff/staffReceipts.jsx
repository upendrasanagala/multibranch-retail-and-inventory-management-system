import { useEffect, useState } from "react";
import api from "../../services/api";
import { getCurrentUser } from "../../services/authService";
import { formatDate } from "../../utils/dateUtils";
import { useToast } from "../../components/ToastContext";

export default function StaffReceipts() {
  const { showToast } = useToast();
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchMobile, setSearchMobile] = useState("");
  const [summary, setSummary] = useState({ count: 0, total: 0 });

  const user = getCurrentUser();
  const branchId = user?.branch_id;
  const canSearchMobile = ["admin", "manager"].includes(user?.role);

  useEffect(() => {
    if (branchId) {
      loadReceipts();
    }
  }, [branchId, startDate, endDate]);

  const loadReceipts = async () => {
    if (searchMobile && !/^[6-9]\d{9}$/.test(searchMobile)) {
      showToast("Invalid mobile identifier format.", "error");
      return;
    }
    setLoading(true);
    try {
      const params = {
        date_from: startDate,
        date_to: endDate,
        ...(searchMobile && { customer_mobile: searchMobile })
      };
      const salesRes = await api.sales.getByBranch(branchId, params);
      setReceipts(salesRes.transactions || []);
      setSummary({
        count: salesRes.transactions?.length || 0,
        total: salesRes.transactions?.reduce((sum, t) => sum + t.total_amount, 0) || 0
      });
    } catch (err) {
      console.error("Failed to load receipts", err);
    }
    setLoading(false);
  };

  const printAllSales = () => {
    if (!receipts.length) return;
    const win = window.open("", "_blank");
    const now = new Date();

    const styles = `<style>
      body { font-family: 'Inter', sans-serif; padding: 40px; color: #0f172a; line-height: 1.5; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1e293b; padding-bottom: 20px; margin-bottom: 30px; }
      .header h1 { margin: 0; font-size: 22px; font-weight: 900; letter-spacing: -0.5px; }
      .summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 40px; }
      .card { background: #fff; border: 1.5px solid #e2e8f0; padding: 20px; border-radius: 16px; }
      .card h4 { margin: 0; font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: 800; letter-spacing: 1px; }
      .card .val { margin-top: 8px; font-size: 24px; font-weight: 900; }
      table { width: 100%; border-collapse: separate; border-spacing: 0; }
      th { background: #f8fafc; padding: 12px 16px; text-align: left; font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #e2e8f0; }
      td { padding: 12px 16px; font-size: 12px; border-bottom: 1px solid #f1f5f9; font-weight: 600; vertical-align: top; }
      .total-row { border-top: 2px solid #e2e8f0; font-size: 16px; font-weight: 900; }
    </style>`;

    const content = `
      <div class="header">
        <div>
          <h1>SALES REPORT</h1>
          <p style="margin:5px 0 0; font-size:12px; font-weight:700; color:#64748b;">Branch: ${user?.branch_name} | Period: ${formatDate(new Date(startDate))} - ${formatDate(new Date(endDate))}</p>
        </div>
        <div style="text-align:right;">
          <div style="padding:4px 12px; background:#f1f5f9; border-radius:100px; font-size:10px; font-weight:800; color:#475569;">OFFICIAL LOG</div>
          <p style="margin:10px 0 0; font-size:11px; font-weight:700; color:#94a3b8;">GEN: ${now.toLocaleString()}</p>
        </div>
      </div>

      <div class="summary-grid">
        <div class="card"><h4>Total Bills</h4><div class="val">${summary.count}</div></div>
        <div class="card"><h4>Total Sales</h4><div class="val">₹${summary.total.toFixed(2)}</div></div>
      </div>

      <table>
        <thead><tr><th>Timestamp</th><th>Bill Reference</th><th>Line Items</th><th>Method</th><th style="text-align:right;">Amount</th></tr></thead>
        <tbody>
          ${receipts.map(r => `<tr><td>${formatDate(r.transaction_date)}</td><td>#${r.transaction_id}</td><td style="max-width:280px">${r.items?.map(i => i.product_name).join(', ')}</td><td>${r.payment_method.toUpperCase()}</td><td style="text-align:right;">₹${r.total_amount.toFixed(2)}</td></tr>`).join('')}
          <tr class="total-row"><td colspan="4">PERIOD AGGREGATE</td><td style="text-align:right;">₹${summary.total.toFixed(2)}</td></tr>
        </tbody>
      </table>
    `;

    win.document.write(`<html><head><title>Period_Audit_${startDate}</title>${styles}</head><body>${content}</body></html>`);
    win.document.close();
    win.print();
  };

  const printReceipt = (sale) => {
    const w = window.open("", "_blank", "width=400,height=600");
    if (!w) { showToast("Popup blocked", "warning"); return; }
    
    // Original Monospace Helpers
    const L = 42;
    const dash = '-'.repeat(L);
    const dbl = '='.repeat(L);
    const center = (txt) => { const p = Math.max(0, Math.floor((L - txt.length) / 2)); return ' '.repeat(p) + txt; };
    const lr = (l, r) => {
      const space = Math.max(1, L - l.toString().length - r.toString().length);
      return l.toString() + ' '.repeat(space) + r.toString();
    };

    const numToWords = (n) => {
      const a = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
      const b = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
      const transform = (num) => {
        if (num < 20) return a[num];
        if (num < 100) return b[Math.floor(num/10)] + (num%10 !== 0 ? ' ' + a[num%10] : '');
        if (num < 1000) return a[Math.floor(num/100)] + ' Hundred' + (num%100 !== 0 ? ' ' + transform(num%100) : '');
        if (num < 100000) return transform(Math.floor(num/1000)) + ' Thousand' + (num%1000 !== 0 ? ' ' + transform(num%1000) : '');
        return transform(Math.floor(num/100000)) + ' Lakh' + (num%100000 !== 0 ? ' ' + transform(num%100000) : '');
      };
      return 'Rs. ' + (n === 0 ? 'Zero' : transform(Math.floor(n))) + ' Only';
    };

    const transId = sale.invoice_number || sale.transaction_id || "ERR";
    const transDate = sale.transaction_date ? new Date(sale.transaction_date) : new Date();
    const total_amount = Number(sale.total_amount || 0);
    const saleItems = sale.items || [];
    const totalQty = saleItems.reduce((sum, i) => sum + i.quantity, 0);

    // GST Slabs Logic
    const gstGroups = {};
    saleItems.forEach(item => {
      const rate = item.gst_percent || 0;
      if (!gstGroups[rate]) gstGroups[rate] = { taxable: 0, gst: 0 };
      
      const lineNet = item.unit_price * item.quantity;
      const lineTaxable = lineNet / (1 + (rate / 100));
      const lineGst = lineNet - lineTaxable;

      gstGroups[rate].taxable += lineTaxable;
      gstGroups[rate].gst += lineGst;
    });

    let taxTable = 'GST%      Taxable   CGST   SGST   Total\n' + dash + '\n';
    Object.keys(gstGroups).sort((a,b)=>a-b).forEach(rate => {
      const gp = gstGroups[rate];
      const r_p = (rate + '%').padEnd(6);
      const t_p = gp.taxable.toFixed(1).padStart(11);
      const c_p = (gp.gst / 2).toFixed(1).padStart(7);
      const s_p = (gp.gst / 2).toFixed(1).padStart(7);
      const tot_p = gp.gst.toFixed(1).padStart(8);
      taxTable += r_p + t_p + c_p + s_p + tot_p + '\n';
    });

    let itemsLines = '';
    saleItems.forEach((item, index) => {
      itemsLines += `${index + 1}. ${item.product_name.substring(0, 38)}\n`;
      const detail = `${item.quantity} x ${item.unit_price.toFixed(2)} = ${(item.quantity * item.unit_price).toFixed(2)} [${item.gst_percent || 0}%]`;
      itemsLines += `   ${detail}\n`;
    });

    const barcodeVal = transId;

    const header = 
      center('RETAIL STORE') + '\n' +
      center(`Branch: ${user?.branch_name || 'Store'}`) + '\n' +
      center(user?.branch_address || 'Srinagar Colony, Vijayawada - 520001') + '\n' +
      center('GSTIN: ' + (user?.branch_gstin || '37XXXXX0000X1ZX')) + '\n' +
      dash + '\n' +
      center('TAX INVOICE') + '\n' +
      dash + '\n';

    const body = 
      lr(`Bill No: ${transId}`, `Date: ${formatDate(transDate)}`) + '\n' +
      lr(`Cashier: ${user?.first_name || 'Staff'}`, `Time: ${transDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}`) + '\n' +
      `Customer: ${sale.customer_mobile || '7989702030'}\n\n` +
      `ITEM                  QTY x RATE = AMT [GST]\n` +
      dash + '\n' +
      itemsLines + 
      dash + '\n' +
      lr(`Total Items: ${saleItems.length}`, `Total Qty: ${totalQty}`) + '\n' +
      dash + '\n' +
      lr('Gross Amount:', 'Rs.' + (total_amount + (sale.discount || 0)).toFixed(2)) + '\n' +
      dbl + '\n' +
      lr('NET PAYABLE:', 'Rs.' + Math.round(total_amount).toFixed(2)) + '\n' +
      dbl + '\n' +
      numToWords(total_amount) + '\n' +
      dash + '\n' +
      taxTable +
      dash + '\n' +
      lr('Payment:', (sale.payment_method || 'CASH').toUpperCase()) + '\n' +
      lr('Mode:', (sale.payment_method || 'CASH').toUpperCase()) + '\n' +
      lr('Cash Tendered:', 'Rs.' + Math.round(total_amount).toString()) + '\n' +
      lr('Change:', 'Rs.0.00') + '\n' +
      dash + '\n\n' +
      center('Thank you! Visit Again') + '\n' +
      center('Goods once sold will not be taken back') + '\n' +
      center('E. & O.E.') + '\n\n' +
      center('--- Authorized Signatory ---') + '\n\n' +
      center('Computer Generated Invoice') + '\n';

    w.document.write(`
      <html>
        <head>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.0/dist/JsBarcode.all.min.js"></script>
          <style>
            pre { font-family:"Courier New",monospace; font-size:12px; width:302px; margin:0; padding:10px 20px; }
            .barcode-container { text-align: center; width: 342px; margin: 10px 0; }
            #barcode { max-width: 100%; height: 60px; }
          </style>
        </head>
        <body>
          <pre>${header}</pre>
          <div class="barcode-container">
            <svg id="barcode"></svg>
          </div>
          <pre>${body}</pre>
          <script>
            try {
              JsBarcode("#barcode", "${barcodeVal}", {
                format: "CODE128",
                width: 2,
                height: 50,
                displayValue: true,
                fontSize: 14,
                margin: 0
              });
            } catch(e) { console.error("Barcode Error:", e); }
            setTimeout(() => { window.print(); window.close(); }, 500);
          </script>
        </body>
      </html>
    `);
    w.document.close();
  };





  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      
      {/* ================= ACTIONS BAR ================= */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', background: '#fff', padding: '16px 24px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', gap: '15px' }}>
           <div style={{ display: 'flex', flexDirection: 'column' }}>
             <span style={{ fontSize: '10px', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Range Start</span>
             <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ border: 'none', background: 'transparent', fontSize: '13px', fontWeight: 800, color: '#4338ca', outline: 'none' }} />
           </div>
           <div style={{ width: '1px', height: '30px', background: '#f1f5f9' }}></div>
           <div style={{ display: 'flex', flexDirection: 'column' }}>
             <span style={{ fontSize: '10px', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Range End</span>
             <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ border: 'none', background: 'transparent', fontSize: '13px', fontWeight: 800, color: '#4338ca', outline: 'none' }} />
           </div>
           {canSearchMobile && (
             <>
               <div style={{ width: '1px', height: '30px', background: '#f1f5f9' }}></div>
               <div style={{ display: 'flex', flexDirection: 'column' }}>
                 <span style={{ fontSize: '10px', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Mobile Filter</span>
                 <input type="text" placeholder="Digits only..." value={searchMobile} onChange={e => setSearchMobile(e.target.value)} style={{ border: 'none', background: 'transparent', fontSize: '13px', fontWeight: 800, color: '#4338ca', outline: 'none', width: '100px' }} />
               </div>
             </>
           )}
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
           <button onClick={loadReceipts} disabled={loading} style={{ padding: '12px 20px', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '14px', fontSize: '12px', fontWeight: 800, color: '#64748b', cursor: 'pointer' }}>
             <i className={`fas fa-sync ${loading ? 'fa-spin' : ''}`}></i> Sync
           </button>
           <button onClick={printAllSales} disabled={!receipts.length} style={{ padding: '12px 24px', background: '#4338ca', color: 'white', border: 'none', borderRadius: '14px', fontSize: '12px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(67, 56, 202, 0.3)' }}>
             <i className="fas fa-file-invoice"></i> Download Report
           </button>
        </div>
      </div>

      {/* ================= SUMMARY STRIP ================= */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '30px' }}>
         <div style={{ background: '#fff', padding: '24px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Bills</div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: '#1e293b', marginTop: '4px' }}>{summary.count}</div>
         </div>
         <div style={{ background: '#fff', padding: '24px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Revenue</div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: '#1e293b', marginTop: '4px' }}>₹{summary.total.toFixed(2)}</div>
         </div>
      </div>

      {/* ================= TABLE ================= */}
      <div style={{ background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #f1f5f9' }}>
              <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Invoice ID & Time</th>
              <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Products Sold</th>
              <th style={{ padding: '16px 24px', textAlign: 'center', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Payment Mode</th>
              <th style={{ padding: '16px 24px', textAlign: 'right', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Amount</th>
              <th style={{ padding: '16px 24px', textAlign: 'center', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {receipts.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', fontWeight: 800 }}>No sales record found for this period.</td></tr>
            ) : (
              receipts.map(r => (
                <tr key={r.transaction_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ fontWeight: 900, color: '#4338ca', fontSize: '15px' }}>#REC-{r.transaction_id}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, marginTop: '2px' }}>{formatDate(r.transaction_date)} • {new Date(r.transaction_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '13px' }}>{r.items?.length || 0} Products Indexed</div>
                    <div style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>{r.items?.map(i => i.product_name).join(', ')}</div>
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                    <span style={{ 
                      padding: '4px 12px', borderRadius: '100px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase',
                      background: r.payment_method === 'cash' ? '#dcfce7' : '#e0e7ff',
                      color: r.payment_method === 'cash' ? '#15803d' : '#4338ca'
                    }}>{r.payment_method}</span>
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                    <div style={{ fontWeight: 900, color: '#1e293b', fontSize: '16px' }}>₹{r.total_amount.toFixed(2)}</div>
                    {r.items?.some(i => i.is_returned) && <div style={{ fontSize: '10px', color: '#ef4444', fontWeight: 800 }}>CONTAINS RETURNS</div>}
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                    <button onClick={() => printReceipt(r)} style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', color: '#64748b', padding: '8px 16px', borderRadius: '10px', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}>
                      <i className="fas fa-print"></i> Print
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
