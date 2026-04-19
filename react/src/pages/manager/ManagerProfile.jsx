import { useState, useEffect } from "react";
import api from "../../services/api";

export default function ManagerProfile() {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [form, setForm] = useState({
        phone: "",
        address: "",
        bank_name: "",
        account_number: "",
        ifsc_code: ""
    });
    const [message, setMessage] = useState("");

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
        const mobileRegex = /^[6-9]\d{9}$/;
        if (form.phone && !mobileRegex.test(form.phone)) {
            setMessage("❌ Invalid mobile number. Must be 10 digits starting with 6,7,8,9");
            setLoading(false);
            setTimeout(() => setMessage(""), 3000);
            return;
        }

        try {
            await api.auth.updateProfile({
                phone: form.phone,
                address: form.address,
                bank_name: form.bank_name,
                account_number: form.account_number,
                ifsc_code: form.ifsc_code
            });
            setMessage("✅ Profile updated successfully");
            await loadProfile();
            setEditMode(false);
        } catch (err) {
            setMessage("❌ Update failed: " + (err.response?.data?.message || err.message));
        }
        setLoading(false);
        setTimeout(() => setMessage(""), 3000);
    };

    if (loading && !profile) return <div style={{ padding: '20px' }}>Loading profile...</div>;

    return (
        <div className="profile-container" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>My Profile</h2>
                {!editMode && (
                    <button className="secondary-btn" onClick={() => setEditMode(true)}>
                        Edit Profile
                    </button>
                )}
            </div>

            {message && (
                <div style={{
                    padding: '12px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    background: message.includes('✅') ? '#d1fae5' : '#fee2e2',
                    color: message.includes('✅') ? '#065f46' : '#991b1b',
                    fontWeight: 500
                }}>
                    {message}
                </div>
            )}

            <div className="chart-card" style={{ padding: '25px' }}>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '30px' }}>
                    <div style={{
                        width: '80px', height: '80px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, #10b981, #3b82f6)',
                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '32px', fontWeight: 700
                    }}>
                        {profile?.firstName?.[0]}{profile?.lastName?.[0]}
                    </div>
                    <div>
                        <h3 style={{ margin: 0 }}>{profile?.firstName} {profile?.lastName}</h3>
                        <span style={{
                            background: '#f1f5f9', padding: '4px 12px', borderRadius: '12px',
                            fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase'
                        }}>
                            {profile?.role} (Branch Manager)
                        </span>
                    </div>
                </div>

                <div style={{ display: 'grid', gap: '20px' }}>
                    <div className="info-group">
                        <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '5px', textTransform: 'uppercase', fontWeight: 700 }}>Email Address</label>
                        <div style={{ fontSize: '15px', fontWeight: 600 }}>{profile?.email}</div>
                    </div>

                    <form onSubmit={handleUpdate} style={{ display: 'grid', gap: '20px' }}>
                        <div className="input-group">
                            <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '5px', textTransform: 'uppercase', fontWeight: 700 }}>Mobile Number</label>
                            <input
                                value={form.phone}
                                onChange={e => setForm({ ...form, phone: e.target.value })}
                                disabled={!editMode || loading}
                                placeholder="No phone number set"
                                style={!editMode ? { background: '#f8fafc', border: '1px solid #e2e8f0' } : {}}
                            />
                        </div>

                        <div className="input-group">
                            <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '5px', textTransform: 'uppercase', fontWeight: 700 }}>Home Address</label>
                            <textarea
                                value={form.address}
                                onChange={e => setForm({ ...form, address: e.target.value })}
                                disabled={!editMode || loading}
                                placeholder="Enter your address"
                                style={{ minHeight: '80px', ...(!editMode ? { background: '#f8fafc', border: '1px solid #e2e8f0' } : {}) }}
                            />
                        </div>

                        <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '10px 0' }} />
                        <h4 style={{ margin: 0, fontSize: '14px', color: '#1e293b' }}>Bank & Payment Details</h4>

                        <div className="input-group">
                            <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '5px', textTransform: 'uppercase', fontWeight: 700 }}>Bank Name</label>
                            <input
                                value={form.bank_name}
                                onChange={e => setForm({ ...form, bank_name: e.target.value })}
                                disabled={!editMode || loading}
                                placeholder="e.g. HDFC Bank"
                                style={!editMode ? { background: '#f8fafc', border: '1px solid #e2e8f0' } : {}}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <div className="input-group">
                                <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '5px', textTransform: 'uppercase', fontWeight: 700 }}>Account Number</label>
                                <input
                                    value={form.account_number}
                                    onChange={e => setForm({ ...form, account_number: e.target.value })}
                                    disabled={!editMode || loading}
                                    placeholder="Account Number"
                                    style={!editMode ? { background: '#f8fafc', border: '1px solid #e2e8f0' } : {}}
                                />
                            </div>
                            <div className="input-group">
                                <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '5px', textTransform: 'uppercase', fontWeight: 700 }}>IFSC Code</label>
                                <input
                                    value={form.ifsc_code}
                                    onChange={e => setForm({ ...form, ifsc_code: e.target.value })}
                                    disabled={!editMode || loading}
                                    placeholder="IFSC Code"
                                    style={!editMode ? { background: '#f8fafc', border: '1px solid #e2e8f0' } : {}}
                                />
                            </div>
                        </div>

                        {editMode && (
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button type="submit" className="primary-btn" disabled={loading}>
                                    {loading ? "Saving..." : "Save Changes"}
                                </button>
                                <button type="button" className="secondary-btn" onClick={() => {
                                    setEditMode(false);
                                    setForm({
                                        phone: profile.phone || "",
                                        address: profile.address || "",
                                        bank_name: profile.bank_name || "",
                                        account_number: profile.account_number || "",
                                        ifsc_code: profile.ifsc_code || ""
                                    });
                                }}>
                                    Cancel
                                </button>
                            </div>
                        )}
                    </form>
                </div>
            </div>

            <div style={{ marginTop: '20px', padding: '15px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fca5a5' }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#991b1b' }}>
                    <i className="fas fa-lock" style={{ marginRight: '5px' }}></i>
                    You can manage your contact and bank details securely. For Name, Email, or Branch re-assignments, please contact the <strong>System Administrator</strong>.
                </p>
            </div>
        </div>
    );
}
