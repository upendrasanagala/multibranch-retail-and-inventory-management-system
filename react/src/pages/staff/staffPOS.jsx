import { useEffect, useState, useRef } from "react";
import "../../styles/dashboard.css";
import { formatDate, formatDateTime } from "../../utils/dateUtils";
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
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) { console.warn("Audio play failed", e); }
  };

  const playSuccessSound = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      const playTone = (freq, type, startTime, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime + startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + startTime + duration);
        osc.start(ctx.currentTime + startTime);
        osc.stop(ctx.currentTime + startTime + duration);
      };

      // "Coin Collect" / "Level Up" style sound
      playTone(523.25, "sine", 0, 0.1);       // C5
      playTone(659.25, "sine", 0.1, 0.1);     // E5
      playTone(783.99, "square", 0.2, 0.3);   // G5 (Square wave for "8-bit" feel)
      playTone(1046.50, "sine", 0.3, 0.4);    // C6
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
        size: product.size, // Added Size
        gst_percent: product.gst_percent || 0 // Added GST for receipt grouping
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

  const [showSuccess, setShowSuccess] = useState(false);

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
      setShowSuccess(true);

      // Capture data for printing IMMEDIATELY (to avoid any state/closure issues)
      const printSaleData = {
        items: cart,
        subtotal,
        gst,
        discount: autoDiscount + manualDiscountAmount,
        discountBreakdown: {
          b1g1: itemDiscounts,
          bill: billDiscount,
          manual: manualDiscountAmount
        },
        billOfferPercent: billOfferPercent, // Pass for display
        total,
        transaction_id: res.transaction_id,
        transaction_date: formatDateTime(new Date())
      };

      // Delay before reset & print (show animation)
      setTimeout(() => {
        setShowSuccess(false);
        setCart([]);
        setDiscount(0);
        setPaymentMethod("");
        setUtr("");
        setCardData({ name: "", number: "" });

        printReceipt(printSaleData);
        loadInventory(); // Auto-refresh stock
      }, 2000);

    } catch (err) {
      alert("Current Sale Failed: " + err.message);
    }
    setLoading(false);
  };

  /* ================= PRINT RECEIPT ================= */
  const printReceipt = (saleData) => {
    const printWindow = window.open("", "", "width=400,height=600");

    if (!printWindow) {
      alert("⚠️ Receipt printing was blocked by your browser.\nPlease allow popups for this site.");
      return;
    }

    const sale = saleData || {
      items: [],
      subtotal: 0,
      gst: 0,
      discount: 0,
      discountBreakdown: { b1g1: 0, bill: 0, manual: 0 },
      transaction_id: "ERR",
      transaction_date: new Date().toLocaleString()
    };

    // --- 1. Group items by GST Rate ---
    const gstGroups = {};
    const gstBreakup = {}; // { '5': { taxable: 0, cgst: 0, sgst: 0, total: 0 } }

    sale.items.forEach(item => {
      const rate = item.gst_percent || 0;
      if (!gstGroups[rate]) gstGroups[rate] = [];
      gstGroups[rate].push(item);

      // Calculate breakup
      if (!gstBreakup[rate]) gstBreakup[rate] = { taxable: 0, cgst: 0, sgst: 0, total: 0 };

      const itemTotal = Number(item.price) * Number(item.qty);
      // Back-calculate taxable from total (Assuming price includes GST)
      // Taxable = Total / (1 + rate/100)
      const taxable = itemTotal / (1 + rate / 100);
      const taxAmt = itemTotal - taxable;

      gstBreakup[rate].taxable += taxable;
      gstBreakup[rate].cgst += taxAmt / 2;
      gstBreakup[rate].sgst += taxAmt / 2;
      gstBreakup[rate].total += itemTotal;
    });

    const breakdown = sale.discountBreakdown || { b1g1: 0, bill: 0, manual: 0 };
    const totalSavings = (breakdown.b1g1 || 0) + (breakdown.bill || 0) + (breakdown.manual || 0) + (sale.discount || 0);

    // --- HTML Template ---
    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice #${sale.transaction_id}</title>
          <style>
            body { font-family: 'Courier New', monospace; font-size: 11px; padding: 10px; margin: 0; width: 300px; }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            
            .header img { width: 100px; margin-bottom: 5px; } /* Placeholder for Logo */
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
            .barcode { margin: 10px auto; height: 30px; background: #000; width: 80%; display: block; } /* Mockup */
          </style>
        </head>
        <body>
          <div class="header">
            <h2>RETAIL STORE</h2>
            <p>Branch: ${branchName}</p>
            <p>Phone: +91 98765 43210</p>
            <br/>
            <h3 style="margin:0; text-decoration: underline;">TAX INVOICE</h3>
          </div>

          <div class="meta">
            <div>Bill No: ${sale.transaction_id}</div>
            <div class="right">Date: ${formatDate(new Date())}</div>
            <div>Cashier: ${user?.name || 'Staff'}</div>
            <div class="right">Time: ${new Date().toLocaleTimeString()}</div>
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
                      ${i.name}
                      ${i.is_b1g1 ? '<br/>(B1G1 Free)' : ''}
                      ${(i.size || i.unit) ? `<br/><span style="font-size:9px">${i.size || ''}${i.unit || ''}</span>` : ''}
                    </td>
                    <td class="center">${i.qty}</td>
                    <td class="right">${Number(i.price).toFixed(2)}</td>
                    <td class="right">${(Number(i.price) * Number(i.qty)).toFixed(2)}</td>
                  </tr>
                `).join('')}
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            <p><span>Total Items: ${sale.items.length}</span> <span>Total Qty: ${sale.items.reduce((s, i) => s + i.qty, 0)}</span></p>
            
            <p style="border-top: 1px dotted #000; margin-top: 5px; padding-top: 2px;">
              <span>Gross Amount:</span> <span>₹${sale.items.reduce((s, i) => s + (i.price * i.qty), 0).toFixed(2)}</span>
            </p>

            ${breakdown.b1g1 > 0 ? `<p><span>Less: B1G1 Savings:</span> <span>-₹${breakdown.b1g1.toFixed(2)}</span></p>` : ''}
            ${breakdown.bill > 0 ? `<p><span>Less: Bill Offer:</span> <span>-₹${breakdown.bill.toFixed(2)}</span></p>` : ''}
            ${breakdown.manual > 0 ? `<p><span>Less: Manual Disc:</span> <span>-₹${breakdown.manual.toFixed(2)}</span></p>` : ''}
            
            <p class="grand-total"><span>Grand Total:</span> <span>₹${sale.total.toFixed(2)}</span></p>
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
            <span class="right" style="float:right">₹${sale.total.toFixed(2)}</span>
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

    printWindow.document.close();
    printWindow.focus();
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
      <style>{`
          @keyframes check-scale {
            0% { transform: scale(0); opacity: 0; }
            50% { transform: scale(1.2); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes check-stroke {
            0% { stroke-dashoffset: 100; }
            100% { stroke-dashoffset: 0; }
          }
          @keyframes confetti-pop {
            0% { transform: scale(0); opacity: 1; }
            100% { transform: scale(1.5); opacity: 0; }
          }
          .success-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.7);
            backdrop-filter: blur(4px);
            display: flex; justify-content: center; alignItems: center;
            z-index: 10000;
          }
          .success-card {
            background: white; padding: 50px; border-radius: 30px;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0,0,0,0.4);
            animation: check-scale 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
            position: relative;
            overflow: hidden;
          }
          .checkmark-wrapper {
            width: 100px; height: 100px; margin: 0 auto 20px;
            position: relative;
          }
          .checkmark-circle {
            width: 100%; height: 100%;
            background: #22c55e; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 10px 30px rgba(34, 197, 94, 0.4);
            position: relative;
            z-index: 2;
          }
          /* Confetti Particles */
          .particles {
            position: absolute; top: 50%; left: 50%; width: 100%; height: 100%;
            pointer-events: none; z-index: 1;
            transform: translate(-50%, -50%);
          }
          .particle {
            position: absolute; width: 10px; height: 10px;
            background: #fcd34d; border-radius: 50%;
            opacity: 0;
          }
          .particle:nth-child(1) { top: 0; left: 50%; animation: confetti-pop 0.6s ease-out 0.3s forwards; }
          .particle:nth-child(2) { top: 20%; left: 80%; background: #ef4444; animation: confetti-pop 0.6s ease-out 0.4s forwards; }
          .particle:nth-child(3) { top: 80%; left: 80%; background: #3b82f6; animation: confetti-pop 0.6s ease-out 0.3s forwards; }
          .particle:nth-child(4) { top: 100%; left: 50%; animation: confetti-pop 0.6s ease-out 0.5s forwards; }
          .particle:nth-child(5) { top: 80%; left: 20%; background: #ec4899; animation: confetti-pop 0.6s ease-out 0.3s forwards; }
          .particle:nth-child(6) { top: 20%; left: 20%; background: #8b5cf6; animation: confetti-pop 0.6s ease-out 0.4s forwards; }

          .checkmark-svg {
            width: 60px; height: 60px;
            stroke: white; stroke-width: 6; fill: none;
            stroke-linecap: round; stroke-linejoin: round;
            stroke-dasharray: 100; stroke-dashoffset: 100;
            animation: check-stroke 0.4s cubic-bezier(0.65, 0, 0.45, 1) 0.3s forwards;
          }
        `}</style>

      {showSuccess && (
        <div className="success-overlay">
          <div className="success-card">
            <div className="checkmark-wrapper">
              <div className="particles">
                <div className="particle"></div><div className="particle"></div>
                <div className="particle"></div><div className="particle"></div>
                <div className="particle"></div><div className="particle"></div>
              </div>
              <div className="checkmark-circle">
                <svg className="checkmark-svg" viewBox="0 0 52 52">
                  <path d="M14 27l10 10 L40 16" />
                </svg>
              </div>
            </div>
            <h2 style={{
              color: '#15803d', margin: '0 0 10px 0',
              fontSize: '28px', fontWeight: '800',
              letterSpacing: '-0.5px'
            }}>Payment Successful!</h2>
            <p style={{ color: '#666', margin: 0, fontSize: '14px' }}>Printing Receipt...</p>
          </div>
        </div>
      )}

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
                            <div className="product-name">
                              {i.name}
                              {i.is_b1g1 && <span style={{ fontSize: '10px', background: '#d97706', color: 'white', padding: '1px 3px', borderRadius: '3px', marginLeft: '5px' }}>B1G1</span>}
                            </div>
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

                          <td style={{ textAlign: 'right', fontWeight: 700 }}>
                            {i.is_b1g1 && i.qty >= 2 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                <span style={{ textDecoration: 'line-through', color: '#94a3b8', fontSize: '11px' }}>
                                  ₹{(i.price * i.qty).toFixed(2)}
                                </span>
                                <span style={{ color: '#16a34a' }}>
                                  ₹{(i.price * (i.qty - Math.floor(i.qty / 2))).toFixed(2)}
                                </span>
                                <span style={{ fontSize: '10px', color: '#16a34a', fontWeight: 'normal' }}>
                                  (Free: {Math.floor(i.qty / 2)})
                                </span>
                              </div>
                            ) : (
                              `₹${(i.price * i.qty).toFixed(2)}`
                            )}
                          </td>
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

        {
          showReceipt && (
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
                            {i.is_b1g1 && <span style={{ fontSize: '10px', fontWeight: 'bold' }}> (B1G1)</span>}
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
          )
        }
      </div >
    </div >
  );
}
