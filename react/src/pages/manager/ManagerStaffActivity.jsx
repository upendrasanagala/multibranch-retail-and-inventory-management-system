import { useEffect, useState } from "react";
import api from "../../services/api";
import { formatDate } from "../../utils/dateUtils";
import { useToast } from "../../components/ToastContext";

export default function ManagerStaffActivity() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState(null);
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const { showToast } = useToast();

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
    dob: "",
    joining_date: "",
    gender: "male",
    pan_number: "",
    national_id: "",
    emergency_name: "",
    emergency_phone: "",
    score: 0,
    interview_status: "round_1",
    status: "pending"
  });

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
      dob: "",
      joining_date: "",
      gender: "male",
      pan_number: "",
      national_id: "",
      emergency_name: "",
      emergency_phone: "",
      score: 0,
      interview_status: "round_1",
      status: "pending"
    });
    setEditingStaffId(null);
    setEditMode(false);
    setFieldErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setFieldErrors({});

    let errors = {};

    if (formData.mobile && !/^[6-9]\d{9}$/.test(formData.mobile)) {
      errors.mobile = true;
      showToast("Invalid mobile number. Must be 10 digits starting with 6-9.", "error");
    }

    if (formData.account_number && !/^\d{9,18}$/.test(formData.account_number)) {
      errors.account_number = true;
      showToast("Invalid account number. Must be between 9 and 18 digits.", "error");
    }

    if (formData.ifsc_code && !/^[A-Z0-9]{8,11}$/.test(formData.ifsc_code.toUpperCase())) {
      errors.ifsc_code = true;
      showToast("Invalid IFSC Code. Please enter 8 to 11 alphanumeric characters.", "error");
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setLoading(false);
      return;
    }

    // Force uppercase for IFSC before saving
    const finalData = { ...formData, ifsc_code: formData.ifsc_code.toUpperCase() };

    try {
      if (editMode) {
        await api.manager.updateStaff(editingStaffId, finalData);
        showToast("Personnel records updated successfully", "success");
      } else {
        const res = await api.manager.createStaff(finalData);
        showToast(res.message, "success");
      }
      setShowModal(false);
      resetForm();
      loadStaff();
    } catch (err) {
      const errMsg = err.response?.data?.message || "Failed to process personnel request";
      showToast(errMsg, "error");
      
      const lowerErr = errMsg.toLowerCase();
      if (lowerErr.includes('email')) setFieldErrors(prev => ({ ...prev, email: true }));
      if (lowerErr.includes('mobile') || lowerErr.includes('phone')) setFieldErrors(prev => ({ ...prev, mobile: true }));
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
      dob: s.dob || "",
      joining_date: s.joining_date || "",
      gender: s.gender || "male",
      pan_number: s.pan_number || "",
      national_id: s.national_id || "",
      emergency_name: s.emergency_name || "",
      emergency_phone: s.emergency_phone || "",
      score: s.score || 0,
      interview_status: s.interview_status || "round_1",
      status: s.status || "pending"
    });
    setEditingStaffId(s.user_id);
    setEditMode(true);
    setShowModal(true);
  };

  const handleStatusUpdate = async (userId, newStatus) => {
    try {
      await api.manager.updateInterviewStatus(userId, newStatus);
      showToast("Recruitment stage updated", "success");
      loadStaff();
    } catch (err) {
      showToast("Failed to update recruitment stage", "error");
    }
  };

  const handleScoreUpdate = async (userId, newScore) => {
    try {
      await api.manager.updateStaffScore(userId, parseInt(newScore));
      showToast("Performance score updated", "success");
      loadStaff();
    } catch (err) {
      showToast("Failed to update score", "error");
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <style>{`.error-field { border: 2px solid #ef4444 !important; background-color: #fef2f2 !important; }`}</style>
      
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

      {/* ================= TABLE ================= */}
      <div style={{ background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #f1f5f9' }}>
              <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Staff Member</th>
              <th style={{ padding: '16px 20px', textAlign: 'center', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Recruitment Performance</th>
              <th style={{ padding: '16px 20px', textAlign: 'center', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Joining Info</th>
              <th style={{ padding: '16px 20px', textAlign: 'right', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Management Actions</th>
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
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700 }}>Score:</span>
                          <input
                            type="number"
                            value={s.score || 0}
                            onChange={(e) => handleScoreUpdate(s.user_id, e.target.value)}
                            style={{ width: '50px', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '2px 4px', fontSize: '12px', fontWeight: 900, textAlign: 'center', background: '#f8fafc' }}
                            min="0" max="100"
                          />
                          <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b' }}>%</span>
                        </div>
                        <select
                          value={s.interview_status || "not_started"}
                          onChange={(e) => handleStatusUpdate(s.user_id, e.target.value)}
                          style={{ padding: '6px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: 700, border: '1.5px solid #e2e8f0', background: '#fff', color: '#4b5563', outline: 'none' }}
                        >
                          <option value="not_started">Pre-Screening</option>
                          <option value="round_1">Interview R1</option>
                          <option value="round_2">Technical R2</option>
                          <option value="final_round">HR General</option>
                          <option value="completed">Onboarded</option>
                        </select>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '13px' }}>{s.joining_date || 'TBD'}</div>
                      <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 800 }}>{s.status.toUpperCase()}</div>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <button 
                        onClick={() => handleEdit(s)}
                        style={{ padding: '8px 16px', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '12px', fontSize: '12px', fontWeight: 800, color: '#4338ca', cursor: 'pointer' }}
                      >
                        Modify Record
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
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>{editMode ? 'Edit Staff Member' : 'Add New Staff Member'}</h3>
                <p style={{ margin: '5px 0 0', opacity: 0.7, fontSize: '13px' }}>Employee Details Form</p>
              </div>
              <button onClick={() => { setShowModal(false); resetForm(); }} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '36px', height: '36px', borderRadius: '12px', cursor: 'pointer' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '25px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', maxHeight: '70vh', overflowY: 'auto' }}>
               {/* 1. PERSONAL DETAILS */}
               <div style={{ gridColumn: 'span 2', borderBottom: '1.5px solid #f1f5f9', paddingBottom: '10px', marginBottom: '5px' }}>
                  <h4 style={{ margin: 0, fontSize: '12px', fontWeight: 900, color: '#4338ca', textTransform: 'uppercase', letterSpacing: '0.5px' }}>1. Personal Profile</h4>
               </div>
               
               <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                 <label style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>First Name</label>
                 <input name="firstName" value={formData.firstName} onChange={handleChange} required style={{ padding: '10px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '13px', fontWeight: 600 }} />
               </div>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                 <label style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Last Name</label>
                 <input name="lastName" value={formData.lastName} onChange={handleChange} required style={{ padding: '10px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '13px', fontWeight: 600 }} />
               </div>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                 <label style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Gender</label>
                 <select name="gender" value={formData.gender} onChange={handleChange} style={{ padding: '10px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '13px', fontWeight: 600, background: '#fff' }}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                 </select>
               </div>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                 <label style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Date of Birth</label>
                 <input type="date" name="dob" value={formData.dob} onChange={handleChange} style={{ padding: '10px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '13px', fontWeight: 600 }} />
               </div>

               {/* 2. CONTACT & PROFESSIONAL */}
               <div style={{ gridColumn: 'span 2', borderBottom: '1.5px solid #f1f5f9', paddingBottom: '10px', marginTop: '10px', marginBottom: '5px' }}>
                  <h4 style={{ margin: 0, fontSize: '12px', fontWeight: 900, color: '#4338ca', textTransform: 'uppercase', letterSpacing: '0.5px' }}>2. Contact & Professional Info</h4>
               </div>

               <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                 <label style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Corporate Email</label>
                 <input type="email" name="email" value={formData.email} onChange={handleChange} required className={fieldErrors.email ? "error-field" : ""} style={{ padding: '10px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '13px', fontWeight: 600 }} />
               </div>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                 <label style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>{editMode ? 'Reset Password' : 'Mobile Number'}</label>
                 {editMode ? (
                   <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Optional" className={fieldErrors.password ? "error-field" : ""} style={{ padding: '10px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '13px', fontWeight: 600 }} />
                 ) : (
                   <input name="mobile" value={formData.mobile} onChange={handleChange} required className={fieldErrors.mobile ? "error-field" : ""} style={{ padding: '10px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '13px', fontWeight: 600 }} />
                 )}
               </div>
               <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                 <label style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Current Address</label>
                 <input name="address" value={formData.address} onChange={handleChange} placeholder="Street, City, State..." style={{ padding: '10px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '13px', fontWeight: 600 }} />
               </div>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                 <label style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Date of Joining</label>
                 <input type="date" name="joining_date" value={formData.joining_date} onChange={handleChange} style={{ padding: '10px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '13px', fontWeight: 600 }} />
               </div>

               {/* 3. RECRUITMENT PERFORMANCE */}
               <div style={{ gridColumn: 'span 2', background: '#f8fafc', padding: '15px', borderRadius: '16px', border: '1px solid #e2e8f0', marginTop: '10px' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '11px', fontWeight: 900, color: '#1e293b', textTransform: 'uppercase' }}>3. Recruitment Assessment</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                       <label style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8' }}>Interview Score (%)</label>
                       <input type="number" name="score" value={formData.score} onChange={handleChange} min="0" max="100" style={{ padding: '10px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '13px' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                       <label style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8' }}>Recruitment Status</label>
                       <select name="interview_status" value={formData.interview_status} onChange={handleChange} style={{ padding: '10px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '13px', background: '#fff' }}>
                          <option value="not_started">Pre-Screening</option>
                          <option value="round_1">Interview R1</option>
                          <option value="round_2">Technical R2</option>
                          <option value="final_round">HR General</option>
                          <option value="completed">Onboarded / Done</option>
                       </select>
                    </div>
                  </div>
               </div>

               {/* 4. IDENTIFICATION & SETTLEMENT */}
               <div style={{ gridColumn: 'span 2', borderBottom: '1.5px solid #f1f5f9', paddingBottom: '10px', marginTop: '15px', marginBottom: '5px' }}>
                  <h4 style={{ margin: 0, fontSize: '12px', fontWeight: 900, color: '#4338ca', textTransform: 'uppercase', letterSpacing: '0.5px' }}>4. ID & Banking Records</h4>
               </div>

               <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                 <label style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>PAN Number</label>
                 <input name="pan_number" value={formData.pan_number} onChange={handleChange} placeholder="ABCDE1234F" style={{ padding: '10px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '13px', fontWeight: 600 }} />
               </div>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                 <label style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>National ID (Aadhar/SSN)</label>
                 <input name="national_id" value={formData.national_id} onChange={handleChange} style={{ padding: '10px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '13px', fontWeight: 600 }} />
               </div>

               <div style={{ gridColumn: 'span 2', background: '#f8fafc', padding: '15px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8' }}>Bank Name</label>
                      <select name="bank_name" value={formData.bank_name} onChange={handleChange} style={{ padding: '10px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '13px', background: '#fff' }}>
                        <option value="">Select a Bank...</option>
                        <option value="State Bank of India (SBI)">State Bank of India (SBI)</option>
                        <option value="HDFC Bank">HDFC Bank</option>
                        <option value="ICICI Bank">ICICI Bank</option>
                        <option value="Axis Bank">Axis Bank</option>
                        <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                        <option value="Punjab National Bank (PNB)">Punjab National Bank (PNB)</option>
                        <option value="Bank of Baroda (BOB)">Bank of Baroda (BOB)</option>
                        <option value="Canara Bank">Canara Bank</option>
                        <option value="Union Bank of India">Union Bank of India</option>
                        <option value="IndusInd Bank">IndusInd Bank</option>
                        <option value="Yes Bank">Yes Bank</option>
                        <option value="Other">Other Bank</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8' }}>Account Number</label>
                      <input name="account_number" type="text" pattern="\d{9,18}" maxLength="18" minLength="9" title="Must be 9 to 18 digits" value={formData.account_number} onChange={handleChange} autoComplete="off" className={fieldErrors.account_number ? "error-field" : ""} style={{ padding: '10px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '13px' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8' }}>IFSC Code</label>
                      <input name="ifsc_code" type="text" maxLength="11" minLength="8" pattern="[A-Za-z0-9]{8,11}" title="Must be 8 to 11 characters" value={formData.ifsc_code} onChange={handleChange} className={fieldErrors.ifsc_code ? "error-field" : ""} style={{ textTransform: 'uppercase', padding: '10px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '13px' }} />
                    </div>
                  </div>
               </div>

               {/* 5. EMERGENCY CONTACT */}
               <div style={{ gridColumn: 'span 2', background: '#fff1f2', padding: '15px', borderRadius: '16px', border: '1px solid #fecdd3', marginTop: '10px' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '11px', fontWeight: 900, color: '#be123c', textTransform: 'uppercase' }}>5. Emergency Situation Contact</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                       <label style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8' }}>Contact Person Name</label>
                       <input name="emergency_name" value={formData.emergency_name} onChange={handleChange} style={{ padding: '10px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '13px' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                       <label style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8' }}>Emergency Phone</label>
                       <input name="emergency_phone" value={formData.emergency_phone} onChange={handleChange} style={{ padding: '10px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '13px' }} />
                    </div>
                  </div>
               </div>

               <div style={{ gridColumn: 'span 2', display: 'flex', gap: '15px', marginTop: '15px', paddingBottom: '20px' }}>
                 <button type="submit" disabled={loading} style={{ flex: 2, background: '#4338ca', color: 'white', border: 'none', padding: '16px', borderRadius: '16px', fontSize: '14px', fontWeight: 800, cursor: 'pointer' }}>
                    {loading ? 'Processing...' : (editMode ? 'Save Global Records' : 'Register Global Staff')}
                 </button>
                 <button type="button" onClick={() => { setShowModal(false); resetForm(); }} style={{ flex: 1, background: '#f1f5f9', color: '#64748b', border: 'none', padding: '16px', borderRadius: '16px', fontSize: '14px', fontWeight: 800, cursor: 'pointer' }}>Cancel</button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
