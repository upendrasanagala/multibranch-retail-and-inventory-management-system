import { useEffect, useState, useRef } from "react";
import { formatDate, formatDateTime } from "../../utils/dateUtils";
import api from "../../services/api";
import { getCurrentUser } from "../../services/authService";
import { useToast } from "../../components/ToastContext";

export default function StaffPOS() {
  const { showToast } = useToast();
  const user = getCurrentUser();
  const branchId = user?.branch_id || user?.branch?.branch_id || user?.user_branch_id;
  const branchName = user?.branch_name || "Main Terminal";

  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [search, setSearch] = useState("");
  const [mobile, setMobile] = useState("");
  const [showResults, setShowResults] = useState(false);
  
  // Terminal Logic
  const [manualDiscountPercent, setManualDiscountPercent] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [utr, setUtr] = useState("");
  const [cardName, setCardName] = useState("");
  const [cashReceived, setCashReceived] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  // Configuration (Auto)
  const [billThreshold, setBillThreshold] = useState(2000);
  const [billOfferPercent, setBillOfferPercent] = useState(5);

  const loadInventory = async () => {
    setLoading(true);
    try {
      const pRes = await api.products.getAll({ per_page: 1000 });
      const allP = pRes.products || [];
      let iMap = {};
      if (branchId) {
        const iRes = await api.inventory.getByBranch(branchId);
        (iRes.inventory || []).forEach(inv => { iMap[inv.product_id] = inv.quantity; });
      }
      setProducts(allP.map(p => ({
        id: p.product_id || p.id,
        name: p.name,
        price: p.unit_price || p.price || 0,
        stock: iMap[p.product_id || p.id] !== undefined ? iMap[p.product_id || p.id] : 0,
        sku: p.sku || 'N/A',
        size: p.size || 'STD',
        unit: p.unit || 'PCS',
        is_b1g1: !!p.is_b1g1,
        gst_percent: p.gst_percent || 0,
        discount_percent: p.discount_percent || 0
      })));
    } catch (err) { console.error("POS Load Err:", err); }
    setLoading(false);
  };

  useEffect(() => { loadInventory(); }, []);

  const addToCart = (p) => {
    const existing = cart.find(i => i.id === p.id);
    if (existing && existing.qty + 1 > p.stock) { showToast("Insufficient stock available", "warning"); return; }
    if (!existing && p.stock <= 0) { showToast("Product out of stock", "warning"); return; }

    setCart(prev => {
      if (existing) return prev.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...p, qty: 1, item_discount_percent: p.discount_percent || 0 }];
    });
    playBeep();
  };

  const updateItemDiscount = (id, pct) => {
    setCart(cart.map(i => i.id === id ? { ...i, item_discount_percent: Math.min(100, Math.max(0, pct)) } : i));
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let savings = 0;
    let gst = 0;

    cart.forEach(i => {
      const lineGross = i.price * i.qty;
      subtotal += lineGross;
      
      let lineSavings = 0;
      if (i.is_b1g1) {
        lineSavings += Math.floor(i.qty / 2) * i.price;
      }
      const billableQtyAfterB1G1 = i.is_b1g1 ? (i.qty - Math.floor(i.qty / 2)) : i.qty;
      lineSavings += (billableQtyAfterB1G1 * i.price * i.item_discount_percent) / 100;
      
      savings += lineSavings;
      
      // TAX INCLUSIVE: Extract GST from the total
      const lineNet = lineGross - lineSavings;
      const lineGst = lineNet - (lineNet / (1 + (i.gst_percent / 100)));
      gst += lineGst;
    });

    const currentTotal = subtotal - savings;
    const billDisc = currentTotal > billThreshold ? (currentTotal * billOfferPercent) / 100 : 0;
    const finalBeforeManual = currentTotal - billDisc;
    const manualDisc = (finalBeforeManual * manualDiscountPercent) / 100;

    return { subtotal, savings, gst, billDisc, manualDisc, total: finalBeforeManual - manualDisc };
  };

  const t = calculateTotals();

  const handleCheckout = async () => {
    if (!cart.length) return showToast("Cart is empty", "warning");
    if (!mobile || !/^[6-9]\d{9}$/.test(mobile)) return showToast("Enter a valid mobile number", "warning");
    if (paymentMethod === 'cash' && Number(cashReceived) < t.total) return showToast("Insufficient cash provided", "error");

    setLoading(true);
    try {
      const saleData = {
        branch_id: branchId,
        customer_mobile: mobile,
        items: cart.map(i => ({ product_id: i.id, quantity: i.qty, unit_price: i.price })),
        subtotal: t.subtotal,
        gst: t.gst,
        discount: t.savings + t.billDisc + t.manualDisc,
        total: t.total,
        payment_method: paymentMethod,
        payment_meta: { utr, card_holder: cardName }
      };
      const res = await api.sales.create(saleData);
      
      setShowSuccess(true);
      playSuccessSound();

      const printData = {
        ...saleData,
        invoice_number: res.invoice_number || res.transaction_id,
        items_detail: cart,
        change: paymentMethod === 'cash' ? Math.max(0, Number(cashReceived) - t.total) : 0,
        savings: t.savings + t.billDisc + t.manualDisc
      };

      setTimeout(() => {
        setShowSuccess(false);
        setCart([]);
        setMobile("");
        setManualDiscountPercent(0);
        setCashReceived("");
        setUtr("");
        setCardName("");
        printReceipt(printData);
        loadInventory();
      }, 2000);

    } catch (err) {
      showToast("Sale failed: " + err.message, "error");
    }
    setLoading(false);
  };

  const printReceipt = (sale) => {
    const w = window.open("", "_blank", "width=400,height=600");
    if (!w) return;
    
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

    // GST Slabs Logic
    const gstGroups = {};
    sale.items_detail.forEach(item => {
      const rate = item.gst_percent || 0;
      if (!gstGroups[rate]) gstGroups[rate] = { taxable: 0, gst: 0 };
      
      const lineGross = item.price * item.qty;
      let lineSavings = 0;
      if (item.is_b1g1) lineSavings += Math.floor(item.qty / 2) * item.price;
      const billableQtyAfterB1G1 = item.is_b1g1 ? (item.qty - Math.floor(item.qty / 2)) : item.qty;
      lineSavings += (billableQtyAfterB1G1 * item.price * (item.item_discount_percent || 0)) / 100;
      
      const lineNet = lineGross - lineSavings;
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

    const now = new Date();
    const totalQty = sale.items_detail.reduce((sum, item) => sum + item.qty, 0);
    const totalItems = sale.items_detail.length;

    let itemsLines = '';
    sale.items_detail.forEach((item, index) => {
      itemsLines += `${index + 1}. ${item.name.substring(0, 38)}\n`;
      const detail = `${item.qty} x ${item.price.toFixed(2)} = ${(item.qty * item.price).toFixed(2)} [${item.gst_percent || 0}%]`;
      itemsLines += `   ${detail}\n`;
    });

    const barcodeVal = sale.invoice_number || sale.transaction_id || "ERR";

    const header = 
      center('RETAIL STORE') + '\n' +
      center(`Branch: ${branchName}`) + '\n' +
      center(user?.branch_address || 'Srinagar Colony, Vijayawada - 520001') + '\n' +
      center('GSTIN: ' + (user?.branch_gstin || '37XXXXX0000X1ZX')) + '\n' +
      dash + '\n' +
      center('TAX INVOICE') + '\n' +
      dash + '\n';

    const body = 
      lr(`Bill No: ${sale.invoice_number}`, `Date: ${formatDate(now)}`) + '\n' +
      lr(`Cashier: ${user?.name || 'Staff'}`, `Time: ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}`) + '\n' +
      `Customer: ${mobile || sale.customer_mobile || '7989702030'}\n\n` +
      `ITEM                  QTY x RATE = AMT [GST]\n` +
      dash + '\n' +
      itemsLines + 
      dash + '\n' +
      lr(`Total Items: ${totalItems}`, `Total Qty: ${totalQty}`) + '\n' +
      dash + '\n' +
      lr('Gross Amount:', 'Rs.' + sale.subtotal.toFixed(2)) + '\n' +
      dbl + '\n' +
      lr('NET PAYABLE:', 'Rs.' + Math.round(sale.total).toFixed(2)) + '\n' +
      dbl + '\n' +
      numToWords(sale.total) + '\n' +
      dash + '\n' +
      taxTable +
      dash + '\n' +
      lr('Payment:', (sale.payment_method || 'CASH').toUpperCase()) + '\n' +
      lr('Mode:', (sale.payment_method || 'CASH').toUpperCase()) + '\n' +
      lr('Cash Tendered:', 'Rs.' + (cashReceived || Math.round(sale.total)).toString()) + '\n' +
      lr('Change:', 'Rs.' + (sale.change || 0).toFixed(2)) + '\n' +
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





  const playBeep = () => { try { const ctx = new (window.AudioContext || window.webkitAudioContext)(); const o = ctx.createOscillator(); const g = ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.frequency.setValueAtTime(1000, ctx.currentTime); g.gain.setValueAtTime(0.05, ctx.currentTime); o.start(); o.stop(ctx.currentTime + 0.1); } catch(e){} };
  const playSuccessSound = () => { try { const ctx = new (window.AudioContext || window.webkitAudioContext)(); [523, 659, 784].forEach((f, i) => { const o = ctx.createOscillator(); const g = ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.frequency.setValueAtTime(f, ctx.currentTime + i*0.1); g.gain.setValueAtTime(0.1, ctx.currentTime + i*0.1); o.start(ctx.currentTime + i*0.1); o.stop(ctx.currentTime + i*0.1 + 0.2); }); } catch(e){} };

  return (
    <div style={{ height: 'calc(100vh - 100px)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', animation: 'fadeIn 0.5s ease-out', overflowY: 'auto', padding: '10px' }}>
      
      {showSuccess && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
           <div style={{ background: '#fff', padding: '60px', borderRadius: '40px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
              <div style={{ width: '100px', height: '100px', background: '#ecfdf5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: '#10b981', fontSize: '48px' }}>
                <i className="fas fa-check-circle"></i>
              </div>
              <h2 style={{ fontSize: '32px', fontWeight: 900, color: '#1e293b' }}>Payment Successful</h2>
              <p style={{ color: '#64748b', fontWeight: 600, marginTop: '8px' }}>Finalizing sale and printing receipt...</p>
           </div>
        </div>
      )}

      {/* ================= LEFT: CART ITEMS ================= */}
      <div style={{ background: '#fff', borderRadius: '28px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <div style={{ background: '#f8fafc', padding: '16px 30px', borderBottom: '2px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
           <div style={{ fontWeight: 900, fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Items in Cart</div>
           <div style={{ background: '#eef2ff', padding: '4px 12px', borderRadius: '100px', fontSize: '11px', fontWeight: 800, color: '#4338ca' }}>{cart.length} ITEMS</div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px' }}>
           <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
                   <th style={{ padding: '16px', textAlign: 'left', fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>Product</th>
                   <th style={{ padding: '16px', textAlign: 'center', fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>Price</th>
                   <th style={{ padding: '16px', textAlign: 'center', fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>Qty</th>
                   <th style={{ padding: '16px', textAlign: 'center', fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>Disc %</th>
                   <th style={{ padding: '16px', textAlign: 'right', fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>Total</th>
                   <th style={{ width: '50px' }}></th>
                </tr>
              </thead>
              <tbody>
                {cart.length === 0 ? (
                  <tr><td colSpan="6" style={{ padding: '80px 0', textAlign: 'center', color: '#94a3b8' }}>
                    <i className="fas fa-shopping-basket" style={{ fontSize: '48px', marginBottom: '20px', opacity: 0.3 }}></i>
                    <div style={{ fontWeight: 800, fontSize: '16px' }}>Empty Cart</div>
                    <p style={{ fontSize: '12px', marginTop: '5px' }}>Please scan products to start.</p>
                  </td></tr>
                ) : (
                  cart.map(i => (
                    <tr key={i.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                       <td style={{ padding: '16px' }}>
                          <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '13px' }}>{i.name}</div>
                          <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700 }}>{i.sku} | {i.size}</div>
                       </td>
                       <td style={{ padding: '16px', textAlign: 'center', fontWeight: 800, color: '#64748b', fontSize: '13px' }}>₹{i.price.toFixed(2)}</td>
                       <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                             <button onClick={() => setCart(cart.map(x => x.id === i.id ? { ...x, qty: Math.max(1, x.qty - 1) } : x))} style={{ width: '24px', height: '24px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer', fontWeight: 900 }}>-</button>
                             <span style={{ fontWeight: 800, minWidth: '15px' }}>{i.qty}</span>
                             <button onClick={() => addToCart(i)} style={{ width: '24px', height: '24px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer', fontWeight: 900 }}>+</button>
                          </div>
                       </td>
                       <td style={{ padding: '16px', textAlign: 'center' }}>
                          <input type="number" min="0" max="100" value={i.item_discount_percent} onChange={e => updateItemDiscount(i.id, e.target.value)} style={{ width: '50px', padding: '4px', borderRadius: '6px', border: '1.5px solid #e2e8f0', textAlign: 'center', fontWeight: 800, fontSize: '12px' }} />
                       </td>
                       <td style={{ padding: '16px', textAlign: 'right' }}>
                          <div style={{ fontWeight: 900, color: '#1e293b', fontSize: '14px' }}>₹{(i.price * i.qty).toFixed(2)}</div>
                          {(i.is_b1g1 || i.item_discount_percent > 0) && <div style={{ fontSize: '9px', color: '#10b981', fontWeight: 800 }}>SAVED</div>}
                       </td>
                       <td style={{ padding: '16px' }}>
                          <button onClick={() => setCart(cart.filter(x => x.id !== i.id))} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', fontSize: '13px' }}><i className="fas fa-trash-alt"></i></button>
                       </td>
                    </tr>
                  ))
                )}
              </tbody>
           </table>
        </div>

        <div style={{ background: '#f8fafc', padding: '20px 30px', borderTop: '2px solid #f1f5f9' }}>
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
              <div>
                 <div style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Subtotal</div>
                 <div style={{ fontSize: '16px', fontWeight: 900, color: '#1e293b' }}>₹{t.subtotal.toFixed(2)}</div>
              </div>
              <div>
                 <div style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Discount</div>
                 <div style={{ fontSize: '16px', fontWeight: 900, color: '#10b981' }}>-₹{(t.savings + t.billDisc + t.manualDisc).toFixed(2)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                 <div style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Net Total</div>
                 <div style={{ fontSize: '24px', fontWeight: 900, color: '#4338ca' }}>₹{t.total.toFixed(2)}</div>
              </div>
           </div>
        </div>
      </div>

      {/* ================= RIGHT: TOOLS ================= */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* SCAN & SEARCH */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '28px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
           <div style={{ position: 'relative', marginBottom: '12px' }}>
              <i className="fas fa-barcode" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}></i>
              <input 
                placeholder="Scan Barcode or Type SKU..." 
                value={barcode} 
                onChange={e => setBarcode(e.target.value)}
                onKeyDown={e => {
                  if(e.key === 'Enter') {
                    const found = products.find(p => p.sku === barcode || String(p.id) === barcode);
                    if(found) { addToCart(found); setBarcode(""); }
                    else showToast("Product not found", "error");
                  }
                }}
                style={{ width: '100%', padding: '12px 12px 12px 45px', borderRadius: '12px', border: 'none', background: '#f8fafc', fontSize: '13px', fontWeight: 600, outline: 'none' }}
              />
           </div>
           
           <div style={{ position: 'relative' }}>
              <i className="fas fa-search" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}></i>
              <input 
                placeholder="Product Search..." 
                value={search} 
                onFocus={() => setShowResults(true)}
                onChange={e => {setSearch(e.target.value); setShowResults(true);}} 
                style={{ width: '100%', padding: '12px 12px 12px 45px', borderRadius: '12px', border: 'none', background: '#f8fafc', fontSize: '13px', fontWeight: 600, outline: 'none' }}
              />
              {showResults && search.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', marginTop: '8px', zIndex: 100, maxHeight: '250px', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                   {products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())).map(p => (
                     <div key={p.id} onClick={() => {addToCart(p); setSearch(""); setShowResults(false);}} style={{ padding: '10px 16px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '13px', color: '#1e293b' }}>{p.name}</div>
                          <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700 }}>₹{p.price} | Stock: {p.stock}</div>
                        </div>
                        <i className="fas fa-plus-circle" style={{ color: '#4338ca', opacity: 0.5 }}></i>
                     </div>
                   ))}
                </div>
              )}
           </div>
        </div>

        {/* CUSTOMER & DISCOUNTS */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '28px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '9px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Customer Phone</label>
                <input maxLength="10" placeholder="Mobile..." value={mobile} onChange={e => setMobile(e.target.value.replace(/\D/g, ''))} style={{ padding: '10px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontWeight: 800, fontSize: '14px', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '9px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Cart Discount %</label>
                <input type="number" min="0" max="100" value={manualDiscountPercent} onChange={e => setManualDiscountPercent(e.target.value)} style={{ padding: '10px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontWeight: 800, fontSize: '14px', outline: 'none' }} />
              </div>
           </div>

           <div style={{ background: '#f0f9ff', padding: '12px', borderRadius: '12px', border: '1px solid #bae6fd' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <div style={{ fontSize: '10px', fontWeight: 800, color: '#0369a1' }}>THRESHOLD DISCOUNT</div>
                 <div style={{ fontSize: '9px', background: '#0369a1', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 900 }}>{t.total > billThreshold ? 'QUALIFIED' : 'NOT MET'}</div>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '10px', color: '#0369a1', fontWeight: 600 }}>Get {billOfferPercent}% off on orders above ₹{billThreshold}.</p>
           </div>
        </div>

        {/* PAYMENT SETTINGS */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '28px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', flex: 1 }}>
           <h3 style={{ margin: '0 0 16px 0', fontSize: '12px', fontWeight: 900, color: '#1e293b', textTransform: 'uppercase' }}>Payment Mode</h3>
           
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '20px' }}>
              {['cash', 'upi', 'card'].map(m => (
                <button key={m} onClick={() => setPaymentMethod(m)} style={{ padding: '10px', borderRadius: '10px', border: paymentMethod === m ? '2px solid #4338ca' : '1.5px solid #e2e8f0', background: paymentMethod === m ? '#eef2ff' : '#fff', color: paymentMethod === m ? '#4338ca' : '#64748b', fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', cursor: 'pointer' }}>
                   <i className={`fas fa-${m === 'cash' ? 'money-bill' : (m === 'upi' ? 'qrcode' : 'credit-card')}`} style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}></i>
                   {m}
                </button>
              ))}
           </div>

           <div>
              {paymentMethod === 'cash' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                     <label style={{ fontSize: '9px', fontWeight: 800, color: '#94a3b8' }}>CASH RECEIVED (Rs.)</label>
                     <input type="number" value={cashReceived} onChange={e => setCashReceived(e.target.value)} style={{ padding: '12px', borderRadius: '10px', border: '2px solid #10b981', fontSize: '18px', fontWeight: 900, outline: 'none' }} />
                   </div>
                   {Number(cashReceived) > t.total && (
                     <div style={{ padding: '12px', background: '#ecfdf5', borderRadius: '10px', border: '1px solid #d1fae5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '10px', fontWeight: 800, color: '#059669' }}>REFUND</span>
                        <span style={{ fontSize: '18px', fontWeight: 900, color: '#059669' }}>₹{(Number(cashReceived) - t.total).toFixed(2)}</span>
                     </div>
                   )}
                </div>
              ) : paymentMethod === 'upi' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                   <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '12px', textAlign: 'center' }}>
                      <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=upi://pay?pa=store@upi&pn=RetailStore&am=${t.total.toFixed(2)}&cu=INR`} alt="QR" style={{ borderRadius: '6px' }} />
                   </div>
                   <input placeholder="Transaction ID / UTR" value={utr} onChange={e => setUtr(e.target.value)} style={{ padding: '12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '12px', fontWeight: 700, outline: 'none' }} />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                   <input placeholder="Customer Name on Card" value={cardName} onChange={e => setCardName(e.target.value)} style={{ padding: '12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '12px', fontWeight: 700, outline: 'none' }} />
                   <p style={{ fontSize: '9px', color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>Verify payment on PDQ machine before finishing.</p>
                </div>
              )}
           </div>

           <button 
             onClick={handleCheckout} 
             disabled={loading || !cart.length} 
             style={{ width: '100%', padding: '16px', background: '#4338ca', color: '#fff', border: 'none', borderRadius: '14px', fontSize: '14px', fontWeight: 900, cursor: 'pointer', boxShadow: '0 8px 12px -3px rgba(67, 56, 202, 0.4)', marginTop: '20px' }}>
             {loading ? 'FINISHING...' : 'FINISH SALE'}
           </button>
        </div>
      </div>

    </div>
  );
}
