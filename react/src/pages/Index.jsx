import { useEffect, useState } from "react";
import "../styles/home.css";

export default function Home() {

  const [activeIndex, setActiveIndex] = useState(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const faqData = [
    {
      question: "How many branches can I manage?",
      answer: "InventoryPro Enterprise supports unlimited branches. You can scale your retail chain from two locations to hundreds without any performance degradation."
    },
    {
      question: "Is the synchronization truly real-time?",
      answer: "Yes. Our proprietary sync engine ensures that any stock change, sale, or transfer is updated across all connected devices in under 200 milliseconds."
    },
    {
      question: "Can I transfer stock between branches?",
      answer: "Yes, our 'Inter-Branch Transfer' (IBT) feature allows you to move stock between locations with one click, complete with digital transit tracking."
    },
    {
      question: "Does it support barcode scanning?",
      answer: "Absolutely. The system is compatible with standard USB/Bluetooth scanners and mobile camera scanning for fast checkouts and inventory audits."
    },
    {
      question: "What kind of reports can I generate?",
      answer: "You can generate detailed sales analytics, profit margin reports, tax summaries, and inventory turnover data for individual branches or the entire chain."
    },
    {
      question: "Can I manage employee permissions?",
      answer: "Yes. Use our granular Role-Based Access Control (RBAC) to define what Admin, Manager, and Staff users can see and modify in the system."
    },
    {
      question: "Does it work offline?",
      answer: "Yes, our 'Offline-First' architecture allows you to continue sales during internet outages. Data automatically syncs once the connection is restored."
    },
    {
      question: "Can I use it on mobile devices?",
      answer: "Absolutely. InventoryPro is a progressive web platform designed to work seamlessly on tablets, smartphones, and desktop computers."
    },
    {
      question: "How secure is my business data?",
      answer: "We use bank-grade AES-256 encryption for all data at rest and TLS 1.3 for data in transit. Your data is backed up hourly across multiple secure locations."
    },
    {
      question: "Do you offer staff training?",
      answer: "Yes, we provide comprehensive onboarding and 24/7 dedicated support for all Enterprise customers to ensure your team is proficient."
    }
  ];

  const toggleFAQ = (index) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <>
      <div className="bg-mesh"></div>

      {/* ================= NAVBAR ================= */}
      <header className={`navbar ${scrolled ? "scrolled" : ""}`}>
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

      {/* ================= UNIFIED HERO ================= */}
      <section className="unified-hero">
        <div style={{ animation: 'fadeInUp 0.8s ease-out forwards' }}>
          <div className="badge-new">
            <span>LIVE</span> Enterprise Network Status
          </div>
          <h1>Management at Scale.</h1>
          <p className="subheadline">
            One platform for every branch, every item, and every sale.
            Real-time synchronization across your entire retail empire.
          </p>

          <div className="btn-group">
            <a href="/login" className="btn-primary">Launch Console</a>
          </div>
        </div>

        <div className="branch-grid">
          {[
            { id: 'BH-01', name: 'Smart Store', loc: 'vijayawada Central', rev: '$12,450', stock: '8,240', status: 'online' },
            { id: 'BH-02', name: 'City Outlet', loc: 'Guntur West', rev: '$4,280', stock: '2,150', status: 'online' },
            { id: 'BH-03', name: 'Asia Hub', loc: 'Hyderabad Metro', rev: '$9,120', stock: '5,400', status: 'online' }
          ].map((branch, i) => (
            <div key={branch.id} className="branch-card" style={{ animationDelay: `${i * 0.15}s` }}>
              <div className="status-indicator">
                <span className={`dot-pulse ${branch.status}`}></span>
                {branch.status}
              </div>
              <div className="branch-info">
                <h3>{branch.name}</h3>
                <p><i className="fas fa-map-marker-alt" style={{ marginRight: '6px' }}></i>{branch.loc}</p>
              </div>
              <div className="branch-stats">
                <div className="b-stat">
                  <span className="label">Daily Rev</span>
                  <span className="value">{branch.rev}</span>
                </div>
                <div className="b-stat">
                  <span className="label">Total Stock</span>
                  <span className="value">{branch.stock}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

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

          <div className="bento-card">
            <div className="bento-icon">
              <i className="fas fa-qrcode"></i>
            </div>
            <h3>Dynamic UPI Integration</h3>
            <p>Generate branch-specific QR codes for instant, error-free digital payments at every POS.</p>
          </div>

          <div className="bento-card">
            <div className="bento-icon">
              <i className="fas fa-robot"></i>
            </div>
            <h3>Auto-Procurement</h3>
            <p>Intelligent restocking suggestions based on sales velocity and minimum stock thresholds.</p>
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

      {/* ================= FAQ SECTION ================= */}
      <section className="faq-section" id="faq">
        <div className="section-head">
          <h2>Got Questions? We have answers.</h2>
          <p>Everything you need to know about scaling your retail operations.</p>
        </div>

        <div className="faq-container">
          {faqData.map((item, index) => (
            <div
              key={index}
              className={`faq-item ${activeIndex === index ? 'active' : ''}`}
              onClick={() => toggleFAQ(index)}
            >
              <div className="faq-question">
                <span>{item.question}</span>
                <i className={`fas fa-chevron-${activeIndex === index ? 'up' : 'down'}`}></i>
              </div>
              <div className="faq-answer">
                <p>{item.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      < footer className="footer" >
        <div className="footer-inner">
          <div className="footer-brand">
            <h4>InventoryPro</h4>
            <p>
              Empowering retail chains with next-generation management tools.
              Built for speed, security, and scale.
            </p>
            <div className="footer-social">
              <a href="#"><i className="fab fa-twitter"></i></a>
              <a href="#"><i className="fab fa-linkedin"></i></a>
              <a href="https://github.com/ravi9506301/multibranch-retail-and-inventory-management-system"><i className="fab fa-github"></i></a>
              <a href="#"><i className="fab fa-instagram"></i></a>
            </div>
          </div>

          <div className="footer-links">
            <h5>Product</h5>
            <ul>
              <li><a href="#features">Features</a></li>
              <li><a href="#faq">FAQ</a></li>
              <li><a href="#">Security</a></li>
              <li><a href="#">Enterprise</a></li>
            </ul>
          </div>

          <div className="footer-links">
            <h5>Company</h5>
            <ul>
              <li><a href="#features">Our Mission</a></li>
              <li><a href="#">Team</a></li>
              <li><a href="#">Customers</a></li>
              <li><a href="#">Contact Us</a></li>
            </ul>
          </div>

          <div className="footer-links">
            <h5>Legal</h5>
            <ul>
              <li><a href="/privacy">Privacy Policy</a></li>
              <li><a href="/terms">Terms of Service</a></li>
              <li><a href="#">Cookie Policy</a></li>
              <li><a href="#">Security</a></li>
            </ul>
          </div>

          <div className="footer-newsletter">
            <h5>Stay Updated</h5>
            <p>Get the latest updates on inventory management.</p>
            <form className="newsletter-form" onSubmit={(e) => e.preventDefault()}>
              <input type="email" placeholder="Email address" required />
              <button type="submit">
                <i className="fas fa-paper-plane"></i>
              </button>
            </form>
          </div>
        </div>
        <div className="footer-bottom">
          &copy; 2025 InventoryPro Inc. All rights reserved.
        </div>
      </footer >
    </>
  );
}
