import { useEffect, useState } from "react";
import api from "../../services/api";
import { useToast } from "../../components/ToastContext";
import { useConfirm } from "../../components/ConfirmContext";

export default function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [form, setForm] = useState({
    title: "",
    message: "",
    target_role: "all"
  });

  const { showToast } = useToast();
  const { showConfirm } = useConfirm();

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await api.announcements.getAll();
      setAnnouncements(res.announcements || []);
    } catch (err) {
      console.error("Failed to load announcements:", err);
      showToast("Failed to load announcements", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.announcements.create(form);
      showToast("Announcement broadcasted successfully", "success");
      setForm({ title: "", message: "", target_role: "all" });
      loadAnnouncements();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || "Failed to broadcast announcement", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!(await showConfirm("Are you sure you want to delete this announcement? It will be removed from all staff and manager dashboards.", "Delete Announcement"))) {
      return;
    }

    try {
      await api.announcements.delete(id);
      showToast("Announcement deleted", "success");
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      showToast("Failed to delete announcement", "error");
    }
  };

  const getTargetBadge = (role) => {
    switch (role) {
      case "all": return <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>EVERYONE</span>;
      case "manager": return <span style={{ background: '#f3e8ff', color: '#7e22ce', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>MANAGERS ONLY</span>;
      case "staff": return <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>STAFF ONLY</span>;
      default: return null;
    }
  };

  return (
    <div className="container-fade-in" style={{ padding: '0 20px', maxWidth: '1200px', margin: '0 auto' }}>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '24px', alignItems: 'start' }}>
        
        {/* L/H: CREATE ANNOUNCEMENT FORM */}
        <div className="table-card" style={{ position: 'sticky', top: '20px' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '20px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="fas fa-bullhorn" style={{ color: '#4f46e5' }}></i> New Broadcast
          </h3>
          
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Target Audience</label>
              <select 
                name="target_role" 
                value={form.target_role} 
                onChange={handleChange}
                style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontFamily: 'inherit', fontSize: '14px' }}
                required
              >
                <option value="all">Everyone (Managers & Staff)</option>
                <option value="manager">Branch Managers Only</option>
                <option value="staff">Staff Members Only</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Headline</label>
              <input 
                type="text" 
                name="title" 
                placeholder="e.g. New Return Policy Effective Monday"
                value={form.title} 
                onChange={handleChange}
                style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontFamily: 'inherit', fontSize: '14px' }}
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Message Body</label>
              <textarea 
                name="message" 
                rows="6"
                placeholder="Type the full announcement here..."
                value={form.message} 
                onChange={handleChange}
                style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontFamily: 'inherit', fontSize: '14px', resize: 'vertical' }}
                required
              ></textarea>
            </div>

            <button 
              type="submit" 
              className="primary-btn" 
              disabled={isSubmitting}
              style={{ padding: '12px', fontSize: '15px', display: 'flex', justifyContent: 'center', gap: '8px', opacity: isSubmitting ? 0.7 : 1 }}
            >
              {isSubmitting ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-paper-plane"></i>}
              {isSubmitting ? "Broadcasting..." : "Send Announcement"}
            </button>
            <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', margin: 0 }}>
              This will instantly appear on the selected users' dashboards.
            </p>
          </form>
        </div>

        {/* R/H: PREVIOUS ANNOUNCEMENTS LOG */}
        <div className="table-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: '0', fontSize: '20px', color: '#0f172a' }}>Broadcast History</h3>
            <button onClick={loadAnnouncements} className="secondary-btn" style={{ fontSize: '12px', padding: '6px 12px' }}>
              <i className="fas fa-sync-alt"></i> Refresh
            </button>
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', marginBottom: '10px' }}></i>
              <p>Loading history...</p>
            </div>
          ) : announcements.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
              <i className="fas fa-broadcast-tower" style={{ fontSize: '48px', color: '#cbd5e1', marginBottom: '16px' }}></i>
              <h4 style={{ margin: '0 0 8px 0', color: '#475569' }}>No announcements yet</h4>
              <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8' }}>Send your first broadcast using the form on the left.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {announcements.map((a) => (
                <div key={a.id} style={{ 
                  background: '#f8fafc', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '12px', 
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#0f172a' }}>{a.title}</h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {getTargetBadge(a.target_role)}
                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                          <i className="far fa-clock"></i> {new Date(a.created_at.endsWith('Z') ? a.created_at : a.created_at + 'Z').toLocaleString()}
                        </span>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                          <i className="far fa-user"></i> By {a.creator_name}
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDelete(a.id)} 
                      style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '8px', borderRadius: '6px' }}
                      title="Delete Announcement"
                      onMouseEnter={(e) => e.currentTarget.style.background = '#fee2e2'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <i className="fas fa-trash-alt"></i>
                    </button>
                  </div>
                  <div style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6', whiteSpace: 'pre-wrap', background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    {a.message}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}
