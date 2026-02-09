import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Chart from "react-apexcharts";
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
            totalUsers: statsRes.totalUsers || 0,
            pendingUsers: statsRes.pendingUsers || 0,
            approvedUsers: statsRes.approvedUsers || 0,
            totalBranches: statsRes.totalBranches || 0
          });

          // Load recent sales
          const salesRes = await api.admin.getDashboard();
          setSales(salesRes.recent_sales || []);
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

  /* ================= USER ACTIONS ================= */
  const approveUser = async (userId) => {
    try {
      await api.admin.approveUser(userId);
      // Reload users
      const usersRes = await api.admin.getUsers();
      setUsers(usersRes.users || []);
    } catch (error) {
      console.error("Failed to approve user:", error);
      alert("Failed to approve user: " + error.message);
    }
  };

  const deleteUser = async (userId) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      await api.admin.deleteUser(userId);
      // Reload users
      const usersRes = await api.admin.getUsers();
      setUsers(usersRes.users || []);
    } catch (error) {
      console.error("Failed to delete user:", error);
      alert("Failed to delete user: " + error.message);
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
  const baseOptions = {
    chart: { toolbar: { show: false } },
    dataLabels: { enabled: false },
    stroke: { curve: "smooth", width: 3 }
  };

  const pieOptions = {
    labels: Object.keys(branchMap).length > 0 ? Object.keys(branchMap) : ["No Data"],
    legend: { position: "bottom" }
  };

  const donutOptions = {
    labels: Object.keys(productMap).length > 0 ? Object.keys(productMap) : ["No Data"],
    plotOptions: {
      pie: { donut: { size: "65%" } }
    },
    legend: { position: "bottom" }
  };

  const radialOptions = {
    labels: ["Approved %"],
    plotOptions: {
      radialBar: {
        hollow: { size: "65%" },
        dataLabels: {
          value: { fontSize: "22px" }
        }
      }
    }
  };

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
              <div className="dashboard-grid">
                <div className="data-box"><h4>Total Users</h4><div className="value">{stats.totalUsers}</div></div>
                <div className="data-box"><h4>Pending</h4><div className="value">{stats.pendingUsers}</div></div>
                <div className="data-box"><h4>Approved</h4><div className="value">{stats.approvedUsers}</div></div>
                <div className="data-box"><h4>Branches</h4><div className="value">{stats.totalBranches}</div></div>
              </div>

              {/* NEW: Pending Approvals on Main Dashboard */}
              <div className="table-card" style={{ marginBottom: '44px' }}>
                <h3>Pending User Approvals</h3>
                {users.filter(u => u.status === 'pending').length > 0 ? (
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.filter(u => u.status === 'pending').map((u, i) => (
                        <tr key={u.user_id || u.id || i}>
                          <td>{u.firstName || u.first_name} {u.lastName || u.last_name}</td>
                          <td>{u.email}</td>
                          <td>{u.role}</td>
                          <td>
                            <button onClick={() => approveUser(u.user_id || u.id)}>Approve</button>
                            <button onClick={() => deleteUser(u.user_id || u.id)}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ color: '#666', padding: '10px' }}>No pending requests at the moment.</p>
                )}
              </div>

              <div className="chart-grid">
                <div className="chart-card">
                  <Chart
                    options={{ ...baseOptions, xaxis: { categories: Object.keys(branchMap) } }}
                    series={[{ data: Object.values(branchMap).length > 0 ? Object.values(branchMap) : [0] }]}
                    type="bar"
                    height={280}
                  />
                </div>

                <div className="chart-card">
                  <Chart
                    options={pieOptions}
                    series={Object.values(branchMap).length > 0 ? Object.values(branchMap) : [1]}
                    type="pie"
                    height={280}
                  />
                </div>

                <div className="chart-card">
                  <Chart
                    options={donutOptions}
                    series={Object.values(productMap).length > 0 ? Object.values(productMap) : [1]}
                    type="donut"
                    height={280}
                  />
                </div>

                <div className="chart-card">
                  <Chart
                    options={radialOptions}
                    series={[
                      stats.totalUsers === 0
                        ? 0
                        : Math.round(
                          (stats.approvedUsers / stats.totalUsers) * 100
                        )
                    ]}
                    type="radialBar"
                    height={280}
                  />
                </div>
              </div>
            </>
          )}

          {/* ================= USERS ================= */}
          {activeSection === "users" && (
            <div className="table-card">
              <h3>User Approval</h3>

              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Branch</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {users.map((u, i) => (
                    <tr key={u.user_id || i}>
                      <td>{u.first_name || u.firstName} {u.last_name || u.lastName}</td>
                      <td>{u.email}</td>
                      <td>{u.role}</td>
                      <td>{u.branch?.name || u.branch || 'N/A'}</td>

                      <td>
                        {u.status === "approved"
                          ? <span style={{ color: "green", fontWeight: 600 }}>Approved</span>
                          : <span style={{ color: "#dc2626", fontWeight: 600 }}>Pending</span>}
                      </td>

                      <td>
                        <button onClick={() => setSelectedUser(u)}>View</button>

                        {u.status === "pending" && (
                          <button onClick={() => approveUser(u.user_id)}>Approve</button>
                        )}

                        <button onClick={() => deleteUser(u.user_id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeSection === "inventory" && <AdminInventory />}
          {activeSection === "branches" && <AdminBranches />}
          {activeSection === "reports" && <AdminReports />}
          {activeSection === "transfers" && <AdminStockTransfers />}

        </main>
      </div>

      {/* ================= USER PROFILE MODAL ================= */}
      {selectedUser && (
        <div className="profile-overlay" onClick={() => setSelectedUser(null)}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
            <h2>User Profile</h2>

            <p><b>Name:</b> {selectedUser.first_name || selectedUser.firstName} {selectedUser.last_name || selectedUser.lastName}</p>
            <p><b>Email:</b> {selectedUser.email}</p>
            <p><b>Mobile:</b> {selectedUser.phone || selectedUser.mobile || 'N/A'}</p>
            <p><b>Role:</b> {selectedUser.role}</p>
            <p><b>Branch:</b> {selectedUser.branch?.name || selectedUser.branch || 'N/A'}</p>
            <p><b>Status:</b> {selectedUser.status}</p>
            <p><b>Address:</b> {selectedUser.address || 'N/A'}</p>

            <button className="primary-btn" onClick={() => setSelectedUser(null)}>
              Back
            </button>
          </div>
        </div>
      )}
    </>
  );
}
