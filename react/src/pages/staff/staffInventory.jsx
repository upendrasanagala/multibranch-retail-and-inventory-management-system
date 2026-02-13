import { useEffect, useState } from "react";
import { formatDate } from "../../utils/dateUtils";
import api from "../../services/api";

export default function StaffInventory() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
  const branchId = loggedInUser?.branch_id;
  const branchName = loggedInUser?.branch_name || "Assigned Branch";

  useEffect(() => {
    if (branchId) {
      loadInventory();
    }
  }, [branchId]);

  const loadInventory = async () => {
    setLoading(true);
    try {
      const res = await api.inventory.getByBranch(branchId);
      setProducts(res.inventory || []);
    } catch (err) {
      console.error("Failed to load inventory", err);
    }
    setLoading(false);
  };

  return (
    <div className="table-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3>Quick Inventory Check ({branchName})</h3>
        <button className="secondary-btn" onClick={loadInventory} disabled={loading} style={{ padding: '4px 12px', fontSize: '13px' }}>
          {loading ? "..." : "Refresh"}
        </button>
      </div>

      {products.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
          <i className="fas fa-box-open" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}></i>
          <p>{loading ? "Loading stock..." : "No inventory found for this branch."}</p>
          {!loading && <p style={{ fontSize: '12px' }}>Please contact admin to assign products to your branch.</p>}
        </div>
      ) : (
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product</th>
                <th>Size</th>
                <th>Price</th>
                <th>Expiry</th>
                <th>Stock</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.inventory_id || p.id}>
                  <td>{p.sku || 'N/A'}</td>
                  <td>
                    {p.product_name || p.name}
                    {p.is_b1g1 && <span style={{ fontSize: '10px', background: '#d97706', color: 'white', padding: '2px 4px', borderRadius: '4px', marginLeft: '5px' }}>B1G1</span>}
                  </td>
                  <td>{p.size || '-'}</td>
                  <td>₹{p.unit_price || p.price}</td>
                  <td>{p.expiry_date ? formatDate(p.expiry_date) : '-'}</td>
                  <td>{p.quantity || p.stock || 0}</td>
                  <td>
                    {(p.quantity || p.stock || 0) <= (p.min_threshold || 5) ? (
                      <span style={{ color: "red", fontWeight: 600 }}>LOW</span>
                    ) : (
                      <span style={{ color: "green" }}>OK</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
