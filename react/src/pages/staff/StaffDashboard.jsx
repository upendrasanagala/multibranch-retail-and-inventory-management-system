import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import StaffDashboardHome from "./staffDashboardHome";
import StaffPOS from "./staffPOS";
import StaffInventory from "./staffInventory";
import StaffReceipts from "./staffReceipts";
import StaffProfile from "./StaffProfile";
import AnnouncementsFeed from "../../components/AnnouncementsFeed";
import UnreadAnnouncementsBadge from "../../components/UnreadAnnouncementsBadge";
import LiveClock from "../../components/LiveClock";
import ConfirmModal from "../../components/ConfirmModal";

export default function StaffDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const active = searchParams.get("tab") || "dashboard";
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const navigate = useNavigate();
  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));

  useEffect(() => {
    if (!searchParams.get("tab")) {
      setSearchParams({ tab: "dashboard" }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleLogout = () => {
    localStorage.removeItem("loggedInUser");
    navigate("/");
  };

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: "fas fa-th-large" },
    { id: "pos", label: "Sales Terminal", icon: "fas fa-cash-register" },
    { id: "inventory", label: "Inventory", icon: "fas fa-boxes" },
    { id: "receipts", label: "Past Sales", icon: "fas fa-receipt" },
    { id: "announcements", label: "Announcements", icon: "fas fa-bullhorn", badge: true },
    { id: "profile", label: "My Profile", icon: "fas fa-user-circle" },
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f8fafc', overflow: 'hidden' }}>
      
      {/* ================= SIDEBAR ================= */}
      <aside style={{ 
        width: isSidebarCollapsed ? '80px' : '280px', 
        background: '#fff', 
        borderRight: '1px solid #e2e8f0', 
        display: 'flex', 
        flexDirection: 'column', 
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        zIndex: 50
      }}>
        {/* LOGO AREA */}
        <div style={{ padding: '15px 24px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'linear-gradient(135deg, #4338ca 0%, #6366f1 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <i className="fas fa-store"></i>
            </div>
            {!isSidebarCollapsed && (
              <span style={{ fontWeight: 900, fontSize: '18px', color: '#1e293b', letterSpacing: '-0.5px' }}>STAFF PORTAL</span>
            )}
        </div>

        {/* PROFILE STRIP */}
        {!isSidebarCollapsed && (
          <div style={{ padding: '12px 20px', background: '#f8fafc', margin: '10px 15px', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
             <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '14px' }}>{loggedInUser?.name || "Staff"}</div>
             <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', fontWeight: 600 }}>{loggedInUser?.branch_name || "POS Operator"}</div>
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
              <i className={item.icon} style={{ fontSize: '18px', width: '24px', textAlign: 'center' }}></i>
              {!isSidebarCollapsed && (
                <span style={{ fontWeight: 700, fontSize: '14px', flex: 1 }}>{item.label}</span>
              )}
              {!isSidebarCollapsed && item.badge && <UnreadAnnouncementsBadge />}
            </button>
          ))}
          
          <div style={{ marginTop: 'auto', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
            <button
              onClick={() => setShowLogoutModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '9px 14px', borderRadius: '12px', border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', width: '100%', textAlign: 'left' }}
            >
              <i className="fas fa-sign-out-alt" style={{ fontSize: '18px', width: '24px', textAlign: 'center' }}></i>
              {!isSidebarCollapsed && <span style={{ fontWeight: 700, fontSize: '14px' }}>Logout</span>}
            </button>
          </div>
        </nav>

        {/* FOOTER CLOCK */}
        {!isSidebarCollapsed && (
          <div style={{ padding: '12px 24px', background: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
            <LiveClock />
          </div>
        )}

        {/* COLLAPSE TOGGLE */}
        <button 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          style={{ position: 'absolute', right: '-12px', top: '80px', width: '24px', height: '24px', borderRadius: '50%', background: '#fff', border: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#64748b', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
        >
          <i className={`fas fa-chevron-${isSidebarCollapsed ? 'right' : 'left'}`}></i>
        </button>
      </aside>

      {/* ================= MAIN CONTENT ================= */}
      <main style={{ flex: 1, overflowY: 'auto', position: 'relative', display: 'flex', flexDirection: 'column' }}>
         
         {/* TOPBAR / CONTROL STRIP (Optional, can hide on POS) */}
         <header style={{ 
           height: '70px', 
           background: '#fff', 
           borderBottom: '1px solid #e2e8f0', 
           display: active === 'pos' ? 'none' : 'flex', 
           alignItems: 'center', 
           padding: '0 40px', 
           justifyContent: 'space-between',
           position: 'sticky',
           top: 0,
           zIndex: 40
         }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
               <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#1e293b' }}>
                 {navItems.find(n => n.id === active)?.label}
               </h1>
               <div style={{ padding: '4px 12px', background: '#f1f5f9', borderRadius: '100px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                 Staff Access
               </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
               <div 
                 onClick={() => setSearchParams({ tab: 'announcements' })}
                 style={{ 
                   width: '40px', 
                   height: '40px', 
                   borderRadius: '12px', 
                   background: '#f8fafc', 
                   border: '1px solid #e2e8f0', 
                   display: 'flex', 
                   alignItems: 'center', 
                   justifyContent: 'center', 
                   color: '#64748b',
                   cursor: 'pointer',
                   transition: '0.2s',
                   hover: { background: '#f1f5f9' }
                 }}
                 title="View Announcements"
               >
                 <i className="fas fa-bell"></i>
               </div>
            </div>
         </header>

          <div style={{ padding: active === 'pos' ? '0' : 'clamp(20px, 4vw, 40px)', flex: 1 }}>
            {active === "dashboard" && <StaffDashboardHome />}
            {active === "pos" && <StaffPOS />}
            {active === "inventory" && <StaffInventory />}
            {active === "announcements" && <AnnouncementsFeed />}
            {active === "receipts" && <StaffReceipts />}
            {active === "profile" && <StaffProfile />}
         </div>
      </main>

      <ConfirmModal
        isOpen={showLogoutModal}
        title="Logout Confirmation"
        message="Are you sure you want to log out? Make sure you have finished any active sales before proceeding."
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutModal(false)}
      />
    </div>
  );
}
