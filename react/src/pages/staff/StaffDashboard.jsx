import { useState } from "react";
import { useNavigate } from "react-router-dom";

import StaffDashboardHome from "./staffDashboardHome";
import StaffPOS from "./staffPOS";
import StaffInventory from "./staffInventory";
import StaffReceipts from "./staffReceipts";

import "../../styles/dashboard.css";

export default function StaffDashboard() {
  const [active, setActive] = useState("dashboard");
  const navigate = useNavigate();

  /* ================= LOGOUT ================= */
  const logout = () => {
    localStorage.removeItem("loggedInUser");
    navigate("/login");
  };

  return (
    <div className="admin-layout">

      {/* ================= SIDEBAR ================= */}
      <aside className="sidebar">
        <div className="sidebar-profile">
          <div className="profile-info">
            <h4>Staff</h4>
            <span>POS Operator</span>
          </div>
        </div>

        <nav>
          <a
            className={active === "dashboard" ? "active" : ""}
            onClick={() => setActive("dashboard")}
          >
            <i className="fas fa-chart-pie"></i> Dashboard
          </a>

          <a
            className={active === "pos" ? "active" : ""}
            onClick={() => setActive("pos")}
          >
            <i className="fas fa-cash-register"></i> POS
          </a>

          <a
            className={active === "inventory" ? "active" : ""}
            onClick={() => setActive("inventory")}
          >
            <i className="fas fa-boxes"></i> Inventory
          </a>

          <a
            className={active === "receipts" ? "active" : ""}
            onClick={() => setActive("receipts")}
          >
            <i className="fas fa-receipt"></i> Receipts
          </a>

          <a className="logout-link" onClick={logout}>
            <i className="fas fa-sign-out-alt"></i> Logout
          </a>
        </nav>
      </aside>

      {/* ================= MAIN CONTENT ================= */}
      <main className="main-content">
        {active === "dashboard" && <StaffDashboardHome />}
        {active === "pos" && <StaffPOS />}
        {active === "inventory" && <StaffInventory />}
        {active === "receipts" && <StaffReceipts />}
      </main>

    </div>
  );
}
