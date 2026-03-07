import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/dashboard.css";
import { useToast } from "../../components/ToastContext";
import { useConfirm } from "../../components/ConfirmContext";

import AdminInventory from "../admin/AdminInventory";
import AdminStockTransfers from "../admin/adminStockTransfer";
import AdminBranches from "../admin/AdminBranches";
import AdminReports from "../admin/AdminReports";
import SupplierManagement from "../admin/SupplierManagement";

import api from "../../services/api";
import { logout as authLogout, getCurrentUser } from "../../services/authService";
import LiveClock from "../../components/LiveClock";
import DashboardFAQ from "../../components/DashboardFAQ";
import ConfirmModal from "../../components/ConfirmModal";
import Chart from "react-apexcharts";

export default function AdminDashboard() {
  const { showToast } = useToast();
  const { showConfirm } = useConfirm();
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState("dashboard");
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAddManager, setShowAddManager] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
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
    totalBranches: 0,
    totalProducts: 0,
    todayRevenue: 0,
    todayCash: 0,
    todayUpi: 0,
    todayQr: 0,
    criticalItems: [],
    branchPerformance: []
  });

  /* ================= LOAD DATA FROM BACKEND ================= */
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      // Load users (independent)
      if (activeSection === "users" || activeSection === "dashboard") {
        try {
          const usersRes = await api.admin.getUsers();
          setUsers(usersRes.users || []);
        } catch (err) {
          console.error("Failed to load users:", err);
          const usersData = JSON.parse(localStorage.getItem("users")) || [];
          setUsers(usersData);
        }
      }

      // Load sales (independent)
      if (activeSection === "dashboard") {
        try {
          const salesRes = await api.sales.getAll({ per_page: 50 });
          setSales(salesRes.sales || []);
        } catch (err) {
          console.error("Failed to load sales:", err);
          const salesData = JSON.parse(localStorage.getItem("sales")) || [];
          setSales(salesData);
        }
      }

      // Load stats (independent)
      if (activeSection === "dashboard") {
        try {
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
            todayQr: statsRes.today_qr || 0,
            criticalItems: statsRes.critical_items || [],
            branchPerformance: statsRes.branch_performance || []
          });
        } catch (err) {
          console.error("Failed to load stats:", err);
        }
      }

      // Load branches for dropdown if needed
      if (activeSection === "users") {
        try {
          const branchRes = await api.branches.getAll();
          setBranches(branchRes.branches || []);
        } catch (err) {
          console.error("Failed to load branches:", err);
          const branches = JSON.parse(localStorage.getItem("branches")) || [];
          setBranches(branches);
        }
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

      showToast(msg, "success");

      // Reload users
      const usersRes = await api.admin.getUsers();
      setUsers(usersRes.users || []);
      // Refresh stats
      const statsRes = await api.admin.getStats();
      setStats(prev => ({
        ...prev,
        totalUsers: statsRes.total_users || 0,
        pendingUsers: statsRes.pending_users || 0,
        approvedUsers: statsRes.approved_users || 0,
        totalBranches: statsRes.total_branches || 0
      }));
    } catch (error) {
      console.error("Failed to approve user:", error);
      showToast("Failed to approve user: " + (error.response?.data?.message || error.message), "error");
    } finally {
      setProcessingId(null);
    }
  };

  const deactivateUser = async (userId) => {
    if (!(await showConfirm("Are you sure you want to deactivate this user? They will no longer be able to log in, but all their records will be preserved.", "Deactivate User"))) return;

    try {
      await api.admin.deleteUser(userId);
      showToast("User deactivated successfully", "success");
      const usersRes = await api.admin.getUsers();
      setUsers(usersRes.users || []);
      const statsRes = await api.admin.getStats();
      setStats(prev => ({
        ...prev,
        totalUsers: statsRes.total_users || 0,
        pendingUsers: statsRes.pending_users || 0,
        approvedUsers: statsRes.approved_users || 0,
        totalBranches: statsRes.total_branches || 0
      }));
    } catch (error) {
      console.error("Failed to deactivate user:", error);
      showToast("Failed to deactivate user: " + error.message, "error");
    }
  };

  const reactivateUser = async (userId) => {
    if (!(await showConfirm("Reactivate this user? They will be able to log in again.", "Reactivate User"))) return;

    try {
      await api.admin.reactivateUser(userId);
      showToast("User reactivated successfully", "success");
      const usersRes = await api.admin.getUsers();
      setUsers(usersRes.users || []);
    } catch (error) {
      console.error("Failed to reactivate user:", error);
      showToast("Failed to reactivate user: " + error.message, "error");
    }
  };

  const handleAddManagerSubmit = async (e) => {
    e.preventDefault();
    if (!newManager.branch_id) {
      showToast("Please select a branch", "warning");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(newManager.mobile)) {
      showToast("Invalid mobile number. Must be 10 digits starting with 6,7,8,9", "warning");
      return;
    }

    try {
      const res = await api.admin.createUser(newManager);
      showToast(`Manager Created! Email: ${res.user.email} | Temp Password: ${res.user.temp_password} — They must change it on first login.`, "success");
      setShowAddManager(false);
      setNewManager({ firstName: "", lastName: "", email: "", mobile: "", address: "", branch_id: "", password: "" });

      // Reload users
      const usersRes = await api.admin.getUsers();
      setUsers(usersRes.users || []);
    } catch (err) {
      console.error("Failed to create manager:", err);
      showToast("Error: " + (err.response?.data?.message || err.message), "error");
    }
  };

  /* ================= LOGOUT ================= */
  const logout = () => {
    authLogout();
    navigate("/");
  };



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

            <a className={activeSection === "suppliers" ? "active" : ""}
              onClick={() => setActiveSection("suppliers")}>Suppliers</a>

            <a onClick={() => setShowLogoutModal(true)}>Logout</a>
          </nav>

          <LiveClock />
        </aside>

        {/* ================= MAIN ================= */}
        <main className="main-content">

          <header className="topbar">
            <h1>Admin Dashboard</h1>
            {loading && <span style={{ marginLeft: '10px', color: '#666' }}>Loading...</span>}
          </header>

          {/* ================= ALERTS CENTER ================= */}
          {stats.criticalItems?.length > 0 && (
            <div className="alerts-center" style={{
              marginBottom: '25px',
              background: '#fef2f2',
              border: '1px solid #fee2e2',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              gap: '15px',
              alignItems: 'flex-start',
              animation: 'slideDown 0.4s ease-out'
            }}>
              <div style={{
                background: '#ef4444',
                color: 'white',
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontSize: '20px'
              }}>
                <i className="fas fa-exclamation-triangle"></i>
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 5px', color: '#991b1b', fontSize: '15px' }}>Critical Stock Alerts</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {stats.criticalItems.map((item, idx) => (
                    <div key={idx} style={{
                      background: 'white',
                      border: '1px solid #fee2e2',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#4b5563'
                    }}>
                      <b style={{ color: '#b91c1c' }}>{item.product}</b> in {item.branch}:
                      <span style={{ fontWeight: 800, marginLeft: '5px', color: item.qty <= 5 ? '#dc2626' : '#d97706' }}>
                        {item.qty} left
                      </span>
                    </div>
                  ))}
                  {stats.criticalItems.length > 5 && (
                    <button
                      onClick={() => setActiveSection('inventory')}
                      style={{ background: 'none', border: 'none', color: '#2563eb', padding: 0, fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
                    >
                      +{stats.criticalItems.length - 5} more...
                    </button>
                  )}
                </div>
              </div>
              <button
                onClick={() => setActiveSection('inventory')}
                className="primary-btn"
                style={{ background: '#ef4444', fontSize: '12px', padding: '8px 16px' }}
              >
                Manage Stock
              </button>
            </div>
          )}

          {/* ================= DASHBOARD HOME ================= */}
          {activeSection === "dashboard" && (
            <div className="dashboard-container-refined" style={{ animation: 'fadeIn 0.5s ease-out' }}>

              {/* SECTION 1: SYSTEM STRIP (Mini metrics at the top) */}
              <div className="stats-strip">
                <div className="stat-card-mini">
                  <span className="label">Total Users</span>
                  <span className="count">{stats.totalUsers}</span>
                </div>
                <div className="stat-card-mini">
                  <span className="label">Active Branches</span>
                  <span className="count">{stats.totalBranches}</span>
                </div>
                <div className="stat-card-mini">
                  <span className="label">Total Products</span>
                  <span className="count">{stats.totalProducts}</span>
                </div>
                <div className="stat-card-mini" style={{ borderLeft: stats.pendingUsers > 0 ? '4px solid #f59e0b' : '' }}>
                  <span className="label">Pending Approvals</span>
                  <span className="count" style={{ color: stats.pendingUsers > 0 ? '#d97706' : 'inherit' }}>
                    {stats.pendingUsers}
                  </span>
                </div>
              </div>

              {/* SECTION 2: HERO STATS (Financial Focus) */}
              <div className="hero-stats-grid">
                <div className="stat-card-hero primary">
                  <span className="label">TODAY'S TOTAL REVENUE</span>
                  <div className="value">₹{stats.todayRevenue?.toLocaleString() || 0}</div>
                  <div className="trend">
                    <i className="fas fa-chart-line"></i> Global performance across all branches
                  </div>
                </div>

                <div className="stat-card-hero secondary">
                  <span className="label">Cash Payments</span>
                  <div className="value" style={{ color: '#059669', fontSize: '24px' }}>₹{stats.todayCash?.toLocaleString() || 0}</div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '10px' }}>Physical Collections</div>
                </div>

                <div className="stat-card-hero secondary">
                  <span className="label">UPI Transfers</span>
                  <div className="value" style={{ color: '#2563eb', fontSize: '24px' }}>₹{stats.todayUpi?.toLocaleString() || 0}</div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '10px' }}>Digital Direct</div>
                </div>

                <div className="stat-card-hero secondary">
                  <span className="label">QR Scans</span>
                  <div className="value" style={{ color: '#0d9488', fontSize: '24px' }}>₹{stats.todayQr?.toLocaleString() || 0}</div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '10px' }}>Merchant QR</div>
                </div>
              </div>

              {/* SECTION 3: MAIN OPERATIONAL GRID */}
              <div className="dashboard-main-grid">

                {/* LEFT COLUMN: Charts & Performance */}
                <div className="left-column" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                  {/* PERFORMANCE CHART */}
                  <div className="table-card" style={{ margin: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h3 style={{ margin: 0 }}>📊 Branch Sales Performance (Last 30 Days)</h3>
                      <button className="primary-btn" onClick={() => setActiveSection('reports')} style={{ padding: '6px 12px', fontSize: '11px' }}>
                        Deep Dive
                      </button>
                    </div>

                    {!stats.branchPerformance || stats.branchPerformance.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                        <p>Waiting for sales data to generate analytics...</p>
                      </div>
                    ) : (
                      <div style={{ minHeight: '300px' }}>
                        <Chart
                          type="bar"
                          height={300}
                          series={[{
                            name: 'Revenue (₹)',
                            data: stats.branchPerformance.map(b => b.revenue)
                          }]}
                          options={{
                            chart: { toolbar: { show: false }, fontFamily: 'Outfit, sans-serif' },
                            plotOptions: {
                              bar: { borderRadius: 6, columnWidth: '40%', distributed: true, dataLabels: { position: 'top' } }
                            },
                            colors: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'],
                            dataLabels: {
                              enabled: true,
                              formatter: (val) => `₹${(val / 1000).toFixed(1)}k`,
                              offsetY: -20,
                              style: { fontSize: '11px', colors: ["#64748b"] }
                            },
                            xaxis: {
                              categories: stats.branchPerformance.map(b => b.name),
                              labels: { style: { fontSize: '12px', fontWeight: 600 } }
                            },
                            yaxis: { labels: { formatter: (val) => `₹${(val / 1000).toFixed(0)}k` } },
                            grid: { borderColor: '#f1f5f9' }
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* FAQ SECION */}
                  <DashboardFAQ faqs={[
                    {
                      question: "How do I approve new staff?",
                      answer: "Go to the 'Users' tab in the sidebar. Staff waiting for approval will have a 'Pending' status and an 'Approve' button next to their details."
                    },
                    {
                      question: "How to add a new branch?",
                      answer: "Navigate to the 'Branches' tab and click the '+ Add Branch' button at the top right of the page."
                    },
                    {
                      question: "Can I see global sales across all branches?",
                      answer: "Yes, this Dashboard home provides a real-time system-wide revenue overview, and the 'Reports' tab offers detailed financial breakdowns."
                    },
                    {
                      question: "How do I manage suppliers?",
                      answer: "Use the 'Suppliers' tab to add, edit, or remove vendors for your inventory network."
                    },
                    {
                      question: "What do the critical stock alerts mean?",
                      answer: "The red alert bar at the top highlights items that have fallen below their minimum threshold across any branch. Click 'Manage Stock' to address these immediately."
                    },
                    {
                      question: "How do I monitor branch performance?",
                      answer: "The 'Branch Sales Performance' chart on this home page shows a 30-day revenue comparison. Detailed per-branch metrics are available in the 'Reports' section."
                    },
                    {
                      question: "How do I initiate a stock transfer?",
                      answer: "Go to the 'Transfers' tab. You can create a new request by selecting the source and destination branches along with the products to be moved."
                    },
                    {
                      question: "Can I export or print reports?",
                      answer: "Yes, in the 'Reports' tab, you can filter by date and branch, then use the 'Print' button to generate a physical or PDF copy of the financial data."
                    },
                    {
                      question: "How do I update branch payment details?",
                      answer: "Go to the 'Branches' tab, select 'Edit' on the desired branch, and you can update their UPI ID, Address, or Mobile number."
                    },
                    {
                      question: "What happens when I delete a user?",
                      answer: "Deleting a user removes their login access immediately. However, their past transaction signatures remain in the system for auditing and integrity."
                    }
                  ]} />
                </div>

                {/* RIGHT COLUMN: Critical Actions & Alerts */}
                <div className="right-column" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                  {/* CRITICAL STOCK WIDGET */}
                  <div className="table-card" style={{ margin: 0, borderTop: '4px solid #dc2626' }}>
                    <div style={{ marginBottom: '15px' }}>
                      <h3 style={{ margin: 0, color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className="fas fa-exclamation-triangle"></i> Low Stock Alerts
                      </h3>
                    </div>

                    {(!stats.criticalItems || stats.criticalItems.length === 0) ? (
                      <div style={{ textAlign: 'center', padding: '20px', background: '#f0fdf4', borderRadius: '12px', color: '#166534' }}>
                        <i className="fas fa-check-circle" style={{ fontSize: '24px', marginBottom: '8px' }}></i>
                        <p style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>All stocks healthy</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {stats.criticalItems.slice(0, 5).map((item, i) => (
                          <div key={i} style={{ padding: '10px', background: '#fef2f2', borderRadius: '10px', border: '1px solid #fee2e2' }}>
                            <div style={{ fontWeight: 700, fontSize: '13px', color: '#991b1b' }}>{item.product}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#b91c1c', marginTop: '4px' }}>
                              <span>{item.branch}</span>
                              <span style={{ fontWeight: 800 }}>{item.qty} left</span>
                            </div>
                          </div>
                        ))}
                        <button className="secondary-btn" onClick={() => setActiveSection('inventory')} style={{ width: '100%', marginTop: '5px', fontSize: '12px' }}>
                          View Full Stock Report
                        </button>
                      </div>
                    )}
                  </div>

                  {/* PENDING APPROVALS WIDGET */}
                  <div className="table-card" style={{ margin: 0 }}>
                    <h3 style={{ marginBottom: '15px' }}>Pending Approvals</h3>
                    {users.filter(u => u.status === 'pending').length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '20px', color: '#64748b', background: '#f8fafc', borderRadius: '12px' }}>
                        <p style={{ margin: 0, fontSize: '12px' }}>No users awaiting action</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {users.filter(u => u.status === 'pending' && u.email !== 'admin@retail.com').slice(0, 3).map((u, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '13px' }}>{u.firstName || u.first_name}</div>
                              <div style={{ fontSize: '11px', color: '#64748b' }}>{u.role} | {u.branch_name}</div>
                            </div>
                            <button onClick={() => approveUser(u.user_id || u.id)} className="primary-btn" style={{ padding: '5px 10px', fontSize: '11px' }}>
                              Approve
                            </button>
                          </div>
                        ))}
                        <button className="secondary-btn" onClick={() => setActiveSection('users')} style={{ width: '100%', fontSize: '12px' }}>
                          Manage All Users
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* ================= USERS ================= */}
          {activeSection === "users" && (
            <>
              {/* ========== MANAGERS SECTION ========== */}
              <div className="table-card" style={{ marginBottom: '30px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <span style={{ background: '#6366f1', color: '#fff', padding: '2px 10px', borderRadius: '12px', fontSize: '13px' }}>Managers</span>
                    Branch Managers ({users.filter(u => u.role === 'manager' && u.email !== 'admin@retail.com' && (showInactive || u.status !== 'suspended')).length})
                  </h3>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setShowInactive(v => !v)}
                      style={{
                        fontSize: '12px', padding: '8px 18px',
                        borderRadius: '20px',
                        border: showInactive ? '1.5px solid #fca5a5' : '1.5px solid #cbd5e1',
                        cursor: 'pointer',
                        background: showInactive
                          ? 'linear-gradient(135deg, #fef2f2, #fff1f2)'
                          : 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
                        color: showInactive ? '#b91c1c' : '#475569',
                        fontWeight: 700,
                        letterSpacing: '0.3px',
                        boxShadow: showInactive
                          ? '0 2px 8px rgba(239, 68, 68, 0.15)'
                          : '0 1px 4px rgba(0, 0, 0, 0.06)',
                        transition: 'all 0.25s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <i className={`fas ${showInactive ? 'fa-eye-slash' : 'fa-eye'}`} style={{ fontSize: '11px' }}></i>
                      {showInactive ? 'Hide Inactive' : 'Show Inactive'}
                    </button>
                    <button
                      className="primary-btn"
                      style={{ fontSize: '13px', padding: '6px 14px' }}
                      onClick={() => setShowAddManager(true)}
                    >
                      + Add Manager
                    </button>
                  </div>
                </div>

                {users.filter(u => u.role === 'manager' && u.email !== 'admin@retail.com' && (showInactive || u.status !== 'suspended')).length > 0 ? (
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
                        {users.filter(u => u.role === 'manager' && u.email !== 'admin@retail.com' && (showInactive || u.status !== 'suspended')).map((u, i) => (
                          <tr key={u.user_id || i}>
                            <td><code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>{u.employee_id || '—'}</code></td>
                            <td>{u.first_name || u.firstName} {u.last_name || u.lastName}</td>
                            <td>{u.email}</td>
                            <td>{u.branch_name || u.branch || 'N/A'}</td>
                            <td>
                              {u.status === "approved"
                                ? <span style={{ color: "#10b981", fontWeight: 700 }}>Approved</span>
                                : u.status === "suspended"
                                  ? <span style={{ color: "#ef4444", fontWeight: 700 }}>Inactive</span>
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

                              {u.status === "suspended" ? (
                                <button onClick={() => reactivateUser(u.user_id)} style={{ background: '#d1fae5', color: '#065f46' }}>Reactivate</button>
                              ) : (
                                <button onClick={() => deactivateUser(u.user_id)} style={{ background: '#fee2e2', color: '#dc2626' }}>Deactivate</button>
                              )}
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
                  Staff Members ({users.filter(u => u.role === 'staff' && u.email !== 'admin@retail.com' && (showInactive || u.status !== 'suspended')).length})
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
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.filter(u => u.role === 'staff' && u.email !== 'admin@retail.com' && (showInactive || u.status !== 'suspended')).map((u, i) => (
                          <tr key={u.user_id || i}>
                            <td><code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>{u.employee_id || '—'}</code></td>
                            <td>{u.first_name || u.firstName} {u.last_name || u.lastName}</td>
                            <td>{u.email}</td>
                            <td>{u.branch_name || u.branch || 'N/A'}</td>

                            <td>
                              {u.status === "approved"
                                ? <span style={{ color: "#10b981", fontWeight: 700 }}>Approved</span>
                                : u.status === "suspended"
                                  ? <span style={{ color: "#ef4444", fontWeight: 700 }}>Inactive</span>
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

                              {u.status === "suspended" ? (
                                <button onClick={() => reactivateUser(u.user_id)} style={{ background: '#d1fae5', color: '#065f46' }}>Reactivate</button>
                              ) : (
                                <button onClick={() => deactivateUser(u.user_id)} style={{ background: '#fee2e2', color: '#dc2626' }}>Deactivate</button>
                              )}
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

          {activeSection === "inventory" && <AdminInventory setActiveSection={setActiveSection} />}
          {activeSection === "branches" && <AdminBranches />}
          {activeSection === "reports" && <AdminReports />}
          {activeSection === "transfers" && <AdminStockTransfers />}
          {activeSection === "suppliers" && <SupplierManagement />}

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
                  <span style={{ color: selectedUser.status === 'approved' ? '#10b981' : selectedUser.status === 'suspended' ? '#ef4444' : '#f59e0b', fontWeight: 700 }}>
                    {selectedUser.status === 'suspended' ? 'INACTIVE' : selectedUser.status?.toUpperCase()}
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

      <ConfirmModal
        isOpen={showLogoutModal}
        title="Confirm Logout"
        message="Are you sure you want to log out of the Admin Panel? Security is paramount."
        onConfirm={logout}
        onCancel={() => setShowLogoutModal(false)}
      />
    </>
  );
}
