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
  const [search, setSearch] = useState("");

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

  const printInventory = () => {
    if (!products.length) return;
    const w = window.open("", "_blank");
    const now = new Date();

    const styles = '<style>' +
      'body{font-family:"Segoe UI",Arial,sans-serif;padding:20px;color:#111;font-size:12px}' +
      '.hdr{text-align:center;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:15px}' +
      '.hdr h2{margin:0;font-size:18px}.hdr p{margin:2px 0;font-size:11px}' +
      'table{width:100%;border-collapse:collapse;margin:10px 0}' +
      'th{background:#f3f4f6;border:1px solid #ddd;padding:6px;text-align:left;font-size:10px}' +
      'td{border:1px solid #ddd;padding:5px}' +
      '.r{text-align:right}.low{color:#dc2626;font-weight:bold}' +
      '</style>';

    const header = '<div class="hdr">' +
      '<h2>RETAIL STORE</h2>' +
      '<p>4-143, Srinagar Colony, Vijayawada - 520001</p>' +
      '<p>GSTIN: 37XXXXX0000X1ZX</p>' +
      '<p><b>Branch:</b> ' + branchName + '</p>' +
      '<h3>STOCK STATUS REPORT</h3>' +
      '<p><b>As of:</b> ' + formatDate(now) + '</p>' +
      '</div>';

    let table = '<table><tr><th>SKU</th><th>Product</th><th>Category</th><th class="r">Price</th><th class="r">Stock</th><th>Status</th></tr>';
    products.forEach(p => {
      const status = (p.quantity || 0) <= (p.min_threshold || 5) ? '<span class="low">LOW</span>' : 'OK';
      table += '<tr><td>' + (p.sku || '-') + '</td><td>' + (p.product_name || p.name) + '</td><td>' + (p.category || '-') + '</td><td class="r">' + (p.unit_price || 0).toFixed(2) + '</td><td class="r">' + (p.quantity || 0) + '</td><td>' + status + '</td></tr>';
    });
    table += '</table>';

    w.document.write('<html><head><title>Inventory Report</title>' + styles + '</head><body>' + header + table + '</body></html>');
    w.document.close();
    w.print();
  };

  return (
    <div className="table-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3>Quick Inventory Check ({branchName})</h3>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="🔍 Search by name or SKU..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                padding: '6px 12px',
                paddingRight: search ? '28px' : '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '13px',
                width: '220px',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = '#6366f1'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                style={{
                  position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px',
                  color: '#94a3b8', padding: '0 2px'
                }}
              >✕</button>
            )}
          </div>
          <button className="secondary-btn" onClick={printInventory} disabled={loading || !products.length} style={{ padding: '4px 12px', fontSize: '13px', background: '#f8fafc', color: '#475569' }}>
            Print Stock
          </button>
          <button className="secondary-btn" onClick={loadInventory} disabled={loading} style={{ padding: '4px 12px', fontSize: '13px' }}>
            {loading ? "..." : "Refresh"}
          </button>
        </div>
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
                <th>Category</th>
                <th>Supplier</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {products.filter(p => {
                const term = search.toLowerCase();
                if (!term) return true;
                return (p.product_name || p.name || '').toLowerCase().includes(term)
                  || (p.sku || '').toLowerCase().includes(term);
              }).map(p => (
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
                  <td>{p.category || '-'}</td>
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
