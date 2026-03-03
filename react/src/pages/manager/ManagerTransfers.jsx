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
  const [activeTab, setActiveTab] = useState("incoming"); // incoming | outgoing

  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
  const branchId = loggedInUser?.branch_id;

  useEffect(() => {
    if (branchId) {
      loadTransfers();
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

  const handleApprove = async (id) => {
    if (!(await showConfirm("Approve this transfer? Stock will be deducted from your branch.", "Approve Transfer"))) return;
    try {
      await api.transfers.approve(id);
      showToast("Transfer approved!", "success");
      loadTransfers();
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
    } catch (err) {
      showToast("Failed to reject: " + (err.response?.data?.message || err.message), "error");
    }
  };

  // Incoming: Transfers where I am the DESTINATION (I requested them, or someone sent to me)
  // Wait, if I requested FROM B (B->A), I am TO.
  // The 'Pending' ones are waiting for B to approve.
  // The 'Completed' ones are done.
  const myRequests = transfers.filter(t => t.to_branch_id === branchId);

  // Outgoing: Transfers where I am the SOURCE (Someone requested FROM me)
  // I need to Approve/Reject these.
  const incomingRequests = transfers.filter(t => t.from_branch_id === branchId);

  // Filtered view based on tab
  const displayedTransfers = activeTab === "requests" ? myRequests : incomingRequests;

  return (
    <div>
      <header className="topbar">
        <h2>🚚 Stock Transfers</h2>
        <button className="secondary-btn" onClick={loadTransfers} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh Data"}
        </button>
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
          <p style={{ padding: "20px", textAlign: "center", color: "#666" }}>No records found.</p>
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
                      padding: "2px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "600",
                      background: t.status === "pending" ? "#fef3c7" : t.status === "completed" ? "#dcfce7" : "#fee2e2",
                      color: t.status === "pending" ? "#b45309" : t.status === "completed" ? "#15803d" : "#b91c1c"
                    }}>
                      {t.status.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    {activeTab === "incoming" && t.status === "pending" && (
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          onClick={() => handleApprove(t.transfer_id)}
                          style={{ background: '#15803d', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(t.transfer_id)}
                          style={{ background: '#b91c1c', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    {t.notes && <div style={{ fontSize: '11px', color: '#666', marginTop: '5px' }}>{t.notes}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
