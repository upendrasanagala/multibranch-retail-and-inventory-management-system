import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "../styles/auth.css";
import api from "../services/api";

export default function ResetPassword() {
    const navigate = useNavigate();
    const location = useLocation();

    // If redirected from login with must_reset_password, pre-fill email
    const prefilledEmail = location.state?.email || "";

    const [step, setStep] = useState(prefilledEmail ? 1 : 1); // 1=email, 2=otp, 3=new password
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
                alert(data.message); // Show OTP for testing
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

    /* ===== STEP 2+3: Verify OTP & Reset Password ===== */
    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError("");
        setMessage("");

        if (!otp || otp.length !== 6) {
            setError("Please enter the 6-digit OTP.");
            return;
        }

        if (step === 2) {
            // Move to step 3 (enter new password)
            setStep(3);
            setMessage("✅ Now set your new password.");
            return;
        }

        // Step 3: Submit new password — validate all requirements
        const hasMinLen = newPassword.length >= 8;
        const hasUpper = /[A-Z]/.test(newPassword);
        const hasLower = /[a-z]/.test(newPassword);
        const hasNumber = /[0-9]/.test(newPassword);
        const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);

        if (!hasMinLen || !hasUpper || !hasLower || !hasNumber || !hasSymbol) {
            setError("Password does not meet all requirements.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);
        try {
            const data = await api.auth.resetPassword({ email, otp, new_password: newPassword });

            if (data) {
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
        <div className="auth-wrapper">

            <div className="auth-info">
                <h1>Reset Password</h1>
                <p>
                    Securely reset your password using
                    email verification.
                </p>

                <ul className="info-points">
                    <li>📧 OTP sent to your email</li>
                    <li>🔒 10-minute expiry for security</li>
                    <li>✅ Set your own password</li>
                </ul>
            </div>

            <div className="auth-card">
                <h2>Password Reset</h2>

                {/* Step Progress */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '8px',
                    marginBottom: '20px'
                }}>
                    {steps.map((s, i) => (
                        <div key={i} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '12px',
                            color: step >= i + 1 ? '#3b82f6' : '#94a3b8',
                            fontWeight: step === i + 1 ? 700 : 400
                        }}>
                            <span style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: step > i + 1 ? '#22c55e' : (step === i + 1 ? '#3b82f6' : '#e2e8f0'),
                                color: step >= i + 1 ? '#fff' : '#94a3b8',
                                fontSize: '11px',
                                fontWeight: 700
                            }}>
                                {step > i + 1 ? '✓' : i + 1}
                            </span>
                            {s}
                            {i < 2 && <span style={{ color: '#cbd5e1', margin: '0 2px' }}>→</span>}
                        </div>
                    ))}
                </div>

                {/* Step 1: Email */}
                {step === 1 && (
                    <form onSubmit={handleSendOTP}>
                        <p className="subtitle">Enter your registered email to receive an OTP</p>
                        <div className="input-group">
                            <input
                                type="email"
                                placeholder="Email Address"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                disabled={loading}
                            />
                        </div>
                        <button className="primary-btn" disabled={loading}>
                            {loading ? "Sending OTP..." : "Send OTP"}
                        </button>
                    </form>
                )}

                {/* Step 2: OTP */}
                {step === 2 && (
                    <form onSubmit={handleResetPassword}>
                        <p className="subtitle">Enter the 6-digit OTP sent to <b>{email}</b></p>
                        <div className="input-group">
                            <input
                                type="text"
                                placeholder="Enter 6-digit OTP"
                                value={otp}
                                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                disabled={loading}
                                maxLength={6}
                                style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '20px', fontWeight: 700 }}
                            />
                        </div>
                        <button className="primary-btn" disabled={loading}>
                            Verify OTP
                        </button>
                        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '10px', textAlign: 'center' }}>
                            Didn't receive? <span style={{ color: '#3b82f6', cursor: 'pointer' }} onClick={() => { setStep(1); setOtp(''); }}>Resend OTP</span>
                        </p>
                    </form>
                )}

                {/* Step 3: New Password */}
                {step === 3 && (
                    <form onSubmit={handleResetPassword}>
                        <p className="subtitle">Set your new password</p>
                        <div className="input-group" style={{ position: 'relative' }}>
                            <input
                                type={showPass ? "text" : "password"}
                                placeholder="New Password"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                disabled={loading}
                            />
                            <span onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', fontSize: '16px', userSelect: 'none' }}>{showPass ? '🙈' : '👁️'}</span>
                        </div>

                        {/* Password Requirements Checklist */}
                        <div style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '10px',
                            padding: '12px 16px',
                            marginBottom: '14px',
                            fontSize: '13px'
                        }}>
                            <p style={{ fontWeight: 700, color: '#334155', marginBottom: '8px', fontSize: '12px' }}>Password Requirements:</p>
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
                                    gap: '6px',
                                    marginBottom: '4px',
                                    color: newPassword ? (req.met ? '#16a34a' : '#dc2626') : '#94a3b8',
                                    transition: 'color 0.2s'
                                }}>
                                    <span style={{ fontSize: '14px' }}>{newPassword ? (req.met ? '✅' : '❌') : '⚪'}</span>
                                    {req.label}
                                </div>
                            ))}
                        </div>

                        <div className="input-group" style={{ position: 'relative' }}>
                            <input
                                type={showConfirm ? "text" : "password"}
                                placeholder="Confirm Password"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                disabled={loading}
                            />
                            <span onClick={() => setShowConfirm(!showConfirm)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', fontSize: '16px', userSelect: 'none' }}>{showConfirm ? '🙈' : '👁️'}</span>
                        </div>
                        {confirmPassword && newPassword !== confirmPassword && (
                            <p style={{ color: '#dc2626', fontSize: '12px', marginBottom: '10px' }}>Passwords do not match</p>
                        )}
                        <button className="primary-btn" disabled={loading || !(
                            newPassword.length >= 8 &&
                            /[A-Z]/.test(newPassword) &&
                            /[a-z]/.test(newPassword) &&
                            /[0-9]/.test(newPassword) &&
                            /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword) &&
                            newPassword === confirmPassword
                        )}>
                            {loading ? "Resetting..." : "Reset Password"}
                        </button>
                    </form>
                )}

                {/* Messages */}
                {message && <p style={{ color: '#22c55e', textAlign: 'center', marginTop: '12px', fontSize: '14px' }}>{message}</p>}
                {error && <p className="error">{error}</p>}

                <div className="auth-links">
                    <Link to="/login">← Back to Login</Link>
                </div>
            </div>
        </div>
    );
}
