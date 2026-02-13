import { useEffect, useState } from "react";
import api from "../../services/api";

export default function AdminBranches() {
  const [branches, setBranches] = useState([]);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [upiId, setUpiId] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editUpi, setEditUpi] = useState("");
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

  /* ================= DELETE BRANCH ================= */
  const deleteBranch = async (branchId, branchName) => {
    if (!confirm(`Are you sure you want to delete branch "${branchName}"?`)) {
      return;
    }

    setLoading(true);
    try {
      await api.branches.update(branchId, { status: 'closed' });
      await loadBranches();
    } catch (err) {
      setError(err.message || "Failed to delete branch");
    }
    setLoading(false);
  };

  /* ================= UPDATE UPI ================= */
  const updateUpi = async (branchId) => {
    setLoading(true);
    try {
      await api.branches.update(branchId, { upi_id: editUpi.trim() });
      await loadBranches();
      setEditingId(null);
    } catch (err) {
      setError(err.message || "Failed to update UPI ID");
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
              {branches.filter(b => b.status !== 'closed').map((b, i) => (
                <tr key={b.branch_id || i}>
                  <td><span style={{ fontWeight: 700 }}>{b.name}</span></td>
                  <td>{b.city || b.location || 'N/A'}</td>
                  <td>
                    {editingId === b.branch_id ? (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          value={editUpi}
                          onChange={e => setEditUpi(e.target.value)}
                          style={{ padding: '6px', fontSize: '13px', maxWidth: '180px' }}
                        />
                        <button onClick={() => updateUpi(b.branch_id)} className="primary-btn" style={{ padding: '6px 12px' }}>Save</button>
                        <button onClick={() => setEditingId(null)} style={{ padding: '6px 12px', background: '#f1f5f9', color: '#64748b' }}>Cancel</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '14px', color: '#1e293b', fontWeight: '600' }}>{b.upi_id || 'Not Set'}</span>
                        <button
                          onClick={() => { setEditingId(b.branch_id); setEditUpi(b.upi_id || ""); }}
                          style={{ padding: '4px 10px', fontSize: '12px', background: '#f1f5f9', color: '#475569' }}
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </td>
                  <td>
                    <span className="stock-badge ok" style={{ fontSize: '11px' }}>
                      {b.status || 'active'}
                    </span>
                  </td>
                  <td>
                    <button
                      style={{ background: '#fee2e2', color: '#dc2626', padding: '6px 12px' }}
                      onClick={() => deleteBranch(b.branch_id, b.name)}
                      disabled={loading}
                    >
                      Delete
                    </button>
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
