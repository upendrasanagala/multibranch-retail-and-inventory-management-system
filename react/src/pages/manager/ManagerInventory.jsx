import { useEffect, useState } from "react";
import api from "../../services/api";
import { formatDate } from "../../utils/dateUtils";
import { useToast } from "../../components/ToastContext";

export default function ManagerInventory() {
  const { showToast } = useToast();
  const [inventory, setInventory] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [transfer, setTransfer] = useState({ productId: "", quantity: "", toBranch: "" });
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState([]);
  const [activeTab, setActiveTab] = useState("stock");
  const [adjustments, setAdjustments] = useState([]);

  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  const branchId = user?.branch_id;

  useEffect(() => {
    if (branchId) loadData();
  }, [branchId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [invRes, branchRes, prodRes] = await Promise.all([
        api.inventory.getByBranch(branchId),
        api.branches.getAll(),
        api.products.getAll()
      ]);
      setInventory(invRes.inventory || []);
      setBranches(branchRes.branches || []);
      setAllProducts(prodRes.products || []);
    } catch (err) { console.error("Inventory Load Err:", err); }
    setLoading(false);
  };

  const loadAdjustments = async () => {
    setLoading(true);
    try {
      const res = await api.inventory.getAdjustments({ branch_id: branchId });
      setAdjustments(res.adjustments || []);
    } catch (err) { console.error("Audit Load Err:", err); }
    setLoading(false);
  };

  const filtered = inventory.filter(p =>
    (p.product_name || p.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.sku || "").toLowerCase().includes(search.toLowerCase())
  );

  const requestTransfer = async (e) => {
    e.preventDefault();
    if (!transfer.productId || !transfer.quantity || !transfer.toBranch) return showToast("Transfer parameters incomplete", "warning");
    setLoading(true);
    try {
      await api.transfers.create({
        product_id: Number(transfer.productId),
        from_branch_id: Number(transfer.toBranch),
        to_branch_id: branchId,
        quantity: Number(transfer.quantity),
        reason: "Managerial replenishment"
      });
      showToast("Logistics primitive dispatched", "success");
      setTransfer({ productId: "", quantity: "", toBranch: "" });
    } catch (err) {
      showToast("Dispatch failed: " + (err.response?.data?.message || err.message), "error");
    }
    setLoading(false);
  };

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      
      {/* ================= CONTROL STRIP ================= */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '35px', gap: '30px' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <i className="fas fa-search" style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '14px' }}></i>
          <input
            placeholder="Search localized asset registry (Name, SKU, Barcode)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '16px 16px 16px 50px', borderRadius: '18px', border: '1.5px solid #e2e8f0', fontSize: '13px', fontWeight: 600, background: '#fff', outline: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
          />
        </div>
        
        <div style={{ display: 'flex', background: '#fff', padding: '5px', borderRadius: '14px', border: '1.5px solid #e2e8f0' }}>
           {['stock', 'adjustments'].map(t => (
             <button key={t} onClick={() => { setActiveTab(t); if(t==='adjustments') loadAdjustments(); }} style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: activeTab === t ? '#4338ca' : 'transparent', color: activeTab === t ? '#fff' : '#64748b', fontSize: '12px', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
               {t === 'stock' ? 'Live Assets' : 'Audit Logs'}
             </button>
           ))}
        </div>
      </div>

      {/* ================= ASSET GRID ================= */}
      {activeTab === "stock" ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '35px' }}>
          
          <div style={{ background: '#fff', borderRadius: '32px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #f1f5f9' }}>
                  <th style={{ padding: '20px 25px', textAlign: 'left', fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 900 }}>Product Details</th>
                  <th style={{ padding: '20px 25px', textAlign: 'left', fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 900 }}>Category & Source</th>
                  <th style={{ padding: '20px 25px', textAlign: 'center', fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 900 }}>Current Stock</th>
                  <th style={{ padding: '20px 25px', textAlign: 'left', fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 900 }}>Pricing</th>
                  <th style={{ padding: '20px 25px', textAlign: 'right', fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 900 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                   const isLow = (p.quantity || 0) <= (p.min_threshold || 5);
                   return (
                     <tr key={p.inventory_id || p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                       <td style={{ padding: '18px 25px' }}>
                          <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '14px' }}>
                            {p.product_name || p.name} {p.size && <span style={{ color: '#6366f1', marginLeft: '4px' }}>({p.size} {p.unit || 'pcs'})</span>}
                          </div>
                          <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>{p.sku || p.barcode || '---'}</div>
                       </td>
                       <td style={{ padding: '18px 25px' }}>
                          <div style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, color: '#4338ca', marginBottom: '4px' }}>{p.category_name || 'GENERAL'}</div>
                          <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600 }}>SOURCE: {p.supplier_name || 'INTERNAL'}</div>
                       </td>
                       <td style={{ padding: '18px 25px', textAlign: 'center' }}>
                          <span style={{ fontSize: '15px', fontWeight: 900, color: isLow ? '#ef4444' : '#1e293b', background: isLow ? '#fef2f2' : '#f8fafc', padding: '6px 14px', borderRadius: '12px', display: 'inline-block', border: isLow ? '1px solid #fecaca' : '1px solid #f1f5f9' }}>
                            {p.quantity || 0}
                          </span>
                       </td>
                       <td style={{ padding: '18px 25px' }}>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>₹{(p.unit_price || 0).toFixed(2)}</div>
                          <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700 }}>TOTAL: ₹{((p.quantity || 0) * (p.unit_price || 0)).toFixed(2)}</div>
                       </td>
                       <td style={{ padding: '18px 25px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                             <span style={{ padding: '5px 12px', borderRadius: '100px', fontSize: '10px', fontWeight: 900, background: isLow ? '#fff1f2' : '#ecfdf5', color: isLow ? '#e11d48' : '#059669', border: isLow ? '1px solid #fda4af' : '1px solid #6ee7b7' }}>
                               {isLow ? 'LOW STOCK' : 'STABLE'}
                             </span>
                             {isLow && <div style={{ fontSize: '9px', fontWeight: 800, color: '#e11d48' }}>REORDER REQUIRED</div>}
                          </div>
                       </td>
                     </tr>
                   );
                })}
              </tbody>
            </table>
          </div>

          {/* LOGISTICS CARD */}
          <div style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', borderRadius: '32px', padding: '35px', color: '#fff', boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.4)' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                   <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, letterSpacing: '-0.5px' }}>Request Stock Transfer</h3>
                   <p style={{ margin: '4px 0 0', opacity: 0.6, fontSize: '13px', fontWeight: 500 }}>Request inventory from other branches to replenish stock</p>
                </div>
                <div style={{ width: '48px', height: '48px', background: 'rgba(255,255,255,0.1)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <i className="fas fa-truck-loading"></i>
                </div>
             </div>

             <form onSubmit={requestTransfer} style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr) minmax(250px, 1.2fr) 150px 180px', gap: '20px', alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                   <label style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Source Branch</label>
                   <select value={transfer.toBranch} onChange={e => setTransfer({ ...transfer, toBranch: e.target.value })} style={{ padding: '14px', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px', fontWeight: 600, outline: 'none' }}>
                      <option style={{ background: '#1e293b' }} value="">Select Branch</option>
                      {branches.filter(b => b.branch_id !== branchId).map(b => ( <option style={{ background: '#1e293b' }} key={b.branch_id} value={b.branch_id}>{b.name}</option> ))}
                   </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                   <label style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Select Product</label>
                   <select value={transfer.productId} onChange={e => setTransfer({ ...transfer, productId: e.target.value })} style={{ padding: '14px', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px', fontWeight: 600, outline: 'none' }}>
                      <option style={{ background: '#1e293b' }} value="">Select Item</option>
                      {allProducts.map(p => ( <option style={{ background: '#1e293b' }} key={p.product_id} value={p.product_id}>{p.name}</option> ))}
                   </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                   <label style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Quantity</label>
                   <input type="number" placeholder="0" value={transfer.quantity} onChange={e => setTransfer({ ...transfer, quantity: e.target.value })} style={{ padding: '14px', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px', fontWeight: 800, outline: 'none', textAlign: 'center' }} />
                </div>
                <button type="submit" disabled={loading} style={{ height: '48px', background: '#fff', color: '#1e293b', border: 'none', borderRadius: '14px', fontSize: '14px', fontWeight: 900, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                   {loading ? 'SENDING...' : 'SEND REQUEST'}
                </button>
             </form>
          </div>
        </div>
      ) : (
        /* ================= AUDIT LOGS ================= */
        <div style={{ background: '#fff', borderRadius: '32px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #f1f5f9' }}>
                <th style={{ padding: '20px 25px', textAlign: 'left', fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 900 }}>Date & Time</th>
                <th style={{ padding: '20px 25px', textAlign: 'left', fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 900 }}>Stock Adjustment</th>
                <th style={{ padding: '20px 25px', textAlign: 'center', fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 900 }}>Type</th>
                <th style={{ padding: '20px 25px', textAlign: 'right', fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 900 }}>Reason</th>
              </tr>
            </thead>
            <tbody>
              {adjustments.map(adj => (
                <tr key={adj.adjustment_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '18px 25px' }}>
                    <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '13px' }}>{new Date(adj.adjustment_date).toLocaleString()}</div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700 }}>AUDITOR: {adj.adjusted_by}</div>
                  </td>
                  <td style={{ padding: '18px 25px' }}>
                    <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '14px' }}>{adj.product_name}</div>
                    <div style={{ fontSize: '15px', fontWeight: 900, color: adj.adjustment_type === 'add' ? '#059669' : '#e11d48' }}>
                       {adj.adjustment_type === 'add' ? 'INCREMENT ' : 'DECREMENT '}{adj.quantity}
                    </div>
                  </td>
                  <td style={{ padding: '18px 25px', textAlign: 'center' }}>
                    <span style={{ padding: '5px 12px', borderRadius: '100px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', background: adj.adjustment_type === 'add' ? '#ecfdf5' : '#fff1f2', color: adj.adjustment_type === 'add' ? '#059669' : '#e11d48', border: adj.adjustment_type === 'add' ? '1px solid #6ee7b7' : '1px solid #fda4af' }}>
                      {adj.adjustment_type}
                    </span>
                  </td>
                  <td style={{ padding: '18px 25px', textAlign: 'right', color: '#64748b', fontSize: '13px', fontWeight: 600 }}>{adj.reason || 'Sovereign Manual Adjustment'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
