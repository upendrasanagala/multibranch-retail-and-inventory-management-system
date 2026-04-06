import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const active = searchParams.get("tab") || "dashboard";
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    if (!searchParams.get("tab")) {
      setSearchParams({ tab: "dashboard" }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  const branchName = user?.branch_name || "Regional";

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fa-th-large' },
    { id: 'inventory', label: 'Inventory', icon: 'fa-boxes' },
    { id: 'transactions', label: 'Transactions', icon: 'fa-receipt' },
    { id: 'transfers', label: 'Transfers', icon: 'fa-exchange-alt', badge: <UnreadTransfersBadge /> },
    { id: 'reports', label: 'Reports', icon: 'fa-chart-line' },
    { id: 'staff', label: 'Staff Management', icon: 'fa-users' },
    { id: 'announcements', label: 'Announcements', icon: 'fa-bullhorn', badge: <UnreadAnnouncementsBadge /> },
    { id: 'profile', label: 'My Profile', icon: 'fa-user-circle' },
  ];

  const handleLogout = () => {
    localStorage.removeItem("loggedInUser");
    navigate("/");
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f8fafc', overflow: 'hidden', fontFamily: "'Inter', sans-serif" }}>

      {/* ================= SIDEBAR ================= */}
      <aside style={{ 
        width: isCollapsed ? '80px' : '280px', 
        background: '#fff', 
        borderRight: '1px solid #e2e8f0', 
        display: 'flex', 
        flexDirection: 'column', 
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        zIndex: 1000
      }}>
        {/* LOGO AREA */}
        <div style={{ padding: '15px 24px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'linear-gradient(135deg, #4338ca 0%, #6366f1 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <i className="fas fa-layer-group"></i>
            </div>
            {!isCollapsed && (
              <span style={{ fontWeight: 900, fontSize: '18px', color: '#1e293b', letterSpacing: '-0.5px' }}>MANAGER PORTAL</span>
            )}
        </div>

        {/* PROFILE STRIP */}
        {!isCollapsed && (
          <div style={{ padding: '12px 20px', background: '#f8fafc', margin: '10px 15px', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
             <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '14px' }}>{user?.firstName}</div>
             <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', fontWeight: 600 }}>{branchName} Manager</div>
          </div>
        )}

        {/* NAVIGATION */}
        <nav style={{ flex: 1, padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto', scrollbarWidth: 'none' }}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setSearchParams({ tab: item.id })}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '9px 14px',
                borderRadius: '12px',
                border: 'none',
                background: active === item.id ? '#eef2ff' : 'transparent',
                color: active === item.id ? '#4338ca' : '#64748b',
                cursor: 'pointer',
                transition: '0.2s',
                textAlign: 'left'
              }}
            >
              <i className={`fas ${item.icon}`} style={{ fontSize: '18px', width: '24px', textAlign: 'center' }}></i>
              {!isCollapsed && (
                <span style={{ fontWeight: 700, fontSize: '14px', flex: 1 }}>{item.label}</span>
              )}
              {!isCollapsed && item.badge && <span style={{ marginLeft: 'auto' }}>{item.badge}</span>}
            </button>
          ))}
          
          <div style={{ marginTop: 'auto', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
            <button
              onClick={() => setShowLogoutModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '9px 14px', borderRadius: '12px', border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', width: '100%', textAlign: 'left' }}
            >
              <i className="fas fa-sign-out-alt" style={{ fontSize: '18px', width: '24px', textAlign: 'center' }}></i>
              {!isCollapsed && <span style={{ fontWeight: 700, fontSize: '14px' }}>Logout</span>}
            </button>
          </div>
        </nav>

        {/* FOOTER CLOCK */}
        {!isCollapsed && (
          <div style={{ padding: '12px 24px', background: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
            <LiveClock />
          </div>
        )}

        {/* COLLAPSE TOGGLE */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{ position: 'absolute', right: '-12px', top: '80px', width: '24px', height: '24px', borderRadius: '50%', background: '#fff', border: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#64748b', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
        >
          <i className={`fas fa-chevron-${isCollapsed ? 'right' : 'left'}`}></i>
        </button>
      </aside>

      {/* ================= MAIN CONTENT ================= */}
      <main style={{ flex: 1, overflowY: 'auto', position: 'relative', display: 'flex', flexDirection: 'column' }}>
        
        {/* TOPBAR */}
        <header style={{ 
          height: '70px', 
          background: '#fff', 
          borderBottom: '1px solid #e2e8f0', 
          display: 'flex', 
          alignItems: 'center', 
          padding: '0 40px', 
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 900
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
             <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#1e293b' }}>
               {navItems.find(n => n.id === active)?.label}
             </h1>
             <div style={{ padding: '4px 12px', background: '#f1f5f9', borderRadius: '100px', fontSize: '11px', fontWeight: 800, color: '#4338ca', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
               {branchName} Manager
             </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b' }}>{user?.firstName}</div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>Branch Head</div>
                </div>
                <div style={{ 
                  width: '40px', height: '40px', background: '#eef2ff', 
                  borderRadius: '12px', display: 'flex', 
                  alignItems: 'center', justifyContent: 'center', color: '#4338ca', fontWeight: 800, fontSize: '15px' 
                }}>
                  {(user?.firstName?.[0] || 'M').toUpperCase()}
                </div>
             </div>
          </div>
        </header>

        {/* CONTENT */}
        <div style={{ padding: '40px' }}>
           {active === "dashboard" && <ManagerDashboardHome />}
           {active === "inventory" && <ManagerInventory />}
           {active === "transactions" && <ManagerTransactions />}
           {active === "transfers" && <ManagerTransfers />}
           {active === "reports" && <ManagerReports />}
           {active === "staff" && <StaffActivity />}
           {active === "announcements" && <AnnouncementsFeed />}
           {active === "profile" && <ManagerProfile />}
        </div>
      </main>

      <ConfirmModal
        isOpen={showLogoutModal}
        title="Logout Confirmation"
        message="Are you sure you want to log out of your session? Any unsaved changes may be lost."
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutModal(false)}
      />

    </div>
  );
}
