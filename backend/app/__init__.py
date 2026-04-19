"""
Application Factory
Initializes Flask app, extensions, blueprints, and models
"""

from flask import Flask
from .config import Config
from .extensions import db, jwt, cors, migrate


def create_app():
    app = Flask(__name__)

    # -----------------------------
    # Load Configuration
    # -----------------------------
    app.config.from_object(Config)

    # -----------------------------
    # Initialize Extensions
    # -----------------------------
    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)
    from .extensions import mail
    mail.init_app(app)

    # -----------------------------
    # Enable CORS
    # -----------------------------
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173"]}},
        supports_credentials=True
    )

    # -----------------------------
    # Register Blueprints
    # -----------------------------
    from app.routes import (
        auth_bp,
        branch_bp,
        category_bp,
        product_bp,
        inventory_bp,
        sales_bp,
        transfer_bp,
        admin_bp,
        supplier_bp,
        contact_bp
    )

    app.register_blueprint(auth_bp)
    app.register_blueprint(branch_bp)
    app.register_blueprint(category_bp)
    app.register_blueprint(product_bp)
    app.register_blueprint(inventory_bp)
    app.register_blueprint(sales_bp)
    app.register_blueprint(transfer_bp)
    app.register_blueprint(admin_bp)
    from app.routes.manager import manager_bp
    app.register_blueprint(manager_bp)
    app.register_blueprint(supplier_bp)
    app.register_blueprint(contact_bp)
    
    from app.routes.announcements import announcements_bp
    app.register_blueprint(announcements_bp)

    # -----------------------------
    # Import Models (For Migrations)
    # -----------------------------
    from app.models import (
        User,
        Branch,
        Category,
        Product,
        Inventory,
        SalesTransaction,
        TransactionItem,
        StockTransfer,
        InventoryAdjustment,
        Supplier,
        ContactMessage,
        Announcement
    )

    # -----------------------------
    # Configure Logging
    # -----------------------------
    import logging
    from logging.handlers import RotatingFileHandler
    import os

    if not os.path.exists('logs'):
        os.mkdir('logs')
    file_handler = RotatingFileHandler('logs/retail_app.log', maxBytes=10240, backupCount=10)
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
    ))
    file_handler.setLevel(logging.INFO)
    app.logger.addHandler(file_handler)
    app.logger.setLevel(logging.INFO)
    app.logger.info('Retail Management System Startup')

    # -----------------------------
    # Custom Error Handlers
    # -----------------------------
    from flask import jsonify

    @app.errorhandler(404)
    def not_found_error(error):
        return jsonify({"error": "Resource not found", "message": str(error)}), 404

    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        app.logger.error(f'Server Error: {error}')
        return jsonify({"error": "Internal server error", "message": "An unexpected error occurred"}), 500

    # -----------------------------
    # Health Check Route
    # -----------------------------
    @app.route("/")
    def health_check():
        return {"status": "Backend running successfully"}, 200

    return app
