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
  const [phone, setPhone] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({
    name: "",
    city: "",
    upi_id: "",
    phone: ""
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

    if (phone && !/^[6-9]\d{9}$/.test(phone)) {
      setError("Invalid mobile number. Must be 10 digits starting with 6,7,8,9");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await api.branches.create({
        name: name.trim(),
        city: location.trim(),
        upi_id: upiId.trim(),
        phone: phone.trim()
      });

      // Reload branches
      await loadBranches();
      setName("");
      setLocation("");
      setUpiId("");
      setPhone("");
      showToast("New branch established successfully", "success");
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
      showToast("Branch operations suspended", "warning");
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
      showToast("Branch and all associated data purged", "error");
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
      showToast("Branch operations resumed", "success");
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

    if (editData.phone && !/^[6-9]\d{9}$/.test(editData.phone)) {
      showToast("Invalid mobile number. Must be 10 digits starting with 6,7,8,9", "warning");
      return;
    }

    setLoading(true);
    try {
      await api.branches.update(branchId, {
        name: editData.name.trim(),
        city: editData.city.trim(),
        upi_id: editData.upi_id.trim(),
        phone: editData.phone.trim()
      });
      await loadBranches();
      setEditingId(null);
      showToast("Branch metadata updated successfully", "success");
    } catch (err) {
      setError(err.message || "Failed to update branch");
      showToast("Failed to update branch", "error");
    }
    setLoading(false);
  };

  const activeCount = branches.filter(b => b.status !== 'closed').length;
  const regions = new Set(branches.map(b => b.city || b.location)).size;

  return (
    <div style={{ padding: '0 0 40px' }}>
      {/* ================= HEADER & STATS ================= */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#1e293b' }}>Branch Network Intelligence</h2>
          <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#64748b' }}>Manage your global retail expansion and branch operational status</p>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ backgroundColor: '#fff', padding: '12px 24px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
              <i className="fas fa-store"></i>
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b' }}>{activeCount}</div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Active Hubs</div>
            </div>
          </div>
          <div style={{ backgroundColor: '#fff', padding: '12px 24px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
              <i className="fas fa-map-marked-alt"></i>
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b' }}>{regions}</div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Global Regions</div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= ADD BRANCH FORM ================= */}
      <div style={{ backgroundColor: '#fff', borderRadius: '24px', padding: '24px 32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9', marginBottom: '32px' }}>
        <h3 style={{ margin: '0 0 20px', fontSize: '14px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Branch Initialization</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr)) auto', gap: '16px', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>BRANCH NAME *</label>
            <input
              placeholder="e.g. Phoenix Mall Hub"
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={loading}
              style={{ padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>LOCATION (CITY) *</label>
            <input
              placeholder="e.g. Mumbai South"
              value={location}
              onChange={e => setLocation(e.target.value)}
              disabled={loading}
              style={{ padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>CONTACT PHONE</label>
            <input
              placeholder="10-digit number"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              disabled={loading}
              style={{ padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>UPI SETTLEMENT ID</label>
            <input
              placeholder="store@upi"
              value={upiId}
              onChange={e => setUpiId(e.target.value)}
              disabled={loading}
              style={{ padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px' }}
            />
          </div>
          <button 
            onClick={addBranch} 
            disabled={loading}
            style={{ 
              padding: '13px 28px', 
              background: 'linear-gradient(135deg, #4338ca, #6366f1)', 
              color: '#fff', 
              border: 'none', 
              borderRadius: '12px', 
              fontWeight: 800, 
              fontSize: '14px', 
              cursor: 'pointer',
              boxShadow: '0 10px 15px -3px rgba(67, 56, 202, 0.3)',
              transition: 'all 0.2s ease'
            }}
          >
            {loading ? "INITIALIZING..." : "EXPAND NETWORK"}
          </button>
        </div>
        {error && <p style={{ color: "#e11d48", fontSize: '12px', fontWeight: 600, marginTop: '12px', margin: '12px 0 0' }}>{error}</p>}
      </div>

      {/* ================= BRANCH TABLE ================= */}
      <div style={{ backgroundColor: '#fff', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr>
                <th className="table-header-th" style={{ textAlign: 'left' }}>Branch Hub</th>
                <th className="table-header-th" style={{ textAlign: 'left' }}>Region / City</th>
                <th className="table-header-th" style={{ textAlign: 'left' }}>Settlement Info</th>
                <th className="table-header-th" style={{ textAlign: 'center' }}>Operational Status</th>
                <th className="table-header-th" style={{ textAlign: 'right' }}>Network Management</th>
              </tr>
            </thead>
            <tbody>
              {branches.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '64px', color: '#94a3b8' }}>
                    <i className="fas fa-store-slash" style={{ fontSize: '32px', opacity: 0.3, marginBottom: '16px' }}></i>
                    <p style={{ margin: 0, fontWeight: 600 }}>No branches identified in the network intelligence.</p>
                  </td>
                </tr>
              ) : (
                branches.map((b, i) => (
                  <tr key={b.branch_id || i} className="inventory-row" style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '20px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: b.status === 'closed' ? '#f1f5f9' : '#eef2ff', color: b.status === 'closed' ? '#94a3b8' : '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800 }}>
                          {editingId === b.branch_id ? (
                            <i className="fas fa-edit"></i>
                          ) : (
                            (b.name || 'B')[0]
                          )}
                        </div>
                        <div>
                          {editingId === b.branch_id ? (
                            <input
                              value={editData.name}
                              onChange={e => setEditData({ ...editData, name: e.target.value })}
                              style={{ padding: '8px', borderRadius: '8px', border: '1.5px solid #6366f1', fontSize: '14px', width: '180px' }}
                            />
                          ) : (
                            <>
                              <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '15px' }}>{b.name}</div>
                              <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>ID: BR-{b.branch_id || '00'}</div>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '20px 0' }}>
                      {editingId === b.branch_id ? (
                        <input
                          value={editData.city}
                          onChange={e => setEditData({ ...editData, city: e.target.value })}
                          style={{ padding: '8px', borderRadius: '8px', border: '1.5px solid #6366f1', fontSize: '14px', width: '150px' }}
                        />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', fontWeight: 600, fontSize: '14px' }}>
                          <i className="fas fa-map-marker-alt" style={{ color: '#94a3b8', fontSize: '12px' }}></i>
                          {b.city || b.location || 'N/A Region'}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '20px 0' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {editingId === b.branch_id ? (
                          <>
                            <input
                              placeholder="Phone"
                              value={editData.phone}
                              onChange={e => setEditData({ ...editData, phone: e.target.value })}
                              style={{ padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px', marginBottom: '4px' }}
                            />
                            <input
                              placeholder="UPI ID"
                              value={editData.upi_id}
                              onChange={e => setEditData({ ...editData, upi_id: e.target.value })}
                              style={{ padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                            />
                          </>
                        ) : (
                          <>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>{b.phone || 'No Contact'}</div>
                            <div style={{ fontSize: '11px', color: '#6366f1', fontWeight: 800 }}>{b.upi_id || 'UPI NOT LINKED'}</div>
                          </>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '20px 0', textAlign: 'center' }}>
                      <span style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        padding: '6px 12px', 
                        borderRadius: '20px', 
                        fontSize: '11px', 
                        fontWeight: 800, 
                        background: b.status === 'closed' ? '#fff1f2' : '#ecfdf5', 
                        color: b.status === 'closed' ? '#e11d48' : '#059669',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }}></span>
                        {b.status || 'active'}
                      </span>
                    </td>
                    <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        {editingId === b.branch_id ? (
                          <>
                            <button onClick={() => updateBranch(b.branch_id)} style={{ padding: '8px 16px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}>SAVE</button>
                            <button onClick={() => setEditingId(null)} style={{ padding: '8px 16px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '10px', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}>CANCEL</button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setEditingId(b.branch_id);
                                setEditData({
                                  name: b.name || "",
                                  city: b.city || b.location || "",
                                  upi_id: b.upi_id || "",
                                  phone: b.phone || ""
                                });
                              }}
                              style={{ background: '#f8faff', color: '#6366f1', border: 'none', padding: '8px 12px', borderRadius: '10px', fontSize: '12px', cursor: 'pointer' }}
                              title="Edit Hub Meta"
                            >
                              <i className="fas fa-pencil-alt"></i>
                            </button>
                            <button
                              onClick={() => b.status === 'closed' ? reopenBranch(b.branch_id, b.name) : closeBranch(b.branch_id, b.name)}
                              style={{ background: b.status === 'closed' ? '#ecfdf5' : '#fff7ed', color: b.status === 'closed' ? '#059669' : '#f97316', border: 'none', padding: '8px 12px', borderRadius: '10px', fontSize: '12px', cursor: 'pointer' }}
                              title={b.status === 'closed' ? "Restore Operations" : "Suspend Operations"}
                            >
                              <i className={b.status === 'closed' ? "fas fa-play" : "fas fa-pause"}></i>
                            </button>
                            <button
                              onClick={() => hardDeleteBranch(b.branch_id, b.name)}
                              style={{ background: '#fff1f2', color: '#e11d48', border: 'none', padding: '8px 12px', borderRadius: '10px', fontSize: '12px', cursor: 'pointer' }}
                              title="Purge Hub"
                            >
                              <i className="fas fa-trash-alt"></i>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
