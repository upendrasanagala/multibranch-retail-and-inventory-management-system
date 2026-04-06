import { useState, useEffect } from "react";
import api from "../../services/api";
import { useToast } from "../../components/ToastContext";

export default function StaffProfile() {
  const { showToast } = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ phone: "", address: "", bank_name: "", account_number: "", ifsc_code: "" });

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await api.auth.getProfile();
      setProfile(res);
      setForm({
        phone: res.phone || "",
        address: res.address || "",
        bank_name: res.bank_name || "",
        account_number: res.account_number || "",
        ifsc_code: res.ifsc_code || ""
      });
    } catch (err) {
      console.error("Failed to load profile", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.auth.updateProfile(form);
      showToast("Profile credentials updated successfully", "success");
      await loadProfile();
      setEditMode(false);
    } catch (err) {
      showToast("Update failed: " + (err.response?.data?.message || err.message), "error");
    }
    setLoading(false);
  };

  if (loading && !profile) return <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontWeight: 800 }}>Loading Profile...</div>;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', animation: 'fadeIn 0.5s ease-out' }}>
      
      {/* ================= PROFILE CARD ================= */}
      <div style={{ background: '#fff', borderRadius: '28px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', marginBottom: '30px' }}>
        <div style={{ height: '120px', background: 'linear-gradient(135deg, #4338ca 0%, #6366f1 100%)' }}></div>
        <div style={{ padding: '0 40px 40px', marginTop: '-40px' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div style={{ width: '100px', height: '100px', borderRadius: '30px', border: '6px solid #fff', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 900, color: '#4338ca', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                {profile?.firstName?.[0]}{profile?.lastName?.[0]}
              </div>
              {!editMode && (
                 <button onClick={() => setEditMode(true)} style={{ marginBottom: '10px', padding: '10px 24px', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '14px', fontSize: '13px', fontWeight: 800, color: '#64748b', cursor: 'pointer' }}>
                   <i className="fas fa-edit" style={{ marginRight: '8px' }}></i> Edit Profile
                 </button>
              )}
           </div>

           <div style={{ marginTop: '20px' }}>
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 900, color: '#1e293b' }}>{profile?.firstName} {profile?.lastName}</h1>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '6px' }}>
                  <span style={{ padding: '4px 12px', background: '#eef2ff', borderRadius: '100px', fontSize: '11px', fontWeight: 800, color: '#4338ca', textTransform: 'uppercase' }}>{profile?.role}</span>
                 <span style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8' }}>ID: {profile?.employee_id || 'STF-001'}</span>
              </div>
           </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
         {/* PERSONAL & AUTH */}
         <div style={{ background: '#fff', padding: '35px', borderRadius: '28px', border: '1px solid #e2e8f0' }}>
             <h3 style={{ margin: '0 0 25px 0', fontSize: '16px', fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fas fa-id-card" style={{ color: '#4338ca' }}></i> Personal Information
            </h3>
            <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Email Address</label>
                    <div style={{ padding: '14px', borderRadius: '14px', background: '#f8fafc', border: '1.5px solid #f1f5f9', fontSize: '14px', fontWeight: 700, color: '#64748b' }}>{profile?.email}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Phone Number</label>
                    <input disabled={!editMode} value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} style={{ padding: '14px', borderRadius: '14px', background: editMode ? '#fff' : '#f8fafc', border: '1.5px solid #e2e8f0', fontSize: '14px', fontWeight: 700, outline: 'none' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Residential Address</label>
                    <textarea disabled={!editMode} rows="3" value={form.address} onChange={e => setForm({...form, address: e.target.value})} style={{ padding: '14px', borderRadius: '14px', background: editMode ? '#fff' : '#f8fafc', border: '1.5px solid #e2e8f0', fontSize: '14px', fontWeight: 700, outline: 'none', resize: 'none' }} />
                  </div>
               </div>
               
               {editMode && (
                  <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                     <button type="submit" disabled={loading} style={{ flex: 1, padding: '14px', background: '#4338ca', color: 'white', border: 'none', borderRadius: '14px', fontSize: '14px', fontWeight: 800, cursor: 'pointer' }}>Save Changes</button>
                     <button type="button" onClick={() => setEditMode(false)} style={{ flex: 1, padding: '14px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '14px', fontSize: '14px', fontWeight: 800, cursor: 'pointer' }}>Cancel</button>
                  </div>
               )}
            </form>
         </div>

         {/* FINANCIALS */}
         <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
           <div style={{ background: '#fff', padding: '35px', borderRadius: '28px', border: '1px solid #e2e8f0' }}>
               <h3 style={{ margin: '0 0 25px 0', fontSize: '16px', fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="fas fa-university" style={{ color: '#10b981' }}></i> Bank Details
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                     <label style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Bank Name</label>
                     <input disabled={!editMode} value={form.bank_name} onChange={e => setForm({...form, bank_name: e.target.value})} style={{ padding: '14px', borderRadius: '14px', background: editMode ? '#fff' : '#f8fafc', border: '1.5px solid #e2e8f0', fontSize: '14px', fontWeight: 700, outline: 'none' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                     <label style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Account Number</label>
                     <input disabled={!editMode} value={form.account_number} onChange={e => setForm({...form, account_number: e.target.value})} style={{ padding: '14px', borderRadius: '14px', background: editMode ? '#fff' : '#f8fafc', border: '1.5px solid #e2e8f0', fontSize: '14px', fontWeight: 700, outline: 'none' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                     <label style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>IFSC Code</label>
                     <input disabled={!editMode} value={form.ifsc_code} onChange={e => setForm({...form, ifsc_code: e.target.value})} style={{ padding: '14px', borderRadius: '14px', background: editMode ? '#fff' : '#f8fafc', border: '1.5px solid #e2e8f0', fontSize: '14px', fontWeight: 700, outline: 'none' }} />
                  </div>
              </div>
           </div>

           <div style={{ padding: '24px', background: '#eef2ff', borderRadius: '24px', border: '1px solid #e0e7ff', display: 'flex', gap: '15px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4338ca', flexShrink: 0 }}>
                 <i className="fas fa-shield-alt"></i>
              </div>
              <div>
                  <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '13px' }}>Profile Security</div>
                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#64748b', fontWeight: 600, lineHeight: 1.5 }}>Name, Role, and Branch can only be changed by your Manager.</p>
              </div>
           </div>
         </div>
      </div>
    </div>
  );
}
