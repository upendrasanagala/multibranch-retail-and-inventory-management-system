import { useEffect, useState } from "react";
import { formatDate } from "../../utils/dateUtils";
import api from "../../services/api";

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
      'body{font-family:"Inter",-apple-system,sans-serif;padding:40px;color:#0f172a;line-height:1.5}' +
      '.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1e293b;padding-bottom:20px;margin-bottom:30px}' +
      '.header-left h1{margin:0;font-size:22px;font-weight:900;letter-spacing:-0.5px;color:#1e293b}' +
      '.header-left p{margin:5px 0 0;color:#64748b;font-size:12px;font-weight:700}' +
      'table{width:100%;border-collapse:separate;border-spacing:0;margin-bottom:30px}' +
      'th{background:#f8fafc;padding:12px 16px;text-align:left;font-size:10px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #e2e8f0}' +
      'td{padding:12px 16px;font-size:12px;color:#334155;border-bottom:1px solid #f1f5f9;font-weight:600}' +
      '.low{color:#ef4444;font-weight:800}' +
      '.ok{color:#10b981;font-weight:800}' +
      '</style>';

    const content = `
      <div class="header">
        <div class="header-left">
          <h1>STOCK REPORT</h1>
          <p>Branch: ${branchName} | ID: B-0${branchId}</p>
        </div>
        <div style="text-align:right;">
          <div style="display:inline-block;padding:4px 12px;background:#f1f5f9;border-radius:100px;font-size:10px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:1px">Internal Audit</div>
          <p style="margin:10px 0 0;font-size:11px;font-weight:700;color:#94a3b8">D: ${formatDate(now)}</p>
        </div>
      </div>
      <table>
        <thead><tr><th>SKU</th><th>Catalog Item</th><th style="text-align:right;">Price</th><th style="text-align:right;">Stock</th><th>Health</th></tr></thead>
        <tbody>
          ${products.map(p => `<tr><td>${p.sku || '-'}</td><td>${p.product_name}</td><td style="text-align:right;">₹${(p.unit_price || 0).toFixed(2)}</td><td style="text-align:right;">${p.quantity}</td><td class="${p.quantity <= (p.min_threshold || 5) ? 'low' : 'ok'}">${p.quantity <= (p.min_threshold || 5) ? 'LOW STOCK' : 'IN STOCK'}</td></tr>`).join('')}
        </tbody>
      </table>
    `;

    w.document.write(`<html><head><title>Inventory_Report_${formatDate(now)}</title>${styles}</head><body>${content}</body></html>`);
    w.document.close();
    w.print();
  };

  const filteredProducts = products.filter(p => {
    const term = search.toLowerCase();
    if (!term) return true;
    return (p.product_name || '').toLowerCase().includes(term) || (p.sku || '').toLowerCase().includes(term);
  });

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      
      {/* ================= ACTIONS BAR ================= */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', background: '#fff', padding: '12px 24px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <i className="fas fa-search" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '13px' }}></i>
            <input
              type="text"
              placeholder="Search by SKU or Product Name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '320px',
                padding: '12px 12px 12px 42px',
                borderRadius: '14px',
                border: 'none',
                background: '#f8fafc',
                fontSize: '13px',
                fontWeight: 600,
                color: '#1e293b',
                outline: 'none'
              }}
            />
          </div>
          <div style={{ padding: '4px 12px', background: '#eef2ff', borderRadius: '100px', fontSize: '11px', fontWeight: 800, color: '#4338ca', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
             {filteredProducts.length} Products Found
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={loadInventory} disabled={loading} style={{ padding: '11px 18px', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '12px', fontSize: '12px', fontWeight: 800, color: '#64748b', cursor: 'pointer' }}>
             <i className={`fas fa-sync ${loading ? 'fa-spin' : ''}`}></i> Sync
          </button>
          <button onClick={printInventory} style={{ padding: '11px 24px', background: '#4338ca', color: 'white', border: 'none', borderRadius: '12px', fontSize: '12px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(67, 56, 202, 0.3)' }}>
             <i className="fas fa-print" style={{ marginRight: '8px' }}></i> Download Report
          </button>
        </div>
      </div>

      {/* ================= TABLE ================= */}
      <div style={{ background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #f1f5f9' }}>
              <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Product Info</th>
              <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Dates</th>
              <th style={{ padding: '16px 24px', textAlign: 'center', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Unit Price</th>
              <th style={{ padding: '16px 24px', textAlign: 'center', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Current Quantity</th>
              <th style={{ padding: '16px 24px', textAlign: 'right', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map(p => {
              const isLow = (p.quantity || 0) <= (p.min_threshold || 5);
              return (
                <tr key={p.inventory_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.5px' }}>{p.sku || 'UNASSIGNED'}</div>
                    <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '14px', marginTop: '2px' }}>{p.product_name}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', fontWeight: 600 }}>{p.category} • {p.size || 'STD'}</div>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700 }}>MANUFACTURING & EXPIRY</div>
                    <div style={{ fontSize: '11px', color: '#4b5563', fontWeight: 700, marginTop: '2px' }}>
                       MFG: {p.mfg_date ? formatDate(p.mfg_date) : '--'}
                    </div>
                    <div style={{ fontSize: '11px', color: p.expiry_date ? '#ef4444' : '#4b5563', fontWeight: 700 }}>
                       EXP: {p.expiry_date ? formatDate(p.expiry_date) : '--'}
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                     <div style={{ fontSize: '15px', fontWeight: 900, color: '#10b981' }}>₹{(p.unit_price || 0).toFixed(2)}</div>
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                     <div style={{ background: isLow ? '#fef2f2' : '#f8fafc', padding: '6px 12px', borderRadius: '10px', fontSize: '15px', fontWeight: 900, color: isLow ? '#ef4444' : '#1e293b', border: `1px solid ${isLow ? '#fee2e2' : '#f1f5f9'}`, display: 'inline-block' }}>{p.quantity}</div>
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                     <span style={{ padding: '6px 14px', borderRadius: '10px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', background: isLow ? '#fef2f2' : '#ecfdf5', color: isLow ? '#dc2626' : '#059669', border: `1px solid ${isLow ? '#fee2e2' : '#d1fae5'}` }}>
                       {isLow ? 'LOW STOCK' : 'IN STOCK'}
                     </span>
                  </td>
                </tr>
              );
            })}
            {filteredProducts.length === 0 && (
              <tr><td colSpan="5" style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', fontWeight: 700 }}>No catalog items found matching your search term.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
