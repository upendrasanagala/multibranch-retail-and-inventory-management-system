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
  const [activeTab, setActiveTab] = useState("incoming"); // incoming | requests

  // Form states
  const [showNewModal, setShowNewModal] = useState(false);
  const [products, setProducts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [form, setForm] = useState({
    product_id: "",
    from_branch_id: "",
    quantity: "",
    notes: ""
  });
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
      // Exclude current branch from options
      setBranches((branchRes.branches || []).filter(b => b.branch_id !== branchId));
    } catch (err) {
      console.error("Failed to load dropdown data", err);
    }
  };

  const handleApprove = async (id) => {
    if (!(await showConfirm("Approve this transfer? Stock will be deducted from your branch.", "Approve Transfer"))) return;
    try {
      await api.transfers.approve(id);
      showToast("Transfer approved!", "success");
      loadTransfers();
      window.dispatchEvent(new Event("transfersUpdated"));
    } catch (err) {
      showToast("Failed to approve: " + (err.response?.data?.message || err.message), "error");
    }
  };

  const handleReject = async (id) => {
    const reason = await showPrompt("Enter rejection reason:", "Reject Transfer", "Reason...");
    if (!reason) return;
    try {
      await api.transfers.reject(id, reason);
      showToast("Transfer rejected.", "info");
      loadTransfers();
      window.dispatchEvent(new Event("transfersUpdated"));
    } catch (err) {
      showToast("Failed to reject: " + (err.response?.data?.message || err.message), "error");
    }
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!form.product_id || !form.from_branch_id || !form.quantity) {
      showToast("Please fill all required fields", "warning");
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
      showToast("Stock transfer request sent successfully!", "success");
      setShowNewModal(false);
      setForm({ product_id: "", from_branch_id: "", quantity: "", notes: "" });
      setActiveTab("requests");
      loadTransfers();
      window.dispatchEvent(new Event("transfersUpdated"));
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to create request", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const myRequests = transfers.filter(t => t.to_branch_id === branchId);
  const incomingRequests = transfers.filter(t => t.from_branch_id === branchId);
  const displayedTransfers = activeTab === "requests" ? myRequests : incomingRequests;

  return (
    <div>
      <header className="topbar">
        <h2>🚚 Stock Transfers</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="primary-btn" onClick={() => setShowNewModal(true)}>
            <i className="fas fa-plus"></i> New Request
          </button>
          <button className="secondary-btn" onClick={loadTransfers} disabled={loading}>
            <i className="fas fa-sync-alt"></i> {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', borderBottom: '1px solid #ddd' }}>
        <button
          onClick={() => setActiveTab("incoming")}
          style={{
            padding: '10px 0',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === "incoming" ? '2px solid #2563eb' : 'none',
            color: activeTab === "incoming" ? '#2563eb' : '#666',
            fontWeight: activeTab === "incoming" ? '600' : '400',
            cursor: 'pointer'
          }}
        >
          Incoming Requests (Action Required)
        </button>
        <button
          onClick={() => setActiveTab("requests")}
          style={{
            padding: '10px 0',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === "requests" ? '2px solid #2563eb' : 'none',
            color: activeTab === "requests" ? '#2563eb' : '#666',
            fontWeight: activeTab === "requests" ? '600' : '400',
            cursor: 'pointer'
          }}
        >
          My Requests (Sent)
        </button>
      </div>

      <div className="table-card">
        <h3>
          {activeTab === "incoming"
            ? "Requests from Other Branches (You need to Approve)"
            : "Requests I Sent (Waiting for others)"}
        </h3>

        {displayedTransfers.length === 0 ? (
          <p style={{ padding: "40px", textAlign: "center", color: "#666" }}>
            <i className="fas fa-box-open" style={{ fontSize: '32px', color: '#cbd5e1', marginBottom: '10px' }}></i><br/>
            No transfer requests found.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Product</th>
                <th>Qty</th>
                <th>{activeTab === "incoming" ? "Requesting Branch" : "Source Branch"}</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {displayedTransfers.map(t => (
                <tr key={t.transfer_id}>
                  <td>{formatDate(t.request_date)}</td>
                  <td>{t.product_name}</td>
                  <td style={{ fontWeight: "bold" }}>{t.quantity}</td>
                  <td>
                    {activeTab === "incoming" ? t.to_branch_name : t.from_branch_name}
                  </td>
                  <td>
                    <span style={{
                      padding: "4px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: "700",
                      background: t.status === "pending" ? "#fef3c7" : t.status === "completed" ? "#dcfce7" : "#fee2e2",
                      color: t.status === "pending" ? "#b45309" : t.status === "completed" ? "#15803d" : "#b91c1c"
                    }}>
                      {t.status.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    {activeTab === "incoming" && t.status === "pending" && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleApprove(t.transfer_id)}
                          style={{ background: '#10b981', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}
                        >
                          <i className="fas fa-check"></i> Approve
                        </button>
                        <button
                          onClick={() => handleReject(t.transfer_id)}
                          style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}
                        >
                          <i className="fas fa-times"></i> Reject
                        </button>
                      </div>
                    )}
                    {t.notes && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px', background: '#f8fafc', padding: '6px', borderRadius: '4px' }}><strong>Note:</strong> {t.notes}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* NEW REQUEST MODAL */}
      {showNewModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{
            background: '#fff', padding: '30px', borderRadius: '16px',
            width: '450px', maxWidth: '90%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }} className="container-fade-in">
            <h3 style={{ margin: '0 0 20px 0', fontSize: '20px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fas fa-paper-plane" style={{ color: '#3b82f6' }}></i> Request Stock from Branch
            </h3>
            
            <form onSubmit={handleCreateRequest} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Select Product *</label>
                <select 
                  required
                  value={form.product_id}
                  onChange={(e) => setForm({...form, product_id: e.target.value})}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px' }}
                >
                  <option value="">-- Choose Product --</option>
                  {products.map(p => (
                    <option key={p.product_id} value={p.product_id}>{p.name} (SKU: {p.sku})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Request From Branch *</label>
                <select 
                  required
                  value={form.from_branch_id}
                  onChange={(e) => setForm({...form, from_branch_id: e.target.value})}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px' }}
                >
                  <option value="">-- Choose Branch --</option>
                  {branches.map(b => (
                    <option key={b.branch_id} value={b.branch_id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Quantity Needed *</label>
                <input 
                  type="number" 
                  min="1" 
                  required
                  placeholder="e.g. 50"
                  value={form.quantity}
                  onChange={(e) => setForm({...form, quantity: e.target.value})}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Urgency & Notes (Optional)</label>
                <textarea 
                  rows="3"
                  placeholder="e.g. Urgent setup required by tomorrow"
                  value={form.notes}
                  onChange={(e) => setForm({...form, notes: e.target.value})}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button type="submit" className="primary-btn" disabled={isSubmitting} style={{ flex: 1, padding: '12px', fontSize: '15px' }}>
                  {isSubmitting ? "Sending..." : "Submit Request"}
                </button>
                <button type="button" className="secondary-btn" onClick={() => setShowNewModal(false)} style={{ flex: 1, padding: '12px', fontSize: '15px' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
