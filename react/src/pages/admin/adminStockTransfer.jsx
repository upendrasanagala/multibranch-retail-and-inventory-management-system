import { useEffect, useState } from "react";
import api from "../../services/api";
import { useToast } from "../../components/ToastContext";
import { useConfirm } from "../../components/ConfirmContext";

export default function AdminStockTransfers() {
  const { showToast } = useToast();
  const { showPrompt } = useConfirm();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* ================= LOAD DATA ================= */
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.transfers.getAll({ status: "pending" });
      setRequests(res.transfers || []);
    } catch (err) {
      console.error("Failed to load transfer data:", err);
      setError("Failed to synchronize with logistics server");
    }
    setLoading(false);
  };

  /* ================= APPROVE REQUEST ================= */
  const approveRequest = async (transferId) => {
    setLoading(true);
    try {
      await api.transfers.approve(transferId);
      await loadData();
      showToast("Transfer authorized successfully", "success");
      window.dispatchEvent(new Event("transfersUpdated"));
    } catch (err) {
      showToast("Logistics authorization failed: " + err.message, "error");
    }
    setLoading(false);
  };

  /* ================= REJECT REQUEST ================= */
  const rejectRequest = async (id) => {
    const reason = await showPrompt("Please specify the reason for declining this stock request:", "Decline Logistics Request", "Insufficient stock / Pricing audit...");
    if (reason === null) return;

    setLoading(true);
    try {
      await api.transfers.reject(id, reason);
      await loadData();
      showToast("Transfer declined and logged", "warning");
      window.dispatchEvent(new Event("transfersUpdated"));
    } catch (err) {
      showToast("Failed to decline transfer: " + err.message, "error");
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '0 0 40px' }}>
      {/* ================= HEADER ================= */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#1e293b' }}>Stock Requests</h2>
          <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#64748b' }}>Approve or decline stock movements between branches</p>
        </div>
        <div style={{ padding: '8px 16px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: requests.length > 0 ? '#f59e0b' : '#10b981' }}></div>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
            {requests.length} Pending Actions
          </span>
        </div>
      </div>

      {/* ================= MAIN INTERFACE ================= */}
      <div style={{ background: '#fff', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
        <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#1e293b' }}>📥 Pending Requests</h3>
        </div>

        {error && (
          <div style={{ padding: '24px', color: '#e11d48', background: '#fff1f2', textAlign: 'center', fontWeight: 600 }}>
            {error}
          </div>
        )}

        {requests.length === 0 ? (
          <div style={{ padding: '80px 0', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: '#f1f5f9', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', margin: '0 auto 20px' }}>
              <i className="fas fa-truck-loading"></i>
            </div>
            <h4 style={{ margin: 0, color: '#1e293b', fontSize: '16px', fontWeight: 800 }}>Clear for Launch</h4>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>No branch stock requests require manual intervention at this time.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr>
                  <th className="table-header-th" style={{ textAlign: 'left' }}>Branch Route</th>
                  <th className="table-header-th" style={{ textAlign: 'left' }}>Product</th>
                  <th className="table-header-th" style={{ textAlign: 'center' }}>Quantity</th>
                  <th className="table-header-th" style={{ textAlign: 'center' }}>Status</th>
                  <th className="table-header-th" style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {requests.map(r => (
                  <tr key={r.id} className="inventory-row">
                    <td style={{ padding: '20px 32px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 800, color: '#475569', fontSize: '13px' }}>{r.from_branch_name || "CENTRAL HUB"}</div>
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: '16px' }}>
                          <i className="fas fa-long-arrow-alt-right"></i>
                        </div>
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '13px' }}>{r.to_branch_name || r.branch_name || "Unknown"}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '20px 0' }}>
                      <div style={{ fontWeight: 800, color: '#1e293b' }}>{r.product_name || r.productName}</div>
                      <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600 }}>TRANS-REF: {r.id?.toUpperCase() || r.transfer_id}</div>
                    </td>
                    <td style={{ padding: '20px 0', textAlign: 'center' }}>
                      <span style={{ padding: '6px 12px', background: '#f1f5f9', color: '#1e293b', borderRadius: '12px', fontWeight: 900, fontSize: '14px', border: '1px solid #e2e8f0' }}>
                        {r.quantity} <span style={{ fontSize: '10px', opacity: 0.6 }}>units</span>
                      </span>
                    </td>
                    <td style={{ padding: '20px 0', textAlign: 'center' }}>
                      <span style={{ 
                        padding: '6px 12px', 
                        borderRadius: '20px', 
                        fontSize: '11px', 
                        fontWeight: 800, 
                        background: '#fef9c3', 
                        color: '#a16207',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#a16207', display: 'inline-block', marginRight: '6px' }}></span>
                        {r.status}
                      </span>
                    </td>

                    <td style={{ padding: '20px 32px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => approveRequest(r.transfer_id || r.id)}
                          style={{ padding: '10px 16px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '12px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)' }}
                        >
                          <i className="fas fa-check" style={{ marginRight: '6px' }}></i> Authorize
                        </button>
                        <button
                          onClick={() => rejectRequest(r.transfer_id || r.id)}
                          style={{ padding: '10px 16px', background: '#fff1f2', color: '#e11d48', border: 'none', borderRadius: '12px', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
                        >
                          <i className="fas fa-times" style={{ marginRight: '6px' }}></i> Decline
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
