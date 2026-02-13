"""
Inventory Routes
Stock management with adjustments
"""

from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.extensions import db
from app.models.inventory import Inventory
from app.models.product import Product
from app.models.adjustment import InventoryAdjustment
from app.utils.decorators import roles_required
from app.routes import inventory_bp


# =============================
# Get Inventory (by branch)
# =============================
@inventory_bp.route("/", methods=["GET"])
@jwt_required()
def get_inventory():
    branch_id = request.args.get("branch_id", type=int)
    low_stock = request.args.get("low_stock", "false").lower() == "true"
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    
    from app.models.branch import Branch
    query = db.session.query(
        Inventory, Product, Branch
    ).join(
        Product, Inventory.product_id == Product.product_id
    ).join(
        Branch, Inventory.branch_id == Branch.branch_id
    )
    
    if branch_id:
        query = query.filter(Inventory.branch_id == branch_id)
    
    product_id = request.args.get("product_id", type=int)
    if product_id:
        query = query.filter(Inventory.product_id == product_id)
    
    if low_stock:
        query = query.filter(Inventory.quantity <= Inventory.min_threshold)
    
    paginated = query.paginate(page=page, per_page=per_page, error_out=False)
    
    items = []
    for inv, prod, branch in paginated.items:
        items.append({
            "inventory_id": inv.inventory_id,
            "product_id": inv.product_id,
            "product_name": prod.name,
            "sku": prod.sku,
            "branch_id": inv.branch_id,
            "branch_name": branch.name,
            "quantity": inv.quantity,
            "min_threshold": inv.min_threshold,
            "max_threshold": inv.max_threshold,
            "unit_price": prod.unit_price,
            "size": getattr(prod, 'size', None),
            "expiry_date": prod.expiry_date.isoformat() if getattr(prod, 'expiry_date', None) else None,
            "last_updated": inv.last_updated.isoformat() if inv.last_updated else None
        })
    
    return jsonify({
        "inventory": items,
        "total": paginated.total,
        "pages": paginated.pages,
        "current_page": page
    }), 200


# =============================
# Get Inventory by Branch (Frontend compatible)
# =============================
@inventory_bp.route("/branch/<int:branch_id>", methods=["GET"])
@jwt_required()
def get_inventory_by_branch(branch_id):
    query = db.session.query(
        Inventory, Product
    ).join(
        Product, Inventory.product_id == Product.product_id
    ).filter(Inventory.branch_id == branch_id)
    
    results = query.all()
    
    items = []
    for inv, prod in results:
        items.append({
            "inventory_id": inv.inventory_id,
            "product_id": inv.product_id,
            "product_name": prod.name,
            "sku": prod.sku,
            "barcode": prod.barcode,
            "branch_id": inv.branch_id,
            "quantity": inv.quantity,
            "min_threshold": inv.min_threshold,
            "max_threshold": inv.max_threshold,
            "unit_price": prod.unit_price,
            "size": getattr(prod, 'size', None),
            "expiry_date": prod.expiry_date.isoformat() if getattr(prod, 'expiry_date', None) else None,
            "last_updated": inv.last_updated.isoformat() if inv.last_updated else None
        })
    
    return jsonify({"inventory": items}), 200


# =============================
# Get Low Stock Items
# =============================
@inventory_bp.route("/low-stock", methods=["GET"])
@jwt_required()
def get_low_stock():
    branch_id = request.args.get("branch_id", type=int)
    
    query = db.session.query(
        Inventory, Product
    ).join(
        Product, Inventory.product_id == Product.product_id
    ).filter(Inventory.quantity <= Inventory.min_threshold)
    
    if branch_id:
        query = query.filter(Inventory.branch_id == branch_id)
    
    results = query.all()
    
    items = []
    for inv, prod in results:
        items.append({
            "inventory_id": inv.inventory_id,
            "product_id": inv.product_id,
            "product_name": prod.name,
            "sku": prod.sku,
            "branch_id": inv.branch_id,
            "quantity": inv.quantity,
            "min_threshold": inv.min_threshold,
            "unit_price": prod.unit_price
        })
    
    return jsonify({"low_stock_items": items, "count": len(items)}), 200


# =============================
# Get Single Inventory Item
# =============================
@inventory_bp.route("/<int:inventory_id>", methods=["GET"])
@jwt_required()
def get_inventory_item(inventory_id):
    inv = Inventory.query.get_or_404(inventory_id)
    prod = Product.query.get(inv.product_id)
    
    return jsonify({
        "inventory_id": inv.inventory_id,
        "product_id": inv.product_id,
        "product_name": prod.name if prod else None,
        "branch_id": inv.branch_id,
        "quantity": inv.quantity,
        "min_threshold": inv.min_threshold,
        "max_threshold": inv.max_threshold,
        "last_updated": inv.last_updated.isoformat() if inv.last_updated else None
    }), 200


# =============================
# Add Product to Branch Inventory
# =============================
@inventory_bp.route("/", methods=["POST"])
@jwt_required()
@roles_required("admin", "manager")
def add_inventory():
    data = request.get_json() or {}
    
    product_id = data.get("product_id")
    branch_id = data.get("branch_id")
    quantity = data.get("quantity", 0)
    
    if not product_id or not branch_id:
        return jsonify({"message": "product_id and branch_id are required"}), 400
    
    # Check if already exists
    existing = Inventory.query.filter_by(
        product_id=product_id, branch_id=branch_id
    ).first()
    
    if existing:
        return jsonify({"message": "Product already exists in this branch inventory"}), 409
    
    inventory = Inventory(
        product_id=product_id,
        branch_id=branch_id,
        quantity=quantity,
        min_threshold=data.get("min_threshold", 10),
        max_threshold=data.get("max_threshold")
    )
    
    db.session.add(inventory)
    db.session.commit()
    
    return jsonify({
        "message": "Inventory added successfully",
        "inventory_id": inventory.inventory_id
    }), 201


# =============================
# Update Inventory Quantity
# =============================
@inventory_bp.route("/<int:inventory_id>", methods=["PUT"])
@jwt_required()
@roles_required("admin", "manager", "staff")
def update_inventory(inventory_id):
    inventory = Inventory.query.get_or_404(inventory_id)
    data = request.get_json() or {}
    
    inventory.quantity = data.get("quantity", inventory.quantity)
    inventory.min_threshold = data.get("min_threshold", inventory.min_threshold)
    inventory.max_threshold = data.get("max_threshold", inventory.max_threshold)
    
    db.session.commit()
    
    return jsonify({"message": "Inventory updated successfully"}), 200


# =============================
# Make Inventory Adjustment
# =============================
@inventory_bp.route("/adjust", methods=["POST"])
@jwt_required()
@roles_required("admin", "manager", "staff")
def adjust_inventory():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    
    product_id = data.get("product_id")
    branch_id = data.get("branch_id")
    adjustment_type = data.get("adjustment_type")  # 'add', 'subtract', 'set'
    quantity = data.get("quantity")
    reason = data.get("reason")
    
    if not all([product_id, branch_id, adjustment_type, quantity is not None]):
        return jsonify({"message": "Missing required fields"}), 400
    
    # Find inventory record
    inventory = Inventory.query.filter_by(
        product_id=product_id, branch_id=branch_id
    ).first()
    
    if not inventory:
        return jsonify({"message": "Inventory record not found"}), 404
    
    # Apply adjustment
    old_quantity = inventory.quantity
    
    if adjustment_type == "add":
        inventory.quantity += quantity
    elif adjustment_type == "subtract":
        if inventory.quantity < quantity:
            return jsonify({"message": "Insufficient stock"}), 400
        inventory.quantity -= quantity
    elif adjustment_type == "set":
        inventory.quantity = quantity
    else:
        return jsonify({"message": "Invalid adjustment type"}), 400
    
    # Record the adjustment
    adjustment = InventoryAdjustment(
        product_id=product_id,
        branch_id=branch_id,
        adjustment_type=adjustment_type,
        quantity=quantity,
        reason=reason,
        adjusted_by=user_id
    )
    
    db.session.add(adjustment)
    db.session.commit()
    
    return jsonify({
        "message": "Adjustment recorded successfully",
        "old_quantity": old_quantity,
        "new_quantity": inventory.quantity
    }), 200


# =============================
# Get Adjustment History
# =============================
@inventory_bp.route("/adjustments", methods=["GET"])
@jwt_required()
def get_adjustments():
    branch_id = request.args.get("branch_id", type=int)
    product_id = request.args.get("product_id", type=int)
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    
    query = InventoryAdjustment.query
    
    if branch_id:
        query = query.filter(InventoryAdjustment.branch_id == branch_id)
    if product_id:
        query = query.filter(InventoryAdjustment.product_id == product_id)
    
    paginated = query.order_by(
        InventoryAdjustment.adjustment_date.desc()
    ).paginate(page=page, per_page=per_page, error_out=False)
    
    adjustments = []
    for adj in paginated.items:
        adjustments.append({
            "adjustment_id": adj.adjustment_id,
            "product_id": adj.product_id,
            "branch_id": adj.branch_id,
            "adjustment_type": adj.adjustment_type,
            "quantity": adj.quantity,
            "reason": adj.reason,
            "adjusted_by": adj.adjusted_by,
            "adjustment_date": adj.adjustment_date.isoformat() if adj.adjustment_date else None
        })
    
    return jsonify({
        "adjustments": adjustments,
        "total": paginated.total,
        "pages": paginated.pages,
        "current_page": page
    }), 200
