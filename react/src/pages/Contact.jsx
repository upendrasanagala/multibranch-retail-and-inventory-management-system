import { useState } from "react";
import "../styles/home.css";
import "../styles/contact.css";
import api from "../services/api";

export default function Contact() {
    const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
    const [submitted, setSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrorMsg("");

        try {
            await api.contact.submit(form);
            setSubmitted(true);
            setForm({ name: "", email: "", subject: "", message: "" });
            setTimeout(() => setSubmitted(false), 5000);
        } catch (error) {
            setErrorMsg(error.response?.data?.message || error.message || "Failed to send message. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="legal-page-wrapper">
            <div className="bg-mesh"></div>

            {/* ─── NAVBAR ─── */}
            <header className="navbar">
                <div className="nav-left">
                    <div className="logo" onClick={() => (window.location.href = "/")}>
                        <i className="fas fa-layer-group"></i>
                        InventoryPro
                    </div>
                </div>
                <nav className="nav-right">
                    <a href="/" className="nav-cta">Back to Home</a>
                </nav>
            </header>

            {/* ─── CONTACT SECTION ─── */}
            <main className="contact-page">
                <div className="contact-header">
                    <span className="contact-badge">SUPPORT</span>
                    <h1>Get in Touch</h1>
                    <p>
                        Have questions about InventoryPro? Our enterprise support team
                        is here to help you with any queries.
                    </p>
                </div>

                <div className="contact-grid">
                    {/* ─── INFO CARDS ─── */}
                    <div className="contact-info">
                        <div className="contact-card" id="contact-email-card">
                            <div className="contact-card__icon">
                                <i className="fas fa-envelope"></i>
                            </div>
                            <div className="contact-card__body">
                                <h4>Email Us</h4>
                                <p>app.supportrequest@gmail.com</p>
                                <span>We reply within 24 hours</span>
                            </div>
                        </div>

                        <div className="contact-card" id="contact-phone-card">
                            <div className="contact-card__icon contact-card__icon--green">
                                <i className="fas fa-phone-alt"></i>
                            </div>
                            <div className="contact-card__body">
                                <h4>Call Us</h4>
                                <p>+91 9876 543 210</p>
                                <span>Mon – Sat, 9 AM – 6 PM IST</span>
                            </div>
                        </div>

                        <div className="contact-card" id="contact-location-card">
                            <div className="contact-card__icon contact-card__icon--amber">
                                <i className="fas fa-map-marker-alt"></i>
                            </div>
                            <div className="contact-card__body">
                                <h4>Visit Us</h4>
                                <p>Vijayawada, Andhra Pradesh</p>
                                <span>India — 520001</span>
                            </div>
                        </div>

                        <div className="contact-card" id="contact-hours-card">
                            <div className="contact-card__icon contact-card__icon--slate">
                                <i className="fas fa-clock"></i>
                            </div>
                            <div className="contact-card__body">
                                <h4>Business Hours</h4>
                                <p>Monday – Saturday</p>
                                <span>9:00 AM – 6:00 PM IST</span>
                            </div>
                        </div>
                    </div>

                    {/* ─── FORM ─── */}
                    <div className="contact-form-wrapper" id="contact-form-section">
                        {submitted ? (
                            <div className="contact-success">
                                <div className="contact-success__icon">
                                    <i className="fas fa-check-circle"></i>
                                </div>
                                <h3>Message Sent!</h3>
                                <p>Thank you for reaching out. Our team will get back to you within 24 hours.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="contact-form">
                                <h3>Send us a message</h3>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="contact-name">Full Name</label>
                                        <input
                                            id="contact-name"
                                            name="name"
                                            type="text"
                                            placeholder="Your full name"
                                            value={form.name}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="contact-email">Email Address</label>
                                        <input
                                            id="contact-email"
                                            name="email"
                                            type="email"
                                            placeholder="you@company.com"
                                            value={form.email}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="contact-subject">Subject</label>
                                    <select
                                        id="contact-subject"
                                        name="subject"
                                        value={form.subject}
                                        onChange={handleChange}
                                        required
                                    >
                                        <option value="">Select a topic</option>
                                        <option value="general">General Inquiry</option>
                                        <option value="technical">Technical Support</option>
                                        <option value="billing">Billing & Pricing</option>
                                        <option value="enterprise">Enterprise Plans</option>
                                        <option value="bug">Report a Bug</option>
                                        <option value="feature">Feature Request</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="contact-message">Message</label>
                                    <textarea
                                        id="contact-message"
                                        name="message"
                                        rows="5"
                                        placeholder="Describe your query in detail..."
                                        value={form.message}
                                        onChange={handleChange}
                                        required
                                    ></textarea>
                                </div>

                                {errorMsg && (
                                    <div style={{ color: '#dc2626', fontSize: '14px', marginBottom: '16px', background: '#fef2f2', padding: '10px', borderRadius: '8px', border: '1px solid #fee2e2' }}>
                                        {errorMsg}
                                    </div>
                                )}

                                <button type="submit" className="contact-submit" id="contact-submit-btn" disabled={isSubmitting} style={{ opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>
                                    {isSubmitting ? (
                                        <span><i className="fas fa-spinner fa-spin"></i> Sending...</span>
                                    ) : (
                                        <span><i className="fas fa-paper-plane"></i> Send Message</span>
                                    )}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </main>

            <footer className="footer-bottom" style={{ marginTop: "40px" }}>
                &copy; 2025 InventoryPro Inc. All rights reserved.
            </footer>
        </div>
    );
}
