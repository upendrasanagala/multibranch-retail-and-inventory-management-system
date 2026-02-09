import { useEffect, useState } from "react";

export default function AdminStats() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    pending: 0,
    approved: 0,
    branches: 0
  });

  useEffect(() => {
    const users = JSON.parse(localStorage.getItem("users")) || [];

    setStats({
      totalUsers: users.length,
      pending: users.filter(u => u.status === "pending").length,
      approved: users.filter(u => u.status === "approved").length,
      branches: new Set(users.map(u => u.branch)).size
    });
  }, []);

  return (
    <div className="dashboard-grid">

      <div className="data-box">
        <h4>Total Users</h4>
        <div className="value">{stats.totalUsers}</div>
      </div>

      <div className="data-box">
        <h4>Pending Approvals</h4>
        <div className="value">{stats.pending}</div>
      </div>

      <div className="data-box">
        <h4>Approved Users</h4>
        <div className="value">{stats.approved}</div>
      </div>

      <div className="data-box">
        <h4>Total Branches</h4>
        <div className="value">{stats.branches}</div>
      </div>

    </div>
  );
}
