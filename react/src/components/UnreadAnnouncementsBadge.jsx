import { useState, useEffect } from "react";
import api from "../services/api";

export default function UnreadAnnouncementsBadge() {
  const [count, setCount] = useState(0);

  const fetchUnreadCount = async () => {
    try {
      const res = await api.announcements.getFeed();
      const announcements = res.announcements || [];
      const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || {};
      const storageKey = `readAnnouncements_${loggedInUser.id || loggedInUser.user_id || loggedInUser.username || loggedInUser.email || 'guest'}`;
      const readIds = JSON.parse(localStorage.getItem(storageKey)) || [];
      
      const unreadCount = announcements.filter(a => !readIds.includes(a.id)).length;
      setCount(unreadCount);
    } catch (err) {
      console.error("Failed to fetch unread announcements count", err);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    
    // Listen for custom event emitted by AnnouncementsFeed when read state changes
    window.addEventListener("announcementsRead", fetchUnreadCount);
    return () => window.removeEventListener("announcementsRead", fetchUnreadCount);
  }, []);

  if (count === 0) return null;

  return (
    <span style={{ 
      background: '#ef4444', 
      color: '#fff', 
      fontSize: '10px', 
      padding: '2px 6px', 
      borderRadius: '10px', 
      fontWeight: 'bold', 
      marginLeft: '8px',
      verticalAlign: 'middle'
    }}>
      {count} NEW
    </span>
  );
}
