import { useEffect, useState } from "react";
import api from "../../services/api";
import { useToast } from "../../components/ToastContext";
import { useConfirm } from "../../components/ConfirmContext";

export default function AdminMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState(null);
  
  const { showToast } = useToast();
  const { showConfirm } = useConfirm();

  const loadMessages = async () => {
    setLoading(true);
    try {
      const res = await api.contact.getAll();
      setMessages(res.messages || []);
    } catch (err) {
      console.error("Failed to load messages:", err);
      showToast("Communication link synchronization failed", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await api.contact.markRead(id);
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, is_read: true } : m))
      );
      if (selectedMessage && selectedMessage.id === id) {
        setSelectedMessage({ ...selectedMessage, is_read: true });
      }
    } catch (err) {
      showToast("Priority update failed", "error");
    }
  };

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    
    if (!(await showConfirm("Are you sure you want to PERMANENTLY PURGE this communication record? This cannot be restored.", "Archive Message"))) {
      return;
    }

    try {
      await api.contact.delete(id);
      showToast("Message purged from database", "success");
      setMessages((prev) => prev.filter((m) => m.id !== id));
      if (selectedMessage && selectedMessage.id === id) {
        setSelectedMessage(null);
      }
    } catch (err) {
      showToast("Data deletion failed", "error");
    }
  };

  const openMessage = (msg) => {
    setSelectedMessage(msg);
    if (!msg.is_read) {
      handleMarkRead(msg.id);
    }
  };

  const getSubjectBadgeColor = (subject) => {
    switch (subject?.toLowerCase()) {
      case "bug": return { bg: '#fff1f2', color: '#e11d48' };
      case "enterprise": return { bg: '#eef2ff', color: '#4338ca' };
      case "billing": return { bg: '#ecfdf5', color: '#10b981' };
      case "technical": return { bg: '#eff6ff', color: '#3b82f6' };
      case "feature": return { bg: '#fef3c7', color: '#d97706' };
      default: return { bg: '#f1f5f9', color: '#64748b' };
    }
  };

  return (
    <div style={{ padding: '0 0 40px' }}>
      {/* ================= HEADER ================= */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#1e293b' }}>Messages</h2>
          <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#64748b' }}>Support requests and user feedback streams</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ padding: '8px 16px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6366f1' }}></div>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
              {messages.filter(m => !m.is_read).length} Priority Packets
            </span>
          </div>
          <button onClick={loadMessages} style={{ background: 'none', border: 'none', padding: '10px', color: '#64748b', cursor: 'pointer', fontSize: '18px' }} title="Sync Portal">
            <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
          </button>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)', display: 'flex', height: 'calc(100vh - 280px)', minHeight: '600px', overflow: 'hidden' }}>
        
        {/* ================= INBOX SIDEBAR ================= */}
        <div style={{ width: '380px', borderRight: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 900, color: '#475569', letterSpacing: '0.05em' }}>INBOX</h3>
            <i className="fas fa-inbox" style={{ color: '#94a3b8' }}></i>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading && messages.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                <div className="fas fa-circle-notch fa-spin" style={{ fontSize: '24px', marginBottom: '12px' }}></div>
                <p style={{ fontWeight: 600, fontSize: '13px' }}>Mapping records...</p>
              </div>
            ) : messages.length === 0 ? (
              <div style={{ padding: '80px 40px', textAlign: 'center' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: '#e2e8f0', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', margin: '0 auto 16px' }}>
                  <i className="fas fa-envelope-open"></i>
                </div>
                <h4 style={{ margin: 0, color: '#1e293b', fontSize: '15px' }}>Terminal Empty</h4>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px' }}>No inbound signals detected.</p>
              </div>
            ) : (
              messages.map(msg => (
                <div 
                  key={msg.id}
                  onClick={() => openMessage(msg)}
                  style={{ 
                    padding: '20px 24px',
                    borderBottom: '1px solid #f1f5f9',
                    background: selectedMessage?.id === msg.id ? '#fff' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', alignItems: 'center' }}>
                    <span style={{ fontWeight: msg.is_read ? 700 : 900, color: msg.is_read ? '#64748b' : '#1e293b', fontSize: '14px' }}>{msg.name}</span>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>
                      {new Date(msg.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: msg.is_read ? 600 : 800, color: msg.is_read ? '#94a3b8' : '#4338ca', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {msg.subject || 'No Head'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {msg.message}
                  </div>
                  {!msg.is_read && (
                    <div style={{ position: 'absolute', left: '0', top: '20px', bottom: '20px', width: '3px', background: '#6366f1' }}></div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* ================= DETAIL VIEWPORT ================= */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff' }}>
          {selectedMessage ? (
            <>
              {/* Message Header */}
              <div style={{ padding: '32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#1e293b' }}>{selectedMessage.subject || 'Standard Query'}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>{selectedMessage.name}</span>
                      <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#cbd5e1' }}></span>
                      <a href={`mailto:${selectedMessage.email}`} style={{ fontSize: '13px', color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>{selectedMessage.email}</a>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <a href={`mailto:${selectedMessage.email}?subject=Response: ${selectedMessage.subject}`} style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #4338ca, #6366f1)', color: '#fff', textDecoration: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '13px', boxShadow: '0 4px 6px -1px rgba(67, 56, 202, 0.2)' }}>
                    <i className="fas fa-reply" style={{ marginRight: '8px' }}></i> Reply
                  </a>
                  <button onClick={(e) => handleDelete(selectedMessage.id, e)} style={{ padding: '10px 14px', background: '#fff1f2', color: '#e11d48', border: 'none', borderRadius: '12px', cursor: 'pointer' }}>
                    <i className="fas fa-trash-alt"></i>
                  </button>
                </div>
              </div>

              {/* Message Payload */}
              <div style={{ flex: 1, padding: '40px', overflowY: 'auto', background: '#fcfdfe' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  <i className="fas fa-clock" style={{ marginRight: '6px' }}></i> Captured: {new Date(selectedMessage.created_at).toLocaleString()}
                </div>
                
                <div style={{ background: '#fff', padding: '32px', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.02)', color: '#334155', fontSize: '16px', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
                  {selectedMessage.message}
                </div>

                <div style={{ marginTop: '24px' }}>
                  {(() => {
                    const badge = getSubjectBadgeColor(selectedMessage.subject);
                    return (
                      <span style={{ 
                        background: badge.bg, 
                        color: badge.color, 
                        padding: '6px 16px', 
                        borderRadius: '12px', 
                        fontSize: '11px', 
                        fontWeight: 800,
                        textTransform: 'uppercase'
                      }}>
                        Identifier: {selectedMessage.subject || 'General'}
                      </span>
                    );
                  })()}
                </div>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '30px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', marginBottom: '20px', color: '#cbd5e1' }}>
                <i className="fas fa-paper-plane"></i>
              </div>
              <h3 style={{ margin: 0, color: '#1e293b', fontSize: '18px', fontWeight: 800 }}>Signal Selection Required</h3>
              <p style={{ marginTop: '8px', fontSize: '14px', maxWidth: '300px', textAlign: 'center', lineHeight: '1.5' }}>Please select a communication thread from the directory to initialize full-text visualization.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
