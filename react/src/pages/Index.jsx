import { useEffect } from "react";
import "../styles/home.css";

export default function Home() {

  useEffect(() => {
    // Optional: Add intersection observer for reveal animations if needed
  }, []);

  return (
    <>
      <div className="bg-mesh"></div>

      {/* ================= NAVBAR ================= */}
      <header className="navbar">
        <div className="nav-left">
          <div className="logo">
            <i className="fas fa-layer-group"></i>
            InventoryPro
          </div>
          <span className="tagline">Enterprise v2.0</span>
        </div>

        <nav className="nav-right">
          <a href="/login" className="nav-cta">
            Authorized Access
          </a>
        </nav>
      </header>

      {/* ================= HERO SECTION ================= */}
      <section className="hero-wrapper">
        <div className="hero-content">
          <div className="badge-new">
            <span>NEW</span> Multi-Branch Sync
          </div>

          <h1 className="hero-headline">
            Retail Management <br />
            Reimagined.
          </h1>

          <p className="subheadline">
            The all-in-one platform for modern retail chains. Control inventory,
            sales, and staff across unlimited locations in real-time.
          </p>

          <div className="btn-group">
            <a href="/login" className="btn-primary">
              Launch Console
            </a>
            <a href="#features" className="btn-secondary">
              Explore Features
            </a>
          </div>
        </div>

        <div className="hero-visual">
          <div className="dashboard-card" style={{ padding: 0, background: 'none' }}>
            <img
              src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2426&auto=format&fit=crop"
              alt="InventoryPro Dashboard"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: '12px',
                display: 'block'
              }}
            />
          </div>
        </div>
      </section>

      {/* ================= STATS ROW ================= */}
      <div className="stats-strip">
        <div className="stats-container">
          <div className="stat-box">
            <h3>2.5s</h3>
            <p>Avg. Checkout Time</p>
          </div>
          <div className="stat-box">
            <h3>99.9%</h3>
            <p>Inventory Accuracy</p>
          </div>
          <div className="stat-box">
            <h3>Unlimited</h3>
            <p>Branch Support</p>
          </div>
          <div className="stat-box">
            <h3>Real-Time</h3>
            <p>Global Sync</p>
          </div>
        </div>
      </div>

      {/* ================= IMPACT POSTER ================= */}
      <section className="impact-section">
        <div className="impact-poster">
          <div className="impact-content">
            <h2>Outperform the competition.</h2>
            <p>
              Stop guessing. Start growing. InventoryPro gives you the data-driven edge
              to optimize stock levels and maximize profit margins.
            </p>
            <div className="impact-stats">
              <div className="impact-stat">
                <h4>93%</h4>
                <span>Less Stockouts</span>
              </div>
              <div className="impact-stat">
                <h4>30%</h4>
                <span>Revenue Boost</span>
              </div>
            </div>
          </div>

          <div className="impact-visual">
            <div className="chart-bars">
              <div className="chart-col" style={{ height: '40%', opacity: 0.3 }} data-val="Q1"></div>
              <div className="chart-col" style={{ height: '55%', opacity: 0.5 }} data-val="Q2"></div>
              <div className="chart-col" style={{ height: '70%', opacity: 0.7 }} data-val="Q3"></div>
              <div className="chart-col" style={{ height: '95%', background: '#60a5fa' }} data-val="Q4"></div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FEATURES SECTION ================= */}
      <section className="features-section" id="features">
        <div className="section-head">
          <h2>Everything you need to run your empire.</h2>
          <p>
            Powerful tools designed for scale. From the warehouse to the register,
            we've got you covered.
          </p>
        </div>

        <div className="bento-grid">
          <div className="bento-card large">
            <div className="bento-icon">
              <i className="fas fa-satellite-dish"></i>
            </div>
            <h3>Real-Time Synchronization</h3>
            <p>
              Changes made in one branch reflect instantly across your entire network.
              Never oversell or lose track of stock again.
            </p>
          </div>

          <div className="bento-card">
            <div className="bento-icon">
              <i className="fas fa-shield-alt"></i>
            </div>
            <h3>Role-Based Security</h3>
            <p>Granular access controls for Admins, Managers, and Staff.</p>
          </div>

          <div className="bento-card">
            <div className="bento-icon">
              <i className="fas fa-chart-line"></i>
            </div>
            <h3>Advanced Analytics</h3>
            <p>Deep insights into sales, top products, and branch performance.</p>
          </div>

          <div className="bento-card large">
            <div className="bento-icon">
              <i className="fas fa-box-open"></i>
            </div>
            <h3>Smart Inventory</h3>
            <p>
              Automated low-stock alerts, expiry tracking, and one-click transfers
              between branches.
            </p>
          </div>
        </div>
      </section>

      {/* ================= COMPARISON TABLE ================= */}
      <section className="comparison-section">
        <div className="section-head">
          <h2>Why industry leaders choose InventoryPro.</h2>
          <p>See how we stack up against the old way of doing things.</p>
        </div>

        <div className="comparison-container">
          <div className="compare-row compare-header">
            <div className="col-feature">Feature</div>
            <div className="col-competitor">Legacy ERP</div>
            <div className="col-us">InventoryPro</div>
          </div>

          <div className="compare-row">
            <div className="col-feature">Multi-Branch Sync</div>
            <div className="col-competitor"><span className="cross">15m Delay</span></div>
            <div className="col-us"><span className="check">Real-Time</span></div>
          </div>

          <div className="compare-row highlight-row">
            <div className="col-feature">Setup Time</div>
            <div className="col-competitor">3-6 Months</div>
            <div className="col-us"><span className="check">Instant</span></div>
          </div>

          <div className="compare-row">
            <div className="col-feature">Inventory Accuracy</div>
            <div className="col-competitor">~70%</div>
            <div className="col-us"><span className="check">99.9%</span></div>
          </div>

          <div className="compare-row highlight-row">
            <div className="col-feature">Mobile Access</div>
            <div className="col-competitor"><i className="fas fa-times cross"></i></div>
            <div className="col-us"><i className="fas fa-check check"></i></div>
          </div>

          <div className="compare-row">
            <div className="col-feature">Cost</div>
            <div className="col-competitor">High CapEx</div>
            <div className="col-us"><span className="check">Simple SaaS</span></div>
          </div>
        </div>
      </section >

      {/* ================= FOOTER ================= */}
      < footer className="footer" >
        <div className="footer-inner">
          <div className="footer-brand">
            <h4>InventoryPro</h4>
            <p>
              Empowering retail chains with next-generation management tools.
              Built for speed, security, and scale.
            </p>
          </div>

          <div className="footer-links">
            <h5>Product</h5>
            <ul>
              <li><a href="#">Features</a></li>
              <li><a href="#">Security</a></li>
              <li><a href="#">Enterprise</a></li>
              <li><a href="#">Changelog</a></li>
            </ul>
          </div>

          <div className="footer-links">
            <h5>Company</h5>
            <ul>
              <li><a href="#">About</a></li>
              <li><a href="#">Careers</a></li>
              <li><a href="#">Blog</a></li>
              <li><a href="#">Contact</a></li>
            </ul>
          </div>

          <div className="footer-links">
            <h5>Legal</h5>
            <ul>
              <li><a href="#">Privacy</a></li>
              <li><a href="#">Terms</a></li>
              <li><a href="#">Status</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          &copy; 2025 InventoryPro Inc. All rights reserved.
        </div>
      </footer >
    </>
  );
}
