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
      showToast("Failed to load messages", "error");
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
      showToast("Failed to mark as read", "error");
    }
  };

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    
    if (!(await showConfirm("Are you sure you want to delete this message? This action cannot be undone.", "Delete Message"))) {
      return;
    }

    try {
      await api.contact.delete(id);
      showToast("Message deleted", "success");
      setMessages((prev) => prev.filter((m) => m.id !== id));
      if (selectedMessage && selectedMessage.id === id) {
        setSelectedMessage(null);
      }
    } catch (err) {
      showToast("Failed to delete message", "error");
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
      case "bug": return { bg: "#fee2e2", color: "#dc2626" };
      case "enterprise": return { bg: "#f3e8ff", color: "#7e22ce" };
      case "billing": return { bg: "#dcfce7", color: "#16a34a" };
      case "technical": return { bg: "#e0f2fe", color: "#0284c7" };
      case "feature": return { bg: "#fef3c7", color: "#d97706" };
      default: return { bg: "#f1f5f9", color: "#475569" };
    }
  };

  return (
    <div className="table-card container-fade-in" style={{ padding: '0', display: 'flex', minHeight: '600px', flexDirection: 'column' }}>
      
      {/* Header */}
      <div style={{ padding: '24px 32px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', color: '#0f172a' }}>Support Messages</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
            {messages.filter(m => !m.is_read).length} unread queries from site visitors.
          </p>
        </div>
        <button onClick={loadMessages} className="secondary-btn" style={{ fontSize: '13px' }}>
          <i className="fas fa-sync-alt"></i> Refresh
        </button>
      </div>

      <div style={{ display: 'flex', flex: 1 }}>
        
        {/* L/H Sidebar: Message List */}
        <div style={{ width: '380px', borderRight: '1px solid #e2e8f0', background: '#f8fafc', overflowY: 'auto', maxHeight: '700px' }}>
          {loading ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}><i className="fas fa-spinner fa-spin"></i> Loading...</div>
          ) : messages.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
              <i className="fas fa-inbox" style={{ fontSize: '32px', marginBottom: '10px' }}></i>
              <p>No messages found</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {messages.map((msg) => (
                <div 
                  key={msg.id}
                  onClick={() => openMessage(msg)}
                  style={{ 
                    padding: '20px 24px',
                    borderBottom: '1px solid #e2e8f0',
                    background: selectedMessage?.id === msg.id ? '#fff' : msg.is_read ? 'transparent' : '#f0f9ff',
                    borderLeft: `4px solid ${selectedMessage?.id === msg.id ? '#4f46e5' : msg.is_read ? 'transparent' : '#0ea5e9'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontWeight: msg.is_read ? 600 : 700, color: '#0f172a', fontSize: '15px' }}>{msg.name}</span>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      {new Date(msg.created_at.endsWith('Z') ? msg.created_at : msg.created_at + 'Z').toLocaleString(undefined, {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: msg.is_read ? '#475569' : '#0f172a', fontWeight: msg.is_read ? 400 : 600, marginBottom: '8px' }}>
                    {msg.subject || 'No Subject'}
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {msg.message}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* R/H Area: Message Detail */}
        <div style={{ flex: 1, padding: '32px', background: '#fff' }}>
          {selectedMessage ? (
            <div className="fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #e2e8f0' }}>
                
                <div>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '22px', color: '#0f172a' }}>{selectedMessage.subject || 'No Subject'}</h3>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#4f46e5', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '16px' }}>
                      {selectedMessage.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{selectedMessage.name}</div>
                      <div style={{ fontSize: '13px', color: '#64748b', display: 'flex', gap: '10px' }}>
                        <span><a href={`mailto:${selectedMessage.email}`} style={{ color: '#2563eb', textDecoration: 'none' }}>{selectedMessage.email}</a></span>
                        <span>•</span>
                        <span>{new Date(selectedMessage.created_at.endsWith('Z') ? selectedMessage.created_at : selectedMessage.created_at + 'Z').toLocaleString(undefined, {
                          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <a href={`mailto:${selectedMessage.email}?subject=RE: ${selectedMessage.subject}`} className="primary-btn" style={{ textDecoration: 'none', padding: '8px 16px', fontSize: '13px' }}>
                    <i className="fas fa-reply"></i> Reply
                  </a>
                  <button onClick={(e) => handleDelete(selectedMessage.id, e)} className="danger-btn" style={{ padding: '8px 16px', fontSize: '13px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
                    <i className="fas fa-trash-alt"></i> Delete
                  </button>
                </div>

              </div>

              {/* Message Body */}
              <div style={{ fontSize: '15px', color: '#334155', lineHeight: '1.7', whiteSpace: 'pre-wrap', background: '#f8fafc', padding: '24px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                {selectedMessage.message}
              </div>
              
              <div style={{ marginTop: '20px' }}>
                {(() => {
                  const badge = getSubjectBadgeColor(selectedMessage.subject);
                  return (
                    <span style={{ background: badge.bg, color: badge.color, padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
                      Category: {selectedMessage.subject}
                    </span>
                  );
                })()}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
              <i className="fas fa-envelope-open-text" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}></i>
              <h3 style={{ margin: 0, color: '#475569' }}>Select a message to read</h3>
              <p style={{ marginTop: '8px', fontSize: '14px' }}>Choose a message from the list on the left.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
