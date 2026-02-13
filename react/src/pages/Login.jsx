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

    /* ===== BASIC VALIDATION ===== */
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
      /* ===== CALL BACKEND API ===== */
      const result = await login(email, password);

      if (!result.success) {
        setError(result.error || "Invalid email or password.");
        setLoading(false);
        return;
      }

      /* ===== LOGIN SUCCESS - REDIRECT BASED ON ROLE ===== */
      const user = result.user;

      /* If must reset password, redirect to reset page */
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
    <div className="auth-wrapper">

      <div className="auth-info">
        <h1>Welcome Back</h1>
        <p>
          Login to manage inventory, sales,
          and branch operations.
        </p>

        <ul className="info-points">
          <li>🔒 Secure login</li>
          <li>📊 Live analytics</li>
          <li>🧭 Role based access</li>
        </ul>
      </div>

      <div className="auth-card">
        <Link to="/" style={{ display: 'block', marginBottom: '15px', color: '#64748b', textDecoration: 'none', fontSize: '14px' }}>
          ← Back to Home
        </Link>
        <h2>Retail System Login</h2>
        <p className="subtitle">Access your dashboard</p>

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="input-group" style={{ position: 'relative' }}>
            <input
              type={showPass ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={loading}
            />
            <span onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', fontSize: '16px', userSelect: 'none' }}>{showPass ? '🙈' : '👁️'}</span>
          </div>

          <button className="primary-btn" disabled={loading}>
            {loading ? "Signing In..." : "Sign In"}
          </button>

          {error && <p className="error">{error}</p>}
        </form>

        <div className="auth-links">
          <Link to="/reset-password">Forgot Password?</Link>
        </div>

        <div style={{ marginTop: '25px', padding: '12px', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.1)', borderRadius: '10px', fontSize: '12px', textAlign: 'center' }}>
          <p style={{ color: '#3b82f6', fontWeight: 'bold', marginBottom: '4px' }}>Default Admin Access</p>
          <code style={{ fontSize: '11px', color: '#1e293b' }}>admin@retail.com / Admin@123</code>
        </div>

      </div>
    </div>
  );
}
