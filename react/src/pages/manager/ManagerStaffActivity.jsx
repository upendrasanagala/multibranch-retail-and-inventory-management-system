import { useEffect, useState } from "react";
import api from "../../services/api";
import { formatDate } from "../../utils/dateUtils";

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

    if (formData.mobile && !/^[6-9]\d{9}$/.test(formData.mobile)) {
      setMessage("❌ Invalid mobile number. Must be 10 digits starting with 6-9.");
      setLoading(false);
      return;
    }

    try {
      if (editMode) {
        await api.manager.updateStaff(editingStaffId, formData);
        setMessage("✅ Personnel records updated successfully");
      } else {
        const res = await api.manager.createStaff(formData);
        setMessage(res.message);
      }
      setShowModal(false);
      resetForm();
      loadStaff();
    } catch (err) {
      setMessage("❌ Error: " + (err.response?.data?.message || "Failed to process personnel request"));
    }
    setLoading(false);
    setTimeout(() => setMessage(""), 3000);
  };

  const handleEdit = (s) => {
    setFormData({
      firstName: s.firstName || "",
      lastName: s.lastName || "",
      email: s.email || "",
      password: "",
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
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      
      {/* ================= ACTIONS BAR ================= */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 900, color: '#1e293b', letterSpacing: '-0.5px' }}>Staff Management</h2>
          <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: '13px', fontWeight: 600 }}>Manage branch employees and recruitment</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
           <button onClick={loadStaff} disabled={loading} style={{ padding: '12px 20px', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '14px', fontSize: '13px', fontWeight: 700, color: '#64748b', cursor: 'pointer' }}>
             <i className={`fas fa-sync ${loading ? 'fa-spin' : ''}`} style={{ marginRight: '8px' }}></i> Sync Data
           </button>
           <button onClick={() => { resetForm(); setShowModal(true); }} style={{ padding: '12px 24px', background: '#4338ca', color: 'white', border: 'none', borderRadius: '14px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(67, 56, 202, 0.3)' }}>
             <i className="fas fa-user-plus" style={{ marginRight: '8px' }}></i> Add New Staff
           </button>
        </div>
      </div>

      {message && (
        <div style={{ padding: '14px 20px', background: message.includes('✅') ? '#ecfdf5' : '#fef2f2', color: message.includes('✅') ? '#059669' : '#dc2626', borderRadius: '14px', marginBottom: '25px', fontWeight: 700, border: '1px solid currentColor', fontSize: '13px' }}>
          {message}
        </div>
      )}

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
            {staff.length === 0 ? (
              <tr><td colSpan="4" style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', fontWeight: 600 }}>No staff recorded in system.</td></tr>
            ) : (
              staff.map((s, i) => {
                const isCompleted = s.interview_status === 'completed';
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#eef2ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '16px' }}>{s.firstName?.[0]}{s.lastName?.[0]}</div>
                        <div>
                          <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '14px' }}>{s.firstName} {s.lastName}</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>{s.email} | {s.phone || 'No Mobile'}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ padding: '4px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 800, background: s.status === 'approved' ? '#dcfce7' : '#fef2f2', color: s.status === 'approved' ? '#15803d' : '#ef4444', textTransform: 'uppercase' }}>{s.status}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700 }}>Score:</span>
                          <input
                            type="number"
                            value={s.score || 0}
                            onChange={(e) => handleScoreUpdate(s.user_id, e.target.value)}
                            style={{ width: '50px', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '2px 4px', fontSize: '12px', fontWeight: 900, textAlign: 'center', background: '#f8fafc' }}
                            min="0" max="100"
                            disabled={isCompleted}
                          />
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <select
                        value={s.interview_status || "not_started"}
                        onChange={(e) => handleStatusUpdate(s.user_id, e.target.value)}
                        style={{ padding: '6px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, border: '1.5px solid #e2e8f0', background: '#fff', color: '#4b5563', outline: 'none' }}
                        disabled={isCompleted}
                      >
                        <option value="not_started">Pre-Screening</option>
                        <option value="round_1">Interview R1</option>
                        <option value="round_2">Technical R2</option>
                        <option value="final_round">HR General</option>
                        <option value="completed">Onboarded</option>
                      </select>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <button 
                        onClick={() => handleEdit(s)}
                        disabled={isCompleted}
                        style={{ padding: '8px 16px', background: isCompleted ? '#f8fafc' : '#fff', border: '1.5px solid #e2e8f0', borderRadius: '12px', fontSize: '12px', fontWeight: 800, color: isCompleted ? '#94a3b8' : '#4338ca', cursor: isCompleted ? 'not-allowed' : 'pointer' }}
                      >
                        {isCompleted ? 'Profile Locked' : 'Modify Record'}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ================= STAFF MODAL ================= */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: '700px', borderRadius: '28px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', animation: 'scaleUp 0.3s ease-out' }}>
            <div style={{ background: '#1e293b', padding: '25px 30px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>New Transfer Request</h3>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>{editMode ? 'Edit Staff Member' : 'Add New Staff Member'}</h3>
                <p style={{ margin: '5px 0 0', opacity: 0.7, fontSize: '13px' }}>Employee Details Form</p>
              </div>
              <button onClick={() => { setShowModal(false); resetForm(); }} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '36px', height: '36px', borderRadius: '12px', cursor: 'pointer' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '30px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                 <label style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>First Name</label>
                 <input name="firstName" value={formData.firstName} onChange={handleChange} required style={{ padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px', fontWeight: 600 }} />
               </div>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                 <label style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Last Name</label>
                 <input name="lastName" value={formData.lastName} onChange={handleChange} required style={{ padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px', fontWeight: 600 }} />
               </div>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                 <label style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Corporate Email</label>
                 <input type="email" name="email" value={formData.email} onChange={handleChange} required style={{ padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px', fontWeight: 600 }} />
               </div>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                 <label style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>{editMode ? 'Reset Password' : 'Mobile Number'}</label>
                 {editMode ? (
                   <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Leave blank to keep current" style={{ padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px', fontWeight: 600 }} />
                 ) : (
                   <input name="mobile" value={formData.mobile} onChange={handleChange} required style={{ padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px', fontWeight: 600 }} />
                 )}
               </div>

               <div style={{ gridColumn: 'span 2', background: '#f8fafc', padding: '20px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: '0 0 15px 0', fontSize: '13px', fontWeight: 900, color: '#1e293b' }}>Settlement Details (Banking)</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '15px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8' }}>Bank Service Provider</label>
                      <input name="bank_name" value={formData.bank_name} onChange={handleChange} style={{ padding: '10px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '13px' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8' }}>Account Identifier</label>
                      <input name="account_number" value={formData.account_number} onChange={handleChange} style={{ padding: '10px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '13px' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8' }}>Network Code (IFSC)</label>
                      <input name="ifsc_code" value={formData.ifsc_code} onChange={handleChange} style={{ padding: '10px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '13px' }} />
                    </div>
                  </div>
               </div>

               <div style={{ gridColumn: 'span 2', display: 'flex', gap: '15px', marginTop: '10px' }}>
                 <button type="submit" disabled={loading} style={{ flex: 2, background: '#4338ca', color: 'white', border: 'none', padding: '14px', borderRadius: '14px', fontSize: '14px', fontWeight: 800, cursor: 'pointer' }}>
                    {loading ? 'Processing...' : (editMode ? 'Save Changes' : 'Add Staff Member')}
                 </button>
                 <button type="button" onClick={() => { setShowModal(false); resetForm(); }} style={{ flex: 1, background: '#f1f5f9', color: '#64748b', border: 'none', padding: '14px', borderRadius: '14px', fontSize: '14px', fontWeight: 800, cursor: 'pointer' }}>Cancel</button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
