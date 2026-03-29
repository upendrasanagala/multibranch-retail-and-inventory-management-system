import { useState, useEffect } from "react";
import api from "../services/api";

export default function UnreadTransfersBadge() {
  const [count, setCount] = useState(0);

  const fetchPendingCount = async () => {
    try {
      const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || {};
      const branchId = loggedInUser.branch_id;
      const isAdmin = loggedInUser.role === 'admin';

      const res = await api.transfers.getAll(branchId && !isAdmin ? { branch_id: branchId } : {});
      const transfers = res.transfers || [];
      
      let pendingCount = 0;
      if (isAdmin) {
        pendingCount = transfers.filter(t => t.status === "pending").length;
      } else {
        // For managers, count incoming requests that they need to approve
        pendingCount = transfers.filter(t => t.from_branch_id === branchId && t.status === "pending").length;
      }
      
      setCount(pendingCount);
    } catch (err) {
      console.error("Failed to fetch pending transfers count", err);
    }
  };

  useEffect(() => {
    fetchPendingCount();
    
    // Poll every 30 seconds to stay updated with other branches 
    const interval = setInterval(fetchPendingCount, 30000);
    return () => clearInterval(interval);
  }, []);

  if (count === 0) return null;

  return (
    <span style={{ 
      background: '#f59e0b', // Amber to indicate action required
      color: '#fff', 
      fontSize: '10px', 
      padding: '2px 6px', 
      borderRadius: '10px', 
      fontWeight: 'bold', 
      marginLeft: '8px',
      verticalAlign: 'middle'
    }}>
      {count} PENDING
    </span>
  );
}
