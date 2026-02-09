import { useEffect } from "react";
import "../styles/home.css";

export default function Home() {

  useEffect(() => {
    const featureCards = document.querySelectorAll(".feature-box");
    const roleCards = document.querySelectorAll(".role-card");

    // ===== FEATURE CARDS =====
    featureCards.forEach(card => {

      card.addEventListener("mousemove", (e) => {
        const rect = card.getBoundingClientRect();

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = (y - centerY) / 20;
        const rotateY = (x - centerX) / 20;

        card.style.transform = `
          perspective(900px)
          rotateX(${-rotateX}deg)
          rotateY(${rotateY}deg)
          translateY(-10px)
        `;
      });

      card.addEventListener("mouseleave", () => {
        card.style.transform = "none";
      });
    });

    // ===== ROLE CARDS =====
    roleCards.forEach(card => {

      card.addEventListener("mousemove", (e) => {
        const rect = card.getBoundingClientRect();

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = (y - centerY) / 25;
        const rotateY = (x - centerX) / 25;

        card.style.transform = `
          perspective(800px)
          rotateX(${-rotateX}deg)
          rotateY(${rotateY}deg)
          translateY(-8px)
        `;
      });

      card.addEventListener("mouseleave", () => {
        card.style.transform = "none";
      });
    });

  }, []);

  return (
    <>
      {/* ================= NAVBAR ================= */}
      <header className="navbar">
        <div className="nav-left">
          <div className="logo">Inventory Retail System</div>
          <span className="tagline">Enterprise Retail Platform</span>
        </div>

        <nav className="nav-right">
          <a href="/login" className="nav-login">Sign In</a>
          <a href="/register" className="nav-cta">
            Get Started <i className="fas fa-arrow-right"></i>
          </a>
        </nav>
      </header>

      {/* ================= HERO ================= */}
      <section className="hero-split">
        <div className="hero-left">
          <span className="badge">Enterprise Retail Platform</span>

          <h1>
            Smart Inventory & Sales Management <br />
            for Multi-Branch Retail Businesses
          </h1>

          <p>
            A centralized retail management system that enables organizations
            to control inventory, streamline sales, manage staff, and analyze
            performance across multiple branches in real time.
          </p>
        </div>

        <div className="hero-right">
          <div className="cta-card">
            <h2>Why This System?</h2>

            <ul className="benefits">
              <li><i className="fas fa-check-circle"></i> Real-time stock visibility</li>
              <li><i className="fas fa-check-circle"></i> Secure role-based access</li>
              <li><i className="fas fa-check-circle"></i> Fast POS billing</li>
              <li><i className="fas fa-check-circle"></i> Actionable analytics</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ================= FEATURES ================= */}
      <section className="features-section">
        <h2 className="section-title">Core Platform Features</h2>
        <p className="section-subtitle">
          Designed to simulate real-world retail enterprise systems
        </p>

        <div className="features-grid">
          <div className="feature-box">
            <i className="fas fa-boxes-stacked"></i>
            <h3>Inventory Control</h3>
            <p>Track, update, and transfer stock across branches with precision.</p>
          </div>

          <div className="feature-box">
            <i className="fas fa-cash-register"></i>
            <h3>Point of Sale</h3>
            <p>Integrated POS ensures accurate billing and instant stock updates.</p>
          </div>

          <div className="feature-box">
            <i className="fas fa-users-gear"></i>
            <h3>User Management</h3>
            <p>Separate roles for Staff, Managers, and Administrators.</p>
          </div>

          <div className="feature-box">
            <i className="fas fa-chart-pie"></i>
            <h3>Reports & Insights</h3>
            <p>Sales, inventory, and performance reports for decisions.</p>
          </div>
        </div>
      </section>

      {/* ================= ROLES ================= */}
      <section className="roles-section">
        <h2 className="section-title">Built for Every Retail Role</h2>

        <div className="roles-grid">
          <div className="role-card">
            <h3>Staff</h3>
            <p>Billing, sales processing, and inventory updates.</p>
          </div>

          <div className="role-card">
            <h3>Manager</h3>
            <p>Branch performance, stock transfers, and reports.</p>
          </div>

          <div className="role-card">
            <h3>Administrator</h3>
            <p>User approvals, system control, and global analytics.</p>
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="footer">
        © 2025 Inventory Retail Management System | Enterprise Academic Project
      </footer>
    </>
  );
}
