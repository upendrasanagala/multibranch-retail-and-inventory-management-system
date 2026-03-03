import { useEffect, useState } from "react";
import api from "../../services/api";
import { useToast } from "../../components/ToastContext";
import { useConfirm } from "../../components/ConfirmContext";

export default function AdminBranches() {
  const { showToast } = useToast();
  const { showConfirm, showPrompt } = useConfirm();
  const [branches, setBranches] = useState([]);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [upiId, setUpiId] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({
    name: "",
    city: "",
    upi_id: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* ================= LOAD BRANCHES FROM BACKEND ================= */
  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    setLoading(true);
    try {
      const response = await api.branches.getAll();
      setBranches(response.branches || []);
    } catch (err) {
      console.error("Failed to load branches:", err);
      // Fallback to localStorage
      const stored = JSON.parse(localStorage.getItem("branches")) || [];
      const normalized = stored.map(b =>
        typeof b === "string" ? { name: b, location: "N/A" } : b
      );
      setBranches(normalized);
    }
    setLoading(false);
  };

  /* ================= ADD BRANCH ================= */
  const addBranch = async () => {
    if (!name || !location) {
      setError("Branch name and location are required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await api.branches.create({
        name: name.trim(),
        city: location.trim(),
        upi_id: upiId.trim()
      });

      // Reload branches
      await loadBranches();
      setName("");
      setLocation("");
      setUpiId("");
    } catch (err) {
      setError(err.message || "Failed to add branch");
    }
    setLoading(false);
  };

  /* ================= CLOSE BRANCH ================= */
  const closeBranch = async (branchId, branchName) => {
    if (!(await showConfirm(`Are you sure you want to CLOSE branch "${branchName}"? This will stop operations but preserve data.`, "Close Branch"))) {
      return;
    }

    setLoading(true);
    try {
      await api.branches.update(branchId, { status: 'closed' });
      await loadBranches();
    } catch (err) {
      setError(err.message || "Failed to close branch");
    }
    setLoading(false);
  };

  /* ================= HARD DELETE BRANCH ================= */
  const hardDeleteBranch = async (branchId, branchName) => {
    const confirmation = await showPrompt(`This will PERMANENTLY DELETE branch "${branchName}" along with all Sales History, Inventory Records, Stock Transfers, and ALL linked STAFF & MANAGERS. Type "DELETE" to confirm.`, "⚠️ DANGER ZONE", "Type DELETE");

    if (confirmation !== "DELETE") {
      if (confirmation !== null) showToast("Deletion cancelled. You typed the wrong confirmation.", "warning");
      return;
    }

    setLoading(true);
    try {
      await api.branches.delete(branchId);
      await loadBranches();
    } catch (err) {
      setError(err.message || "Failed to delete branch");
    }
    setLoading(false);
  };

  /* ================= REOPEN BRANCH ================= */
  const reopenBranch = async (branchId, branchName) => {
    if (!(await showConfirm(`Are you sure you want to REOPEN branch "${branchName}"?`, "Reopen Branch"))) {
      return;
    }

    setLoading(true);
    try {
      await api.branches.update(branchId, { status: 'active' });
      await loadBranches();
    } catch (err) {
      setError(err.message || "Failed to reopen branch");
    }
    setLoading(false);
  };

  /* ================= UPDATE BRANCH ================= */
  const updateBranch = async (branchId) => {
    if (!editData.name || !editData.city) {
      showToast("Name and Location are required", "warning");
      return;
    }

    setLoading(true);
    try {
      await api.branches.update(branchId, {
        name: editData.name.trim(),
        city: editData.city.trim(),
        upi_id: editData.upi_id.trim()
      });
      await loadBranches();
      setEditingId(null);
      showToast("Branch updated successfully", "success");
    } catch (err) {
      setError(err.message || "Failed to update branch");
      showToast("Failed to update branch", "error");
    }
    setLoading(false);
  };

  return (
    <div className="chart-card">
      <h3>Branch Management</h3>

      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <input
          placeholder="Branch Name"
          value={name}
          onChange={e => setName(e.target.value)}
          disabled={loading}
        />

        <input
          placeholder="Location (City)"
          value={location}
          onChange={e => setLocation(e.target.value)}
          disabled={loading}
        />

        <input
          placeholder="UPI ID (e.g. store@upi)"
          value={upiId}
          onChange={e => setUpiId(e.target.value)}
          disabled={loading}
        />

        <button onClick={addBranch} disabled={loading} style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', padding: '0 15px' }}>
          {loading ? "Adding..." : "Add Branch"}
        </button>
      </div>

      {error && <p style={{ color: "#dc2626", marginBottom: 10 }}>{error}</p>}

      {branches.length === 0 ? (
        <p>{loading ? "Loading branches..." : "No branches added"}</p>
      ) : (
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Branch</th>
                <th>Location</th>
                <th>UPI ID (Pay To)</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((b, i) => (
                <tr key={b.branch_id || i}>
                  <td>
                    {editingId === b.branch_id ? (
                      <input
                        value={editData.name}
                        onChange={e => setEditData({ ...editData, name: e.target.value })}
                        style={{ padding: '6px', fontSize: '13px', width: '100%' }}
                      />
                    ) : (
                      <span style={{ fontWeight: 700 }}>{b.name}</span>
                    )}
                  </td>
                  <td>
                    {editingId === b.branch_id ? (
                      <input
                        value={editData.city}
                        onChange={e => setEditData({ ...editData, city: e.target.value })}
                        style={{ padding: '6px', fontSize: '13px', width: '100%' }}
                      />
                    ) : (
                      b.city || b.location || 'N/A'
                    )}
                  </td>
                  <td>
                    {editingId === b.branch_id ? (
                      <input
                        value={editData.upi_id}
                        onChange={e => setEditData({ ...editData, upi_id: e.target.value })}
                        style={{ padding: '6px', fontSize: '13px', width: '100%' }}
                      />
                    ) : (
                      <span style={{ fontSize: '14px', color: '#1e293b', fontWeight: '600' }}>{b.upi_id || 'Not Set'}</span>
                    )}
                  </td>
                  <td>
                    <span className={`stock-badge ${b.status === 'closed' ? 'low' : 'ok'}`} style={{ fontSize: '11px' }}>
                      {b.status || 'active'}
                    </span>
                  </td>
                  <td style={{ display: 'flex', gap: '8px' }}>
                    {editingId === b.branch_id ? (
                      <>
                        <button onClick={() => updateBranch(b.branch_id)} className="primary-btn" style={{ padding: '6px 12px' }}>Save</button>
                        <button onClick={() => setEditingId(null)} style={{ padding: '6px 12px', background: '#f1f5f9', color: '#64748b' }}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditingId(b.branch_id);
                            setEditData({
                              name: b.name || "",
                              city: b.city || b.location || "",
                              upi_id: b.upi_id || ""
                            });
                          }}
                          style={{ padding: '6px 12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px' }}
                        >
                          Edit
                        </button>
                        {b.status !== 'closed' ? (
                          <button
                            style={{ background: '#f97316', color: 'white', padding: '6px 12px', border: 'none', borderRadius: '4px' }}
                            onClick={() => closeBranch(b.branch_id, b.name)}
                            disabled={loading}
                            title="Deactivate this branch (Preserves Data)"
                          >
                            Close
                          </button>
                        ) : (
                          <button
                            style={{ background: '#10b981', color: 'white', padding: '6px 12px', border: 'none', borderRadius: '4px' }}
                            onClick={() => reopenBranch(b.branch_id, b.name)}
                            disabled={loading}
                            title="Reactivate this branch"
                          >
                            Reopen
                          </button>
                        )}
                        <button
                          style={{ background: '#fee2e2', color: '#dc2626', padding: '6px 12px', border: 'none', borderRadius: '4px' }}
                          onClick={() => hardDeleteBranch(b.branch_id, b.name)}
                          disabled={loading}
                          title="PERMANENTLY DELETE Branch and All History"
                        >
                          Delete
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
  );
}
