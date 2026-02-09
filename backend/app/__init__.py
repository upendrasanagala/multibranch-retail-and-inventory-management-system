"""
Application Factory
Initializes Flask app, extensions, blueprints, and models
"""

from flask import Flask
from .config import Config
from .extensions import db, jwt, cors, migrate


def create_app():
    app = Flask(__name__)

    # Load configuration
    app.config.from_object(Config)

    # -----------------------------
    # Initialize Extensions
    # -----------------------------
    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)

    # ✅ Proper CORS Configuration
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": "*"}},
        supports_credentials=True
    )

    # -----------------------------
    # Register Blueprints
    # -----------------------------
    from app.routes.auth import auth_bp
    app.register_blueprint(auth_bp)
    from app.routes.branches import branch_bp
    app.register_blueprint(branch_bp)


    # -----------------------------
    # Import Models (Required for migrations)
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
        InventoryAdjustment
    )

    # -----------------------------
    # Health Check Route
    # -----------------------------
    @app.route("/")
    def health_check():
        return {"status": "Backend running successfully"}, 200

    return app
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

    # -----------------------------
    # Enable CORS (CRITICAL FIX)
    # -----------------------------
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": "*"}},
        supports_credentials=True
    )

    # -----------------------------
    # Register Blueprints
    # -----------------------------
    from app.routes.auth import auth_bp
    from app.routes.branches import branch_bp
    from app.routes.products import product_bp
    from app.routes.categories import category_bp
    from app.routes.inventory import inventory_bp
    from app.routes.sales import sales_bp
    from app.routes.transfers import transfer_bp
    from app.routes.admin import admin_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(branch_bp, url_prefix="/api/branches")
    app.register_blueprint(product_bp, url_prefix="/api/products")
    app.register_blueprint(category_bp, url_prefix="/api/categories")
    app.register_blueprint(inventory_bp, url_prefix="/api/inventory")
    app.register_blueprint(sales_bp, url_prefix="/api/sales")
    app.register_blueprint(transfer_bp, url_prefix="/api/transfers")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")

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
        InventoryAdjustment
    )

    # -----------------------------
    # Health Check Route
    # -----------------------------
    @app.route("/")
    def health_check():
        return {"status": "Backend running successfully"}, 200

    return app
