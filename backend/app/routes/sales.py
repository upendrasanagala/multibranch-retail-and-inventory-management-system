"""
Sales Routes
POS transactions and sales management
"""

from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime

from app.extensions import db
from app.models.sales import SalesTransaction, TransactionItem
from app.models.inventory import Inventory
from app.models.product import Product
from app.models.user import User
from app.utils.decorators import roles_required
from app.routes import sales_bp


# =============================
# Create Sale Transaction (POS)
# =============================
@sales_bp.route("/", methods=["POST"])
@jwt_required()
@roles_required("admin", "manager", "staff")
def create_sale():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user or not user.branch_id:
        return jsonify({"message": "User must be assigned to a branch"}), 400
    
    data = request.get_json() or {}
    
    items = data.get("items", [])  # [{product_id, quantity, unit_price}]
    payment_method = data.get("payment_method", "cash")
    
    if not items:
        return jsonify({"message": "No items in transaction"}), 400
    
    # Calculate total and validate stock
    items_subtotal = 0
    validated_items = []
    
    # Get discount and total from request (Frontend logic for B1G1/Bill Offer/GST)
    discount = data.get("discount", 0.0)
    total_from_fe = data.get("total")
    
    for item in items:
        product_id = item.get("product_id")
        quantity = item.get("quantity", 1)
        
        # Get inventory
        inventory = Inventory.query.filter_by(
            product_id=product_id, branch_id=user.branch_id
        ).first()
        
        if not inventory:
            return jsonify({"message": f"Product {product_id} not in branch inventory"}), 400
        
        if inventory.quantity < quantity:
            return jsonify({
                "message": f"Insufficient stock for product {product_id}. Available: {inventory.quantity}"
            }), 400
        
        product = Product.query.get(product_id)
        unit_price = item.get("unit_price", product.unit_price)
        subtotal = unit_price * quantity
        items_subtotal += subtotal
        
        validated_items.append({
            "product_id": product_id,
            "quantity": quantity,
            "unit_price": unit_price,
            "subtotal": subtotal,
            "inventory": inventory
        })
    
    # Use frontend total if provided (trusted for complex logic), else calculate simple
    final_total = total_from_fe if total_from_fe is not None else (items_subtotal - discount)

    # Create transaction
    transaction = SalesTransaction(
        branch_id=user.branch_id,
        staff_id=user_id,
        total_amount=final_total,
        discount=discount,
        payment_method=payment_method,
        status="completed"
    )
    
    db.session.add(transaction)
    db.session.flush()  # Get transaction_id
    
    # Create transaction items and update inventory
    for item in validated_items:
        trans_item = TransactionItem(
            transaction_id=transaction.transaction_id,
            product_id=item["product_id"],
            quantity=item["quantity"],
            unit_price=item["unit_price"],
            subtotal=item["subtotal"]
        )
        db.session.add(trans_item)
        
        # Deduct from inventory
        item["inventory"].quantity -= item["quantity"]
    
    db.session.commit()
    
    return jsonify({
        "message": "Sale completed successfully",
        "transaction_id": transaction.transaction_id,
        "total_amount": final_total,
        "transaction_date": transaction.transaction_date.isoformat()
    }), 201


# =============================
# Get Sales (with filters)
# =============================
@sales_bp.route("/", methods=["GET"])
@jwt_required()
def get_sales():
    branch_id = request.args.get("branch_id", type=int)
    staff_id = request.args.get("staff_id", type=int)
    date_from = request.args.get("date_from")
    date_to = request.args.get("date_to")
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    # Enforce branch isolation for non-admins
    if user.role != "admin":
        branch_id = user.branch_id
        if not branch_id:
            return jsonify({"message": "User not assigned to a branch"}), 403
    
    query = SalesTransaction.query
    
    if branch_id:
        query = query.filter(SalesTransaction.branch_id == branch_id)
    if staff_id:
        query = query.filter(SalesTransaction.staff_id == staff_id)
    
    if date_from:
        try:
            date_from_dt = datetime.fromisoformat(date_from)
            query = query.filter(SalesTransaction.transaction_date >= date_from_dt)
        except ValueError:
            pass
    
    if date_to:
        try:
                        # Set time to end of day to include same-day records
            date_to_dt = datetime.fromisoformat(date_to).replace(hour=23, minute=59, second=59)
            query = query.filter(SalesTransaction.transaction_date <= date_to_dt)
        except ValueError:
            pass
    
    paginated = query.order_by(
        SalesTransaction.transaction_date.desc()
    ).paginate(page=page, per_page=per_page, error_out=False)
    
    transactions = []
    for t in paginated.items:
        staff = User.query.get(t.staff_id)
        transactions.append({
            "transaction_id": t.transaction_id,
            "branch_id": t.branch_id,
            "staff_id": t.staff_id,
            "staff_name": staff.name if staff else None,
            "total_amount": t.total_amount,
            "payment_method": t.payment_method,
            "status": t.status,
            "transaction_date": t.transaction_date.isoformat() if t.transaction_date else None
        })
    
    return jsonify({
        "transactions": transactions,
        "total": paginated.total,
        "pages": paginated.pages,
        "current_page": page
    }), 200


# =============================
# Get Single Transaction Details
# =============================
@sales_bp.route("/<int:transaction_id>", methods=["GET"])
@jwt_required()
def get_sale(transaction_id):
    transaction = SalesTransaction.query.get_or_404(transaction_id)
    
    # Get transaction items
    items = TransactionItem.query.filter_by(transaction_id=transaction_id).all()
    
    item_list = []
    for item in items:
        product = Product.query.get(item.product_id)
        item_list.append({
            "item_id": item.item_id,
            "product_id": item.product_id,
            "product_name": product.name if product else None,
            "quantity": item.quantity,
            "unit_price": item.unit_price,
            "subtotal": item.subtotal,
            "size": product.size if product else None,
            "unit": product.unit if product else None,
            "is_b1g1": product.is_b1g1 if product else False,
            "gst_percent": product.gst_percent if product else 0.0
        })
    
    staff = User.query.get(transaction.staff_id)
    
    return jsonify({
        "transaction_id": transaction.transaction_id,
        "branch_id": transaction.branch_id,
        "staff_id": transaction.staff_id,
        "staff_name": staff.name if staff else None,
        "total_amount": transaction.total_amount,
        "discount": transaction.discount,
        "payment_method": transaction.payment_method,
        "status": transaction.status,
        "transaction_date": transaction.transaction_date.isoformat() if transaction.transaction_date else None,
        "items": item_list
    }), 200


# =============================
# Void/Cancel Transaction (Admin/Manager)
# =============================
@sales_bp.route("/<int:transaction_id>/void", methods=["POST"])
@jwt_required()
@roles_required("admin", "manager")
def void_sale(transaction_id):
    transaction = SalesTransaction.query.get_or_404(transaction_id)
    
    if transaction.status == "voided":
        return jsonify({"message": "Transaction already voided"}), 400
    
    # Restore inventory
    items = TransactionItem.query.filter_by(transaction_id=transaction_id).all()
    
    for item in items:
        inventory = Inventory.query.filter_by(
            product_id=item.product_id, branch_id=transaction.branch_id
        ).first()
        
        if inventory:
            inventory.quantity += item.quantity
    
    transaction.status = "voided"
    db.session.commit()
    
    return jsonify({"message": "Transaction voided successfully"}), 200


# =============================
# Get Sales Summary/Stats
# =============================
@sales_bp.route("/summary", methods=["GET"])
@jwt_required()
def get_sales_summary():
    branch_id = request.args.get("branch_id", type=int)
    date_from = request.args.get("date_from")
    date_to = request.args.get("date_to")
    
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    # Enforce branch isolation for non-admins
    if user.role != "admin":
        branch_id = user.branch_id
        if not branch_id:
            return jsonify({"message": "User not assigned to a branch"}), 403
    
    query = SalesTransaction.query.filter(SalesTransaction.status == "completed")
    
    if branch_id:
        query = query.filter(SalesTransaction.branch_id == branch_id)
    
    if date_from:
        try:
            date_from_dt = datetime.fromisoformat(date_from)
            query = query.filter(SalesTransaction.transaction_date >= date_from_dt)
        except ValueError:
            pass
    
    if date_to:
        try:
            # Set time to end of day to include same-day records
                        # Set time to end of day to include same-day records
            date_to_dt = datetime.fromisoformat(date_to).replace(hour=23, minute=59, second=59).replace(hour=23, minute=59, second=59)
            query = query.filter(SalesTransaction.transaction_date <= date_to_dt)
        except ValueError:
            pass
    
    transactions = query.all()
    
    total_sales = sum(t.total_amount for t in transactions)
    transaction_count = len(transactions)
    avg_transaction = total_sales / transaction_count if transaction_count > 0 else 0
    
    return jsonify({
        "total_sales": total_sales,
        "transaction_count": transaction_count,
        "average_transaction": avg_transaction
    }), 200


# =============================
# Get Sales by Branch (Frontend compatible)
# =============================
@sales_bp.route("/branch/<int:branch_id>", methods=["GET"])
@jwt_required()
def get_sales_by_branch(branch_id):
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    # Enforce branch isolation for non-admins
    if user.role != "admin" and user.branch_id != branch_id:
        return jsonify({"message": "Access denied to other branch data"}), 403

    date_from = request.args.get("date_from")
    date_to = request.args.get("date_to")
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    
    query = SalesTransaction.query.filter(SalesTransaction.branch_id == branch_id)
    
    if date_from:
        try:
            date_from_dt = datetime.fromisoformat(date_from)
            query = query.filter(SalesTransaction.transaction_date >= date_from_dt)
        except ValueError:
            pass
    
    if date_to:
        try:
                        # Set time to end of day to include same-day records
            date_to_dt = datetime.fromisoformat(date_to).replace(hour=23, minute=59, second=59)
            query = query.filter(SalesTransaction.transaction_date <= date_to_dt)
        except ValueError:
            pass
    
    paginated = query.order_by(
        SalesTransaction.transaction_date.desc()
    ).paginate(page=page, per_page=per_page, error_out=False)
    
    transactions = []
    for t in paginated.items:
        staff = User.query.get(t.staff_id)
        # Fetch items for this transaction
        items = TransactionItem.query.filter_by(transaction_id=t.transaction_id).all()
        item_list = []
        for item in items:
            product = Product.query.get(item.product_id)
            item_list.append({
                "product_name": product.name if product else "Unknown",
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "subtotal": item.subtotal,
                "size": product.size if product else None,
                "unit": product.unit if product else None,
                "is_b1g1": product.is_b1g1 if product else False,
                "gst_percent": product.gst_percent if product else 0.0
            })

        transactions.append({
            "transaction_id": t.transaction_id,
            "branch_id": t.branch_id,
            "staff_id": t.staff_id,
            "staff_name": f"{staff.first_name} {staff.last_name}" if staff else None,
            "total_amount": t.total_amount,
            "discount": t.discount,
            "payment_method": t.payment_method,
            "status": t.status,
            "transaction_date": t.transaction_date.isoformat() if t.transaction_date else None,
            "items": item_list
        })
    
    return jsonify({
        "transactions": transactions,
        "total": paginated.total,
        "pages": paginated.pages,
        "current_page": page
    }), 200


# =============================
# Refund Transaction (Frontend compatible)
# =============================
@sales_bp.route("/<int:transaction_id>/refund", methods=["POST"])
@jwt_required()
@roles_required("admin", "manager")
def refund_sale(transaction_id):
    transaction = SalesTransaction.query.get_or_404(transaction_id)
    
    if transaction.status == "refunded":
        return jsonify({"message": "Transaction already refunded"}), 400
    
    if transaction.status == "voided":
        return jsonify({"message": "Cannot refund a voided transaction"}), 400
    
    # Restore inventory
    items = TransactionItem.query.filter_by(transaction_id=transaction_id).all()
    
    for item in items:
        inventory = Inventory.query.filter_by(
            product_id=item.product_id, branch_id=transaction.branch_id
        ).first()
        
        if inventory:
            inventory.quantity += item.quantity
    
    transaction.status = "refunded"
    db.session.commit()
    
    return jsonify({"message": "Transaction refunded successfully"}), 200


# =============================
# Daily Sales Summary (Frontend compatible)
# =============================
@sales_bp.route("/daily-summary", methods=["GET"])
@jwt_required()
def get_daily_summary():
    branch_id = request.args.get("branch_id", type=int)
    date_str = request.args.get("date")
    
    # Default to today
    if date_str:
        try:
            target_date = datetime.fromisoformat(date_str).date()
        except ValueError:
            target_date = datetime.now().date()
    else:
        target_date = datetime.now().date()
    
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    # Enforce branch isolation for non-admins
    if user.role != "admin":
        branch_id = user.branch_id
        if not branch_id:
            return jsonify({"message": "User not assigned to a branch"}), 403

    query = SalesTransaction.query.filter(
        SalesTransaction.status == "completed",
        db.func.date(SalesTransaction.transaction_date) == target_date
    )
    
    if branch_id:
        query = query.filter(SalesTransaction.branch_id == branch_id)
    
    transactions = query.all()
    
    total_sales = sum(t.total_amount for t in transactions)
    transaction_count = len(transactions)
    
    # Group by payment method
    payment_breakdown = {}
    for t in transactions:
        method = t.payment_method or "cash"
        if method not in payment_breakdown:
            payment_breakdown[method] = {"count": 0, "total": 0}
        payment_breakdown[method]["count"] += 1
        payment_breakdown[method]["total"] += t.total_amount
    
    return jsonify({
        "date": target_date.isoformat(),
        "total_sales": total_sales,
        "transaction_count": transaction_count,
        "average_transaction": total_sales / transaction_count if transaction_count > 0 else 0,
        "payment_breakdown": payment_breakdown
    }), 200

