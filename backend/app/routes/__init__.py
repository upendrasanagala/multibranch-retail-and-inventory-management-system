"""
Routes Package Initializer
All API Blueprints
"""

from flask import Blueprint

# Define all blueprints
auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")
branch_bp = Blueprint("branches", __name__, url_prefix="/api/branches")
category_bp = Blueprint("categories", __name__, url_prefix="/api/categories")
product_bp = Blueprint("products", __name__, url_prefix="/api/products")
inventory_bp = Blueprint("inventory", __name__, url_prefix="/api/inventory")
sales_bp = Blueprint("sales", __name__, url_prefix="/api/sales")
transfer_bp = Blueprint("transfers", __name__, url_prefix="/api/transfers")
admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")
manager_bp = Blueprint("manager", __name__, url_prefix="/api/manager")

# Import routes to register endpoints
from . import auth
from . import branches
from . import categories
from . import product
from . import inventory
from . import sales
from . import transfer
from . import admin
from . import manager
