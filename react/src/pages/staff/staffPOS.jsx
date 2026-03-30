import { useEffect, useState, useRef } from "react";
import "../../styles/dashboard.css";
import { formatDate, formatDateTime } from "../../utils/dateUtils";
import api from "../../services/api";
import { getCurrentUser } from "../../services/authService";
import { useToast } from "../../components/ToastContext";

export default function StaffPOS() {
  const { showToast } = useToast();
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
  const [cashReceived, setCashReceived] = useState(""); // New state for Cash Tendered

  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const receiptRef = useRef();

  const GST_PERCENT = 0;

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
        is_b1g1: p.is_b1g1, // Map B1G1 flag
        gst_percent: p.gst_percent || 0 // Per-product GST rate
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
          showToast("Out of stock!", "warning");
        }
      } else {
        showToast("Product not found!", "error");
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
    // Pre-check stock before updating state
    const existing = cart.find(i => i.productId === (product.product_id || product.id));
    if (existing) {
      const productInInventory = products.find(p => p.productId === (product.product_id || product.id));
      if (existing.qty + 1 > productInInventory.stock) {
        showToast("Cannot exceed available stock!", "warning");
        return;
      }
    } else if (product.stock <= 0) {
      showToast("Product is out of stock!", "warning");
      return;
    }
    setCart(prev => {
      const ex = prev.find(i => i.productId === (product.product_id || product.id));
      if (ex) {
        return prev.map(i => i.productId === (product.product_id || product.id)
          ? { ...i, qty: i.qty + 1 }
          : i
        );
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
        gst_percent: product.gst_percent || 0, // Added GST for receipt grouping
      }];
    });
    playBeep(); // Play sound
    setSearch(""); // Clear search
  };

  const updateQty = (id, delta) => {
    const product = products.find(p => p.productId === id);
    const item = cart.find(i => i.productId === id);
    if (delta > 0 && item.qty >= product.stock) {
      showToast("Cannot exceed available stock!", "warning");
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
  const [billThreshold, setBillThreshold] = useState(2000);
  const [billOfferPercent, setBillOfferPercent] = useState(5);

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
    if (cart.length === 0) { showToast("Cart is empty", "warning"); return; }
    if (!mobile || mobile.length < 10) { showToast("Customer mobile number is mandatory (10 digits)", "warning"); return; }
    if (!/^[6-9]/.test(mobile)) { showToast("Mobile number must start with 6, 7, 8, or 9", "warning"); return; }
    if (!paymentMethod) { showToast("Select payment method", "warning"); return; }
    if (paymentMethod === 'upi' && !utr) { showToast("Enter UTR for UPI", "warning"); return; }
    if (paymentMethod === 'card' && !cardData.name) { showToast("Enter Card Details", "warning"); return; }
    if (paymentMethod === 'cash' && Number(cashReceived) < total) { showToast(`Insufficient Cash! Need ₹${(total - Number(cashReceived)).toFixed(2)} more.`, "error"); return; }

    setLoading(true); // Assuming setLoading is used for processing state
    try {
      const saleData = {
        branch_id: user?.branch_id,
        customer_mobile: mobile,
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
        billOfferPercent: billOfferPercent,
        total,
        transaction_id: res.transaction_id,
        invoice_number: res.invoice_number,
        transaction_date: formatDateTime(new Date()),
        mobile: mobile || '',
        paymentMethod: paymentMethod,
        utr: utr || '',
        cardHolder: cardData.name || '',
        cashReceived: Number(cashReceived) || 0,
        change: paymentMethod === 'cash' ? Math.max(0, Number(cashReceived) - total) : 0
      };

      // Delay before reset & print (show animation)
      setTimeout(() => {
        setShowSuccess(false);
        setCart([]);
        setDiscount(0);
        setPaymentMethod("");
        setUtr("");
        setCardData({ name: "", number: "" });
        setCashReceived("");

        printReceipt(printSaleData);
        loadInventory(); // Auto-refresh stock
      }, 2000);

    } catch (err) {
      showToast("Current Sale Failed: " + err.message, "error");
    }
    setLoading(false);
  };


  /* ================= PRINT RECEIPT ================= */
  const printReceipt = (saleData) => {
    const printWindow = window.open("", "", "width=350,height=600");

    if (!printWindow) {
      showToast("Receipt printing was blocked. Please allow popups for this site.", "warning");
      return;
    }

    const sale = saleData || {
      items: [], subtotal: 0, gst: 0, discount: 0,
      discountBreakdown: { b1g1: 0, bill: 0, manual: 0 },
      transaction_id: "ERR", transaction_date: new Date().toLocaleString(),
      mobile: '', paymentMethod: 'cash', utr: '', cardHolder: '',
      cashReceived: 0, change: 0
    };

    // GST breakup
    const gstBreakup = {};
    sale.items.forEach(item => {
      const rate = item.gst_percent || 0;
      if (!gstBreakup[rate]) gstBreakup[rate] = { taxable: 0, cgst: 0, sgst: 0 };
      const itemTotal = Number(item.price) * Number(item.qty);
      const taxable = itemTotal / (1 + rate / 100);
      const taxAmt = itemTotal - taxable;
      gstBreakup[rate].taxable += taxable;
      gstBreakup[rate].cgst += taxAmt / 2;
      gstBreakup[rate].sgst += taxAmt / 2;
    });

    const breakdown = sale.discountBreakdown || { b1g1: 0, bill: 0, manual: 0 };
    const totalSavings = (breakdown.b1g1 || 0) + (breakdown.bill || 0) + (breakdown.manual || 0);
    const roundedTotal = Math.round(sale.total);
    const roundOff = roundedTotal - sale.total;
    const grossAmt = sale.items.reduce((s, i) => s + (i.price * i.qty), 0);
    const totalQty = sale.items.reduce((s, i) => s + i.qty, 0);
    const invoiceNo = sale.invoice_number || sale.transaction_id;
    const payMethod = (sale.paymentMethod || paymentMethod || 'cash').toUpperCase();

    // Amount in words (Indian)
    const numberToWords = (num) => {
      const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
        'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
      const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
      if (num === 0) return 'Zero';
      const n = Math.abs(Math.round(num));
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
      if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + numberToWords(n % 100) : '');
      if (n < 100000) return numberToWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + numberToWords(n % 1000) : '');
      if (n < 10000000) return numberToWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + numberToWords(n % 100000) : '');
      return numberToWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + numberToWords(n % 10000000) : '');
    };

    // Helper: pad/align text for monospace
    const L = 42; // line width in characters
    const dash = '-'.repeat(L);
    const dblLine = '='.repeat(L);
    const center = (txt) => { const pad = Math.max(0, Math.floor((L - txt.length) / 2)); return ' '.repeat(pad) + txt; };
    const leftRight = (l, r) => l + ' '.repeat(Math.max(1, L - l.length - r.length)) + r;

    // Build items
    let itemLines = '';
    let sno = 0;
    sale.items.forEach(i => {
      sno++;
      const name = i.name.length > 24 ? i.name.substring(0, 22) + '..' : i.name;
      const amt = (Number(i.price) * Number(i.qty)).toFixed(2);
      const gstTag = (i.gst_percent || 0) + '%';
      // Line 1: SNo. Name
      itemLines += sno + '. ' + name;
      if (i.is_b1g1) itemLines += ' (B1G1)';
      itemLines += '\n';
      // Line 2:   Qty x Rate = Amount  [GST%]
      const detail = '   ' + i.qty + ' x ' + Number(i.price).toFixed(2) + ' = ' + amt + '  [' + gstTag + ']';
      itemLines += detail + '\n';
    });

    // GST breakup lines
    let gstLines = '';
    gstLines += leftRight('GST%   Taxable    CGST     SGST', '') + '\n';
    gstLines += dash + '\n';
    let totTaxable = 0, totCGST = 0, totSGST = 0;
    Object.keys(gstBreakup).sort((a, b) => Number(a) - Number(b)).forEach(rate => {
      const g = gstBreakup[rate];
      totTaxable += g.taxable; totCGST += g.cgst; totSGST += g.sgst;
      const rateStr = (rate + '%').padEnd(7);
      const taxableStr = g.taxable.toFixed(2).padStart(9);
      const cgstStr = g.cgst.toFixed(2).padStart(9);
      const sgstStr = g.sgst.toFixed(2).padStart(9);
      gstLines += rateStr + taxableStr + cgstStr + sgstStr + '\n';
    });
    gstLines += dash + '\n';
    gstLines += 'Total'.padEnd(7) + totTaxable.toFixed(2).padStart(9) + totCGST.toFixed(2).padStart(9) + totSGST.toFixed(2).padStart(9) + '\n';

    // Payment info
    let payInfo = 'Mode: ' + payMethod;
    if (payMethod === 'UPI' && sale.utr) payInfo += '  UTR: ' + sale.utr;
    if (payMethod === 'CARD' && sale.cardHolder) payInfo += '  ' + sale.cardHolder;

    let cashInfo = '';
    if (payMethod === 'CASH' && sale.cashReceived > 0) {
      cashInfo = leftRight('Cash Tendered:', 'Rs.' + sale.cashReceived.toFixed(2)) + '\n';
      cashInfo += leftRight('Change:', 'Rs.' + sale.change.toFixed(2)) + '\n';
    }

    // Discount lines
    let discLines = '';
    if (breakdown.b1g1 > 0) discLines += leftRight('Less: B1G1 Savings', '-Rs.' + breakdown.b1g1.toFixed(2)) + '\n';
    if (breakdown.bill > 0) discLines += leftRight('Less: Bill Offer(' + (sale.billOfferPercent || 10) + '%)', '-Rs.' + breakdown.bill.toFixed(2)) + '\n';
    if (breakdown.manual > 0) discLines += leftRight('Less: Manual Discount', '-Rs.' + breakdown.manual.toFixed(2)) + '\n';

    // Round off
    let roundLine = '';
    if (Math.abs(roundOff) >= 0.01) {
      roundLine = leftRight('Round Off', (roundOff >= 0 ? '+' : '') + roundOff.toFixed(2)) + '\n';
    }

    // Savings
    let savingsLine = '';
    if (totalSavings > 0) {
      savingsLine = '\n' + center('** You Saved Rs.' + totalSavings.toFixed(2) + ' **') + '\n';
    }

    // Full receipt text
    const receipt =
      center('RETAIL STORE') + '\n' +
      center('Branch: ' + branchName) + '\n' +
      center('4-143, Srinagar Colony, Vijayawada - 520001') + '\n' +
      center('GSTIN: 37XXXXX0000X1ZX') + '\n' +
      dblLine + '\n' +
      center('TAX INVOICE') + '\n' +
      dblLine + '\n' +
      leftRight('Bill No: ' + invoiceNo, 'Date: ' + formatDate(new Date())) + '\n' +
      leftRight('Cashier: ' + (user?.name || 'Staff'), 'Time: ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })) + '\n' +
      'Customer: ' + (sale.mobile || 'Walk-in') + '\n' +
      dash + '\n' +
      leftRight('ITEM', 'QTY x RATE = AMT [GST]') + '\n' +
      dash + '\n' +
      itemLines +
      dash + '\n' +
      leftRight('Total Items: ' + sale.items.length, 'Total Qty: ' + totalQty) + '\n' +
      dash + '\n' +
      leftRight('Gross Amount:', 'Rs.' + grossAmt.toFixed(2)) + '\n' +
      discLines +
      (sale.gst > 0 ? leftRight('GST (Tax):', 'Rs.' + sale.gst.toFixed(2)) + '\n' : '') +
      roundLine +
      dblLine + '\n' +
      leftRight('NET PAYABLE:', 'Rs.' + roundedTotal.toFixed(2)) + '\n' +
      dblLine + '\n' +
      'Rs. ' + numberToWords(roundedTotal) + ' Only' + '\n' +
      dash + '\n' +
      '\n' +
      (totCGST + totSGST > 0 ? (center('--- GST BREAKUP ---') + '\n' + gstLines + dash + '\n\n') : '') +
      leftRight('Payment:', payMethod) + '\n' +
      payInfo + '\n' +
      cashInfo +
      dash + '\n' +
      savingsLine +
      '\n' +
      center('Thank you! Visit Again') + '\n' +
      center('Goods once sold will not be taken back') + '\n' +
      center('E. & O.E.') + '\n' +
      '\n' +
      center('--- Authorized Signatory ---') + '\n' +
      '\n' +
      center('Computer Generated Invoice') + '\n';

    // Build HTML with monospace pre-formatted text (thermal POS style)
    const html = '<!DOCTYPE html><html><head>' +
      '<title>Invoice #' + invoiceNo + '</title>' +
      '<style>' +
      '* { margin:0; padding:0; }' +
      'body { font-family: "Courier New", "Lucida Console", monospace; font-size: 12px; padding: 5px; width: 302px; color: #000; line-height: 1.4; }' +
      'pre { white-space: pre-wrap; word-wrap: break-word; font-family: inherit; font-size: inherit; margin: 0; }' +
      '@media print { body { width: 100%; padding: 2px; } }' +
      '</style>' +
      '</head><body>' +
      '<pre>' + receipt + '</pre>' +
      '</body></html>';

    printWindow.document.write(html);
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
      showToast("Product out of stock!", "warning");
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>Customer Mobile</label>
              <span style={{
                fontSize: '11px',
                color: mobile.length === 10 && /^[6-9]/.test(mobile) ? '#10b981' : (mobile.length > 0 && !/^[6-9]/.test(mobile) ? '#ef4444' : '#64748b'),
                fontWeight: mobile.length === 10 ? 700 : 400
              }}>
                {mobile.length > 0 && !/^[6-9]/.test(mobile) ? 'Invalid start (Must be 6,7,8,9)' : `${mobile.length} / 10 digits`}
              </span>
            </div>
            <input
              placeholder="Enter Mobile Number"
              value={mobile}
              onChange={e => {
                let val = e.target.value.replace(/\D/g, '');
                if (val.length > 0 && !['6', '7', '8', '9'].includes(val[0])) {
                  // If they try to type an invalid first digit, we can either block it or show error
                  // Let's allow typing but the UI/Validation will catch it
                }
                setMobile(val.slice(0, 10));
              }}
            />
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
                {gst > 0 && <div className="bill-row"><span>Tax (GST 5%)</span><span>₹{gst.toFixed(2)}</span></div>}

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
                      onWheel={(e) => e.target.blur()}
                      onKeyDown={(e) => ["ArrowUp", "ArrowDown"].includes(e.key) && e.preventDefault()}
                      style={{ width: '50px', padding: '2px', fontSize: '11px' }}
                    />
                    <span style={{ fontSize: '11px' }}>Get</span>
                    <input
                      type="number"
                      value={billOfferPercent}
                      onChange={e => setBillOfferPercent(Number(e.target.value))}
                      onWheel={(e) => e.target.blur()}
                      onKeyDown={(e) => ["ArrowUp", "ArrowDown"].includes(e.key) && e.preventDefault()}
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
                      onWheel={(e) => e.target.blur()}
                      onKeyDown={(e) => ["ArrowUp", "ArrowDown"].includes(e.key) && e.preventDefault()}
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

                {paymentMethod === 'cash' && (
                  <div className="payment-extra" style={{ marginTop: '10px', background: '#f0fdf4', padding: '10px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#166534', display: 'block', marginBottom: '5px' }}>💵 Cash Received (₹)</label>
                    <input
                      type="number"
                      placeholder="Amount Tendered"
                      value={cashReceived}
                      onChange={e => setCashReceived(e.target.value)}
                      onWheel={(e) => e.target.blur()}
                      onKeyDown={(e) => ["ArrowUp", "ArrowDown"].includes(e.key) && e.preventDefault()}
                      style={{ width: '100%', padding: '8px', fontSize: '16px', fontWeight: 'bold', border: '2px solid #22c55e', borderRadius: '6px' }}
                    />
                    {Number(cashReceived) > total && (
                      <div style={{ marginTop: '10px', fontSize: '14px', fontWeight: 'bold', color: '#15803d', display: 'flex', justifyContent: 'space-between', paddingTop: '5px', borderTop: '1px dashed #16a34a' }}>
                        <span>Change to Return:</span>
                        <span style={{ fontSize: '18px' }}>₹{(Number(cashReceived) - total).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )}

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
                    {gst > 0 && (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>CGST (2.5%):</span>
                          <span>₹{(gst / 2).toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>SGST (2.5%):</span>
                          <span>₹{(gst / 2).toFixed(2)}</span>
                        </div>
                      </>
                    )}
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
