import { useEffect, useState } from "react";
import api from "../../services/api";
import { formatDate } from "../../utils/dateUtils";
import { useToast } from "../../components/ToastContext";
import { useConfirm } from "../../components/ConfirmContext";

export default function ManagerTransfers() {
  const { showToast } = useToast();
  const { showConfirm, showPrompt } = useConfirm();
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("incoming");

  const [showNewModal, setShowNewModal] = useState(false);
  const [products, setProducts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [form, setForm] = useState({ product_id: "", from_branch_id: "", quantity: "", notes: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
  const branchId = loggedInUser?.branch_id;

  useEffect(() => {
    if (branchId) {
      loadTransfers();
      loadFormDependencies();
    }
  }, [branchId]);

  const loadTransfers = async () => {
    setLoading(true);
    try {
      const res = await api.transfers.getAll({ branch_id: branchId });
      setTransfers(res.transfers || []);
    } catch (err) {
      console.error("Failed to load transfers", err);
    }
    setLoading(false);
  };

  const loadFormDependencies = async () => {
    try {
      const [prodRes, branchRes] = await Promise.all([
        api.products.getAll(),
        api.branches.getAll()
      ]);
      setProducts(prodRes.products || []);
      setBranches((branchRes.branches || []).filter(b => b.branch_id !== branchId));
    } catch (err) {
      console.error("Failed to load dropdown data", err);
    }
  };

  const handleApprove = async (id) => {
    const verified = await showConfirm("Approve this logistics transfer? Stock will be immediately deducted from your inventory.", "Approve Logistics");
    if (!verified) return;
    try {
      await api.transfers.approve(id);
      showToast("Logistics transfer approved", "success");
      loadTransfers();
      window.dispatchEvent(new Event("transfersUpdated"));
    } catch (err) {
      showToast("Approval failed: " + (err.response?.data?.message || err.message), "error");
    }
  };

  const handleReject = async (id) => {
    const reason = await showPrompt("Please provide a justification for rejection:", "Reject Transfer", "e.g. Insufficient stock locally...");
    if (!reason) return;
    try {
      await api.transfers.reject(id, reason);
      showToast("Transfer rejected", "info");
      loadTransfers();
      window.dispatchEvent(new Event("transfersUpdated"));
    } catch (err) {
      showToast("Rejection failed: " + (err.response?.data?.message || err.message), "error");
    }
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!form.product_id || !form.from_branch_id || !form.quantity) {
      showToast("Required fields: Product, Source, Quantity", "warning");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.transfers.create({
        product_id: parseInt(form.product_id),
        from_branch_id: parseInt(form.from_branch_id),
        to_branch_id: branchId,
        quantity: parseInt(form.quantity),
        notes: form.notes
      });
      showToast("Inventory request dispatched", "success");
      setShowNewModal(false);
      setForm({ product_id: "", from_branch_id: "", quantity: "", notes: "" });
      setActiveTab("requests");
      loadTransfers();
      window.dispatchEvent(new Event("transfersUpdated"));
    } catch (err) {
      showToast(err.response?.data?.message || "Deployment failed", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const myRequests = transfers.filter(t => t.to_branch_id === branchId);
  const incomingRequests = transfers.filter(t => t.from_branch_id === branchId);
  const displayedTransfers = activeTab === "requests" ? myRequests : incomingRequests;

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      
      {/* ================= ACTIONS BAR ================= */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div style={{ display: 'flex', gap: '8px', background: '#fff', padding: '6px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <button
            onClick={() => setActiveTab("incoming")}
            style={{
              padding: '10px 24px', borderRadius: '12px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', transition: '0.3s',
              background: activeTab === "incoming" ? '#4338ca' : 'transparent',
              color: activeTab === "incoming" ? '#fff' : '#64748b'
            }}
          >Incoming ({incomingRequests.length})</button>
          <button
            onClick={() => setActiveTab("requests")}
            style={{
              padding: '10px 24px', borderRadius: '12px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', transition: '0.3s',
              background: activeTab === "requests" ? '#4338ca' : 'transparent',
              color: activeTab === "requests" ? '#fff' : '#64748b'
            }}
          >Sent ({myRequests.length})</button>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
           <button onClick={loadTransfers} disabled={loading} style={{ padding: '12px 20px', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '14px', fontSize: '13px', fontWeight: 700, color: '#64748b', cursor: 'pointer' }}>
             <i className={`fas fa-sync ${loading ? 'fa-spin' : ''}`} style={{ marginRight: '8px' }}></i> Sync
           </button>
               <button onClick={() => setShowNewModal(true)} style={{ padding: '12px 24px', background: '#4338ca', color: 'white', border: 'none', borderRadius: '14px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(67, 56, 202, 0.3)' }}>
                 <i className="fas fa-plus" style={{ marginRight: '8px' }}></i> New Request
               </button>
        </div>
      </div>

      {/* ================= TABLE ================= */}
      <div style={{ background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #f1f5f9' }}>
              <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Date & Product</th>
              <th style={{ padding: '16px 20px', textAlign: 'center', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Quantity</th>
              <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Branch</th>
              <th style={{ padding: '16px 20px', textAlign: 'right', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {displayedTransfers.length === 0 ? (
              <tr><td colSpan="4" style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', fontWeight: 600 }}>No active logistics logs for this view.</td></tr>
            ) : (
              displayedTransfers.map(t => {
                const isIncoming = activeTab === "incoming";
                const isPending = t.status === "pending";
                return (
                  <tr key={t.transfer_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>{formatDate(t.request_date)}</div>
                      <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '14px', marginTop: '2px' }}>{t.product_name}</div>
                      {t.notes && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', background: '#f8fafc', padding: '4px 8px', borderRadius: '6px', border: '1px solid #f1f5f9' }}>{t.notes}</div>}
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <div style={{ fontSize: '15px', fontWeight: 900, color: '#1e293b', background: '#f8fafc', padding: '4px 12px', borderRadius: '10px', display: 'inline-block' }}>{t.quantity}</div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 800 }}>{isIncoming ? 'TARGET DEST' : 'SOURCE ORIGIN'}</div>
                      <div style={{ fontWeight: 700, color: '#4b5563' }}>{isIncoming ? t.to_branch_name : t.from_branch_name}</div>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                       <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                         <span style={{ 
                           padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase',
                           background: t.status === "pending" ? "#fef3c7" : t.status === "completed" ? "#dcfce7" : "#fef2f2",
                           color: t.status === "pending" ? "#b45309" : t.status === "completed" ? "#15803d" : "#ef4444"
                         }}>{t.status}</span>
                         
                         {isIncoming && isPending && (
                           <div style={{ display: 'flex', gap: '8px' }}>
                              <button onClick={() => handleApprove(t.transfer_id)} style={{ background: '#dcfce7', border: 'none', color: '#15803d', padding: '6px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}>Release Stock</button>
                              <button onClick={() => handleReject(t.transfer_id)} style={{ background: '#fef2f2', border: 'none', color: '#ef4444', padding: '6px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}>Deny</button>
                           </div>
                         )}
                       </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ================= MODAL ================= */}
      {showNewModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: '480px', borderRadius: '28px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', animation: 'scaleUp 0.3s ease-out' }}>
            <div style={{ background: '#1e293b', padding: '25px 30px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>New Transfer Request</h3>
              <button onClick={() => setShowNewModal(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '32px', height: '32px', borderRadius: '10px', cursor: 'pointer' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleCreateRequest} style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                 <label style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Product</label>
                 <select required value={form.product_id} onChange={(e) => setForm({...form, product_id: e.target.value})} style={{ padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px', fontWeight: 600, appearance: 'none', background: '#fff' }}>
                    <option value="">Choose Product</option>
                    {products.map(p => <option key={p.product_id} value={p.product_id}>{p.name} ({p.sku})</option>)}
                 </select>
               </div>

               <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                 <label style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Source Branch</label>
                 <select required value={form.from_branch_id} onChange={(e) => setForm({...form, from_branch_id: e.target.value})} style={{ padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px', fontWeight: 600, appearance: 'none', background: '#fff' }}>
                    <option value="">Choose Branch</option>
                    {branches.map(b => <option key={b.branch_id} value={b.branch_id}>{b.name}</option>)}
                 </select>
               </div>

               <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                 <label style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Quantity</label>
                 <input type="number" required min="1" placeholder="Units required..." value={form.quantity} onChange={(e) => setForm({...form, quantity: e.target.value})} style={{ padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px', fontWeight: 800 }} />
               </div>

               <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                 <label style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Brief / Justification</label>
                 <textarea rows="2" placeholder="e.g. Responding to high local demand..." value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} style={{ padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px', resize: 'none' }} />
               </div>

               <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                 <button type="submit" disabled={isSubmitting} style={{ flex: 2, background: '#4338ca', color: 'white', border: 'none', padding: '14px', borderRadius: '14px', fontSize: '14px', fontWeight: 800, cursor: 'pointer' }}>
                   {isSubmitting ? 'Sending Request...' : 'Send Request'}
                 </button>
                 <button type="button" onClick={() => setShowNewModal(false)} style={{ flex: 1, background: '#f1f5f9', color: '#64748b', border: 'none', padding: '14px', borderRadius: '14px', fontSize: '14px', fontWeight: 800, cursor: 'pointer' }}>Cancel</button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
