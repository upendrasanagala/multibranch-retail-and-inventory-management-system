import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../services/authService";
import "../styles/auth.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const navigate = useNavigate();

  /* ================= LOGIN ================= */
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const result = await login(email, password);

      if (!result.success) {
        setError(result.error || "Invalid email or password.");
        setLoading(false);
        return;
      }

      const user = result.user;

      if (user.must_reset_password) {
        navigate("/reset-password", { state: { email: email } });
        return;
      }

      if (user.role === "staff") navigate("/staff");
      else if (user.role === "manager") navigate("/manager");
      else navigate("/admin");

    } catch (err) {
      setError("Connection error. Please check if the server is running.");
      setLoading(false);
    }
  };

  return (
    <div className="premium-login-page">
      <div className="login-mesh-bg"></div>

      <div className="login-grid">
        {/* ====== LEFT PANEL ====== */}
        <div className="login-left">
          <div className="brand-mark">
            <i className="fas fa-layer-group"></i>
            <span>InventoryPro</span>
            <span className="v-tag">v2.0</span>
          </div>

          <h1>AI-Powered Multi-Branch Retail Inventory and Sales Management System</h1>
          <p>
            The master control for your multi-branch empire.
            Experience zero-latency management from any device.
          </p>

          <div className="feature-pills">
            <div className="pill">
              <i className="fas fa-shield-alt"></i>
              <div>
                <strong>Enterprise Grade</strong>
                <span>End-to-end encryption active</span>
              </div>
            </div>
            <div className="pill">
              <i className="fas fa-bolt"></i>
              <div>
                <strong>Zero Latency</strong>
                <span>Real-time global sync</span>
              </div>
            </div>
            <div className="pill">
              <i className="fas fa-code-branch"></i>
              <div>
                <strong>Multi-Branch</strong>
                <span>Unlimited branch support</span>
              </div>
            </div>
          </div>
        </div>

        {/* ====== RIGHT PANEL (CARD) ====== */}
        <div className="login-right">
          <div className="login-card">
            <Link to="/" className="back-link">
              <i className="fas fa-arrow-left"></i> Return to Platform
            </Link>

            <div className="card-header">
              <h2>Welcome Back</h2>
              <p>Sign in to your authorized account</p>
            </div>

            <form onSubmit={handleLogin}>
              <div className="float-field">
                <input
                  type="email"
                  id="login-email"
                  placeholder=" "
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
                <label htmlFor="login-email">Email Address</label>
              </div>

              <div className="float-field">
                <input
                  type={showPass ? "text" : "password"}
                  id="login-pass"
                  placeholder=" "
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
                <label htmlFor="login-pass">Password</label>
                <span className="eye-toggle" onClick={() => setShowPass(!showPass)}>
                  <i className={`fas fa-eye${showPass ? '-slash' : ''}`}></i>
                </span>
              </div>

              <div className="form-meta">
                <Link to="/reset-password">Forgot Password?</Link>
              </div>

              <button className="login-btn" disabled={loading}>
                {loading ? (
                  <><i className="fas fa-circle-notch fa-spin"></i> Authenticating...</>
                ) : (
                  <>Enter Dashboard <i className="fas fa-arrow-right"></i></>
                )}
              </button>

              {error && (
                <div className="login-error">
                  <i className="fas fa-exclamation-triangle"></i>
                  {error}
                </div>
              )}
            </form>

            <div className="quick-start">
              <div className="qs-label">
                <i className="fas fa-key"></i> Quick Access (Dev)
              </div>
              <div className="qs-row">
                <code>admin@retail.com</code>
                <span className="qs-sep">|</span>
                <code>Admin@123</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
