import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "../styles/auth.css";
import api from "../services/api";
import { useToast } from "../components/ToastContext";

export default function ResetPassword() {
    const { showToast } = useToast();
    const navigate = useNavigate();
    const location = useLocation();

    // If redirected from login with must_reset_password, pre-fill email
    const prefilledEmail = location.state?.email || "";

    const [step, setStep] = useState(1); // 1=email, 2=otp, 3=new password
    const [email, setEmail] = useState(prefilledEmail);
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPass, setShowPass] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    /* ===== STEP 1: Send OTP ===== */
    const handleSendOTP = async (e) => {
        e.preventDefault();
        setError("");
        setMessage("");

        if (!email) {
            setError("Please enter your email address.");
            return;
        }

        setLoading(true);
        try {
            const data = await api.auth.forgotPassword({ email });

            if (data) {
                showToast(data.message, "info");
                setMessage(data.message);
                setStep(2);
            } else {
                setError(data.message || "Failed to send OTP.");
            }
        } catch (err) {
            setError("Connection error. Please check if the server is running.");
        }
        setLoading(false);
    };

    /* ===== STEP 2: Verify OTP ===== */
    const handleVerifyOTP = (e) => {
        e.preventDefault();
        if (!otp || otp.length !== 6) {
            setError("Please enter the 6-digit OTP.");
            return;
        }
        setError("");
        setStep(3);
    };

    /* ===== STEP 3: Reset Password ===== */
    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError("");
        setMessage("");

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);
        try {
            const data = await api.auth.resetPassword({ email, otp, new_password: newPassword });

            if (data) {
                showToast("Password reset successfully!", "success");
                setMessage("🎉 Password reset successfully!");
                setError("");
                setTimeout(() => navigate("/login"), 2000);
            } else {
                setError(data.message || "Failed to reset password.");
            }
        } catch (err) {
            setError("Connection error. Please try again.");
        }
        setLoading(false);
    };

    /* ===== Step indicator ===== */
    const steps = ["Enter Email", "Verify OTP", "New Password"];

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

                    <h1>Secure Password<br />Recovery.</h1>
                    <p>
                        Reset your credentials securely with OTP-based
                        email verification. Your data stays protected.
                    </p>

                    <div className="feature-pills">
                        <div className="pill">
                            <i className="fas fa-envelope-open-text"></i>
                            <div>
                                <strong>Email OTP</strong>
                                <span>Verification code sent instantly</span>
                            </div>
                        </div>
                        <div className="pill">
                            <i className="fas fa-clock"></i>
                            <div>
                                <strong>10-Min Expiry</strong>
                                <span>Time-limited for security</span>
                            </div>
                        </div>
                        <div className="pill">
                            <i className="fas fa-lock"></i>
                            <div>
                                <strong>Strong Password</strong>
                                <span>Must meet all requirements</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ====== RIGHT PANEL (CARD) ====== */}
                <div className="login-right">
                    <div className="login-card">
                        <Link to="/login" className="back-link">
                            <i className="fas fa-arrow-left"></i> Back to Login
                        </Link>

                        <div className="card-header">
                            <h2>Password Reset</h2>
                            <p>Follow the steps to set a new password</p>
                        </div>

                        {/* Step Progress */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            gap: '6px',
                            marginBottom: '24px'
                        }}>
                            {steps.map((s, i) => (
                                <div key={i} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    fontSize: '12px',
                                    color: step >= i + 1 ? '#6366f1' : '#94a3b8',
                                    fontWeight: step === i + 1 ? 700 : 400
                                }}>
                                    <span style={{
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: step > i + 1 ? '#22c55e' : (step === i + 1 ? '#6366f1' : '#e2e8f0'),
                                        color: step >= i + 1 ? '#fff' : '#94a3b8',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        transition: 'all 0.3s ease'
                                    }}>
                                        {step > i + 1 ? <i className="fas fa-check" style={{ fontSize: '10px' }}></i> : i + 1}
                                    </span>
                                    <span className="step-label">{s}</span>
                                    {i < 2 && <i className="fas fa-chevron-right" style={{ fontSize: '8px', color: '#cbd5e1', margin: '0 2px' }}></i>}
                                </div>
                            ))}
                        </div>

                        {/* ===== Step 1: Email ===== */}
                        {step === 1 && (
                            <form onSubmit={handleSendOTP}>
                                <div className="float-field">
                                    <input
                                        type="email"
                                        id="reset-email"
                                        placeholder=" "
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        disabled={loading}
                                        required
                                    />
                                    <label htmlFor="reset-email">Email Address</label>
                                </div>

                                <button className="login-btn" disabled={loading}>
                                    {loading ? (
                                        <><i className="fas fa-circle-notch fa-spin"></i> Sending OTP...</>
                                    ) : (
                                        <>Send OTP <i className="fas fa-paper-plane"></i></>
                                    )}
                                </button>
                            </form>
                        )}

                        {/* ===== Step 2: OTP ===== */}
                        {step === 2 && (
                            <form onSubmit={handleVerifyOTP}>
                                <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', marginBottom: '16px' }}>
                                    Enter the 6-digit code sent to <b style={{ color: '#0f172a' }}>{email}</b>
                                </p>
                                <div className="float-field">
                                    <input
                                        type="text"
                                        id="reset-otp"
                                        placeholder=" "
                                        value={otp}
                                        onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        disabled={loading}
                                        maxLength={6}
                                        style={{ textAlign: 'center', letterSpacing: '10px', fontSize: '22px', fontWeight: 800 }}
                                        autoFocus
                                    />
                                    <label htmlFor="reset-otp">OTP Code</label>
                                </div>

                                <button className="login-btn" disabled={loading || otp.length !== 6}>
                                    Verify OTP <i className="fas fa-arrow-right"></i>
                                </button>

                                <p style={{ fontSize: '12px', color: '#64748b', marginTop: '14px', textAlign: 'center' }}>
                                    Didn't receive? <span style={{ color: '#6366f1', cursor: 'pointer', fontWeight: 600 }} onClick={() => { setStep(1); setOtp(''); }}>Resend OTP</span>
                                </p>
                            </form>
                        )}

                        {/* ===== Step 3: New Password ===== */}
                        {step === 3 && (
                            <form onSubmit={handleResetPassword}>
                                <div className="float-field">
                                    <input
                                        type={showPass ? "text" : "password"}
                                        id="reset-new-pass"
                                        placeholder=" "
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        disabled={loading}
                                        required
                                    />
                                    <label htmlFor="reset-new-pass">New Password</label>
                                    <span className="eye-toggle" onClick={() => setShowPass(!showPass)}>
                                        <i className={`fas fa-eye${showPass ? '-slash' : ''}`}></i>
                                    </span>
                                </div>

                                {/* Password Requirements */}
                                <div style={{
                                    background: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '12px',
                                    padding: '14px 16px',
                                    marginBottom: '16px',
                                    fontSize: '12px'
                                }}>
                                    <p style={{ fontWeight: 700, color: '#334155', marginBottom: '8px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Password Requirements</p>
                                    {[
                                        { label: 'At least 8 characters', met: newPassword.length >= 8 },
                                        { label: 'One uppercase letter (A-Z)', met: /[A-Z]/.test(newPassword) },
                                        { label: 'One lowercase letter (a-z)', met: /[a-z]/.test(newPassword) },
                                        { label: 'One number (0-9)', met: /[0-9]/.test(newPassword) },
                                        { label: 'One special symbol (!@#$%...)', met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword) },
                                    ].map((req, i) => (
                                        <div key={i} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            marginBottom: '3px',
                                            color: newPassword ? (req.met ? '#16a34a' : '#dc2626') : '#94a3b8',
                                            transition: 'color 0.2s'
                                        }}>
                                            <i className={`fas ${newPassword ? (req.met ? 'fa-check-circle' : 'fa-times-circle') : 'fa-circle'}`} style={{ fontSize: '11px' }}></i>
                                            {req.label}
                                        </div>
                                    ))}
                                </div>

                                <div className="float-field">
                                    <input
                                        type={showConfirm ? "text" : "password"}
                                        id="reset-confirm-pass"
                                        placeholder=" "
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        disabled={loading}
                                        required
                                    />
                                    <label htmlFor="reset-confirm-pass">Confirm Password</label>
                                    <span className="eye-toggle" onClick={() => setShowConfirm(!showConfirm)}>
                                        <i className={`fas fa-eye${showConfirm ? '-slash' : ''}`}></i>
                                    </span>
                                </div>

                                {confirmPassword && newPassword !== confirmPassword && (
                                    <div className="login-error" style={{ marginBottom: '12px' }}>
                                        <i className="fas fa-exclamation-triangle"></i>
                                        Passwords do not match
                                    </div>
                                )}

                                <button className="login-btn" disabled={loading || !(
                                    newPassword.length >= 8 &&
                                    /[A-Z]/.test(newPassword) &&
                                    /[a-z]/.test(newPassword) &&
                                    /[0-9]/.test(newPassword) &&
                                    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword) &&
                                    newPassword === confirmPassword
                                )}>
                                    {loading ? (
                                        <><i className="fas fa-circle-notch fa-spin"></i> Resetting...</>
                                    ) : (
                                        <>Reset Password <i className="fas fa-shield-alt"></i></>
                                    )}
                                </button>
                            </form>
                        )}

                        {/* Messages */}
                        {message && (
                            <div style={{
                                background: '#f0fdf4', border: '1px solid #bbf7d0',
                                borderRadius: '10px', padding: '10px 14px',
                                color: '#15803d', fontSize: '13px', fontWeight: 600,
                                textAlign: 'center', marginTop: '16px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                            }}>
                                <i className="fas fa-check-circle"></i> {message}
                            </div>
                        )}
                        {error && (
                            <div className="login-error" style={{ marginTop: '16px' }}>
                                <i className="fas fa-exclamation-triangle"></i> {error}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
