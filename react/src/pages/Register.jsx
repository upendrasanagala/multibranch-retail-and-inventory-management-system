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
    if (!formData.mobile) err.mobile = "Required";
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
        <h1>Create Your Account</h1>
        <p>Registration requires admin approval before login.</p>

        <ul className="info-points">
          <li>✔ Employee onboarding</li>
          <li>✔ Branch assignment</li>
          <li>✔ Role based access</li>
          <li>✔ Secure system</li>
        </ul>
      </div>

      <div className="auth-card">
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
              <option value="staff">Staff</option>
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
                <option key={branch.id} value={branch.id}>
                  {branch.name} — {branch.location || branch.city || "N/A"}
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
