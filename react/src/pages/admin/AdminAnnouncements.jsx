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
      showToast("Broadcast history sync failed", "error");
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
      showToast("Announcement packet broadcasted globally", "success");
      setForm({ title: "", message: "", target_role: "all" });
      loadAnnouncements();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || "Broadcast engine failure", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!(await showConfirm("Are you sure you want to PERMANENTLY RECALL this broadcast? It will be removed from all staff nodes.", "Recall Announcement"))) {
      return;
    }

    try {
      await api.announcements.delete(id);
      showToast("Announcement recalled and purged", "success");
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      showToast("Data recall failed", "error");
    }
  };

  const getTargetBadge = (role) => {
    switch (role) {
      case "all": return <span style={{ background: '#eef2ff', color: '#4338ca', padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: 800 }}>GLOBAL BROADCAST</span>;
      case "manager": return <span style={{ background: '#f5f3ff', color: '#7c3aed', padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: 800 }}>MANAGEMENT ONLY</span>;
      case "staff": return <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: 800 }}>STAFF NODES</span>;
      default: return null;
    }
  };

  return (
    <div style={{ padding: '0 0 40px' }}>
      {/* ================= HEADER ================= */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#1e293b' }}>Announcements</h2>
          <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#64748b' }}>Post internal updates and organizational notices</p>
        </div>
        <div style={{ padding: '8px 16px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6366f1', animation: 'pulse 2s infinite' }}></div>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
            {announcements.length} Dispatched Signals
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 400px) 1fr', gap: '32px', alignItems: 'start' }}>
        
        {/* ================= BROADCAST SUITE ================= */}
        <div style={{ background: '#fff', padding: '32px', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)', position: 'sticky', top: '24px' }}>
          <h3 style={{ margin: '0 0 24px 0', fontSize: '16px', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="fas fa-bullhorn" style={{ color: '#6366f1' }}></i> New Announcement
          </h3>
          
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Target Roles</label>
              <select 
                name="target_role" 
                value={form.target_role} 
                onChange={handleChange}
                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px', fontWeight: 600, color: '#1e293b' }}
                required
              >
                <option value="all">Global (All Nodes)</option>
                <option value="manager">Management Authority</option>
                <option value="staff">Operational Staff</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Title</label>
              <input 
                type="text" 
                name="title" 
                placeholder="e.g. Shop Holiday List"
                value={form.title} 
                onChange={handleChange}
                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px', fontWeight: 600 }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Message</label>
              <textarea 
                name="message" 
                rows="6"
                placeholder="Enter message details..."
                value={form.message} 
                onChange={handleChange}
                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px', resize: 'none', lineHeight: '1.6' }}
                required
              ></textarea>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              style={{ padding: '14px', background: 'linear-gradient(135deg, #4338ca, #6366f1)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '14px', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(67, 56, 202, 0.3)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
            >
              {isSubmitting ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-paper-plane"></i>}
              {isSubmitting ? "SENDING..." : "SEND ANNOUNCEMENT"}
            </button>
          </form>
        </div>

        {/* ================= HISTORICAL ARCHIVE ================= */}
        <div style={{ background: '#fff', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
          <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#1e293b' }}>Broadcast Registry</h3>
            <button onClick={loadAnnouncements} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '14px' }} title="Sync Archives">
              <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
            </button>
          </div>

          <div style={{ padding: '32px' }}>
            {loading && announcements.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                <div className="fas fa-circle-notch fa-spin" style={{ fontSize: '24px', marginBottom: '12px' }}></div>
                <p style={{ fontWeight: 600, fontSize: '13px' }}>Retrieving archive logs...</p>
              </div>
            ) : announcements.length === 0 ? (
              <div style={{ padding: '60px 0', textAlign: 'center' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '30px', background: '#f1f5f9', color: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', margin: '0 auto 24px' }}>
                  <i className="fas fa-broadcast-tower"></i>
                </div>
                <h4 style={{ margin: 0, color: '#1e293b', fontSize: '18px', fontWeight: 800 }}>Archives Silent</h4>
                <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: '14px' }}>No organizational broadcasts have been logged yet.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '20px' }}>
                {announcements.map((a) => (
                  <div key={a.id} style={{ 
                    background: '#fff', 
                    border: '1.5px solid #f1f5f9', 
                    borderRadius: '20px', 
                    padding: '24px',
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#1e293b', width: '100%', marginBottom: '4px' }}>{a.title}</h4>
                        {getTargetBadge(a.target_role)}
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>
                          <i className="far fa-clock" style={{ marginRight: '6px' }}></i> {new Date(a.created_at).toLocaleString()}
                        </span>
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>
                          <i className="far fa-user" style={{ marginRight: '6px' }}></i> Auth: {a.creator_name}
                        </span>
                      </div>
                      <button 
                        onClick={() => handleDelete(a.id)} 
                        style={{ background: '#fff1f2', border: 'none', color: '#e11d48', cursor: 'pointer', padding: '10px', borderRadius: '12px', fontSize: '12px' }}
                        title="Recall Dispatch"
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </div>
                    <div style={{ fontSize: '14px', color: '#475569', lineHeight: '1.7', whiteSpace: 'pre-wrap', background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                      {a.message}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
