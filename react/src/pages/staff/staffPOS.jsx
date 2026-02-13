import { useEffect, useState, useRef } from "react";
import "../../styles/dashboard.css";
import api from "../../services/api";
import { getCurrentUser } from "../../services/authService";

export default function StaffPOS() {
  const user = getCurrentUser();

  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);

  const [barcode, setBarcode] = useState("");
  const [search, setSearch] = useState("");
  const [mobile, setMobile] = useState("");
  const [showResults, setShowResults] = useState(false);

  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");

  // Real Payment Details
  const [utr, setUtr] = useState("");
  const [cardData, setCardData] = useState({ name: "", number: "", cvv: "" });

  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const receiptRef = useRef();

  const GST_PERCENT = 5;

  /* ================= LOAD INVENTORY FROM BACKEND ================= */
  const loadInventory = async () => {
    setLoading(true);
    try {
      const branchId = user?.branch_id || user?.branch?.branch_id || user?.user_branch_id;

      // Fetch ALL products first to ensure we have a complete catalog
      // pagination limit increased to 1000 to get all products
      const productsResponse = await api.products.getAll({ per_page: 1000 });
      const allProducts = productsResponse.products || [];

      let inventoryMap = {};

      if (branchId) {
        // Fetch branch inventory to get stock levels
        const inventoryResponse = await api.inventory.getByBranch(branchId);
        const inventory = inventoryResponse.inventory || [];

        // Create a map for quick lookup: productId -> quantity
        inventory.forEach(inv => {
          inventoryMap[inv.product_id] = inv.quantity;
        });
      }

      // Merge products with inventory data
      const productsWithStock = allProducts.map(p => ({
        productId: p.product_id || p.id,
        id: p.product_id || p.id,
        name: p.name,
        price: p.unit_price || p.price || 0,
        // Use inventory quantity if available, else 0
        stock: inventoryMap[p.product_id || p.id] !== undefined ? inventoryMap[p.product_id || p.id] : 0,
        stock: inventoryMap[p.product_id || p.id] !== undefined ? inventoryMap[p.product_id || p.id] : 0,
        sku: p.sku,
        size: p.size,
        unit: p.unit,
        is_b1g1: p.is_b1g1 // Map B1G1 flag
      }));

      setProducts(productsWithStock);
    } catch (err) {
      console.error("Failed to load inventory:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadInventory();
  }, []);

  /* ================= BARCODE ================= */
  const handleBarcodeKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = barcode.trim();
      if (!code) return;

      const product = products.find(
        p => String(p.productId) === code || String(p.id) === code || p.sku === code
      );

      if (product) {
        const inCart = cart.find(c => c.productId === product.productId);
        const availableStock = product.stock - (inCart ? inCart.qty : 0);
        if (availableStock > 0) {
          addToCart(product);
          setBarcode("");
        } else {
          alert("Out of stock!");
        }
      } else {
        alert("Product not found!");
      }
    }
  };

  /* ================= SOUND UTILS ================= */
  const playBeep = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(1000, ctx.currentTime); // 1000Hz beep
      gain.gain.setValueAtTime(0.1, ctx.currentTime);

      osc.start();
      osc.stop(ctx.currentTime + 0.1); // 100ms duration
    } catch (e) {
      console.warn("Audio play failed", e);
    }
  };

  const playSuccessSound = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      const playNote = (freq, time, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + time);
        gain.gain.setValueAtTime(0.1, ctx.currentTime + time);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + time + duration);
        osc.start(ctx.currentTime + time);
        osc.stop(ctx.currentTime + time + duration);
      };

      // Simple ascending arpeggio (C major ish)
      playNote(523.25, 0, 0.2); // C5
      playNote(659.25, 0.15, 0.2); // E5
      playNote(783.99, 0.3, 0.4); // G5
    } catch (e) {
      console.warn("Success audio failed", e);
    }
  };

  /* ================= CART LOGIC ================= */
  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.productId === (product.product_id || product.id));
      if (existing) {
        // Check stock before incrementing
        const productInInventory = products.find(p => p.productId === (product.product_id || product.id));
        if (existing.qty + 1 > productInInventory.stock) {
          alert("Cannot exceed available stock!");
          return prev; // Return previous state if stock limit reached
        }
        return prev.map(i => i.productId === (product.product_id || product.id)
          ? { ...i, qty: i.qty + 1 }
          : i
        );
      }
      // Check stock for new item
      if (product.stock <= 0) {
        alert("Product is out of stock!");
        return prev; // Return previous state if out of stock
      }
      return [...prev, {
        productId: product.product_id || product.id,
        name: product.name,
        price: product.unit_price || product.price,
        qty: 1,
        stock: product.stock,
        current_stock: product.stock,
        is_b1g1: product.is_b1g1,
        sku: product.sku, // Added SKU
        unit: product.unit, // Added Unit
        size: product.size // Added Size
      }];
    });
    playBeep(); // Play sound
    setSearch(""); // Clear search
  };

  const updateQty = (id, delta) => {
    const product = products.find(p => p.productId === id);
    const item = cart.find(i => i.productId === id);
    if (delta > 0 && item.qty >= product.stock) {
      alert("Cannot exceed available stock!");
      return;
    }
    setCart(cart.map(i => i.productId === id ? { ...i, qty: i.qty + delta } : i).filter(i => i.qty > 0));
  };

  /* ================= TOTAL & DISCOUNT LOGIC ================= */
  // 1. Calculate Item-Level Discounts (B1G1)
  const itemDiscounts = cart.reduce((acc, item) => {
    let disc = 0;
    // B1G1 Logic: Buy 1 Get 1 Free = Every 2nd item is free
    if (item.is_b1g1) {
      const freeQty = Math.floor(item.qty / 2);
      disc = freeQty * item.price;
    }
    return acc + disc;
  }, 0);

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const gst = (subtotal * GST_PERCENT) / 100;

  // 2. Bill-Level Discount (Configurable)
  const [billThreshold, setBillThreshold] = useState(400);
  const [billOfferPercent, setBillOfferPercent] = useState(10);

  const currentTotalBeforeBillDisc = subtotal + gst - itemDiscounts;

  // Calculate Bill Offer
  const billDiscount = currentTotalBeforeBillDisc > billThreshold
    ? (currentTotalBeforeBillDisc * billOfferPercent) / 100
    : 0;

  // 3. Manual Discount (Now Percentage)
  // Applied on what remains? Usually manual disc is on the final payable.
  // Let's apply it on (Total - other discounts).
  const taxableAmount = currentTotalBeforeBillDisc - billDiscount;
  const manualDiscountAmount = (taxableAmount * discount) / 100;

  const total = taxableAmount - manualDiscountAmount;

  // Total Auto Discount (Item + Bill)
  const autoDiscount = itemDiscounts + billDiscount;

  /* ================= COMPLETE PAYMENT ================= */
  const completePayment = async () => {
    if (cart.length === 0) return alert("Cart is empty");
    if (!paymentMethod) return alert("Select payment method");
    if (paymentMethod === 'upi' && !utr) return alert("Enter UTR for UPI");
    if (paymentMethod === 'card' && !cardData.name) return alert("Enter Card Details");

    setLoading(true); // Assuming setLoading is used for processing state
    try {
      const saleData = {
        branch_id: user?.branch_id,
        mobile: mobile,
        items: cart.map(item => ({
          product_id: item.productId,
          quantity: item.qty,
          unit_price: item.price
        })),
        subtotal: subtotal,
        gst: gst,
        // Send total discount value (Auto + Manual Amount) to backend
        discount: autoDiscount + manualDiscountAmount,
        total: total,
        payment_method: paymentMethod,
        payment_meta: paymentMethod === 'upi' ? { utr } : (paymentMethod === 'card' ? { card_holder: cardData.name } : null)
      };

      const res = await api.sales.create(saleData);

      // SUCCESS ACTIONS
      playSuccessSound();
      alert("🎉 Payment Successful! Have a wonderful day!");

      // Reset
      setCart([]);
      setDiscount(0);
      setPaymentMethod("");
      setUtr("");
      setCardData({ name: "", number: "" });

      // Auto Print (optional/mock)
      // window.print(); 

    } catch (err) {
      alert("Current Sale Failed: " + err.message);
    }
    setLoading(false);
  };

  /* ================= PRINT RECEIPT ================= */
  const printReceipt = () => {
    const printWindow = window.open("", "", "width=400,height=600");
    const sale = {
      items: cart,
      subtotal,
      gst,
      discount,
      total,
      transaction_id: lastSale?.transaction_id || "NEW",
      transaction_date: new Date().toLocaleString()
    };

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt</title>
          <style>
            body { font-family: 'Courier New', monospace; padding: 10px; margin: 0; }
            .header { text-align: center; margin-bottom: 10px; }
            h3, p { margin: 2px 0; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th { border-bottom: 1px dashed #000; text-align: left; padding: 4px 0; }
            td { padding: 4px 0; vertical-align: top; }
            .right { text-align: right; }
            .center { text-align: center; }
            .totals-row td { padding: 2px 0; }
            .grand-total { border-top: 1px dashed #000; font-weight: bold; font-size: 14px; padding-top: 5px; }
            .footer { text-align: center; margin-top: 15px; font-size: 11px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h3>RETAIL STORE</h3>
            <p>Branch: ${branchName}</p>
            <p>${sale.transaction_date}</p>
            <p>Receipt: #${sale.transaction_id}</p>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 40%">Item</th>
                <th class="center" style="width: 20%">Qty</th>
                <th class="right" style="width: 20%">Rate</th>
                <th class="right" style="width: 20%">Amt</th>
              </tr>
            </thead>
            <tbody>
              ${sale.items.map(i => `
                <tr>
                  <td>
                    ${i.name}
                    ${(i.size || i.unit) ? `<small>(${i.size || ''} ${i.unit || ''})</small>` : ''}
                  </td>
                  <td class="center">${i.qty}</td>
                  <td class="right">${Number(i.price).toFixed(2)}</td>
                  <td class="right">${(Number(i.price) * Number(i.qty)).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div style="border-top: 1px dashed #000; margin-top: 5px; padding-top: 5px;">
            <table class="totals">
              <tr class="totals-row">
                <td colspan="3">Taxable Amount:</td>
                <td class="right">₹${sale.subtotal.toFixed(2)}</td>
              </tr>
              <tr class="totals-row">
                <td colspan="3">CGST (2.5%):</td>
                <td class="right">₹${(sale.gst / 2).toFixed(2)}</td>
              </tr>
              <tr class="totals-row">
                <td colspan="3">SGST (2.5%):</td>
                <td class="right">₹${(sale.gst / 2).toFixed(2)}</td>
              </tr>
              ${sale.discount > 0 ? `
              <tr class="totals-row">
                <td colspan="3">Discount:</td>
                <td class="right">-₹${sale.discount.toFixed(2)}</td>
              </tr>` : ''}
              <tr class="totals-row">
                <td colspan="3" class="grand-total">Grand Total:</td>
                <td class="right grand-total">₹${sale.total.toFixed(2)}</td>
              </tr>
            </table>
          </div>

          <div class="footer">
            <p>Payment: ${paymentMethod.toUpperCase()}</p>
            <p>*** Thank You! Visit Again ***</p>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    // Allow styles to load before printing
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const filtered = products.filter(p => {
    const term = search.toLowerCase().trim();
    if (!term) return false;
    const name = (p.name || '').toLowerCase();
    const sku = (p.sku || '').toLowerCase();
    const id = String(p.id || '').toLowerCase();
    return name.includes(term) || sku.includes(term) || id.includes(term);
  }).map(p => {
    const inCart = cart.find(c => c.productId === p.productId);
    const availableStock = p.stock - (inCart ? inCart.qty : 0);
    return { ...p, availableStock, inCart: !!inCart };
  });

  const handleSelectProduct = (p) => {
    if (p.availableStock > 0) {
      addToCart(p);
      setSearch("");
      setShowResults(false);
    } else {
      alert("Product out of stock!");
    }
  };

  const branchName = user?.branch_name || "Main Branch";

  /* ================= RENDER ================= */
  return (
    <div style={{ padding: "20px", height: "100%", overflowY: "auto" }}>
      <div className="pos-container">
        <div className="pos-header">
          <div>
            <h2>🛍️ Retail POS Terminal</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <p className="text-muted" style={{ margin: 0 }}>Branch: {branchName}</p>
              <button
                onClick={loadInventory}
                style={{ padding: '2px 8px', fontSize: '10px', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                <i className="fas fa-sync"></i> Refresh
              </button>
            </div>
          </div>
          <div>
            <p>Cashier: {user?.email}</p>
          </div>
        </div>

        <div className="pos-customer-bar">
          <div className="input-group">
            <label>Customer Mobile</label>
            <input placeholder="Mobile Number" value={mobile} onChange={e => setMobile(e.target.value)} />
          </div>
          <div className="input-group">
            <label>Scan Barcode</label>
            <input placeholder="Scan SKU / ID" value={barcode} onChange={e => setBarcode(e.target.value)} onKeyDown={handleBarcodeKeyDown} autoFocus />
          </div>
          <div className="input-group search-container">
            <label>Search Product</label>
            <input
              placeholder="Search by name or SKU..."
              value={search}
              onChange={e => { setSearch(e.target.value); setShowResults(true); }}
              onFocus={() => setShowResults(true)}
            />
            {showResults && search.length > 0 && (
              <div className="search-results-dropdown">
                {filtered.length === 0 ? (
                  <div className="no-results">No products found</div>
                ) : (
                  filtered.map(p => (
                    <div key={p.productId} className="search-result-item" onClick={() => handleSelectProduct(p)}>
                      <div className="info">
                        <span className="name">{p.name}</span>
                        <span className="sku">SKU: {p.sku}</span>
                        {(p.size || p.unit) && (
                          <span className="sku" style={{ marginLeft: '10px', color: '#666' }}>
                            {p.size ? `Size: ${p.size}` : ''} {p.unit ? `(${p.unit})` : ''}
                          </span>
                        )}
                      </div>
                      <div className="meta">
                        <span className="price">₹{p.price}</span>
                        {p.is_b1g1 && <span style={{ fontSize: '10px', background: '#d97706', color: 'white', padding: '2px 4px', borderRadius: '4px', marginLeft: '5px' }}>B1G1 Combined</span>}
                        <span className={`stock ${p.availableStock <= 0 ? 'out' : ''}`}>Stock: {p.availableStock}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <div className="pos-body-full">
          <div className="pos-bill-enhanced">
            <div className="cart-container">
              <div className="table-wrapper">
                <table className="cart-table-v2">
                  <thead>
                    <tr>
                      <th>Product Details</th>
                      <th style={{ textAlign: 'center' }}>Unit Price</th>
                      <th style={{ textAlign: 'center' }}>Quantity</th>
                      <th style={{ textAlign: 'right' }}>Subtotal</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="empty-cart-msg">
                          <i className="fas fa-shopping-basket"></i>
                          <p>No items in cart. Start scanning or searching!</p>
                        </td>
                      </tr>
                    ) : (
                      cart.map(i => (
                        <tr key={i.productId}>
                          <td>
                            <div className="product-name">{i.name}</div>
                            <div className="product-sku">
                              SKU: {i.sku}
                              {(i.size || i.unit) && (
                                <span style={{ marginLeft: '8px', color: '#555' }}>
                                  | {i.size} {i.unit}
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>₹{i.price.toFixed(2)}</td>
                          <td>
                            <div className="qty-controls-v2">
                              <button onClick={() => updateQty(i.productId, -1)} className="qty-btn">-</button>
                              <span className="qty-val">{i.qty}</span>
                              <button onClick={() => updateQty(i.productId, 1)} className="qty-btn">+</button>
                            </div>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{(i.price * i.qty).toFixed(2)}</td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              className="remove-btn"
                              onClick={() => setCart(cart.filter(x => x.productId !== i.productId))}
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="checkout-sidebar">
              <div className="bill-card">
                <h3>Summary</h3>
                <div className="bill-row"><span>Items ({cart.reduce((a, b) => a + b.qty, 0)})</span><span>₹{subtotal.toFixed(2)}</span></div>
                <div className="bill-row"><span>Tax (GST 5%)</span><span>₹{gst.toFixed(2)}</span></div>

                {itemDiscounts > 0 && (
                  <div className="bill-row" style={{ color: '#10b981' }}>
                    <span>B1G1 Savings</span>
                    <span>-₹{itemDiscounts.toFixed(2)}</span>
                  </div>
                )}

                {/* Configurable Bill Offer */}
                <div style={{ background: '#fffbeb', padding: '8px', borderRadius: '6px', marginBottom: '8px', border: '1px solid #fcd34d' }}>
                  <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#b45309', marginBottom: '4px' }}>🎉 Auto Bill Offer Config</div>
                  <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px' }}>If &gt; ₹</span>
                    <input
                      type="number"
                      value={billThreshold}
                      onChange={e => setBillThreshold(Number(e.target.value))}
                      style={{ width: '50px', padding: '2px', fontSize: '11px' }}
                    />
                    <span style={{ fontSize: '11px' }}>Get</span>
                    <input
                      type="number"
                      value={billOfferPercent}
                      onChange={e => setBillOfferPercent(Number(e.target.value))}
                      style={{ width: '35px', padding: '2px', fontSize: '11px' }}
                    />
                    <span style={{ fontSize: '11px' }}>% Off</span>
                  </div>
                </div>

                {billDiscount > 0 && (
                  <div className="bill-row" style={{ color: '#d97706' }}>
                    <span>Special Offer ({billOfferPercent}% off)</span>
                    <span>-₹{billDiscount.toFixed(2)}</span>
                  </div>
                )}

                <div className="bill-row">
                  <span>Manual Discount (%)</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <input
                      type="number"
                      className="disc-input"
                      value={discount}
                      onChange={e => setDiscount(Number(e.target.value))}
                      placeholder="0"
                      max="100"
                    />
                    <span style={{ fontSize: '14px', fontWeight: 'bold' }}>%</span>
                  </div>
                </div>

                {manualDiscountAmount > 0 && (
                  <div className="bill-row" style={{ color: '#6366f1', fontSize: '12px' }}>
                    <span>(Manual Amt)</span>
                    <span>-₹{manualDiscountAmount.toFixed(2)}</span>
                  </div>
                )}

                <div className="total-divider"></div>
                <div className="bill-row total">
                  <strong>Payable</strong>
                  <strong>₹{total.toFixed(2)}</strong>
                </div>
              </div>

              <div className="payment-card">
                <h3>Payment</h3>
                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="method-select">
                  <option value="cash">Cash Payment</option>
                  <option value="upi">UPI / GPay (UTR Needed)</option>
                  <option value="qr">QR Code Scan</option>
                  <option value="card">Debit/Credit Card</option>
                </select>

                {paymentMethod === 'upi' && (
                  <div className="payment-extra">
                    <input placeholder="Enter UTR / Transaction ID" value={utr} onChange={e => setUtr(e.target.value)} />
                  </div>
                )}

                {paymentMethod === 'qr' && (
                  <div className="qr-checkout-box">
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=upi://pay?pa=${user?.upi_id || 'samartha@upi'}&pn=RetailStore&am=${total}&cu=INR`} alt="QR Code" />
                    <p>Scan to Pay ₹{total.toFixed(2)}</p>
                  </div>
                )}

                {paymentMethod === 'card' && (
                  <div className="payment-extra card-inputs">
                    <input placeholder="Card Holder Name" value={cardData.name} onChange={e => setCardData({ ...cardData, name: e.target.value })} />
                    <input placeholder="Last 4 Digits" value={cardData.number} onChange={e => setCardData({ ...cardData, number: e.target.value })} />
                  </div>
                )}

                <button className="checkout-btn" onClick={completePayment} disabled={loading || cart.length === 0}>
                  {loading ? "PROCESSING..." : "FINAL CHECKOUT"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {showReceipt && (
          <div className="receipt-modal">
            <div className="receipt-content">
              <div ref={receiptRef} className="receipt-paper" style={{ padding: '10px', fontSize: '12px' }}>
                <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                  <h3 style={{ margin: '0 0 5px 0' }}>RETAIL STORE</h3>
                  <p style={{ margin: '0 0 2px 0' }}>Branch: {branchName}</p>
                  <p style={{ margin: 0 }}>{new Date().toLocaleString()}</p>
                </div>

                <table style={{ width: '100%', minWidth: '0', tableLayout: 'fixed', borderCollapse: 'collapse', marginBottom: '10px', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px dashed #000' }}>
                      <th style={{ textAlign: 'left', padding: '2px 0', width: '40%' }}>Item</th>
                      <th style={{ textAlign: 'center', padding: '2px 0', width: '15%' }}>Qty</th>
                      <th style={{ textAlign: 'right', padding: '2px 0', width: '20%' }}>Rate</th>
                      <th style={{ textAlign: 'right', padding: '2px 0', width: '25%' }}>Amt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map(i => (
                      <tr key={i.productId}>
                        <td style={{ padding: '2px 0' }}>
                          {i.name}
                          {(i.size || i.unit) && (
                            <span style={{ fontSize: '10px', marginLeft: '4px', color: '#555' }}>
                              ({i.size || ''} {i.unit || ''})
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center', padding: '2px 0' }}>{i.qty}</td>
                        <td style={{ textAlign: 'right', padding: '2px 0' }}>{i.price.toFixed(2)}</td>
                        <td style={{ textAlign: 'right', padding: '2px 0' }}>{(i.price * i.qty).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ borderTop: '1px dashed #000', paddingTop: '5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Taxable Amount:</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>CGST (2.5%):</span>
                    <span>₹{(gst / 2).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>SGST (2.5%):</span>
                    <span>₹{(gst / 2).toFixed(2)}</span>
                  </div>
                  {discount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Discount:</span>
                      <span>-₹{discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', borderTop: '1px solid #000', marginTop: '5px', paddingTop: '5px', fontSize: '14px' }}>
                    <span>Grand Total:</span>
                    <span>₹{total.toFixed(2)}</span>
                  </div>
                </div>

                <p style={{ textAlign: 'center', marginTop: '15px', fontSize: '10px' }}>*** Thank You! Visit Again ***</p>
              </div>
              <div className="receipt-actions">
                <button onClick={() => { printReceipt(); setShowReceipt(false); setCart([]); setMobile(""); setDiscount(0); setLastSale(null); }}>🖨️ Print & Done</button>
                <button onClick={() => { setShowReceipt(false); setCart([]); setMobile(""); setDiscount(0); setLastSale(null); }}>✅ Done — New Sale</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
