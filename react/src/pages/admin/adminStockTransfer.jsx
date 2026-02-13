import { useEffect, useState } from "react";
import api from "../../services/api";

export default function AdminStockTransfers() {

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
      setError("Failed to load data from server");
    }
    setLoading(false);
  };

  /* ================= PRODUCT PREVIEW ================= */


  /* ================= APPROVE REQUEST ================= */
  const approveRequest = async (transferId) => {
    setLoading(true);
    try {
      await api.transfers.approve(transferId);
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

      <div className="table-card" style={{ marginTop: 20 }}>
        <h4>📥 Branch Stock Requests</h4>

        {requests.length === 0 ? (
          <p style={{ color: '#64748b', marginTop: 10 }}>No pending stock requests</p>
        ) : (
          <div className="table-responsive" style={{ marginTop: 15 }}>
            <table>
              <thead>
                <tr>
                  <th>From</th>
                  <th>To</th>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {requests.map(r => (
                  <tr key={r.id}>
                    <td><span style={{ fontWeight: 600 }}>{r.from_branch_name || "Admin"}</span></td>
                    <td><span style={{ fontWeight: 600 }}>{r.to_branch_name || r.branch_name || "Unknown"}</span></td>
                    <td>{r.product_name || r.productName}</td>
                    <td>
                      <span className="stock-badge ok" style={{ background: '#f1f5f9', color: '#1e293b' }}>
                        {r.quantity}
                      </span>
                    </td>
                    <td>
                      <span className={`stock-badge ${r.status === 'approved' ? 'ok' :
                        r.status === 'rejected' ? 'low' : 'pending'
                        }`} style={{
                          background: r.status === 'pending' ? '#fef9c3' : '',
                          color: r.status === 'pending' ? '#a16207' : ''
                        }}>
                        {r.status.toUpperCase()}
                      </span>
                    </td>

                    <td style={{ display: 'flex', gap: '8px' }}>
                      {r.status === "pending" && (
                        <>
                          <button
                            className="primary-btn"
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            onClick={() => approveRequest(r.transfer_id || r.id)}
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => rejectRequest(r.transfer_id || r.id)}
                            style={{ background: '#fee2e2', color: '#dc2626', padding: '6px 12px', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 700 }}
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
          </div>
        )}
      </div>

    </div>
  );
}
