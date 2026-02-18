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
        resources={r"/api/*": {"origins": "*"}},
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
        supplier_bp
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
        Supplier
    )

    # -----------------------------
    # Health Check Route
    # -----------------------------
    @app.route("/")
    def health_check():
        return {"status": "Backend running successfully"}, 200

    return app
