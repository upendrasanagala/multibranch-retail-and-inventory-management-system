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
import ConfirmModal from "../../components/ConfirmModal";
import Chart from "react-apexcharts";
import InventoryInsightCard from "../../components/InventoryInsightCard";
import SmartRebalanceGrid from "../../components/SmartRebalanceGrid";
import AIWastageAlerts from "../../components/admin/AIWastageAlerts";
import AIProfitSimulator from "../../components/admin/AIProfitSimulator";
import AIAnnouncementReview from "../../components/admin/AIAnnouncementReview";
import AIBusinessHub from "../../components/admin/AIBusinessHub";

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
    password: "",
    // New HR Fields
    dob: "",
    joiningDate: "",
    gender: "",
    panNumber: "",
    nationalId: "",
    emergencyName: "",
    emergencyPhone: "",
    // Financial Fields
    upiId: "",
    bankName: "",
    accountNumber: "",
    ifscCode: ""
  });

  const [managerFormTab, setManagerFormTab] = useState("basic");
  const [applyingPrice, setApplyingPrice] = useState(null);

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
  const [users, setUsers] = useState([]);
  const [sales, setSales] = useState([]);

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
        setError("Failed to load dashboard metrics. Reconnecting...");
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
    window.scrollTo(0, 0);
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

const handleDeleteUserPermanent = async (userId, userName) => {
  const confirmed = await showConfirm(
    `Are you absolutely sure you want to PERMANENTLY DELETE ${userName}? This action is irreversible and only possible if the user has no transaction history.`,
    "Dangerous Action: Permanent Deletion"
  );
  if (!confirmed) return;

  try {
    const res = await api.admin.deleteUserPermanent(userId);
    showToast(res.message || "User deleted permanently", "success");
    
    // Reload users and stats
    const usersRes = await api.admin.getUsers();
    setUsers(usersRes.users || []);
    const statsRes = await api.admin.getStats();
    setStats(prev => ({
      ...prev,
      totalUsers: statsRes.total_users || 0,
      pendingUsers: statsRes.pending_users || 0,
      approvedUsers: statsRes.approved_users || 0
    }));
  } catch (err) {
    console.error("Permanent delete failed:", err);
    showToast(err.response?.data?.message || err.message, "error");
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

const applyPricingSuggestion = async (suggestion) => {
  if (applyingPrice) return;
  setApplyingPrice(suggestion.product_id);
  try {
    const payload = suggestion.type === 'discount'
      ? { discount_percent: 10 } // Example fixed discount from AI
      : { unit_price: suggestion.suggested_price };

    await api.products.update(suggestion.product_id, payload);
    showToast(`Successfully applied ${suggestion.type} to ${suggestion.product}`, "success");

    // Refresh pricing alerts
    const pricingRes = await api.admin.getPricingAlerts();
    setPricingAlerts(pricingRes.alerts || []);
  } catch (err) {
    showToast("Failed to apply pricing: " + err.message, "error");
  } finally {
    setApplyingPrice(null);
  }
};

const renderSection = () => {
  switch (activeSection) {
    case 'dashboard':
      return (
        <div className="dashboard-container-refined" style={{ animation: 'fadeIn 0.5s ease-out' }}>
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

          {/* OPERATIONAL SUMMARY - PREMIUM GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '32px' }}>
            {/* HERO REVENUE */}
            <div style={{ background: 'linear-gradient(135deg, #1e1b4b, #312e81)', padding: '28px', borderRadius: '24px', color: '#fff', boxShadow: '0 20px 25px -5px rgba(30, 27, 75, 0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.8 }}>
                <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Global Revenue today</span>
                <i className="fas fa-chart-line"></i>
              </div>
              <div style={{ fontSize: '36px', fontWeight: 900, margin: '16px 0 8px' }}>₹{stats.todayRevenue?.toLocaleString() || 0}</div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <div style={{ background: 'rgba(255,255,255,0.1)', padding: '8px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: 600 }}>
                  Active Branches: {stats.totalBranches}
                </div>
              </div>
            </div>

            {/* PAYMENT MIX */}
            <div style={{ background: '#fff', padding: '28px', borderRadius: '24px', border: '1.5px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Digital Breakdown</span>
              <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}><i className="fas fa-mobile-alt" style={{ marginRight: '8px', color: '#2563eb' }}></i> UPI / QR</span>
                  <span style={{ fontWeight: 800, color: '#1e293b' }}>₹{(stats.todayUpi + stats.todayQr).toLocaleString()}</span>
                </div>
                <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ width: `${((stats.todayUpi + stats.todayQr) / (stats.todayRevenue || 1)) * 100}%`, height: '100%', background: '#2563eb', borderRadius: '10px' }}></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}><i className="fas fa-money-bill-wave" style={{ marginRight: '8px', color: '#059669' }}></i> Cash Payments</span>
                  <span style={{ fontWeight: 800, color: '#1e293b' }}>₹{stats.todayCash?.toLocaleString() || 0}</span>
                </div>
              </div>
            </div>

            {/* SYSTEM STATUS */}
            <div style={{ background: '#fff', padding: '28px', borderRadius: '24px', border: '1.5px solid #f1f5f9', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>User Management</span>
                <span style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%' }}></span>
              </div>
              <div style={{ margin: '20px 0' }}>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#1e293b' }}>{stats.totalUsers} <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 600 }}>Active Assets</span></div>
              </div>
              <button 
                onClick={() => setActiveSection('users')}
                style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '12px', fontSize: '12px', fontWeight: 700, color: '#4338ca', cursor: 'pointer' }}
              >
                Review {stats.pendingUsers} Pendings
              </button>
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
                        <div style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.5', background: '#f8fafc', padding: '8px', borderRadius: '6px', marginBottom: '10px' }}>
                          {p.reason}
                        </div>
                        <button
                          onClick={() => applyPricingSuggestion(p)}
                          disabled={applyingPrice === p.product_id}
                          style={{
                            width: '100%',
                            padding: '8px',
                            background: p.type === 'increase' ? '#4338ca' : '#059669',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            opacity: applyingPrice === p.product_id ? 0.7 : 1
                          }}
                        >
                          {applyingPrice === p.product_id ? 'Applying...' : `Apply ${p.type === 'increase' ? 'Increase' : 'Discount'}`}
                        </button>
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
          </div>
        </div>
      );
    case 'users':
      return (
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
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 700 }}>Status</th>
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
                            <button 
                              onClick={() => handleDeleteUserPermanent(u.user_id, `${u.first_name || u.firstName} ${u.last_name || u.lastName}`)} 
                              style={{ padding: '8px', borderRadius: '8px', background: '#fff', border: '1px solid #fee2e2', color: '#ef4444', cursor: 'pointer' }}
                              title="Permanent Delete"
                            >
                              <i className="fas fa-trash-alt"></i>
                            </button>
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
                            <button 
                              onClick={() => handleDeleteUserPermanent(u.user_id, `${u.first_name || u.firstName} ${u.last_name || u.lastName}`)} 
                              style={{ padding: '8px', borderRadius: '8px', background: '#fff', border: '1px solid #fee2e2', color: '#ef4444', cursor: 'pointer' }}
                              title="Permanent Delete"
                            >
                              <i className="fas fa-trash-alt"></i>
                            </button>
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
      );
    case 'inventory': return <AdminInventory setActiveSection={setActiveSection} />;
    case 'branches': return <AdminBranches />;
    case 'reports': return <AdminReports />;
    case 'transfers': return <AdminStockTransfers />;
    case 'suppliers': return <SupplierManagement />;
    case 'messages': return <AdminMessages />;
    case 'announcements': return <AdminAnnouncements />;
    case 'ai-hub': return <AIBusinessHub />;
    default: return <div>Section not found</div>;
  }
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
            { id: 'ai-hub', label: 'AI Business Hub', icon: 'fa-brain', isAI: true },
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
                backgroundColor: activeSection === item.id ? (item.isAI ? '#f5f3ff' : '#eef2ff') : 'transparent',
                color: activeSection === item.id ? (item.isAI ? '#7c3aed' : '#4338ca') : '#64748b',
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

        {/* ================= ERROR ALERT ================= */}
        {error && (
          <div style={{
            background: '#fff1f2',
            border: '1px solid #fda4af',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '25px',
            display: 'flex',
            alignItems: 'center',
            gap: '15px',
            color: '#be123c',
            animation: 'slideDown 0.4s ease-out'
          }}>
            <i className="fas fa-circle-exclamation" style={{ fontSize: '24px' }}></i>
            <div>
              <p style={{ margin: 0, fontWeight: 800, fontSize: '15px' }}>Data Synchronization Issue</p>
              <p style={{ margin: 0, fontSize: '13px', opacity: 0.9 }}>{error}</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              style={{
                marginLeft: 'auto',
                background: '#be123c',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Retry Now
            </button>
          </div>
        )}

        {renderSection()}

      </main>
    </div>

    {/* USER PROFILE MODAL (Detailed HR View) */}
    {selectedUser && (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setSelectedUser(null)}>
          <div style={{ backgroundColor: '#fff', borderRadius: '32px', width: '100%', maxWidth: '750px', maxHeight: '95vh', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '32px', borderBottom: '1px solid #f1f5f9', background: 'linear-gradient(135deg, #4338ca, #6366f1)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 800 }}>
                  {(selectedUser.first_name || selectedUser.firstName || 'U')[0]}
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 800 }}>{selectedUser.first_name || selectedUser.firstName} {selectedUser.last_name || selectedUser.lastName}</h2>
                  <p style={{ margin: '4px 0 0', fontSize: '14px', opacity: 0.9, fontWeight: 600 }}>{selectedUser.role?.toUpperCase()} | {selectedUser.employee_id || 'PENDING'}</p>
                  <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                    <span style={{ padding: '4px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: '20px', fontSize: '11px', fontWeight: 700 }}>{selectedUser.branch_name || 'Global'}</span>
                    <span style={{ padding: '4px 12px', background: selectedUser.status === 'approved' ? '#dcfce744' : '#fee2e244', color: '#fff', borderRadius: '20px', fontSize: '11px', fontWeight: 700 }}>{selectedUser.status?.toUpperCase()}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedUser(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', width: '36px', height: '36px', borderRadius: '12px', color: '#fff', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>&times;</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px' }}>
              <div>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', fontWeight: 800, color: '#1e293b', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <i className="fas fa-address-book" style={{ color: '#4338ca' }}></i> Contact
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', marginBottom: '2px', display: 'block' }}>EMAIL</label>
                    <div style={{ fontSize: '14px', color: '#334155', fontWeight: 600 }}>{selectedUser.email}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', marginBottom: '2px', display: 'block' }}>PHONE</label>
                    <div style={{ fontSize: '14px', color: '#334155', fontWeight: 600 }}>{selectedUser.phone || selectedUser.mobile || '--'}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', marginBottom: '2px', display: 'block' }}>ADDRESS</label>
                    <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.5' }}>{selectedUser.address || '--'}</div>
                  </div>
                </div>
              </div>

              <div>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', fontWeight: 800, color: '#1e293b', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <i className="fas fa-id-card" style={{ color: '#0ea5e9' }}></i> HR Profile
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', marginBottom: '2px', display: 'block' }}>DOB</label>
                    <div style={{ fontSize: '14px', color: '#334155', fontWeight: 600 }}>{selectedUser.dob || '--'}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', marginBottom: '2px', display: 'block' }}>JOINED</label>
                    <div style={{ fontSize: '14px', color: '#334155', fontWeight: 600 }}>{selectedUser.joining_date || '--'}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', marginBottom: '2px', display: 'block' }}>PAN</label>
                    <div style={{ fontSize: '14px', color: '#334155', fontWeight: 600 }}>{selectedUser.pan_number || '--'}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', marginBottom: '2px', display: 'block' }}>GENDER</label>
                    <div style={{ fontSize: '14px', color: '#334155', fontWeight: 600 }}>{selectedUser.gender || '--'}</div>
                  </div>
                  <div style={{ gridColumn: '1 / -1', marginTop: '8px' }}>
                    <label style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', marginBottom: '2px', display: 'block' }}>EMERGENCY CONTACT</label>
                    <div style={{ fontSize: '14px', color: '#334155', fontWeight: 700 }}>
                      {selectedUser.emergency_name || '--'} <span style={{ color: '#64748b', fontWeight: 500 }}>({selectedUser.emergency_phone || '--'})</span>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #f1f5f9', paddingTop: '24px' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', fontWeight: 800, color: '#059669', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <i className="fas fa-university"></i> Banking & Settlement
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px', background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                  <div>
                    <label style={{ fontSize: '9px', fontWeight: 800, color: '#64748b', marginBottom: '4px', display: 'block' }}>BANK NAME</label>
                    <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: 700 }}>{selectedUser.bank_name || '--'}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: '9px', fontWeight: 800, color: '#64748b', marginBottom: '4px', display: 'block' }}>ACCOUNT NUMBER</label>
                    <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: 700, fontFamily: 'monospace' }}>{selectedUser.account_number || '--'}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: '9px', fontWeight: 800, color: '#64748b', marginBottom: '4px', display: 'block' }}>IFSC CODE</label>
                    <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: 700 }}>{selectedUser.ifsc_code || '--'}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: '9px', fontWeight: 800, color: '#64748b', marginBottom: '4px', display: 'block' }}>UPI ID</label>
                    <div style={{ fontSize: '13px', color: '#4338ca', fontWeight: 700 }}>{selectedUser.upi_id || '--'}</div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: '24px 32px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '15px' }}>
              <button onClick={() => setSelectedUser(null)} style={{ height: '48px', flex: 1, borderRadius: '14px', background: '#fff', color: '#64748b', border: '1.5px solid #e2e8f0', fontWeight: 700, cursor: 'pointer' }}>Close Profile</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD MANAGER MODAL (Tabbed HR Form) */}
      {showAddManager && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '24px', width: '100%', maxWidth: '650px', maxHeight: '90vh', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '24px 32px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#1e293b' }}>Onboard New Manager</h2>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>Provision a new administrative account with full HR profile</p>
              </div>
              <button onClick={() => setShowAddManager(false)} style={{ background: 'none', border: 'none', fontSize: '24px', color: '#94a3b8', cursor: 'pointer' }}>&times;</button>
            </div>

            <div style={{ display: 'flex', padding: '0 32px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              {['basic', 'hr', 'financial'].map(tab => (
                <button 
                  key={tab}
                  onClick={() => setManagerFormTab(tab)}
                  style={{
                    padding: '16px 20px',
                    background: 'none',
                    border: 'none',
                    borderBottom: managerFormTab === tab ? '3px solid #4338ca' : '3px solid transparent',
                    color: managerFormTab === tab ? '#4338ca' : '#64748b',
                    fontSize: '12px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    cursor: 'pointer'
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            <form onSubmit={handleAddManagerSubmit} style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
              {managerFormTab === 'basic' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '8px' }}>FIRST NAME *</label>
                      <input required value={newManager.firstName} onChange={e => setNewManager({...newManager, firstName: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none' }} placeholder="Rahul" />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '8px' }}>LAST NAME *</label>
                      <input required value={newManager.lastName} onChange={e => setNewManager({...newManager, lastName: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none' }} placeholder="Sharma" />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '8px' }}>OFFICIAL EMAIL *</label>
                    <input required type="email" value={newManager.email} onChange={e => setNewManager({...newManager, email: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none' }} placeholder="manager@retail.com" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '8px' }}>MOBILE *</label>
                      <input required value={newManager.mobile} onChange={e => setNewManager({...newManager, mobile: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '8px' }}>BRANCH *</label>
                      <select required value={newManager.branch_id} onChange={e => setNewManager({...newManager, branch_id: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#fff' }}>
                        <option value="">Select Branch</option>
                        {branches.map(b => <option key={b.branch_id} value={b.branch_id}>{b.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {managerFormTab === 'hr' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '8px' }}>DOB</label>
                      <input type="date" value={newManager.dob} onChange={e => setNewManager({...newManager, dob: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '8px' }}>PAN NUMBER</label>
                      <input value={newManager.panNumber} onChange={e => setNewManager({...newManager, panNumber: e.target.value.toUpperCase()})} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0' }} placeholder="ABCDE1234F" />
                    </div>
                  </div>
                </div>
              )}

              {managerFormTab === 'financial' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#1e293b', marginBottom: '15px' }}>SETTLEMENT BANK DETAILS</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      <input value={newManager.bankName} onChange={e => setNewManager({...newManager, bankName: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0' }} placeholder="Bank Name" />
                      <input value={newManager.accountNumber} onChange={e => setNewManager({...newManager, accountNumber: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0' }} placeholder="Account Number" />
                      <input value={newManager.ifscCode} onChange={e => setNewManager({...newManager, ifscCode: e.target.value.toUpperCase()})} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0' }} placeholder="IFSC Code" />
                      <input value={newManager.upiId} onChange={e => setNewManager({...newManager, upiId: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0' }} placeholder="Personal UPI ID" />
                    </div>
                  </div>
                </div>
              )}

              <div style={{ marginTop: '30px', display: 'flex', gap: '15px' }}>
                <button type="button" onClick={() => setShowAddManager(false)} style={{ flex: 1, height: '50px', borderRadius: '14px', border: '1.5px solid #e2e8f0', background: '#fff', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={loading} style={{ flex: 2, height: '50px', borderRadius: '14px', border: 'none', background: '#4338ca', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
                  {loading ? 'PROCESSING...' : 'COMPLETE ONBOARDING'}
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
