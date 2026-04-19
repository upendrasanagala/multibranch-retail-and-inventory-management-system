"""
Inventory Routes (Transitioned to Product Variants)
Stock management using variants
"""

from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.extensions import db
from app.models.product import Product, ProductVariant
from app.models.adjustment import InventoryAdjustment
from app.models.user import User
from app.models.supplier import Supplier
from app.models.category import Category
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
    search = request.args.get("search", "")
    
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    # Enforce branch isolation for non-admins
    if user.role != "admin":
        branch_id = user.branch_id
        if not branch_id:
            return jsonify({"message": "User not assigned to a branch"}), 403

    from app.models.branch import Branch
    query = db.session.query(
        ProductVariant, Product, Branch, Supplier.name, Category.name
    ).join(
        Product, ProductVariant.product_id == Product.product_id
    ).join(
        Branch, ProductVariant.branch_id == Branch.branch_id
    ).join(
        Category, Product.category_id == Category.category_id
    ).outerjoin(
        Supplier, Product.supplier_id == Supplier.supplier_id
    )
    
    if branch_id:
        query = query.filter(ProductVariant.branch_id == branch_id)
    
    if search:
        query = query.filter(
            (Product.name.ilike(f"%{search}%")) |
            (ProductVariant.sku_code.ilike(f"%{search}%"))
        )

    product_id = request.args.get("product_id", type=int)
    if product_id:
        query = query.filter(ProductVariant.product_id == product_id)
    
    variant_id = request.args.get("variant_id", type=int)
    if variant_id:
        query = query.filter(ProductVariant.variant_id == variant_id)

    size = request.args.get("size")
    if size:
        query = query.filter(ProductVariant.variant_size == size)
    
    # Simple low stock filter using a fixed thresh for now
    if low_stock:
        query = query.filter(ProductVariant.stock_quantity <= 10)
    
    paginated = query.paginate(page=page, per_page=per_page, error_out=False)
    
    items = []
    for pv, prod, branch, supplier_name, category_name in paginated.items:
        items.append({
            "inventory_id": pv.variant_id,
            "variant_id": pv.variant_id,
            "product_id": pv.product_id,
            "product_name": prod.name,
            "category": category_name,
            "sku": pv.sku_code,
            "branch_id": pv.branch_id,
            "branch_name": branch.name,
            "quantity": pv.stock_quantity,
            "unit_price": pv.price,
            "size": pv.variant_size,
            "supplier_name": supplier_name,
            "mfg_date": pv.mfg_date.isoformat() if pv.mfg_date else None,
            "expiry_date": pv.expiry_date.isoformat() if pv.expiry_date else None,
            "last_updated": pv.last_updated.isoformat() if pv.last_updated else None
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
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    # Enforce branch isolation for non-admins
    if user.role != "admin" and user.branch_id != branch_id:
        return jsonify({"message": "Access denied to other branch data"}), 403

    query = db.session.query(
        ProductVariant, Product, Supplier.name, Category.name
    ).join(
        Product, ProductVariant.product_id == Product.product_id
    ).join(
        Category, Product.category_id == Category.category_id
    ).outerjoin(
        Supplier, Product.supplier_id == Supplier.supplier_id
    ).filter(ProductVariant.branch_id == branch_id)
    
    results = query.all()
    
    items = []
    for pv, prod, supplier_name, category_name in results:
        items.append({
            "inventory_id": pv.variant_id,
            "variant_id": pv.variant_id,
            "product_id": pv.product_id,
            "product_name": prod.name,
            "category": category_name,
            "sku": pv.sku_code,
            "barcode": pv.barcode,
            "branch_id": pv.branch_id,
            "quantity": pv.stock_quantity,
            "unit_price": pv.price,
            "size": pv.variant_size,
            "supplier_name": supplier_name,
            "mfg_date": pv.mfg_date.isoformat() if pv.mfg_date else None,
            "expiry_date": pv.expiry_date.isoformat() if pv.expiry_date else None,
            "last_updated": pv.last_updated.isoformat() if pv.last_updated else None
        })
    
    return jsonify({"inventory": items}), 200


# =============================
# Get Low Stock Items
# =============================
@inventory_bp.route("/low-stock", methods=["GET"])
@jwt_required()
def get_low_stock():
    branch_id = request.args.get("branch_id", type=int)
    
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    # Enforce branch isolation for non-admins
    if user.role != "admin":
        branch_id = user.branch_id
        if not branch_id:
            return jsonify({"message": "User not assigned to a branch"}), 403

    query = db.session.query(
        ProductVariant, Product, Supplier.name, Category.name
    ).join(
        Product, ProductVariant.product_id == Product.product_id
    ).join(
        Category, Product.category_id == Category.category_id
    ).outerjoin(
        Supplier, Product.supplier_id == Supplier.supplier_id
    ).filter(ProductVariant.stock_quantity <= ProductVariant.min_threshold)
    
    if branch_id:
        query = query.filter(ProductVariant.branch_id == branch_id)
    
    results = query.all()
    
    items = []
    for pv, prod, supplier_name, category_name in results:
        items.append({
            "inventory_id": pv.variant_id,
            "product_name": prod.name,
            "category": category_name,
            "sku": pv.sku_code,
            "branch_id": pv.branch_id,
            "quantity": pv.stock_quantity,
            "unit_price": pv.price,
            "supplier_name": supplier_name,
            "min_threshold": pv.min_threshold,
            "mfg_date": pv.mfg_date.isoformat() if pv.mfg_date else None,
            "expiry_date": pv.expiry_date.isoformat() if pv.expiry_date else None
        })
    
    return jsonify({"low_stock_items": items, "count": len(items)}), 200


# =============================
# Get Single Inventory (Variant)
# =============================
@inventory_bp.route("/<int:variant_id>", methods=["GET"])
@jwt_required()
def get_inventory_item(variant_id):
    pv = ProductVariant.query.get_or_404(variant_id)
    prod = Product.query.get(pv.product_id)
    
    return jsonify({
        "inventory_id": pv.variant_id,
        "variant_id": pv.variant_id,
        "product_id": pv.product_id,
        "product_name": prod.name if prod else None,
        "branch_id": pv.branch_id,
        "quantity": pv.stock_quantity,
        "last_updated": pv.last_updated.isoformat() if pv.last_updated else None
    }), 200


# =============================
# Update Inventory Quantity
# =============================
@inventory_bp.route("/<int:variant_id>", methods=["PUT"])
@jwt_required()
@roles_required("admin", "manager", "staff")
def update_inventory(variant_id):
    pv = ProductVariant.query.get_or_404(variant_id)
    data = request.get_json() or {}
    
    if "quantity" in data:
        pv.stock_quantity = data.get("quantity")
        
    db.session.commit()
    
    return jsonify({"message": "Stock updated successfully"}), 200


# =============================
# Make Inventory Adjustment
# =============================
@inventory_bp.route("/adjust", methods=["POST"])
@jwt_required()
@roles_required("admin", "manager", "staff")
def adjust_inventory():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    
    variant_id = data.get("variant_id") or data.get("product_id") # Back-compat
    branch_id = data.get("branch_id")
    adjustment_type = data.get("adjustment_type")  # 'add', 'subtract', 'set'
    quantity = data.get("quantity")
    reason = data.get("reason")
    
    if not all([variant_id, branch_id, adjustment_type, quantity is not None]):
        return jsonify({"message": "Missing required fields"}), 400
    
    # Find variant record
    pv = ProductVariant.query.get(variant_id)
    if not pv:
        return jsonify({"message": "Product variant not found"}), 404
        
    # Apply adjustment
    old_quantity = pv.stock_quantity
    
    if adjustment_type == "add":
        pv.stock_quantity += quantity
    elif adjustment_type == "subtract":
        if pv.stock_quantity < quantity:
            return jsonify({"message": "Insufficient stock"}), 400
        pv.stock_quantity -= quantity
    elif adjustment_type == "set":
        pv.stock_quantity = quantity
    else:
        return jsonify({"message": "Invalid adjustment type"}), 400
    
    # Record the adjustment
    adjustment = InventoryAdjustment(
        variant_id=pv.variant_id,
        product_id=pv.product_id,
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
        "new_quantity": pv.stock_quantity
    }), 200

# Adjustment history route left for future update (requires variant link join)


# =============================
# Get Adjustment History (Updated for Variants)
# =============================
@inventory_bp.route("/adjustments", methods=["GET"])
@jwt_required()
def get_adjustments():
    branch_id = request.args.get("branch_id", type=int)
    variant_id = request.args.get("variant_id", type=int)
    product_id = request.args.get("product_id", type=int)
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    
    query = db.session.query(
        InventoryAdjustment, Product, User, ProductVariant
    ).join(
        ProductVariant, InventoryAdjustment.variant_id == ProductVariant.variant_id
    ).join(
        Product, ProductVariant.product_id == Product.product_id
    ).join(
        User, InventoryAdjustment.adjusted_by == User.user_id
    )
    
    if branch_id:
        query = query.filter(InventoryAdjustment.branch_id == branch_id)
    if variant_id:
        query = query.filter(InventoryAdjustment.variant_id == variant_id)
    if product_id:
        query = query.filter(ProductVariant.product_id == product_id)
    
    paginated = query.order_by(
        InventoryAdjustment.adjustment_date.desc()
    ).paginate(page=page, per_page=per_page, error_out=False)
    
    adjustments = []
    for adj, prod, user, pv in paginated.items:
        adjustments.append({
            "adjustment_id": adj.adjustment_id,
            "product_id": pv.product_id,
            "variant_id": pv.variant_id,
            "product_name": prod.name,
            "variant_size": pv.variant_size,
            "branch_id": adj.branch_id,
            "adjustment_type": adj.adjustment_type,
            "quantity": adj.quantity,
            "reason": adj.reason,
            "adjusted_by": f"{user.first_name} {user.last_name}",
            "adjustment_date": adj.adjustment_date.isoformat() if adj.adjustment_date else None
        })
    
    return jsonify({
        "adjustments": adjustments,
        "total": paginated.total,
        "pages": paginated.pages,
        "current_page": page
    }), 200
