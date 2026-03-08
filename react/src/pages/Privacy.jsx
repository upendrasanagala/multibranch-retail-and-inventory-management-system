import React from "react";
import "../styles/home.css";

export default function Privacy() {
    return (
        <div className="legal-page-wrapper">
            <div className="bg-mesh"></div>

            <header className="navbar">
                <div className="nav-left">
                    <div className="logo" onClick={() => window.location.href = "/"}>
                        <i className="fas fa-layer-group"></i>
                        InventoryPro
                    </div>
                </div>
                <nav className="nav-right">
                    <a href="/" className="nav-cta">Back to Home</a>
                </nav>
            </header>

            <main className="legal-content">
                <h1>Privacy Policy</h1>
                <p className="last-updated">Last Updated: October 2025</p>

                <section>
                    <h2>1. Introduction</h2>
                    <p>
                        InventoryPro ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our multi-branch retail and inventory management system.
                    </p>
                </section>

                <section>
                    <h2>2. Information We Collect</h2>
                    <h3>2.1 Personal Data</h3>
                    <p>
                        We collect personal information that you provide to us, such as your name, email address, phone number, and business details when you register for an account or contact support.
                    </p>
                    <h3>2.2 Usage Data</h3>
                    <p>
                        We automatically collect information about how you interact with our service, including IP addresses, browser types, and access times, to improve system performance and security.
                    </p>
                    <h3>2.3 Business Data</h3>
                    <p>
                        In the course of using the system, you may upload inventory data, sales records, and staff information. This data is handled with strict confidentiality and used solely for providing the service to you.
                    </p>
                </section>

                <section>
                    <h2>3. How We Use Your Information</h2>
                    <ul>
                        <li>To provide and maintain our Service.</li>
                        <li>To manage your account and provide customer support.</li>
                        <li>To improve our system analytics and branch synchronization features.</li>
                        <li>To ensure compliance with legal obligations and security protocols.</li>
                    </ul>
                </section>

                <section>
                    <h2>4. Data Security</h2>
                    <p>
                        We implement industry-standard security measures, including end-to-end encryption for sensitive data and regular security audits, to protect your business information from unauthorized access.
                    </p>
                </section>

                <section>
                    <h2>5. Your Rights</h2>
                    <p>
                        You have the right to access, update, or delete your personal information. If you wish to exercise these rights, please contact our administrative support team.
                    </p>
                </section>

                <section>
                    <h2>6. Changes to This Policy</h2>
                    <p>
                        We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.
                    </p>
                </section>

                <section>
                    <h2>7. Contact Us</h2>
                    <p>
                        If you have any questions about this Privacy Policy, please contact us at: <br />
                        <strong>Email:</strong> privacy@inventorypro.com
                    </p>
                </section>
            </main>

            <footer className="footer-bottom" style={{ marginTop: '40px' }}>
                &copy; 2025 InventoryPro Inc. All rights reserved.
            </footer>
        </div>
    );
}
