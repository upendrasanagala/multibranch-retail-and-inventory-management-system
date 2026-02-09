import { useEffect, useState } from "react";
import api from "../../services/api";

export default function AdminStockTransfers() {
  const [products, setProducts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [requests, setRequests] = useState([]);

  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [quantity, setQuantity] = useState("");

  const [productInfo, setProductInfo] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* ================= LOAD DATA ================= */
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [productsRes, branchesRes, transfersRes] = await Promise.all([
        api.products.getAll(),
        api.branches.getAll(),
        api.transfers.getPending()
      ]);

      setProducts(productsRes.products || []);
      setBranches(branchesRes.branches || []);
      setRequests(transfersRes.pending_transfers || []);
    } catch (err) {
      console.error("Failed to load transfer data:", err);
      setError("Failed to load data from server");
    }
    setLoading(false);
  };

  /* ================= PRODUCT PREVIEW ================= */
  useEffect(() => {
    if (!selectedProduct) {
      setProductInfo(null);
      return;
    }

    const product = products.find(
      p => (p.product_id || p.id) === Number(selectedProduct)
    );

    setProductInfo(product || null);
  }, [selectedProduct, products]);

  /* ================= MANUAL ALLOCATION ================= */
  const allocateStock = async () => {
    if (!selectedProduct || !selectedBranch || !quantity) return;

    setLoading(true);
    try {
      await api.inventory.add({
        product_id: Number(selectedProduct),
        branch_id: Number(selectedBranch),
        quantity: Number(quantity)
      });

      alert("Stock allocated successfully");
      setSelectedProduct("");
      setSelectedBranch("");
      setQuantity("");
      setProductInfo(null);
      await loadData();
    } catch (err) {
      alert("Failed to allocate stock: " + err.message);
    }
    setLoading(false);
  };

  /* ================= APPROVE REQUEST ================= */
  const approveRequest = async (transferId) => {
    setLoading(true);
    try {
      await api.transfers.approve(transferId);
      await api.transfers.complete(transferId);
      await loadData();
    } catch (err) {
      alert("Failed to approve transfer: " + err.message);
    }
    setLoading(false);
  };

  /* ================= REJECT REQUEST ================= */
  const rejectRequest = async (id) => {
    const reason = prompt("Enter reason for rejection:");
    if (reason === null) return;

    setLoading(true);
    try {
      await api.transfers.reject(id, reason);
      await loadData();
    } catch (err) {
      alert("Failed to reject transfer: " + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="chart-card">

      <h3>🏬 Retail Stock Transfer & Approval</h3>

      <h4 style={{ marginTop: 30 }}>📥 Branch Stock Requests</h4>

      {requests.length === 0 ? (
        <p>No stock requests</p>
      ) : (
        <table style={{ marginTop: 10 }}>
          <thead>
            <tr>
              <th>From</th>
              <th>To</th>
              <th>Product</th>
              <th>Qty</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {requests.map(r => (
              <tr key={r.id}>
                <td>{r.from_branch || "Admin"}</td>
                <td>{r.to_branch || r.branch}</td>
                <td>{r.product_name || r.productName}</td>
                <td>{r.quantity}</td>
                <td>
                  <b style={{
                    color:
                      r.status === "approved"
                        ? "green"
                        : r.status === "rejected"
                          ? "red"
                          : "#ca8a04"
                  }}>
                    {r.status}
                  </b>
                </td>

                <td>
                  {r.status === "pending" && (
                    <>
                      <button onClick={() => approveRequest(r.transfer_id || r.id)}>
                        Approve
                      </button>
                      <button
                        onClick={() => rejectRequest(r.id)}
                        style={{ marginLeft: 6, color: "red" }}
                      >
                        Reject
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <hr style={{ margin: '40px 0' }} />

      <h3>Direct Stock Allocation</h3>
      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
        <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)}>
          <option value="">Select Product</option>
          {products.map(p => (
            <option key={p.product_id || p.id} value={p.product_id || p.id}>
              {p.name} (SKU: {p.sku})
            </option>
          ))}
        </select>

        <select value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)}>
          <option value="">Select Branch</option>
          {branches.map(b => (
            <option key={b.branch_id || b.id} value={b.branch_id || b.id}>
              {b.name}
            </option>
          ))}
        </select>

        <input
          type="number"
          placeholder="Quantity"
          value={quantity}
          onChange={e => setQuantity(e.target.value)}
          style={{ width: '100px' }}
        />

        <button onClick={allocateStock} disabled={loading}>
          {loading ? "Allocating..." : "Allocate Stock"}
        </button>
      </div>

      {productInfo && (
        <div style={{ marginTop: '10px', color: '#666' }}>
          <p>Current Price: ₹{productInfo.unit_price || productInfo.price}</p>
        </div>
      )}
    </div>
  );
}
