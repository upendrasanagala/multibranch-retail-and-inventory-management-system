import { useEffect, useState } from "react";
import { formatDate } from "../../utils/dateUtils";
import api from "../../services/api";

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

      <style>{tableStyle}</style>

      {products.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
          <i className="fas fa-box-open" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}></i>
          <p>{loading ? "Loading stock..." : "No inventory found for this branch."}</p>
          {!loading && <p style={{ fontSize: '12px' }}>Please contact admin to assign products to your branch.</p>}
        </div>
      ) : (
        <div className="table-responsive">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product</th>
                <th>Size</th>
                <th>Price</th>
                <th>Mfg/Exp</th>
                <th>Stock</th>
                <th>Supplier</th>
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
                  <td>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>
                      <div>M: {p.mfg_date ? formatDate(p.mfg_date) : '-'}</div>
                      <div>E: {p.expiry_date ? formatDate(p.expiry_date) : '-'}</div>
                    </div>
                  </td>
                  <td>{p.quantity || p.stock || 0}</td>
                  <td style={{ fontSize: '11px', color: '#64748b' }}>
                    {p.supplier_name || 'N/A'}
                  </td>
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
