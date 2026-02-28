import { useEffect, useState } from "react";
import api from "../../services/api";
import { formatDate } from "../../utils/dateUtils";

const tableStyle = `
  .inventory-table tr {
    transition: all 0.2s ease;
  }
  .inventory-table tr:hover {
    background-color: #f8fafc !important;
    transform: scale(1.002);
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    z-index: 10;
    position: relative;
  }
  .inventory-table th {
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 0.05em;
    color: #64748b;
    font-weight: 700;
  }
`;

export default function ManagerInventory() {
  const [inventory, setInventory] = useState([]);
  const [allProducts, setAllProducts] = useState([]); // For transfer dropdown
  const [search, setSearch] = useState("");
  const [transfer, setTransfer] = useState({
    productId: "",
    quantity: "",
    toBranch: ""
  });

  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState([]);

  // ================= NEW: Adjustment State =================
  const [activeTab, setActiveTab] = useState("stock");
  const [adjustments, setAdjustments] = useState([]);

  const loadAdjustments = async () => {
    setLoading(true);
    try {
      const res = await api.inventory.getAdjustments({ branch_id: branchId });
      setAdjustments(res.adjustments || []);
    } catch (err) {
      console.error("Failed to load adjustments", err);
    }
    setLoading(false);
  };

  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
  const branchId = loggedInUser?.branch_id;
  const currentBranchName = loggedInUser?.branch_name || "Current Branch";

  /* ================= LOAD DATA ================= */
  useEffect(() => {
    if (branchId) {
      loadData();
    }
  }, [branchId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [invRes, branchRes, prodRes] = await Promise.all([
        api.inventory.getByBranch(branchId),
        api.branches.getAll(),
        api.products.getAll() // Load all products for transfer dropdown
      ]);

      setInventory(invRes.inventory || []);
      setBranches(branchRes.branches || []);
      setAllProducts(prodRes.products || []);
    } catch (err) {
      console.error("Failed to load data", err);
    }
    setLoading(false);
  };

  /* ================= SEARCH ================= */
  const filteredInventory = inventory.filter(p =>
    (p.product_name || p.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.sku || "").toLowerCase().includes(search.toLowerCase())
  );

  /* ================= REQUEST TRANSFER ================= */
  const requestTransfer = async (e) => {
    e.preventDefault();

    if (!transfer.productId || !transfer.quantity || !transfer.toBranch) {
      alert("All transfer fields required");
      return;
    }

    setLoading(true);
    try {
      await api.transfers.create({
        product_id: Number(transfer.productId),
        from_branch_id: Number(transfer.toBranch), // Requesting FROM this branch
        to_branch_id: branchId,                    // Delivering TO current branch
        quantity: Number(transfer.quantity),
        reason: "Stock replenishment"
      });

      alert("Stock transfer request sent successfully");
      setTransfer({ productId: "", quantity: "", toBranch: "" });
    } catch (err) {
      console.error("Transfer failed", err);
      alert("Failed to send transfer request: " + (err.response?.data?.message || err.message));
    }
    setLoading(false);
  };

  return (
    <div>

      <header className="topbar">
        <h2>📦 Branch Inventory: {currentBranchName}</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <span style={{ fontSize: '14px', color: '#666', alignSelf: 'center' }}>
            Total Items: {inventory.length}
          </span>
        </div>
      </header>

      {/* ================= SEARCH ================= */}
      <input
        type="text"
        placeholder="Search product by name or SKU..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          marginBottom: "20px",
          padding: "10px",
          width: "100%",
          borderRadius: "6px",
          border: "1px solid #ddd"
        }}
      />



      {/* ================= TABS ================= */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', borderBottom: '1px solid #ddd' }}>
        <button
          onClick={() => setActiveTab("stock")}
          style={{
            padding: '10px 0',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === "stock" ? '2px solid #2563eb' : 'none',
            color: activeTab === "stock" ? '#2563eb' : '#666',
            fontWeight: activeTab === "stock" ? '600' : '400',
            cursor: 'pointer'
          }}
        >
          Current Stock
        </button>
        <button
          onClick={() => { setActiveTab("adjustments"); loadAdjustments(); }}
          style={{
            padding: '10px 0',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === "adjustments" ? '2px solid #2563eb' : 'none',
            color: activeTab === "adjustments" ? '#2563eb' : '#666',
            fontWeight: activeTab === "adjustments" ? '600' : '400',
            cursor: 'pointer'
          }}
        >
          Stock Audits (Log)
        </button>
      </div>

      {/* ================= INVENTORY TABLE ================= */}
      {
        activeTab === "stock" ? (
          <div className="table-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3>Current Stock</h3>
              <button className="secondary-btn" onClick={loadData} disabled={loading}>
                {loading ? "Refreshing..." : "Refresh Data"}
              </button>
            </div>

            <style>{tableStyle}</style>

            {inventory.length === 0 ? (
              <p style={{ padding: "20px", textAlign: "center", color: "#666" }}>
                {loading ? "Loading stock..." : "No items found in inventory."}
              </p>
            ) : (
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Size</th>
                    <th>SKU</th>
                    <th>Unit Price</th>
                    <th>Stock Level</th>
                    <th>Value</th>
                    <th>Mfg/Exp</th>
                    <th>Supplier</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.map(p => (
                    <tr key={p.inventory_id || p.id}>
                      <td>
                        <div style={{ fontWeight: '600' }}>{p.product_name || p.name}</div>
                      </td>
                      <td>{p.size || '-'}</td>
                      <td>{p.sku || 'N/A'}</td>
                      <td>₹{(p.unit_price || 0).toFixed(2)}</td>
                      <td style={{ fontWeight: 'bold' }}>{p.quantity || 0}</td>
                      <td>₹{((p.quantity || 0) * (p.unit_price || 0)).toFixed(2)}</td>
                      <td>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>
                          <div>M: {p.mfg_date ? formatDate(p.mfg_date) : '-'}</div>
                          <div>E: {p.expiry_date ? formatDate(p.expiry_date) : '-'}</div>
                        </div>
                      </td>
                      <td style={{ fontSize: '12px', color: '#64748b' }}>
                        {p.supplier_name || <span style={{ fontStyle: 'italic', opacity: 0.6 }}>N/A</span>}
                      </td>
                      <td>
                        {(p.quantity || 0) <= (p.min_threshold || 5) ? (
                          <span style={{ color: "#c2410c", background: "#ffedd5", padding: "2px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "600" }}>LOW STOCK</span>
                        ) : (
                          <span style={{ color: "#15803d", background: "#dcfce7", padding: "2px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "600" }}>IN STOCK</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          /* ================= ADJUSTMENTS TABLE ================= */
          <div className="table-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3>Stock Adjustment History</h3>
              <button className="secondary-btn" onClick={loadAdjustments} disabled={loading}>
                {loading ? "Refreshing..." : "Refresh Logs"}
              </button>
            </div>

            {adjustments.length === 0 ? (
              <p style={{ padding: "20px", textAlign: "center", color: "#666" }}>
                {loading ? "Loading logs..." : "No adjustment records found."}
              </p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Product</th>
                    <th>Type</th>
                    <th>Qty</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {adjustments.map(adj => (
                    <tr key={adj.adjustment_id}>
                      <td>{new Date(adj.adjustment_date).toLocaleString()}</td>
                      <td>Branch #{adj.branch_id} (Prod #{adj.product_id})</td>
                      <td>
                        <span style={{
                          textTransform: 'uppercase',
                          fontSize: '11px',
                          fontWeight: '700',
                          color: adj.adjustment_type === 'add' ? '#15803d' : adj.adjustment_type === 'subtract' ? '#b91c1c' : '#1d4ed8',
                          background: adj.adjustment_type === 'add' ? '#dcfce7' : adj.adjustment_type === 'subtract' ? '#fee2e2' : '#dbeafe',
                          padding: '2px 6px',
                          borderRadius: '4px'
                        }}>
                          {adj.adjustment_type}
                        </span>
                      </td>
                      <td style={{ fontWeight: 'bold' }}>
                        {adj.adjustment_type === 'add' ? '+' : adj.adjustment_type === 'subtract' ? '-' : ''}{adj.quantity}
                      </td>
                      <td style={{ color: '#666', fontSize: '13px' }}>{adj.reason || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )
      }

      {/* ================= TRANSFER FORM ================= */}
      <div className="chart-card" style={{ marginTop: "30px" }}>
        <h3>🚚 Request Stock Transfer</h3>
        <p style={{ fontSize: "13px", color: "#666", marginBottom: "15px" }}>
          Request stock from another branch to replenish your inventory.
        </p>

        <form onSubmit={requestTransfer} style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end' }}>

          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>Source Branch (Request From)</label>
            <select
              value={transfer.toBranch}
              onChange={e => setTransfer({ ...transfer, toBranch: e.target.value })}
              disabled={loading}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              <option value="">Select Source Branch</option>
              {branches.filter(b => b.branch_id !== branchId).map(b => (
                <option key={b.branch_id} value={b.branch_id}>{b.name} ({b.city})</option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>Product</label>
            <select
              value={transfer.productId}
              onChange={e => setTransfer({ ...transfer, productId: e.target.value })}
              disabled={loading}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              <option value="">Select Product</option>
              {allProducts.map(p => (
                <option key={p.product_id} value={p.product_id}>
                  {p.name} (SKU: {p.sku})
                </option>
              ))}
            </select>
          </div>

          <div style={{ width: '100px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>Quantity</label>
            <input
              type="number"
              placeholder="Qty"
              value={transfer.quantity}
              onChange={e => setTransfer({ ...transfer, quantity: e.target.value })}
              disabled={loading}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>

          <button type="submit" disabled={loading} className="primary-btn" style={{ height: '38px' }}>
            {loading ? "Requesting..." : "Send Request"}
          </button>
        </form>
      </div>

    </div >
  );
}
