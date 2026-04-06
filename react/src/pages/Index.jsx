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

    // SECURITY: If the user reaches the home screen, clear the session
    localStorage.removeItem("loggedInUser");
    localStorage.removeItem("token");

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
      question: "How does the AI Demand Forecasting work?",
      answer: "Our AI engine analyzes your historical sales velocity, seasonal trends, and local events to predict stockouts 7 days in advance, suggesting optimal reorder quantities."
    },
    {
      question: "Can I transfer stock between branches?",
      answer: "Yes, our 'Inter-Branch Transfer' (IBT) feature allows you to move stock between locations with one click, complete with digital transit tracking."
    },
    {
      question: "What is Sales Velocity AI?",
      answer: "It's a real-time monitor that tracks terminal speed and transaction volume to help managers optimize staff shifts and detect peak shopping hours before they become bottlenecks."
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
      question: "Is there built-in fraud detection?",
      answer: "Yes, our AI 'Smart Reconciliation' engine audits payment logs and terminal history to flag discrepancies and unusual transaction patterns instantly."
    },
    {
      question: "Can I use it on mobile devices?",
      answer: "Absolutely. InventoryPro is a progressive web platform designed to work seamlessly on tablets, smartphones, and desktop computers."
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
          <div className="badge-new" style={{ display: 'inline-block', padding: '4px 12px', background: '#f1f5f9', borderRadius: '100px', fontSize: '11px', fontWeight: 800, color: '#4f46e5', marginBottom: '20px' }}>
            <span>LIVE</span> Enterprise Network Status
          </div>
          <h1>Intelligence at <span className="grad-text">Scale.</span></h1>
          <p className="subheadline">
            Harness the power of autonomous AI to synchronize every branch, predict every sale, and lead every market. Innovation built for the next generation of retail.
          </p>

          <div className="btn-group">
            <a href="/login" style={{ background: '#4f46e5', color: 'white', padding: '16px 40px', borderRadius: '8px', fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>Launch Console</a>
          </div>
        </div>

        <div className="branch-grid">
          {[
            { id: 'BH-01', name: 'Flagship Hub', loc: 'Downtown Metro', rev: '₹1,50,000+', stock: '12,400', status: 'online' },
            { id: 'BH-02', name: 'Coastal Plaza', loc: 'West Bay District', rev: '₹85,000+', stock: '4,150', status: 'online' },
            { id: 'BH-03', name: 'Tech Park Annex', loc: 'Cyber Hills', rev: '₹62,000+', stock: '6,800', status: 'online' }
          ].map((branch, i) => (
            <div key={branch.id} className="branch-card" style={{ animationDelay: `${i * 0.15}s` }}>
              <div className="status-indicator">
                <span className={`dot-pulse ${branch.status}`}></span>
                {branch.status}
              </div>
              <div className="branch-info">
                <h3 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px 0' }}>{branch.name}</h3>
                <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}><i className="fas fa-map-marker-alt" style={{ marginRight: '6px' }}></i>{branch.loc}</p>
              </div>
              <div className="branch-stats" style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
                <div className="b-stat">
                  <span className="label" style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Daily Rev</span>
                  <span className="value" style={{ display: 'block', fontSize: '18px', fontWeight: 700 }}>{branch.rev}</span>
                </div>
                <div className="b-stat">
                  <span className="label" style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Total Stock</span>
                  <span className="value" style={{ display: 'block', fontSize: '18px', fontWeight: 700 }}>{branch.stock}</span>
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

      {/* ================= AI INTELLIGENCE CORE ================= */}
      <section className="ai-core-section">
        <div className="section-head">
          <div className="ai-badge">NEURAL CORE v2.0</div>
          <h2>Autonomous Intelligence.</h2>
          <p>
            Experience the next generation of retail management. Our proprietary AI engine
            analyzes your data in real-time to optimize every branch autonomously.
          </p>
        </div>

        <div className="ai-core-grid">
          <div className="ai-core-card">
            <div className="ai-icon-box"><i className="fas fa-brain"></i></div>
            <h3>Predictive Demand</h3>
            <p>Our neural networks analyze 50+ variables—from seasonal trends to local velocity—to predict stockouts 7 days in advance.</p>
          </div>
          <div className="ai-core-card">
            <div className="ai-icon-box"><i className="fas fa-bolt"></i></div>
            <h3>Sales Velocity AI</h3>
            <p>Real-time terminal monitoring identifies checkout bottlenecks and optimizes staff scheduling to maximize transaction volume.</p>
          </div>
          <div className="ai-core-card">
            <div className="ai-icon-box"><i className="fas fa-shield-virus"></i></div>
            <h3>Smart Reconciliation</h3>
            <p>Autonomous auditing of payment logs and terminal history detects transaction anomalies and flags potential fraud instantly.</p>
          </div>
        </div>
      </section>

      {/* ================= FEATURES SECTION ================= */}
      <section className="features-section" id="features">
        <div className="section-head">
          <h2>Standard Enterprise Features.</h2>
          <p>The foundation of your retail empire, built for speed and infinite scale.</p>
        </div>

        <div className="bento-grid">
          <div className="bento-card large">
            <div className="bento-icon">
              <i className="fas fa-satellite-dish"></i>
            </div>
            <h3>Real-Time Synchronization</h3>
            <p>
              Changes made in one branch reflect instantly across your entire network.
              Never oversell or lose track of stock again with zero-latency global sync.
            </p>
          </div>

          <div className="bento-card">
            <div className="bento-icon">
              <i className="fas fa-qrcode"></i>
            </div>
            <h3>Branch-Specific QR</h3>
            <p>Generate unique UPI codes for instant, error-free digital payments at every terminal.</p>
          </div>

          <div className="bento-card">
            <div className="bento-icon">
               <i className="fas fa-server"></i>
            </div>
            <h3>Offline Resilience</h3>
            <p>Continue making sales during internet outages; data automatically syncs when the connection is restored.</p>
          </div>

          <div className="bento-card large">
            <div className="bento-icon">
              <i className="fas fa-users-cog"></i>
            </div>
            <h3>Role-Based Permissions</h3>
            <p>
              Define granular access for Admins, Managers, and Staff. Every action is logged and auditable in the global console.
            </p>
          </div>
        </div>
      </section>

      {/* ================= COMPARISON TABLE ================= */}
      <section className="comparison-section">
        <div className="section-head">
          <h2>Why industry leaders choose InventoryPro.</h2>
          <p>See how we stack up against legacy ERP systems.</p>
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
            <div className="col-feature">AI Forecasting</div>
            <div className="col-competitor">Manual</div>
            <div className="col-us"><span className="check">Autonomous</span></div>
          </div>

          <div className="compare-row">
            <div className="col-feature">Inventory Accuracy</div>
            <div className="col-competitor">~70%</div>
            <div className="col-us"><span className="check">99.9%</span></div>
          </div>

          <div className="compare-row highlight-row">
            <div className="col-feature">Setup Time</div>
            <div className="col-competitor">3-6 Months</div>
            <div className="col-us"><span className="check">Instant</span></div>
          </div>

          <div className="compare-row">
            <div className="col-feature">Mobile Support</div>
            <div className="col-competitor"><i className="fas fa-times cross"></i></div>
            <div className="col-us"><i className="fas fa-check check"></i></div>
          </div>
        </div>
      </section >

      {/* ================= FAQ SECTION ================= */}
      <section className="faq-section" id="faq">
        <div className="section-head">
          <h2>Frequently Asked Questions</h2>
          <p>Everything you need to know about your new intelligent retail empire.</p>
        </div>

        <div className="faq-container">
          {faqData.map((item, index) => (
            <div
              key={index}
              className={`faq-item ${activeIndex === index ? 'active' : ''}`}
            >
              <div className="faq-question" onClick={() => toggleFAQ(index)}>
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
      <footer className="footer">
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
              <li><a href="/contact">Contact Us</a></li>
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
      </footer>
    </>
  );
}
