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
import AdminMessages from "../admin/AdminMessages";
import AdminAnnouncements from "../admin/AdminAnnouncements";
import UnreadTransfersBadge from "../../components/UnreadTransfersBadge";

import api from "../../services/api";
import { logout as authLogout, getCurrentUser } from "../../services/authService";
import LiveClock from "../../components/LiveClock";
import DashboardFAQ from "../../components/DashboardFAQ";
import ConfirmModal from "../../components/ConfirmModal";
import Chart from "react-apexcharts";
import InventoryInsightCard from "../../components/InventoryInsightCard";
import SmartRebalanceGrid from "../../components/SmartRebalanceGrid";
import AIWastageAlerts from "../../components/admin/AIWastageAlerts";
import AIProfitSimulator from "../../components/admin/AIProfitSimulator";
import AIAnnouncementReview from "../../components/admin/AIAnnouncementReview";

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

  const [aiInsights, setAiInsights] = useState([]);
  const [aiForecast, setAiForecast] = useState(null);
  const [pricingAlerts, setPricingAlerts] = useState([]);
  const [rebalanceSuggestions, setRebalanceSuggestions] = useState([]);

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

      // Load AI Insights (independent)
      if (activeSection === "dashboard") {
        try {
          const aiRes = await api.admin.getAiInsights();
          setAiInsights(aiRes.insights || []);
          setAiForecast(aiRes.forecast || null);
        } catch (err) {
          console.error("Failed to load AI insights:", err);
        }

        try {
          const pricingRes = await api.admin.getPricingAlerts();
          setPricingAlerts(pricingRes.alerts || []);

          const rebalanceRes = await api.admin.getRebalanceSuggestions();
          setRebalanceSuggestions(rebalanceRes.suggestions || []);
        } catch (err) {
          console.error("Failed to load additional AI metrics:", err);
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
        {/* ================= SIDEBAR ================= */}
        <aside className="sidebar" style={{
          width: '260px',
          backgroundColor: '#fff',
          borderRight: '1px solid #e2e8f0',
          height: '100vh',
          position: 'fixed',
          top: 0,
          left: 0,
          display: 'flex',
          flexDirection: 'column',
          padding: '15px 0'
        }}>
          <div style={{ padding: '0 24px 15px', borderBottom: '1px solid #f1f5f9', marginBottom: '10px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#4338ca', margin: 0 }}>🛒 Retail</h2>
            <p style={{ fontSize: '10px', color: '#94a3b8', margin: '4px 0 0', textTransform: 'uppercase', letterSpacing: '1px' }}></p>
          </div>

          <nav style={{ flex: 1, padding: '0 12px', display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto', scrollbarWidth: 'none' }}>
            {[
              { id: 'dashboard', label: 'Dashboard', icon: 'fa-th-large' },
              { id: 'users', label: 'Users', icon: 'fa-users' },
              { id: 'inventory', label: 'Inventory', icon: 'fa-box' },
              { id: 'branches', label: 'Branches', icon: 'fa-sitemap' },
              { id: 'reports', label: 'Reports', icon: 'fa-chart-pie' },
              { id: 'transfers', label: 'Stock Requests', icon: 'fa-exchange-alt', badge: true },
              { id: 'suppliers', label: 'Suppliers', icon: 'fa-truck-loading' },
              { id: 'messages', label: 'Messages', icon: 'fa-envelope' },
              { id: 'announcements', label: 'Announcements', icon: 'fa-bullhorn' },
            ].map(item => (
              <a
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '9px 16px',
                  borderRadius: '14px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  backgroundColor: activeSection === item.id ? '#eef2ff' : 'transparent',
                  color: activeSection === item.id ? '#4338ca' : '#64748b',
                  transform: activeSection === item.id ? 'translateX(4px)' : 'none',
                  boxShadow: activeSection === item.id ? '0 4px 6px -1px rgba(67, 56, 202, 0.1)' : 'none'
                }}
                className="sidebar-link"
              >
                <i className={`fas ${item.icon}`} style={{ fontSize: '16px', width: '20px', textAlign: 'center', opacity: activeSection === item.id ? 1 : 0.7 }}></i>
                <span style={{ flex: 1, letterSpacing: '0.01em' }}>{item.label}</span>
                {item.badge && <UnreadTransfersBadge />}
              </a>
            ))}

            <div style={{ marginTop: 'auto', paddingTop: '15px', borderTop: '1px solid #f1f5f9' }}>
              <a
                onClick={() => setShowLogoutModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: '#ef4444'
                }}
              >
                <i className="fas fa-sign-out-alt"></i>
                Sign Out
              </a>
            </div>
          </nav>
        </aside>

        {/* ================= MAIN ================= */}
        {/* ================= MAIN ================= */}
        <main className="main-content" style={{ marginLeft: '260px', width: 'calc(100% - 260px)', minHeight: '100vh', backgroundColor: '#f8fafc' }}>

          <header className="topbar" style={{
            height: '70px',
            backgroundColor: '#fff',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 30px',
            position: 'sticky',
            top: 0,
            zIndex: 100
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{
                background: 'linear-gradient(135deg, #4338ca, #6366f1)',
                color: '#fff',
                padding: '6px 16px',
                borderRadius: '20px',
                fontSize: '10px',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                boxShadow: '0 4px 6px -1px rgba(67, 56, 202, 0.2)'
              }}>
                {activeSection}
              </div>
              <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                {activeSection === 'dashboard' ? 'Dashboard' : activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}
              </h1>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
              <LiveClock />
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '20px', borderLeft: '1px solid #e2e8f0' }}>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>Administrator</p>
                  <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>admin@retail.com</p>
                </div>
                <div style={{
                  width: '42px',
                  height: '42px',
                  background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
                  color: '#4338ca',
                  borderRadius: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  border: '1px solid #e2e8f0',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                }}>
                  AD
                </div>
              </div>
            </div>
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                <div style={{ background: 'linear-gradient(135deg, #4338ca, #6366f1)', padding: '24px', borderRadius: '16px', color: '#fff', boxShadow: '0 10px 15px -3px rgba(67, 56, 202, 0.2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '1px' }}>Global Revenue</p>
                    <div style={{ background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '10px' }}><i className="fas fa-wallet"></i></div>
                  </div>
                  <h2 style={{ margin: '12px 0 4px', fontSize: '28px', fontWeight: 800 }}>₹{stats.todayRevenue?.toLocaleString() || 0}</h2>
                  <p style={{ margin: 0, fontSize: '11px', opacity: 0.8 }}>System-wide total for today</p>
                </div>

                {[
                  { label: 'Cash Payments', value: stats.todayCash, icon: 'fa-money-bill-wave', color: '#059669', bg: '#ecfdf5' },
                  { label: 'UPI Direct', value: stats.todayUpi, icon: 'fa-mobile-alt', color: '#2563eb', bg: '#eff6ff' },
                  { label: 'QR Merchant', value: stats.todayQr, icon: 'fa-qrcode', color: '#0d9488', bg: '#f0fdfa' }
                ].map((s, idx) => (
                  <div key={idx} style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>{s.label}</p>
                      <div style={{ backgroundColor: s.bg, color: s.color, padding: '8px', borderRadius: '10px' }}><i className={`fas ${s.icon}`}></i></div>
                    </div>
                    <h2 style={{ margin: '12px 0 4px', fontSize: '22px', fontWeight: 700, color: '#1e293b' }}>₹{s.value?.toLocaleString() || 0}</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#059669', fontWeight: 600 }}>
                      <i className="fas fa-arrow-up"></i>
                      <span>Real-time</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* SECTION 2.5: AI SMART INSIGHTS */}
              {aiInsights.length > 0 && (
                <div style={{ marginBottom: '32px', animation: 'slideUp 0.6s ease-out' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <div style={{
                      background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                      color: 'white',
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                    }}>
                      <i className="fas fa-brain"></i>
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>AI-Powered Smart Insights</h3>
                      <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Predictive stock analysis & restock recommendations</p>
                    </div>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
                    gap: '20px'
                  }}>
                    {aiInsights.map((insight, idx) => (
                      <InventoryInsightCard key={idx} insight={insight} />
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION 2.6: ADVANCED AI SUITE */}
              <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                    color: 'white',
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <i className="fas fa-microchip"></i>
                  </div>
                  <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>Advanced Business Intelligence</h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px' }}>
                  <AIWastageAlerts />
                  <AIProfitSimulator />
                </div>
                <div style={{ marginTop: '24px' }}>
                  <AIAnnouncementReview />
                </div>
              </div>

              {/* SECTION 3: MAIN OPERATIONAL GRID */}
              <div className="dashboard-main-grid">

                {/* LEFT COLUMN: Charts & Performance */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                  {/* PERFORMANCE CHART */}
                  <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>📊 Branch Sales Performance (Last 30 Days)</h3>
                      <button
                        onClick={() => setActiveSection('reports')}
                        style={{ background: '#f1f5f9', border: 'none', color: '#4338ca', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Detailed Reports
                      </button>
                    </div>

                    {!stats.branchPerformance || stats.branchPerformance.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                        <i className="fas fa-chart-area" style={{ fontSize: '32px', marginBottom: '16px', opacity: 0.5 }}></i>
                        <p style={{ margin: 0, fontSize: '14px' }}>Waiting for sales data to generate analytics...</p>
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

                  {/* SMART REBALANCE SECTION */}
                  <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                      <div style={{
                        background: '#e0e7ff',
                        color: '#4338ca',
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <i className="fas fa-shuffle" style={{ fontSize: '14px' }}></i>
                      </div>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>Smart Stock Rebalancing</h3>
                    </div>
                    <SmartRebalanceGrid suggestions={rebalanceSuggestions} />
                  </div>
                </div>

                {/* RIGHT COLUMN: Critical Actions & Alerts */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                  {/* CRITICAL STOCK WIDGET */}
                  <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)', borderTop: '5px solid #ef4444' }}>
                    <div style={{ marginBottom: '16px' }}>
                      <h3 style={{ margin: 0, color: '#b91c1c', fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className="fas fa-exclamation-triangle"></i> Low Stock Alerts
                      </h3>
                    </div>

                    {(!stats.criticalItems || stats.criticalItems.length === 0) ? (
                      <div style={{ textAlign: 'center', padding: '24px', background: '#ecfdf5', borderRadius: '12px', color: '#065f46' }}>
                        <i className="fas fa-check-circle" style={{ fontSize: '24px', marginBottom: '8px' }}></i>
                        <p style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>All stocks healthy</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {stats.criticalItems.slice(0, 5).map((item, i) => (
                          <div key={i} style={{ padding: '12px', background: '#fff', borderRadius: '10px', border: '1px solid #fee2e2' }}>
                            <div style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b' }}>{item.product}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#ef4444', marginTop: '6px' }}>
                              <span style={{ color: '#64748b' }}>{item.branch}</span>
                              <span style={{ fontWeight: 800 }}>{item.qty} left</span>
                            </div>
                          </div>
                        ))}
                        <button
                          onClick={() => setActiveSection('inventory')}
                          style={{ width: '100%', marginTop: '8px', padding: '10px', background: '#fef2f2', border: '1px solid #fee2e2', color: '#b91c1c', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                        >
                          View Full Stock Report
                        </button>
                      </div>
                    )}
                  </div>

                  {/* PRICING ALERTS WIDGET */}
                  <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)', background: 'linear-gradient(to bottom right, #ffffff, #f8faff)' }}>
                    <h3 style={{ marginBottom: '16px', color: '#1e293b', fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <i className="fas fa-tag" style={{ color: '#6366f1' }}></i> Dynamic Pricing Analyst
                    </h3>

                    {pricingAlerts.length === 0 ? (
                      <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', padding: '20px' }}>
                        No pricing adjustments recommended today.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {pricingAlerts.slice(0, 3).map((p, i) => (
                          <div key={i} style={{
                            padding: '16px',
                            borderRadius: '12px',
                            background: 'white',
                            border: '1px solid #f1f5f9',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                          }}>
                            <div style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b', marginBottom: '8px' }}>{p.product}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                              <span style={{ fontSize: '12px', textDecoration: 'line-through', color: '#94a3b8' }}>₹{p.current_price}</span>
                              <i className="fas fa-arrow-right" style={{ fontSize: '10px', color: '#cbd5e1' }}></i>
                              <span style={{ fontSize: '16px', fontWeight: 800, color: p.type === 'increase' ? '#059669' : '#e11d48' }}>
                                ₹{p.suggested_price}
                              </span>
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.5', background: '#f8fafc', padding: '8px', borderRadius: '6px' }}>
                              {p.reason}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* PENDING APPROVALS WIDGET */}
                  <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
                    <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>Pending Approvals</h3>
                    {users.filter(u => u.status === 'pending').length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                        <p style={{ margin: 0, fontSize: '13px' }}>No users awaiting action</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {users.filter(u => u.status === 'pending' && u.email !== 'admin@retail.com').slice(0, 3).map((u, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9' }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>{u.firstName || u.first_name}</div>
                              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{u.role} | {u.branch_name}</div>
                            </div>
                            <button
                              onClick={() => approveUser(u.user_id || u.id)}
                              style={{ padding: '6px 14px', background: '#4338ca', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                            >
                              Approve
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => setActiveSection('users')}
                          style={{ width: '100%', padding: '10px', background: '#f1f5f9', border: 'none', color: '#4338ca', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Manage All Users
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: '40px' }}>
                  <DashboardFAQ faqs={[
                    { question: "How many branches can I manage?", answer: "InventoryPro Enterprise supports unlimited branches. You can scale your retail chain from two locations to hundreds." },
                    { question: "Is the synchronization truly real-time?", answer: "Yes. Our sync engine ensures that any stock change, sale, or transfer is updated across all connected devices in under 200 milliseconds." },
                    { question: "Can I transfer stock between branches?", answer: "Yes, our 'Inter-Branch Transfer' (IBT) feature allows you to move stock between locations with one click, complete with digital transit tracking." },
                    { question: "Does it support barcode scanning?", answer: "Absolutely. The system is compatible with standard USB/Bluetooth scanners and mobile camera scanning." },
                    { question: "What kind of reports can I generate?", answer: "You can generate detailed sales analytics, profit margin reports, tax summaries, and inventory turnover data." },
                    { question: "Can I manage employee permissions?", answer: "Yes. Use our granular Role-Based Access Control (RBAC) to define what Admin, Manager, and Staff users can see and modify." },
                    { question: "Does it work offline?", answer: "Yes, our 'Offline-First' architecture allows you to continue sales during internet outages. Data automatically syncs once restored." },
                    { question: "Can I use it on mobile devices?", answer: "Absolutely. InventoryPro is a progressive web platform designed to work seamlessly on tablets, smartphones, and desktops." },
                    { question: "How secure is my business data?", answer: "We use bank-grade AES-256 encryption for all data at rest and TLS 1.3 for data in transit." },
                    { question: "Do you offer staff training?", answer: "Yes, we provide comprehensive onboarding and 24/7 dedicated support for all Enterprise customers." }
                  ]} />
                </div>
              </div>
            </div>
          )}

          {/* ================= USERS ================= */}
          {activeSection === "users" && (
            <div style={{ padding: '30px', animation: 'fadeIn 0.5s ease-out' }}>
              {/* ========== MANAGERS SECTION ========== */}
              <div style={{
                backgroundColor: '#fff',
                borderRadius: '20px',
                padding: '24px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
                marginBottom: '32px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: 0, fontSize: '18px', fontWeight: 800, color: '#1e293b' }}>
                    <span style={{ background: '#4338ca', color: '#fff', padding: '4px 12px', borderRadius: '10px', fontSize: '12px', textTransform: 'uppercase' }}>Managers</span>
                    Branch Administration ({users.filter(u => u.role === 'manager' && u.email !== 'admin@retail.com' && (showInactive || u.status !== 'suspended')).length})
                  </h3>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={() => setShowInactive(v => !v)}
                      style={{
                        fontSize: '12px',
                        padding: '10px 20px',
                        borderRadius: '12px',
                        border: '1.5px solid #e2e8f0',
                        cursor: 'pointer',
                        background: showInactive ? '#fff1f2' : '#fff',
                        color: showInactive ? '#e11d48' : '#64748b',
                        fontWeight: 700,
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <i className={`fas ${showInactive ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                      {showInactive ? 'Hide Inactive' : 'Show Inactive'}
                    </button>
                    <button
                      onClick={() => setShowAddManager(true)}
                      style={{
                        background: '#4338ca',
                        color: '#fff',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '12px',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 4px 6px -1px rgba(67, 56, 202, 0.2)'
                      }}
                    >
                      <i className="fas fa-plus" style={{ marginRight: '8px' }}></i> Add Manager
                    </button>
                  </div>
                </div>

                {users.filter(u => u.role === 'manager' && u.email !== 'admin@retail.com' && (showInactive || u.status !== 'suspended')).length > 0 ? (
                  <div className="table-responsive">
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                      <thead>
                        <tr style={{ color: '#64748b', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                          <th style={{ padding: '12px', textAlign: 'left', fontWeight: 700 }}>Employee</th>
                          <th style={{ padding: '12px', textAlign: 'left', fontWeight: 700 }}>Contact info</th>
                          <th style={{ padding: '12px', textAlign: 'left', fontWeight: 700 }}>Branch</th>
                          <th style={{ padding: '12px', textAlign: 'left', fontWeight: 700 }}>Staus</th>
                          <th style={{ padding: '12px', textAlign: 'right', fontWeight: 700 }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.filter(u => u.role === 'manager' && u.email !== 'admin@retail.com' && (showInactive || u.status !== 'suspended')).map((u, i) => (
                          <tr key={u.user_id || i} style={{ backgroundColor: '#fff', transition: 'transform 0.2s ease' }} className="table-row-hover">
                            <td style={{ padding: '16px 12px', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', borderLeft: '1px solid #f1f5f9', borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f1f5f9', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                                  {(u.first_name || u.firstName || 'U')[0]}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 700, color: '#1e293b' }}>{u.first_name || u.firstName} {u.last_name || u.lastName}</div>
                                  <code style={{ fontSize: '10px', color: '#94a3b8' }}>ID: {u.employee_id || 'PENDING'}</code>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '16px 12px', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
                              <div style={{ fontSize: '13px', color: '#475569' }}>{u.email}</div>
                              <div style={{ fontSize: '11px', color: '#94a3b8' }}>{u.mobile || u.phone || 'No Phone'}</div>
                            </td>
                            <td style={{ padding: '16px 12px', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{u.branch_name || u.branch || '—'}</span>
                            </td>
                            <td style={{ padding: '16px 12px', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
                              {u.status === "approved" ? (
                                <span style={{ background: '#dcfce7', color: '#15803d', padding: '4px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 800 }}>ACTIVE</span>
                              ) : u.status === "suspended" ? (
                                <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '4px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 800 }}>INACTIVE</span>
                              ) : (
                                <span style={{ background: '#fef3c7', color: '#92400e', padding: '4px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 800 }}>PENDING</span>
                              )}
                            </td>
                            <td style={{ padding: '16px 12px', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9', borderTopRightRadius: '12px', borderBottomRightRadius: '12px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button
                                  onClick={() => setSelectedUser({ ...u, editUpi: u.upi_id || "" })}
                                  style={{ padding: '8px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', cursor: 'pointer' }}
                                  title="View Profile"
                                >
                                  <i className="fas fa-eye"></i>
                                </button>
                                {u.status === "pending" && (
                                  <button
                                    onClick={() => approveUser(u.user_id)}
                                    disabled={processingId === u.user_id}
                                    style={{ padding: '8px 16px', borderRadius: '8px', background: '#4338ca', color: '#fff', border: 'none', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
                                  >
                                    Approve
                                  </button>
                                )}
                                {u.status === "suspended" ? (
                                  <button onClick={() => reactivateUser(u.user_id)} style={{ padding: '8px 16px', borderRadius: '8px', background: '#ecfdf5', color: '#059669', border: 'none', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>Reactivate</button>
                                ) : (
                                  <button onClick={() => deactivateUser(u.user_id)} style={{ padding: '8px 16px', borderRadius: '8px', background: '#fff1f2', color: '#e11d48', border: 'none', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>Suspend</button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    <i className="fas fa-user-shield" style={{ fontSize: '32px', marginBottom: '16px', opacity: 0.3 }}></i>
                    <p style={{ margin: 0 }}>No branch managers found.</p>
                  </div>
                )}
              </div>

              {/* ========== STAFF SECTION ========== */}
              <div style={{
                backgroundColor: '#fff',
                borderRadius: '20px',
                padding: '24px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
              }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', fontSize: '18px', fontWeight: 800, color: '#1e293b' }}>
                  <span style={{ background: '#0ea5e9', color: '#fff', padding: '4px 12px', borderRadius: '10px', fontSize: '12px', textTransform: 'uppercase' }}>Staff</span>
                  Field Personnel ({users.filter(u => u.role === 'staff' && u.email !== 'admin@retail.com' && (showInactive || u.status !== 'suspended')).length})
                </h3>

                {users.filter(u => u.role === 'staff' && u.email !== 'admin@retail.com').length > 0 ? (
                  <div className="table-responsive">
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                      <thead>
                        <tr style={{ color: '#64748b', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                          <th style={{ padding: '12px', textAlign: 'left', fontWeight: 700 }}>Employee</th>
                          <th style={{ padding: '12px', textAlign: 'left', fontWeight: 700 }}>Contact Info</th>
                          <th style={{ padding: '12px', textAlign: 'left', fontWeight: 700 }}>Branch</th>
                          <th style={{ padding: '12px', textAlign: 'left', fontWeight: 700 }}>Status</th>
                          <th style={{ padding: '12px', textAlign: 'right', fontWeight: 700 }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.filter(u => u.role === 'staff' && u.email !== 'admin@retail.com' && (showInactive || u.status !== 'suspended')).map((u, i) => (
                          <tr key={u.user_id || i} style={{ backgroundColor: '#fff' }}>
                            <td style={{ padding: '16px 12px', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', borderLeft: '1px solid #f1f5f9', borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f0f9ff', color: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                                  {(u.first_name || u.firstName || 'U')[0]}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 700, color: '#1e293b' }}>{u.first_name || u.firstName} {u.last_name || u.lastName}</div>
                                  <code style={{ fontSize: '10px', color: '#94a3b8' }}>ID: {u.employee_id || 'PENDING'}</code>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '16px 12px', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
                              <div style={{ fontSize: '13px', color: '#475569' }}>{u.email}</div>
                              <div style={{ fontSize: '11px', color: '#94a3b8' }}>{u.mobile || u.phone || 'No Phone'}</div>
                            </td>
                            <td style={{ padding: '16px 12px', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{u.branch_name || u.branch || '—'}</span>
                            </td>
                            <td style={{ padding: '16px 12px', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
                              {u.status === "approved" ? (
                                <span style={{ background: '#dcfce7', color: '#15803d', padding: '4px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 800 }}>ACTIVE</span>
                              ) : u.status === "suspended" ? (
                                <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '4px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 800 }}>INACTIVE</span>
                              ) : (
                                <span style={{ background: '#fef3c7', color: '#92400e', padding: '4px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 800 }}>PENDING</span>
                              )}
                            </td>
                            <td style={{ padding: '16px 12px', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9', borderTopRightRadius: '12px', borderBottomRightRadius: '12px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button
                                  onClick={() => setSelectedUser({ ...u, editUpi: u.upi_id || "" })}
                                  style={{ padding: '8px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', cursor: 'pointer' }}
                                >
                                  <i className="fas fa-eye"></i>
                                </button>
                                {u.status === "pending" && (
                                  <button
                                    onClick={() => approveUser(u.user_id)}
                                    disabled={processingId === u.user_id}
                                    style={{ padding: '8px 16px', borderRadius: '8px', background: '#4338ca', color: '#fff', border: 'none', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
                                  >
                                    Approve
                                  </button>
                                )}
                                {u.status === "suspended" ? (
                                  <button onClick={() => reactivateUser(u.user_id)} style={{ padding: '8px 16px', borderRadius: '8px', background: '#ecfdf5', color: '#059669', border: 'none', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>Reactivate</button>
                                ) : (
                                  <button onClick={() => deactivateUser(u.user_id)} style={{ padding: '8px 16px', borderRadius: '8px', background: '#fff1f2', color: '#e11d48', border: 'none', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>Suspend</button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    <i className="fas fa-user-tag" style={{ fontSize: '32px', marginBottom: '16px', opacity: 0.3 }}></i>
                    <p style={{ margin: 0 }}>No field personnel recorded.</p>
                  </div>
                )}
              </div>
            </div>
          )}


          {activeSection === "inventory" && <AdminInventory setActiveSection={setActiveSection} />}
          {activeSection === "branches" && <AdminBranches />}
          {activeSection === "reports" && <AdminReports />}
          {activeSection === "transfers" && <AdminStockTransfers />}
          {activeSection === "suppliers" && <SupplierManagement />}
          {activeSection === "messages" && <AdminMessages />}
          {activeSection === "announcements" && <AdminAnnouncements />}

        </main>
      </div>

      {/* ================= USER PROFILE MODAL ================= */}
      {selectedUser && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }} onClick={() => setSelectedUser(null)}>
          <div style={{ backgroundColor: '#fff', width: '100%', maxWidth: '550px', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', animation: 'modalSlideUp 0.3s ease-out' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '24px 32px', background: 'linear-gradient(135deg, #4338ca, #6366f1)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>Profile Intelligence</h2>
                <p style={{ margin: '4px 0 0', fontSize: '11px', opacity: 0.8, letterSpacing: '0.5px', textTransform: 'uppercase' }}>System Identity & Credentials</p>
              </div>
              <button onClick={() => setSelectedUser(null)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', width: '36px', height: '36px', borderRadius: '10px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', paddingBottom: '20px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 800 }}>
                  {(selectedUser.first_name || selectedUser.firstName || 'U')[0]}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#1e293b' }}>{selectedUser.first_name || selectedUser.firstName} {selectedUser.last_name || selectedUser.lastName}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#6366f1', background: '#eff6ff', padding: '2px 8px', borderRadius: '6px' }}>{selectedUser.role?.toUpperCase()}</span>
                    <span style={{ height: '4px', width: '4px', borderRadius: '50%', background: '#cbd5e1' }}></span>
                    <span style={{ fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>{selectedUser.employee_id || 'ID_NOT_SET'}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div className="profile-detail-group">
                  <label style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'block' }}>Email Address</label>
                  <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: 600 }}>{selectedUser.email}</div>
                </div>
                <div className="profile-detail-group">
                  <label style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'block' }}>Contact Number</label>
                  <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: 600 }}>{selectedUser.phone || selectedUser.mobile || '—'}</div>
                </div>
                <div className="profile-detail-group">
                  <label style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'block' }}>Assigned Branch</label>
                  <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: 600 }}>{selectedUser.branch_name || selectedUser.branch || 'Global'}</div>
                </div>
                <div className="profile-detail-group">
                  <label style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'block' }}>Current Status</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ height: '8px', width: '8px', borderRadius: '50%', background: selectedUser.status === 'approved' ? '#10b981' : '#f59e0b' }}></span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: selectedUser.status === 'approved' ? '#10b981' : '#f59e0b', textTransform: 'uppercase' }}>{selectedUser.status}</span>
                  </div>
                </div>
              </div>

              <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                <label style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', display: 'block' }}>Home Address</label>
                <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.5' }}>{selectedUser.address || 'No residential data provided.'}</div>
              </div>

              <button 
                onClick={() => setSelectedUser(null)} 
                style={{ marginTop: '10px', padding: '14px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '14px', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s ease' }}
                onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
                onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}
              >
                Close Profile Info
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ================= ADD MANAGER MODAL ================= */}
      {showAddManager && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#fff', width: '100%', maxWidth: '500px', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', animation: 'modalSlideUp 0.3s ease-out' }}>
            <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9', backgroundColor: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#eef2ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fas fa-user-plus"></i>
                </div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#1e293b' }}>New Manager Entry</h2>
              </div>
              <button onClick={() => setShowAddManager(false)} style={{ background: 'none', border: 'none', fontSize: '20px', color: '#94a3b8', cursor: 'pointer' }}>&times;</button>
            </div>

            <form onSubmit={handleAddManagerSubmit} style={{ padding: '32px' }}>
              <div style={{ display: 'grid', gap: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div className="input-field">
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '8px', textTransform: 'uppercase' }}>First Name</label>
                    <input value={newManager.firstName} onChange={(e) => setNewManager({ ...newManager, firstName: e.target.value })} required style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px' }} />
                  </div>
                  <div className="input-field">
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '8px', textTransform: 'uppercase' }}>Last Name</label>
                    <input value={newManager.lastName} onChange={(e) => setNewManager({ ...newManager, lastName: e.target.value })} required style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px' }} />
                  </div>
                </div>

                <div className="input-field">
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '8px', textTransform: 'uppercase' }}>Email Address</label>
                  <input type="email" value={newManager.email} onChange={(e) => setNewManager({ ...newManager, email: e.target.value })} required style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px' }} />
                </div>

                <div className="input-field">
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '8px', textTransform: 'uppercase' }}>Assigned Branch</label>
                  <select value={newManager.branch_id} onChange={(e) => setNewManager({ ...newManager, branch_id: e.target.value })} required style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px', backgroundColor: '#fff' }}>
                    <option value="">Select Branch...</option>
                    {branches.map(b => <option key={b.branch_id} value={b.branch_id}>{b.name}</option>)}
                  </select>
                </div>

                <button type="submit" style={{ marginTop: '10px', padding: '14px', background: 'linear-gradient(135deg, #4338ca, #6366f1)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '15px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(67, 56, 202, 0.2)' }}>
                  Initialize Account →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
