import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ManagerDashboardHome from "./ManagerDashboardHome";
import ManagerInventory from "./ManagerInventory";
import ManagerTransactions from "./ManagerTransactions";
import ManagerTransfers from "./ManagerTransfers";
import ManagerReports from "./ManagerReports";
import StaffActivity from "./ManagerStaffActivity";
import ManagerProfile from "./ManagerProfile";
import AnnouncementsFeed from "../../components/AnnouncementsFeed";
import UnreadAnnouncementsBadge from "../../components/UnreadAnnouncementsBadge";
import UnreadTransfersBadge from "../../components/UnreadTransfersBadge";
import LiveClock from "../../components/LiveClock";
import ConfirmModal from "../../components/ConfirmModal";
import "../../styles/dashboard.css";

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const [active, setActive] = useState("dashboard");
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));

  const handleLogout = () => {
    localStorage.removeItem("loggedInUser");
    navigate("/");
  };

  return (
    <div className="admin-layout">

      {/* ========== SIDEBAR ========== */}
      <aside className="sidebar">

        <div className="sidebar-profile">
          <div className="profile-info">
            <h4>{loggedInUser?.firstName || "Manager"}</h4>
            <span>{loggedInUser?.branch_name || "Branch Manager"}</span>
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
            className={active === "inventory" ? "active" : ""}
            onClick={() => setActive("inventory")}
          >
            <i className="fas fa-boxes"></i> Inventory
          </a>

          <a
            className={active === "transactions" ? "active" : ""}
            onClick={() => setActive("transactions")}
          >
            <i className="fas fa-receipt"></i> Transactions
          </a>

          <a
            className={active === "transfers" ? "active" : ""}
            onClick={() => setActive("transfers")}
          >
            <i className="fas fa-exchange-alt"></i> Stock Transfers
            <UnreadTransfersBadge />
          </a>

          <a
            className={active === "reports" ? "active" : ""}
            onClick={() => setActive("reports")}
          >
            <i className="fas fa-chart-line"></i> Reports
          </a>

          <a
            className={active === "staff" ? "active" : ""}
            onClick={() => setActive("staff")}
          >
            <i className="fas fa-users"></i> Staff Management
          </a>

          <a
            className={active === "announcements" ? "active" : ""}
            onClick={() => setActive("announcements")}
          >
            <i className="fas fa-bullhorn"></i> Announcements
            <UnreadAnnouncementsBadge />
          </a>

          <a
            className={active === "profile" ? "active" : ""}
            onClick={() => setActive("profile")}
          >
            <i className="fas fa-user-circle"></i> Profile
          </a>

          <a className="logout-link" onClick={() => setShowLogoutModal(true)}>
            <i className="fas fa-sign-out-alt"></i> Logout
          </a>
        </nav>

        <LiveClock />
      </aside>

      {/* ========== MAIN CONTENT ========== */}
      <main className="main-content">

        {active === "dashboard" && <ManagerDashboardHome />}
        {active === "inventory" && <ManagerInventory />}
        {active === "transactions" && <ManagerTransactions />}
        {active === "transfers" && <ManagerTransfers />}
        {active === "reports" && <ManagerReports />}
        {active === "staff" && <StaffActivity />}
        {active === "announcements" && <AnnouncementsFeed />}
        {active === "profile" && <ManagerProfile />}

      </main>

      <ConfirmModal
        isOpen={showLogoutModal}
        title="Confirm Logout"
        message="Are you sure you want to log out of your account? Any unsaved changes might be lost."
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutModal(false)}
      />
    </div>
  );
}
