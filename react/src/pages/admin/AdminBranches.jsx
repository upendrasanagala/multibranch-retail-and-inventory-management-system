import { useEffect, useState } from "react";
import api from "../../services/api";

export default function AdminBranches() {
  const [branches, setBranches] = useState([]);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
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
        city: location.trim()
      });

      // Reload branches
      await loadBranches();
      setName("");
      setLocation("");
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

        <button onClick={addBranch} disabled={loading}>
          {loading ? "Adding..." : "Add Branch"}
        </button>
      </div>

      {error && <p style={{ color: "#dc2626", marginBottom: 10 }}>{error}</p>}

      {branches.length === 0 ? (
        <p>{loading ? "Loading branches..." : "No branches added"}</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Branch</th>
              <th>Location</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {branches.filter(b => b.status !== 'closed').map((b, i) => (
              <tr key={b.branch_id || i}>
                <td>{b.name}</td>
                <td>{b.city || b.location || 'N/A'}</td>
                <td>
                  <span style={{
                    color: b.status === 'active' ? 'green' : '#666',
                    fontWeight: 600
                  }}>
                    {b.status || 'active'}
                  </span>
                </td>
                <td>
                  <button
                    style={{ color: "#dc2626" }}
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
      )}
    </div>
  );
}
