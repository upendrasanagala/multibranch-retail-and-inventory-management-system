import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../services/authService";
import "../styles/auth.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

          <div className="input-group">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <button className="primary-btn" disabled={loading}>
            {loading ? "Signing In..." : "Sign In"}
          </button>

          {error && <p className="error">{error}</p>}
        </form>

        <div className="auth-links">
          <Link to="/register">Create new account</Link>
        </div>

        <div className="demo-credentials" style={{ marginTop: '20px', padding: '15px', background: '#f0f9ff', borderRadius: '8px', fontSize: '12px' }}>
          <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>Demo Credentials:</p>
          <p>Admin: admin@retail.com / Admin@123</p>
          <p>Manager: manager@retail.com / Manager@123</p>
          <p>Staff: staff@retail.com / Staff@123</p>
        </div>
      </div>
    </div>
  );
}
