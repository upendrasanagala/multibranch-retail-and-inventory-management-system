import React from "react";
import "../styles/home.css";

export default function Terms() {
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
                <h1>Terms of Service</h1>
                <p className="last-updated">Last Updated: October 2025</p>

                <section>
                    <h2>1. Acceptance of Terms</h2>
                    <p>
                        By accessing or using InventoryPro, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
                    </p>
                </section>

                <section>
                    <h2>2. Description of Service</h2>
                    <p>
                        InventoryPro provides a multi-branch retail and inventory management platform, including real-time synchronization, sales tracking, and staff management tools.
                    </p>
                </section>

                <section>
                    <h2>3. User Responsibilities</h2>
                    <p>
                        Users are responsible for maintaining the confidentiality of their login credentials and for all activities that occur under their account. You agree to use the system only for lawful business purposes.
                    </p>
                </section>

                <section>
                    <h2>4. Data Ownership</h2>
                    <p>
                        You retain all rights to the business data you upload to InventoryPro. We do not claim ownership of your inventory or sales data. However, you grant us a limited license to host and process this data as required to provide the service.
                    </p>
                </section>

                <section>
                    <h2>5. Limitation of Liability</h2>
                    <p>
                        To the maximum extent permitted by law, InventoryPro shall not be liable for any indirect, incidental, special, or consequential damages resulting from the use or inability to use the service.
                    </p>
                </section>

                <section>
                    <h2>6. Termination</h2>
                    <p>
                        We reserve the right to suspend or terminate your access to the service at our sole discretion, without notice, for conduct that we believe violates these Terms of Service.
                    </p>
                </section>

                <section>
                    <h2>7. Governing Law</h2>
                    <p>
                        These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which InventoryPro operates, without regard to its conflict of law provisions.
                    </p>
                </section>

                <section>
                    <h2>8. Updates to Terms</h2>
                    <p>
                        We may modify these terms at any time. Your continued use of the service following the posting of changes constitutes your acceptance of such changes.
                    </p>
                </section>
            </main>

            <footer className="footer-bottom" style={{ marginTop: '40px' }}>
                &copy; 2025 InventoryPro Inc. All rights reserved.
            </footer>
        </div>
    );
}
