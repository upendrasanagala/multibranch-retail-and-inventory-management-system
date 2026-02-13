import { useEffect, useState } from "react";
import api from "../../services/api";

export default function ManagerStaffActivity() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState(null);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    mobile: "",
    address: "",
    bank_name: "",
    account_number: "",
    ifsc_code: "",
    status: "pending"
  });

  const [message, setMessage] = useState("");

  const loadStaff = async () => {
    setLoading(true);
    try {
      const res = await api.manager.getStaff();
      setStaff(res.users || []);
    } catch (err) {
      console.error("Failed to load staff", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      mobile: "",
      address: "",
      bank_name: "",
      account_number: "",
      ifsc_code: "",
      status: "pending"
    });
    setEditingStaffId(null);
    setEditMode(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (formData.mobile && !/^\d{10}$/.test(formData.mobile)) {
      setMessage("Mobile number must be exactly 10 digits.");
      setLoading(false);
      return;
    }

    try {
      if (editMode) {
        await api.manager.updateStaff(editingStaffId, formData);
        setMessage("✅ Staff updated successfully");
      } else {
        const res = await api.manager.createStaff(formData);
        setMessage(res.message);
      }
      setShowModal(false);
      resetForm();
      loadStaff();
    } catch (err) {
      setMessage("❌ Error: " + (err.response?.data?.message || "Failed to process request"));
    }
    setLoading(false);
    setTimeout(() => setMessage(""), 3000);
  };

  const handleEdit = (s) => {
    setFormData({
      firstName: s.firstName || "",
      lastName: s.lastName || "",
      email: s.email || "",
      password: "", // Keep password empty for security
      mobile: s.phone || "",
      address: s.address || "",
      bank_name: s.bank_name || "",
      account_number: s.account_number || "",
      ifsc_code: s.ifsc_code || "",
      status: s.status || "pending"
    });
    setEditingStaffId(s.user_id);
    setEditMode(true);
    setShowModal(true);
  };

  const handleStatusUpdate = async (userId, newStatus) => {
    try {
      await api.manager.updateInterviewStatus(userId, newStatus);
      loadStaff();
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const handleScoreUpdate = async (userId, newScore) => {
    try {
      await api.manager.updateStaffScore(userId, newScore);
      loadStaff();
    } catch (err) {
      console.error("Failed to update score", err);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: "20px" }}>
        <div>
          <h2 style={{ margin: 0 }}>Staff Management</h2>
          <p style={{ color: '#64748b', fontSize: '14px', margin: '5px 0 0 0' }}>Manage branch employees, status, and performance.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="secondary-btn" onClick={loadStaff} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </button>
          <button className="primary-btn" onClick={() => { resetForm(); setShowModal(true); }}>+ Add Staff</button>
        </div>
      </div>

      {message && (
        <div style={{
          padding: '12px',
          background: message.includes('✅') ? '#d1fae5' : '#e0f2fe',
          color: message.includes('✅') ? '#065f46' : '#0369a1',
          borderRadius: '8px',
          marginBottom: '20px',
          fontWeight: 500
        }}>
          {message}
        </div>
      )}

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Contact</th>
              <th>Status</th>
              <th>Interview Progress</th>
              <th>Perf. Score</th>
              <th>Activity</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {staff.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>No staff found in this branch</td>
              </tr>
            ) : (
              staff.map((s, i) => (
                <tr key={i}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{s.firstName} {s.lastName}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{s.email}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: '13px' }}>{s.phone || 'N/A'}</div>
                  </td>
                  <td>
                    <span className={`stock-badge ${s.status === 'approved' ? 'ok' : 'low'}`} style={{ fontSize: '11px' }}>
                      {s.status}
                    </span>
                  </td>
                  <td>
                    <select
                      value={s.interview_status || "not_started"}
                      onChange={(e) => handleStatusUpdate(s.user_id, e.target.value)}
                      className="status-select"
                      style={{ padding: '4px', borderRadius: '4px', fontSize: '12px', width: '120px' }}
                      disabled={s.interview_status === 'completed'}
                    >
                      <option value="not_started">Not Started</option>
                      <option value="round_1">Round 1</option>
                      <option value="round_2">Round 2</option>
                      <option value="final_round">Final Round</option>
                      <option value="completed">Completed</option>
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      value={s.score || 0}
                      onChange={(e) => handleScoreUpdate(s.user_id, e.target.value)}
                      style={{
                        width: '55px',
                        padding: '4px',
                        borderRadius: '4px',
                        border: '1px solid #e2e8f0',
                        fontSize: '12px',
                        fontWeight: 600
                      }}
                      min="0"
                      max="100"
                      disabled={s.interview_status === 'completed'}
                    />
                  </td>
                  <td>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      Last: {s.created_at ? new Date(s.created_at).toLocaleDateString() : "N/A"}
                    </div>
                  </td>
                  <td>
                    <button
                      className="secondary-btn"
                      style={{ padding: '5px 10px', fontSize: '12px' }}
                      onClick={() => handleEdit(s)}
                    >
                      Edit Details
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* STAFF MODAL (Add/Edit) */}
      {showModal && (
        <div className="profile-overlay">
          <div className="profile-modal" style={{ maxWidth: '600px', width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>{editMode ? 'Edit Staff Member' : 'Create Staff Account'}</h2>
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748b' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '15px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="input-group">
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>FIRST NAME</label>
                  <input name="firstName" value={formData.firstName} onChange={handleChange} required />
                </div>
                <div className="input-group">
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>LAST NAME</label>
                  <input name="lastName" value={formData.lastName} onChange={handleChange} required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="input-group">
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>EMAIL ADDRESS</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} required />
                </div>
                {/* Password removed for Create (auto-generated), shown only if editing password (optional) */}
                {editMode && (
                  <div className="input-group">
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>NEW PASSWORD (OPTIONAL)</label>
                    <input type="password" name="password" value={formData.password} onChange={handleChange} />
                  </div>
                )}
                {!editMode && (
                  <div className="input-group">
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>INTERVIEW SCORE</label>
                    <input type="number" name="score" value={formData.score || ""} onChange={handleChange} required min="0" max="100" />
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="input-group">
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>MOBILE NUMBER</label>
                  <input name="mobile" value={formData.mobile} onChange={handleChange} required />
                </div>
                <div className="input-group">
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>ACCOUNT STATUS</label>
                  <select name="status" value={formData.status} onChange={handleChange}>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="input-group">
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>HOME ADDRESS</label>
                <textarea name="address" value={formData.address} onChange={handleChange} style={{ minHeight: '60px' }} />
              </div>

              <div style={{ padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '5px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '13px' }}>Bank Details (Financial)</h4>
                <div style={{ display: 'grid', gap: '10px' }}>
                  <div className="input-group">
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>BANK NAME</label>
                    <input name="bank_name" value={formData.bank_name} onChange={handleChange} placeholder="e.g. State Bank of India" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="input-group">
                      <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>ACCOUNT NO</label>
                      <input name="account_number" value={formData.account_number} onChange={handleChange} />
                    </div>
                    <div className="input-group">
                      <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>IFSC CODE</label>
                      <input name="ifsc_code" value={formData.ifsc_code} onChange={handleChange} />
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" className="primary-btn" disabled={loading} style={{ flex: 1 }}>
                  {loading ? (editMode ? "Updating..." : "Creating...") : (editMode ? "Save Changes" : "Create Account")}
                </button>
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="secondary-btn" style={{ flex: 1 }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
