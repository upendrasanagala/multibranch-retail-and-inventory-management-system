import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../services/authService";
import api from "../services/api";
import "../styles/auth.css";

export default function Register() {
  const navigate = useNavigate();

  const [branches, setBranches] = useState([]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [errors, setErrors] = useState({});
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    mobile: "",
    password: "",
    confirmPassword: "", // frontend-only
    role: "",
    branch: "", // branch_id
    address: ""
  });

  /* ================= LOAD BRANCHES ================= */
  useEffect(() => {
    const loadBranches = async () => {
      try {
        const res = await api.branches.getAll();
        setBranches(res.branches || []);
      } catch (err) {
        console.error("Failed to load branches:", err);
        setBranches([]);
      }
    };
    loadBranches();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value
    });
    setErrors({ ...errors, [e.target.id]: "" });
    setMessage("");
  };

  const validate = () => {
    const err = {};

    if (!formData.firstName.trim()) err.firstName = "Required";
    if (!formData.lastName.trim()) err.lastName = "Required";
    if (!formData.email) err.email = "Required";
    if (!formData.mobile) {
      err.mobile = "Required";
    } else if (!/^\d{10}$/.test(formData.mobile)) {
      err.mobile = "Mobile number must be exactly 10 digits";
    }
    if (!formData.password) err.password = "Required";
    if (!formData.confirmPassword) err.confirmPassword = "Required";
    if (!formData.role) err.role = "Required";
    if (!formData.branch) err.branch = "Required";
    if (!formData.address.trim()) err.address = "Required";

    if (formData.password !== formData.confirmPassword) {
      err.confirmPassword = "Passwords do not match";
    }

    return err;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const err = validate();
    setErrors(err);

    if (Object.keys(err).length > 0) {
      setMessage("Please fix the highlighted errors.");
      setMessageType("error");
      return;
    }

    setLoading(true);

    try {
      /* ===== CLEAN PAYLOAD (NO confirmPassword) ===== */
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        mobile: formData.mobile,
        password: formData.password,
        role: formData.role,
        branch_id: formData.branch,
        address: formData.address
      };

      const result = await register(payload);

      if (result.success) {
        setMessage(
          result.message ||
          "Registration successful. Please wait for admin approval."
        );
        setMessageType("success");

        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          mobile: "",
          password: "",
          confirmPassword: "",
          role: "",
          branch: "",
          address: ""
        });

        setTimeout(() => navigate("/login"), 2000);
      } else {
        setMessage(result.error || "Registration failed.");
        setMessageType("error");
      }
    } catch (err) {
      setMessage("Server connection failed.");
      setMessageType("error");
    }

    setLoading(false);
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-info">
        <h1>Join the Enterprise</h1>
        <p>
          Secure retail management for multi-branch operations.
        </p>

        <div style={{ marginTop: '30px', color: '#e2e8f0', fontSize: '14px', lineHeight: '1.6' }}>
          <h3 style={{ color: 'white', marginBottom: '10px' }}>How it Works</h3>
          <p style={{ marginBottom: '20px' }}>
            Our centralized system connects all your retail branches. Managers track inventory and sales in real-time,
            while granular permissions ensure data security.
          </p>

          <h3 style={{ color: 'white', marginBottom: '10px' }}>Roles & Access</h3>
          <ul style={{ listStyle: 'none', padding: 0, marginBottom: '20px' }}>
            <li style={{ marginBottom: '8px' }}>
              <strong>👑 Admin:</strong> Full systematic control (Pre-configured).
            </li>
            <li style={{ marginBottom: '8px' }}>
              <strong>👔 Manager:</strong> Register here. Manage branch stock & reports.
              <br /><small>(Requires Approval)</small>
            </li>
            <li style={{ marginBottom: '8px' }}>
              <strong>👤 Staff:</strong> Created internally by Managers. (POS access only).
            </li>
          </ul>

          <div style={{ background: 'rgba(255,255,255,0.1)', padding: '15px', borderRadius: '8px', borderLeft: '3px solid #6366f1' }}>
            <strong>🔒 Private Network:</strong> This is a restricted enterprise system.
            All new manager registrations must be verified and approved by an Administrator before login is enabled.
          </div>
        </div>
      </div>

      <div className="auth-card">
        <Link to="/" style={{ display: 'block', marginBottom: '15px', color: '#64748b', textDecoration: 'none', fontSize: '14px' }}>
          ← Back to Home
        </Link>
        <h2>Employee Registration</h2>
        <p className="subtitle">Submit details for admin verification</p>

        <form onSubmit={handleSubmit}>
          <div className="two-col">
            <input
              id="firstName"
              placeholder="First Name"
              value={formData.firstName}
              onChange={handleChange}
              disabled={loading}
            />

            <input
              id="lastName"
              placeholder="Last Name"
              value={formData.lastName}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          <input
            id="email"
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            disabled={loading}
          />

          <input
            id="mobile"
            placeholder="Mobile"
            value={formData.mobile}
            onChange={handleChange}
            disabled={loading}
          />

          <div className="two-col">
            <div className="password-box">
              <input
                type={showPass ? "text" : "password"}
                id="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
              />
              <span onClick={() => setShowPass(!showPass)}>
                {showPass ? "🙈" : "👁️"}
              </span>
            </div>

            <div className="password-box">
              <input
                type={showConfirm ? "text" : "password"}
                id="confirmPassword"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={loading}
              />
              <span onClick={() => setShowConfirm(!showConfirm)}>
                {showConfirm ? "🙈" : "👁️"}
              </span>
            </div>
          </div>

          <div className="two-col">
            <select
              id="role"
              value={formData.role}
              onChange={handleChange}
              disabled={loading}
            >
              <option value="">Select Role</option>
              {/* Staff role removed as per request */}
              <option value="manager">Manager</option>
            </select>

            <select
              id="branch"
              value={formData.branch}
              onChange={handleChange}
              disabled={loading}
            >
              <option value="">Select Branch</option>
              {branches.map((branch) => (
                <option key={branch.branch_id} value={branch.branch_id}>
                  {branch.name} — {branch.city || "N/A"}
                </option>
              ))}
            </select>
          </div>

          <textarea
            id="address"
            placeholder="Address"
            value={formData.address}
            onChange={handleChange}
            disabled={loading}
          />

          <button className="primary-btn" disabled={loading}>
            {loading ? "Submitting..." : "Submit Registration"}
          </button>

          {message && (
            <p className={messageType === "success" ? "success" : "error"}>
              {message}
            </p>
          )}
        </form>

        <div className="auth-links">
          <Link to="/login">Already have an account? Login</Link>
        </div>
      </div>
    </div>
  );
}
