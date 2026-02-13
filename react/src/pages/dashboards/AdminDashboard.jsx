import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/dashboard.css";

import AdminInventory from "../admin/AdminInventory";
import AdminStockTransfers from "../admin/adminStockTransfer";
import AdminBranches from "../admin/AdminBranches";
import AdminReports from "../admin/AdminReports";

import api from "../../services/api";
import { logout as authLogout, getCurrentUser } from "../../services/authService";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState("dashboard");
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAddManager, setShowAddManager] = useState(false);
  const [branches, setBranches] = useState([]); // Store branches for dropdown

  const [newManager, setNewManager] = useState({
    firstName: "",
    lastName: "",
    email: "",
    mobile: "",
    address: "",
    branch_id: "",
    password: "" // Optional custom password
  });

  const [users, setUsers] = useState([]);
  const [sales, setSales] = useState([]);

  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingUsers: 0,
    approvedUsers: 0,
    totalBranches: 0
  });

  /* ================= LOAD DATA FROM BACKEND ================= */
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Load users
        if (activeSection === "users" || activeSection === "dashboard") {
          const usersRes = await api.admin.getUsers();
          setUsers(usersRes.users || []);
        }

        // Load stats for dashboard
        if (activeSection === "dashboard") {
          const statsRes = await api.admin.getStats();
          setStats({
            totalUsers: statsRes.total_users || 0,
            pendingUsers: statsRes.pending_users || 0,
            approvedUsers: statsRes.approved_users || 0,
            totalBranches: statsRes.total_branches || 0,
            totalProducts: statsRes.total_products || 0,
            todayRevenue: statsRes.today_revenue || 0,
            todayCash: statsRes.today_cash || 0,
            todayUpi: statsRes.today_upi || 0,
            criticalItems: statsRes.critical_items || []
          });
        }

        // Load branches for dropdown if needed
        if (activeSection === "users") {
          const branchRes = await api.branches.getAll();
          setBranches(branchRes.branches || []);
        }
      } catch (error) {
        console.error("Failed to load data:", error);
        // Fallback to localStorage if backend not available
        const usersData = JSON.parse(localStorage.getItem("users")) || [];
        const salesData = JSON.parse(localStorage.getItem("sales")) || [];
        const branches = JSON.parse(localStorage.getItem("branches")) || [];

        setUsers(usersData);
        setSales(salesData);
        setStats({
          totalUsers: usersData.length,
          pendingUsers: usersData.filter(u => u.status === "pending").length,
          approvedUsers: usersData.filter(u => u.status === "approved").length,
          totalBranches: branches.length
        });
      }
      setLoading(false);
    };

    loadData();
  }, [activeSection]);

  const [processingId, setProcessingId] = useState(null);

  /* ================= USER ACTIONS ================= */
  const approveUser = async (userId) => {
    if (processingId) return; // Prevent multiple clicks globally or per item
    setProcessingId(userId);
    try {
      const res = await api.admin.approveUser(userId);

      let msg = `✅ User Approved Successfully!\n\nEmployee ID: ${res.employee_id}`;
      if (res.password) {
        msg += `\nPassword: ${res.password}`;
        msg += `\n\n⚠️ IMPORTANT: Share these credentials. They must change this password on first login.`;
      }

      alert(msg);

      // Reload users
      const usersRes = await api.admin.getUsers();
      setUsers(usersRes.users || []);
      // Refresh stats
      const statsRes = await api.admin.getStats();
      setStats({
        totalUsers: statsRes.total_users || 0,
        pendingUsers: statsRes.pending_users || 0,
        approvedUsers: statsRes.approved_users || 0,
        totalBranches: statsRes.total_branches || 0
      });
    } catch (error) {
      console.error("Failed to approve user:", error);
      alert("Failed to approve user: " + (error.response?.data?.message || error.message));
    } finally {
      setProcessingId(null);
    }
  };

  const deleteUser = async (userId) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      await api.admin.deleteUser(userId);
      // Reload users
      const usersRes = await api.admin.getUsers();
      setUsers(usersRes.users || []);
      // Refresh stats
      const statsRes = await api.admin.getStats();
      setStats({
        totalUsers: statsRes.total_users || 0,
        pendingUsers: statsRes.pending_users || 0,
        approvedUsers: statsRes.approved_users || 0,
        totalBranches: statsRes.total_branches || 0
      });
    } catch (error) {
      console.error("Failed to delete user:", error);
      alert("Failed to delete user: " + error.message);
    }
  };

  const handleAddManagerSubmit = async (e) => {
    e.preventDefault();
    if (!newManager.branch_id) {
      alert("Please select a branch");
      return;
    }

    try {
      const res = await api.admin.createUser(newManager);
      alert(`✅ Manager Created!\n\nEmail: ${res.user.email}\nTemp Password: ${res.user.temp_password}\n\n⚠️ They will be required to change this password on first login.`);
      setShowAddManager(false);
      setNewManager({ firstName: "", lastName: "", email: "", mobile: "", address: "", branch_id: "", password: "" });

      // Reload users
      const usersRes = await api.admin.getUsers();
      setUsers(usersRes.users || []);
    } catch (err) {
      console.error("Failed to create manager:", err);
      alert("❌ Error: " + (err.response?.data?.message || err.message));
    }
  };

  /* ================= LOGOUT ================= */
  const logout = () => {
    authLogout();
    navigate("/login");
  };

  /* ================= SALES MAPS FOR CHARTS ================= */
  const branchMap = {};
  const productMap = {};

  sales.forEach(s => {
    const amount = Number(s.total_amount || s.amount || 0);
    if (!amount) return;

    const branchName = s.branch?.name || s.branch || "Unknown";
    branchMap[branchName] = (branchMap[branchName] || 0) + amount;

    // Count items sold
    if (s.items) {
      s.items.forEach(item => {
        const productName = item.product?.name || item.product || "Unknown";
        productMap[productName] = (productMap[productName] || 0) + (item.quantity || 1);
      });
    }
  });

  /* ================= CHART OPTIONS ================= */
  return (
    <>
      <div className={`admin-layout ${selectedUser ? "blurred" : ""}`}>

        {/* ================= SIDEBAR ================= */}
        <aside className="sidebar">
          <nav>
            <a className={activeSection === "dashboard" ? "active" : ""}
              onClick={() => setActiveSection("dashboard")}>Dashboard</a>

            <a className={activeSection === "users" ? "active" : ""}
              onClick={() => setActiveSection("users")}>Users</a>

            <a className={activeSection === "inventory" ? "active" : ""}
              onClick={() => setActiveSection("inventory")}>Inventory</a>

            <a className={activeSection === "branches" ? "active" : ""}
              onClick={() => setActiveSection("branches")}>Branches</a>

            <a className={activeSection === "reports" ? "active" : ""}
              onClick={() => setActiveSection("reports")}>Reports</a>

            <a className={activeSection === "transfers" ? "active" : ""}
              onClick={() => setActiveSection("transfers")}>Transfers</a>

            <a onClick={logout}>Logout</a>
          </nav>
        </aside>

        {/* ================= MAIN ================= */}
        <main className="main-content">

          <header className="topbar">
            <h1>Admin Dashboard</h1>
            {loading && <span style={{ marginLeft: '10px', color: '#666' }}>Loading...</span>}
          </header>

          {/* ================= DASHBOARD ================= */}
          {activeSection === "dashboard" && (
            <>
              {/* ROW 1: System Overview */}
              <div className="dashboard-grid" style={{ marginBottom: '20px' }}>
                <div className="data-box"><h4>Total Users</h4><div className="value">{stats.totalUsers}</div></div>
                <div className="data-box"><h4>Active Branches</h4><div className="value">{stats.totalBranches}</div></div>
                <div className="data-box"><h4>Products</h4><div className="value">{stats.totalProducts}</div></div>
                <div className="data-box"><h4>Approval Pending</h4><div className="value" style={{ color: stats.pendingUsers > 0 ? '#ca8a04' : 'inherit' }}>{stats.pendingUsers}</div></div>
              </div>

              {/* ROW 2: Today's Financials */}
              <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', marginBottom: '30px' }}>
                <div className="data-box" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white' }}>
                  <h4 style={{ color: 'rgba(255,255,255,0.8)' }}>Today's Revenue</h4>
                  <div className="value" style={{ color: 'white' }}>₹{stats.todayRevenue?.toLocaleString() || 0}</div>
                  <div style={{ fontSize: '12px', marginTop: '5px', opacity: 0.9 }}>Across all branches</div>
                </div>

                <div className="data-box">
                  <h4>Today's Cash</h4>
                  <div className="value" style={{ color: '#059669' }}>₹{stats.todayCash?.toLocaleString() || 0}</div>
                </div>

                <div className="data-box">
                  <h4>Today's UPI</h4>
                  <div className="value" style={{ color: '#2563eb' }}>₹{stats.todayUpi?.toLocaleString() || 0}</div>
                </div>
              </div>

              {/* ROW 3: Critical Tables Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>

                {/* LOW STOCK WIDGET */}
                <div className="table-card" style={{ height: 'fit-content' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3 style={{ margin: 0, color: '#dc2626' }}>⚠️ Critical Low Stock</h3>
                    <span style={{ fontSize: '12px', background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: '10px' }}>
                      Top 5
                    </span>
                  </div>

                  {(!stats.criticalItems || stats.criticalItems.length === 0) ? (
                    <p style={{ color: '#64748b', fontSize: '14px' }}>All stock levels are healthy.</p>
                  ) : (
                    <table style={{ fontSize: '13px' }}>
                      <thead>
                        <tr>
                          <th style={{ padding: '8px' }}>Product</th>
                          <th style={{ padding: '8px' }}>Branch</th>
                          <th style={{ padding: '8px' }}>Qty / Min</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.criticalItems.map((item, i) => (
                          <tr key={i}>
                            <td style={{ padding: '8px' }}>{item.product}</td>
                            <td style={{ padding: '8px' }}>{item.branch}</td>
                            <td style={{ padding: '8px', fontWeight: 600, color: '#dc2626' }}>
                              {item.qty} <span style={{ color: '#94a3b8', fontWeight: 400 }}>/ {item.min}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  <div style={{ marginTop: '10px', textAlign: 'right' }}>
                    <button
                      onClick={() => setActiveSection('inventory')}
                      style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '12px' }}
                    >
                      View All Inventory →
                    </button>
                  </div>
                </div>

                {/* PENDING APPROVALS WIDGET */}
                <div className="table-card" style={{ height: 'fit-content' }}>
                  <h3 style={{ marginBottom: '15px' }}>Pending User Approvals</h3>
                  {users.filter(u => u.status === 'pending').length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                      <p>✅ All users approved</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table>
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Role</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.filter(u => u.status === 'pending' && u.email !== 'admin@retail.com').slice(0, 5).map((u, i) => (
                            <tr key={u.user_id || u.id || i}>
                              <td>
                                <div>{u.firstName || u.first_name}</div>
                                <div style={{ fontSize: '10px', color: '#64748b' }}>{u.branch_name}</div>
                              </td>
                              <td style={{ textTransform: 'capitalize' }}>{u.role}</td>
                              <td>
                                <button
                                  onClick={() => approveUser(u.user_id || u.id)}
                                  className="primary-btn"
                                  style={{ padding: '4px 8px', fontSize: '11px' }}
                                >
                                  Approve
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            </>
          )}

          {/* ================= USERS ================= */}
          {activeSection === "users" && (
            <>
              {/* ========== MANAGERS SECTION ========== */}
              <div className="table-card" style={{ marginBottom: '30px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <span style={{ background: '#6366f1', color: '#fff', padding: '2px 10px', borderRadius: '12px', fontSize: '13px' }}>Managers</span>
                    Branch Managers ({users.filter(u => u.role === 'manager' && u.email !== 'admin@retail.com' && u.status !== 'suspended').length})
                  </h3>
                  <button
                    className="primary-btn"
                    style={{ fontSize: '13px', padding: '6px 14px' }}
                    onClick={() => setShowAddManager(true)}
                  >
                    + Add Manager
                  </button>
                </div>

                {users.filter(u => u.role === 'manager' && u.email !== 'admin@retail.com' && u.status !== 'suspended').length > 0 ? (
                  <div className="table-responsive">
                    <table>
                      <thead>
                        <tr>
                          <th>Emp ID</th>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Branch</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.filter(u => u.role === 'manager' && u.email !== 'admin@retail.com' && u.status !== 'suspended').map((u, i) => (
                          <tr key={u.user_id || i}>
                            <td><code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>{u.employee_id || '—'}</code></td>
                            <td>{u.first_name || u.firstName} {u.last_name || u.lastName}</td>
                            <td>{u.email}</td>
                            <td>{u.branch_name || u.branch || 'N/A'}</td>
                            <td>
                              {u.status === "approved"
                                ? <span style={{ color: "#10b981", fontWeight: 700 }}>Approved</span>
                                : <span style={{ color: "#f59e0b", fontWeight: 700 }}>Pending</span>}
                            </td>
                            <td style={{ display: 'flex', gap: '8px' }}>
                              <button onClick={() => {
                                setSelectedUser({ ...u, editUpi: u.upi_id || "" });
                              }} style={{ background: '#f1f5f9', color: '#475569' }}>View</button>

                              {u.status === "pending" && (
                                <button
                                  onClick={() => approveUser(u.user_id)}
                                  className="primary-btn"
                                  disabled={processingId === u.user_id}
                                  style={{ opacity: processingId === u.user_id ? 0.7 : 1, cursor: processingId === u.user_id ? 'not-allowed' : 'pointer' }}
                                >
                                  {processingId === u.user_id ? "Approving..." : "Approve"}
                                </button>
                              )}

                              <button onClick={() => deleteUser(u.user_id)} style={{ background: '#fee2e2', color: '#dc2626' }}>Delete</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ color: '#666', padding: '10px' }}>No managers registered yet.</p>
                )}
              </div>

              {/* ========== STAFF SECTION ========== */}
              <div className="table-card">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ background: '#0ea5e9', color: '#fff', padding: '2px 10px', borderRadius: '12px', fontSize: '13px' }}>Staff</span>
                  Staff Members ({users.filter(u => u.role === 'staff' && u.email !== 'admin@retail.com').length})
                </h3>

                {users.filter(u => u.role === 'staff' && u.email !== 'admin@retail.com').length > 0 ? (
                  <div className="table-responsive">
                    <table>
                      <thead>
                        <tr>
                          <th>Emp ID</th>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Branch</th>
                          <th>Interviewer</th>
                          <th>Interview Progress</th>
                          <th>Score</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.filter(u => u.role === 'staff' && u.email !== 'admin@retail.com').map((u, i) => (
                          <tr key={u.user_id || i}>
                            <td><code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>{u.employee_id || '—'}</code></td>
                            <td>{u.first_name || u.firstName} {u.last_name || u.lastName}</td>
                            <td>{u.email}</td>
                            <td>{u.branch_name || u.branch || 'N/A'}</td>
                            <td>{u.interviewer_name || 'N/A'}</td>

                            <td>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                background: u.interview_status === 'completed' ? '#d1fae5' : '#f1f5f9',
                                color: u.interview_status === 'completed' ? '#065f46' : '#475569',
                                fontWeight: 700
                              }}>
                                {(u.interview_status || 'not_started').replace('_', ' ').toUpperCase()}
                              </span>
                            </td>

                            <td>
                              <span style={{
                                fontWeight: 800,
                                color: u.score >= 70 ? '#10b981' : (u.score >= 40 ? '#f59e0b' : '#ef4444')
                              }}>
                                {u.score || 0}%
                              </span>
                            </td>

                            <td>
                              {u.status === "approved"
                                ? <span style={{ color: "#10b981", fontWeight: 700 }}>Approved</span>
                                : <span style={{ color: "#f59e0b", fontWeight: 700 }}>Pending</span>}
                            </td>

                            <td style={{ display: 'flex', gap: '8px' }}>
                              <button onClick={() => {
                                setSelectedUser({ ...u, editUpi: u.upi_id || "" });
                              }} style={{ background: '#f1f5f9', color: '#475569' }}>View</button>

                              {u.status === "pending" && (
                                <button
                                  onClick={() => approveUser(u.user_id)}
                                  className="primary-btn"
                                  disabled={processingId === u.user_id}
                                  style={{ opacity: processingId === u.user_id ? 0.7 : 1, cursor: processingId === u.user_id ? 'not-allowed' : 'pointer' }}
                                >
                                  {processingId === u.user_id ? "Approving..." : "Approve"}
                                </button>
                              )}

                              <button onClick={() => deleteUser(u.user_id)} style={{ background: '#fee2e2', color: '#dc2626' }}>Delete</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ color: '#666', padding: '10px' }}>No staff members registered yet.</p>
                )}
              </div>
            </>
          )
          }

          {activeSection === "inventory" && <AdminInventory />}
          {activeSection === "branches" && <AdminBranches />}
          {activeSection === "reports" && <AdminReports />}
          {activeSection === "transfers" && <AdminStockTransfers />}

        </main>
      </div>

      {/* ================= USER PROFILE MODAL ================= */}
      {
        selectedUser && (
          <div className="profile-overlay" onClick={() => setSelectedUser(null)}>
            <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h2 style={{ margin: 0 }}>User Profile</h2>
                <button
                  onClick={() => setSelectedUser(null)}
                  style={{ background: '#f1f5f9', color: '#64748b', padding: '8px', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <div className="info-row">
                <span className="info-label">Employee ID</span>
                <span className="info-value"><code style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px' }}>{selectedUser.employee_id || 'Not assigned'}</code></span>
              </div>

              <div className="info-row">
                <span className="info-label">Full Name</span>
                <span className="info-value">{selectedUser.first_name || selectedUser.firstName} {selectedUser.last_name || selectedUser.lastName}</span>
              </div>

              <div className="info-row">
                <span className="info-label">Email Address</span>
                <span className="info-value">{selectedUser.email}</span>
              </div>

              <div className="info-row">
                <span className="info-label">Mobile Number</span>
                <span className="info-value">{selectedUser.phone || selectedUser.mobile || 'N/A'}</span>
              </div>

              <div className="info-row">
                <span className="info-label">System Role</span>
                <span className="info-value" style={{ textTransform: 'capitalize' }}>{selectedUser.role}</span>
              </div>

              <div className="info-row">
                <span className="info-label">Branch</span>
                <span className="info-value">{selectedUser.branch_name || selectedUser.branch?.name || selectedUser.branch || 'N/A'}</span>
              </div>

              <div className="info-row">
                <span className="info-label">Current Status</span>
                <span className="info-value">
                  <span style={{ color: selectedUser.status === 'approved' ? '#10b981' : '#f59e0b', fontWeight: 700 }}>
                    {selectedUser.status?.toUpperCase()}
                  </span>
                </span>
              </div>

              {selectedUser.role === 'staff' && (
                <>
                  <div className="info-row">
                    <span className="info-label">Interview</span>
                    <span className="info-value">{(selectedUser.interview_status || 'not_started').replace('_', ' ').toUpperCase()}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Interviewer</span>
                    <span className="info-value">{selectedUser.interviewer_name || 'N/A'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Score</span>
                    <span className="info-value" style={{ fontWeight: 800, color: selectedUser.score >= 70 ? '#10b981' : '#ef4444' }}>{selectedUser.score || 0}%</span>
                  </div>
                </>
              )}

              <div className="info-row">
                <span className="info-label">Address</span>
                <span className="info-value">{selectedUser.address || 'N/A'}</span>
              </div>

              <div className="info-row" style={{ marginTop: '20px', paddingTop: '20px', borderTop: '2px dashed #f1f5f9' }}>
                <span className="info-label">Branch UPI ID</span>
                <span className="info-value" style={{ fontFamily: 'monospace', color: '#6366f1' }}>
                  {selectedUser.branch_upi || 'Not Set in Branch Settings'}
                </span>
              </div>
              <p style={{ fontSize: '11px', color: '#64748b', marginTop: '8px', fontStyle: 'italic' }}>
                * Bank details are managed globally in the Branch Management section.
              </p>

              <button
                onClick={() => setSelectedUser(null)}
                style={{ marginTop: '30px', width: '100%', background: '#f1f5f9', color: '#475569', fontWeight: 700 }}
              >
                Close Profile
              </button>
            </div>
          </div>
        )
      }
      {/* ================= ADD MANAGER MODAL ================= */}
      {
        showAddManager && (
          <div className="profile-overlay">
            <div className="profile-modal" style={{ maxWidth: '500px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0 }}>Add New Manager</h2>
                <button
                  onClick={() => setShowAddManager(false)}
                  style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748b' }}
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleAddManagerSubmit} style={{ display: 'grid', gap: '15px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div className="input-group">
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>FIRST NAME</label>
                    <input
                      value={newManager.firstName}
                      onChange={(e) => setNewManager({ ...newManager, firstName: e.target.value })}
                      required
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div className="input-group">
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>LAST NAME</label>
                    <input
                      value={newManager.lastName}
                      onChange={(e) => setNewManager({ ...newManager, lastName: e.target.value })}
                      required
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>EMAIL ADDRESS</label>
                  <input
                    type="email"
                    value={newManager.email}
                    onChange={(e) => setNewManager({ ...newManager, email: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div className="input-group">
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>MOBILE NUMBER</label>
                  <input
                    value={newManager.mobile}
                    onChange={(e) => setNewManager({ ...newManager, mobile: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div className="input-group">
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>HOME ADDRESS</label>
                  <textarea
                    value={newManager.address}
                    onChange={(e) => setNewManager({ ...newManager, address: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', minHeight: '60px' }}
                  />
                </div>

                <div className="input-group">
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>ASSIGN BRANCH</label>
                  <select
                    value={newManager.branch_id}
                    onChange={(e) => setNewManager({ ...newManager, branch_id: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="">Select a Branch...</option>
                    {branches.map(b => (
                      <option key={b.branch_id} value={b.branch_id}>{b.name} ({b.city})</option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>INITIAL PASSWORD (OPTIONAL)</label>
                  <input
                    type="text"
                    placeholder="Default: Manager@123"
                    value={newManager.password}
                    onChange={(e) => setNewManager({ ...newManager, password: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <button type="submit" className="primary-btn" style={{ marginTop: '10px' }}>Create Manager Account</button>
              </form>
            </div>
          </div>
        )
      }
    </>
  );
}
