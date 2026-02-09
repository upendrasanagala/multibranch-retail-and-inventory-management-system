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

  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");

  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const receiptRef = useRef();

  const GST_PERCENT = 5;

  /* ================= LOAD INVENTORY FROM BACKEND ================= */
  const loadInventory = async () => {
    setLoading(true);
    try {
      // Get inventory for user's branch
      const branchId = user?.branch_id || user?.branch?.branch_id;

      if (branchId) {
        const response = await api.inventory.getByBranch(branchId);
        const inventory = response.inventory || [];

        // Transform inventory items to product format
        const productsWithStock = inventory.map(inv => ({
          productId: inv.product_id,
          id: inv.product_id,
          name: inv.product?.name || 'Unknown Product',
          price: inv.product?.unit_price || 0,
          stock: inv.quantity,
          sku: inv.product?.sku
        }));

        setProducts(productsWithStock);
      } else {
        // Fallback: get all products with limited stock info
        const response = await api.products.getAll();
        const allProducts = (response.products || []).map(p => ({
          productId: p.product_id || p.id,
          id: p.product_id || p.id,
          name: p.name,
          price: p.unit_price || p.price || 0,
          stock: 50, // Default stock
          sku: p.sku
        }));
        setProducts(allProducts);
      }
    } catch (err) {
      console.error("Failed to load inventory:", err);
      // Fallback to localStorage
      const inventory = JSON.parse(localStorage.getItem("branchInventory")) || {};
      setProducts(inventory[user?.branch] || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadInventory();
  }, []);

  /* ================= BARCODE ================= */
  useEffect(() => {
    if (!barcode) return;

    const product = products.find(
      p =>
        String(p.productId) === barcode ||
        String(p.id) === barcode ||
        p.sku === barcode
    );

    if (product) {
      addToCart(product);
    }

    setBarcode("");
  }, [barcode]);

  /* ================= CART ================= */
  const addToCart = (product) => {
    if (product.stock <= 0) return;

    const existing = cart.find(
      i => i.productId === product.productId
    );

    if (existing) {
      if (existing.qty >= product.stock) return;

      setCart(
        cart.map(i =>
          i.productId === product.productId
            ? { ...i, qty: i.qty + 1 }
            : i
        )
      );
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
  };

  const updateQty = (id, delta) => {
    setCart(
      cart
        .map(i =>
          i.productId === id
            ? { ...i, qty: i.qty + delta }
            : i
        )
        .filter(i => i.qty > 0)
    );
  };

  /* ================= TOTAL ================= */
  const subtotal = cart.reduce(
    (s, i) => s + i.price * i.qty,
    0
  );

  const gst = (subtotal * GST_PERCENT) / 100;
  const total = subtotal + gst - discount;

  /* ================= COMPLETE PAYMENT - BACKEND API ================= */
  const completePayment = async () => {
    if (!cart.length) return;

    setLoading(true);

    try {
      const saleData = {
        branch_id: user?.branch_id || user?.branch?.branch_id,
        mobile: mobile,
        items: cart.map(item => ({
          product_id: item.productId,
          quantity: item.qty,
          price: item.price
        })),
        subtotal: subtotal,
        gst: gst,
        discount: discount,
        total: total,
        paymentMethod: paymentMethod
      };

      const response = await api.sales.create(saleData);

      setLastSale(response.transaction);
      setShowReceipt(true);

      // Reload inventory to get updated stock
      await loadInventory();

    } catch (err) {
      console.error("Failed to process sale:", err);
      alert("Failed to process sale: " + err.message);

      // Fallback to localStorage
      const inventory = JSON.parse(localStorage.getItem("branchInventory")) || {};
      const sales = JSON.parse(localStorage.getItem("sales")) || [];

      if (inventory[user?.branch]) {
        inventory[user.branch] = inventory[user.branch].map(p => {
          const sold = cart.find(c => c.productId === p.productId);
          return sold ? { ...p, stock: p.stock - sold.qty } : p;
        });
      }

      sales.push({
        invoice: "INV" + Date.now(),
        cashier: user?.email,
        branch: user?.branch,
        mobile,
        items: cart,
        subtotal,
        gst,
        discount,
        total,
        paymentMethod,
        date: new Date().toLocaleString()
      });

      localStorage.setItem("branchInventory", JSON.stringify(inventory));
      localStorage.setItem("sales", JSON.stringify(sales));

      loadInventory();
      setShowReceipt(true);
    }

    setLoading(false);
  };

  /* ================= PRINT RECEIPT ================= */
  const printReceipt = () => {
    const printWindow = window.open("", "", "width=380,height=600");
    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt</title>
          <style>
            body { font-family: monospace; padding: 10px; }
            h3 { text-align:center; }
          </style>
        </head>
        <body>
          ${receiptRef.current.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  /* ================= SEARCH ================= */
  const filtered = products.filter(p =>
    (p.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const branchName = user?.branch?.name || user?.branch || 'N/A';

  return (
    <div className="pos-super">

      <div className="pos-header">
        <div>
          <h2>Retail Supermarket POS</h2>
          <p>Branch: {branchName}</p>
        </div>
        <div>
          <p>Cashier: {user?.email}</p>
          {loading && <span style={{ color: '#666' }}> (Loading...)</span>}
        </div>
      </div>

      <div className="pos-customer">
        <input
          placeholder="Customer Mobile"
          value={mobile}
          onChange={e => setMobile(e.target.value)}
        />

        <input
          placeholder="Scan barcode / SKU"
          value={barcode}
          onChange={e => setBarcode(e.target.value)}
        />

        <input
          placeholder="Search product"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="pos-body">

        <div className="pos-products">
          {loading ? (
            <p>Loading products...</p>
          ) : filtered.length === 0 ? (
            <p>No products available</p>
          ) : (
            filtered.map(p => (
              <div
                key={p.productId}
                className="pos-item"
                onClick={() => addToCart(p)}
                style={{ opacity: p.stock <= 0 ? 0.5 : 1 }}
              >
                <h4>{p.name}</h4>
                <p>₹{p.price}</p>
                <span>
                  Stock: {p.stock}
                  {p.stock <= 5 && p.stock > 0 && (
                    <b style={{ color: "orange", marginLeft: 6 }}>
                      LOW
                    </b>
                  )}
                  {p.stock <= 0 && (
                    <b style={{ color: "red", marginLeft: 6 }}>
                      OUT
                    </b>
                  )}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="pos-bill">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Rate</th>
                <th>Qty</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {cart.map(i => (
                <tr key={i.productId}>
                  <td>{i.name}</td>
                  <td>₹{i.price}</td>
                  <td>
                    <button onClick={() => updateQty(i.productId, -1)}>-</button>
                    {i.qty}
                    <button onClick={() => updateQty(i.productId, 1)}>+</button>
                  </td>
                  <td>₹{i.price * i.qty}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="bill-summary">
            <p>Subtotal: ₹{subtotal}</p>
            <p>GST: ₹{gst.toFixed(2)}</p>

            <input
              type="number"
              placeholder="Discount"
              value={discount}
              onChange={e => setDiscount(Number(e.target.value))}
            />

            <h3>Total: ₹{total.toFixed(2)}</h3>

            <select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value)}
            >
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
            </select>

            <button onClick={completePayment} disabled={loading || cart.length === 0}>
              {loading ? "PROCESSING..." : "COMPLETE PAYMENT"}
            </button>
          </div>
        </div>
      </div>

      {showReceipt && (
        <div className="receipt-modal">
          <div ref={receiptRef} className="receipt">
            <h3>RETAIL STORE</h3>
            <p>Branch: {branchName}</p>
            {lastSale && <p>Invoice: {lastSale.invoice_number}</p>}
            <hr />
            {cart.map(i => (
              <p key={i.productId}>
                {i.name} × {i.qty} = ₹{i.price * i.qty}
              </p>
            ))}
            <hr />
            <p>Subtotal: ₹{subtotal}</p>
            <p>GST (5%): ₹{gst.toFixed(2)}</p>
            {discount > 0 && <p>Discount: -₹{discount}</p>}
            <p><strong>Total: ₹{total.toFixed(2)}</strong></p>
            <p>Payment: {paymentMethod.toUpperCase()}</p>
            <p align="center">Thank you!</p>
          </div>

          <button onClick={printReceipt}>🖨 Print</button>
          <button
            onClick={() => {
              setShowReceipt(false);
              setCart([]);
              setMobile("");
              setDiscount(0);
              setLastSale(null);
            }}
          >
            New Sale
          </button>
        </div>
      )}
    </div>
  );
}
