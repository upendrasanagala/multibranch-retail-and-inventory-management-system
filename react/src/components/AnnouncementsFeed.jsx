import { useEffect, useState } from "react";
import api from "../services/api";

export default function AnnouncementsFeed() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || {};
  const storageKey = `readAnnouncements_${loggedInUser.id || loggedInUser.user_id || loggedInUser.username || loggedInUser.email || 'guest'}`;

  const [readIds, setReadIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey)) || [];
    } catch {
      return [];
    }
  });

  const loadFeed = async () => {
    setLoading(true);
    try {
      const res = await api.announcements.getFeed();
      setAnnouncements(res.announcements || []);
    } catch (err) {
      console.error("Failed to load announcements:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeed();
  }, []);

  const markAsRead = (id) => {
    if (!readIds.includes(id)) {
      const updated = [...readIds, id];
      setReadIds(updated);
      localStorage.setItem(storageKey, JSON.stringify(updated));
      window.dispatchEvent(new Event("announcementsRead"));
    }
  };

  const markAllAsRead = () => {
    const allIds = announcements.map(a => a.id);
    const updated = Array.from(new Set([...readIds, ...allIds]));
    setReadIds(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    window.dispatchEvent(new Event("announcementsRead"));
  };

  const unreadCount = announcements.filter((a) => !readIds.includes(a.id)).length;

  return (
    <div className="container-fade-in" style={{ padding: '0 20px', maxWidth: '800px', margin: '0 auto' }}>
      <div className="table-card">
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
          <div>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fas fa-bullhorn" style={{ color: '#4f46e5' }}></i> Announcements 
              {unreadCount > 0 && <span style={{ background: '#ef4444', color: '#fff', fontSize: '12px', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>{unreadCount} NEW</span>}
            </h2>
            <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Important updates and notices from the administration.</p>
          </div>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="secondary-btn" style={{ fontSize: '12px', padding: '6px 12px' }}>
                <i className="fas fa-check-double"></i> Mark all read
              </button>
            )}
            <button onClick={loadFeed} className="primary-btn" style={{ fontSize: '12px', padding: '6px 12px' }}>
              <i className="fas fa-sync-alt"></i> Refresh
            </button>
          </div>
        </div>

        {/* Feed List */}
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', marginBottom: '10px' }}></i>
            <p>Checking for updates...</p>
          </div>
        ) : announcements.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
            <i className="far fa-bell-slash" style={{ fontSize: '48px', color: '#cbd5e1', marginBottom: '16px' }}></i>
            <h4 style={{ margin: '0 0 8px 0', color: '#475569' }}>You're all caught up!</h4>
            <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8' }}>No new announcements at this time.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {announcements.map((a) => {
              const isUnread = !readIds.includes(a.id);
              return (
                <div 
                  key={a.id} 
                  onClick={() => markAsRead(a.id)}
                  style={{ 
                    background: isUnread ? '#f0f9ff' : '#fff', 
                    border: `1px solid ${isUnread ? '#bae6fd' : '#e2e8f0'}`,
                    borderLeft: `4px solid ${isUnread ? '#0ea5e9' : '#cbd5e1'}`,
                    borderRadius: '8px', 
                    padding: '20px',
                    transition: 'all 0.2s',
                    cursor: isUnread ? 'pointer' : 'default',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <h4 style={{ margin: 0, fontSize: '18px', color: isUnread ? '#0369a1' : '#0f172a', fontWeight: isUnread ? 700 : 600 }}>
                      {a.title}
                    </h4>
                    <span style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap', marginLeft: '16px' }}>
                      {new Date(a.created_at.endsWith('Z') ? a.created_at : a.created_at + 'Z').toLocaleString(undefined, {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </div>
                  
                  <div style={{ fontSize: '15px', color: '#334155', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                    {a.message}
                  </div>
                  
                  <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#e2e8f0', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold' }}>
                        {a.creator_name ? a.creator_name.charAt(0) : 'A'}
                      </div>
                      <span style={{ fontWeight: 600 }}>{a.creator_name || 'Admin'}</span>
                    </div>
                    {isUnread && (
                      <span style={{ fontSize: '11px', color: '#0ea5e9', fontWeight: 600 }}>
                        Click to mark read
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
