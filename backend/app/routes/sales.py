"""
Sales Routes (Transitioned to Product Variants)
POS transactions and sales management
"""

from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime

from app.extensions import db
from app.models.sales import SalesTransaction, TransactionItem
from app.models.product import Product, ProductVariant
from app.models.adjustment import InventoryAdjustment
from app.models.user import User
from app.models.branch import Branch
from app.utils.decorators import roles_required
from app.routes import sales_bp
from app.utils.validators import is_valid_indian_mobile


# =============================
# Create Sale Transaction (POS)
# =============================
@sales_bp.route("/", methods=["POST"])
@jwt_required()
@roles_required("admin", "manager", "staff")
def create_sale():
    from flask import current_app
    user_id = get_jwt_identity()
    current_app.logger.info(f"Sale transaction initiated by User ID: {user_id}")
    user = User.query.get(user_id)
    
    if not user or not user.branch_id:
        return jsonify({"message": "User must be assigned to a branch"}), 400
    
    data = request.get_json() or {}
    
    items = data.get("items", [])  # [{variant_id, quantity, unit_price}]
    payment_method = data.get("payment_method", "cash")
    customer_mobile = data.get("customer_mobile")
    
    if not customer_mobile:
        return jsonify({"message": "Customer mobile number is mandatory"}), 400
    
    if not is_valid_indian_mobile(customer_mobile):
        return jsonify({"message": "Invalid customer mobile number. Must be 10 digits starting with 6,7,8,9"}), 400
    
    if not items:
        return jsonify({"message": "No items in transaction"}), 400
    
    # Calculate total and validate stock
    items_subtotal = 0
    validated_items = []
    
    discount = data.get("discount", 0.0)
    total_from_fe = data.get("total")
    
    for item in items:
        # Support both 'variant_id' (new) and 'product_id' (old) for back-compat
        variant_id = item.get("variant_id") or item.get("product_id")
        quantity = item.get("quantity", 1)
        
        # Get variant (Inventory is now in ProductVariant)
        variant = ProductVariant.query.get(variant_id)
        
        if not variant:
             # If it was a product_id, try to find the variant for this branch
             variant = ProductVariant.query.filter_by(product_id=variant_id, branch_id=user.branch_id).first()
        
        if not variant or variant.branch_id != user.branch_id:
            return jsonify({"message": f"Product variant {variant_id} not available in this branch"}), 400
        
        if variant.stock_quantity < quantity:
            return jsonify({
                "message": f"Insufficient stock for {variant.product.name} ({variant.variant_size}). Available: {variant.stock_quantity}"
            }), 400
        
        unit_price = item.get("unit_price", variant.price)
        subtotal = unit_price * quantity
        items_subtotal += subtotal
        
        validated_items.append({
            "variant_id": variant.variant_id,
            "quantity": quantity,
            "unit_price": unit_price,
            "subtotal": subtotal,
            "variant": variant
        })
    
    final_total = total_from_fe if total_from_fe is not None else (items_subtotal - discount)

    # Create transaction
    import uuid
    branch = Branch.query.get(user.branch_id)
    branch_prefix = branch.branch_code if branch and branch.branch_code else "BR"

    transaction = SalesTransaction(
        branch_id=user.branch_id,
        staff_id=user_id,
        total_amount=final_total,
        discount=discount,
        payment_method=payment_method,
        customer_mobile=customer_mobile,
        status="completed",
        invoice_number=f"TEMP-{uuid.uuid4().hex[:8]}"
    )
    
    db.session.add(transaction)
    db.session.flush() 

    transaction.invoice_number = f"{branch_prefix}-{transaction.transaction_id:06d}"
    
    # Create transaction items and update stock in ProductVariant
    for item in validated_items:
        trans_item = TransactionItem(
            transaction_id=transaction.transaction_id,
            variant_id=item["variant_id"],
            product_id=item["variant"].product_id, # Added to satisfy DB constraint
            quantity=item["quantity"],
            unit_price=item["unit_price"],
            subtotal=item["subtotal"]
        )
        db.session.add(trans_item)
        
        # Deduct from variant stock
        item["variant"].stock_quantity -= item["quantity"]

        # Log the adjustment for audit trail
        adj = InventoryAdjustment(
            variant_id=item["variant_id"],
            product_id=item["variant"].product_id, # Added to satisfy DB constraint
            branch_id=user.branch_id,
            adjustment_type="sale",
            quantity=item["quantity"],
            reason=f"POS Sale #{transaction.invoice_number}",
            adjusted_by=user_id
        )
        db.session.add(adj)
    
    db.session.commit()
    
    return jsonify({
        "message": "Sale completed successfully",
        "transaction_id": transaction.transaction_id,
        "invoice_number": transaction.invoice_number,
        "uuid": transaction.transaction_uuid,
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
    customer_mobile = request.args.get("customer_mobile")

    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if user.role != "admin":
        branch_id = user.branch_id
        if user.role == "staff":
            staff_id = user_id
    
    query = SalesTransaction.query
    
    if branch_id:
        query = query.filter(SalesTransaction.branch_id == branch_id)
    if staff_id:
        query = query.filter(SalesTransaction.staff_id == staff_id)
    if customer_mobile:
        query = query.filter(SalesTransaction.customer_mobile == customer_mobile)
    
    if date_from:
        try: query = query.filter(SalesTransaction.transaction_date >= datetime.fromisoformat(date_from))
        except: pass
    
    if date_to:
        try: query = query.filter(SalesTransaction.transaction_date <= datetime.fromisoformat(date_to).replace(hour=23, minute=59, second=59))
        except: pass
    
    paginated = query.order_by(SalesTransaction.transaction_date.desc()).paginate(page=page, per_page=per_page, error_out=False)
    
    transactions = []
    for t in paginated.items:
        staff = User.query.get(t.staff_id)
        transactions.append({
            "transaction_id": t.transaction_id,
            "invoice_number": t.invoice_number,
            "uuid": t.transaction_uuid,
            "branch_id": t.branch_id,
            "staff_id": t.staff_id,
            "staff_name": f"{staff.first_name} {staff.last_name}" if staff else None,
            "total_amount": t.total_amount,
            "customer_mobile": t.customer_mobile,
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
    items = TransactionItem.query.filter_by(transaction_id=transaction_id).all()
    
    item_list = []
    for item in items:
        # Join with variant and product
        variant = ProductVariant.query.get(item.variant_id)
        product = Product.query.get(variant.product_id) if variant else None
        
        item_list.append({
            "item_id": item.item_id,
            "product_id": variant.product_id if variant else None,
            "variant_id": item.variant_id,
            "product_name": product.name if product else "Unknown",
            "quantity": item.quantity,
            "unit_price": item.unit_price,
            "subtotal": item.subtotal,
            "size": variant.variant_size if variant else None,
            "gst_percent": variant.gst_percent if variant else 0.0
        })
    
    staff = User.query.get(transaction.staff_id)
    
    return jsonify({
        "transaction_id": transaction.transaction_id,
        "invoice_number": transaction.invoice_number,
        "uuid": transaction.transaction_uuid,
        "total_amount": transaction.total_amount,
        "customer_mobile": transaction.customer_mobile,
        "discount": transaction.discount,
        "payment_method": transaction.payment_method,
        "status": transaction.status,
        "transaction_date": transaction.transaction_date.isoformat() if transaction.transaction_date else None,
        "items": item_list,
        "staff_name": f"{staff.first_name} {staff.last_name}" if staff else None
    }), 200


# =============================
# Void Transaction
# =============================
@sales_bp.route("/<int:transaction_id>/void", methods=["POST"])
@jwt_required()
@roles_required("admin", "manager")
def void_sale(transaction_id):
    transaction = SalesTransaction.query.get_or_404(transaction_id)
    if transaction.status == "voided":
        return jsonify({"message": "Already voided"}), 400
    
    items = TransactionItem.query.filter_by(transaction_id=transaction_id).all()
    for item in items:
        variant = ProductVariant.query.get(item.variant_id)
        if variant:
            variant.stock_quantity += item.quantity
    
    transaction.status = "voided"
    db.session.commit()
    return jsonify({"message": "Transaction voided"}), 200


# =============================
# Return Item
# =============================
@sales_bp.route("/items/<int:item_id>/return", methods=["POST"])
@jwt_required()
@roles_required("admin", "manager")
def return_item(item_id):
    item = TransactionItem.query.get_or_404(item_id)
    transaction = SalesTransaction.query.get(item.transaction_id)
    
    if item.is_returned:
        return jsonify({"message": "Already returned"}), 400
        
    item.is_returned = True
    transaction.total_amount -= item.subtotal
    
    variant = ProductVariant.query.get(item.variant_id)
    if variant:
        variant.stock_quantity += item.quantity
        
        adj = InventoryAdjustment(
            variant_id=variant.variant_id,
            branch_id=transaction.branch_id,
            adjustment_type="return",
            quantity=item.quantity,
            reason=f"Return from #{transaction.invoice_number}",
            adjusted_by=get_jwt_identity()
        )
        db.session.add(adj)
        
    db.session.commit()
    return jsonify({"message": "Item returned successfully"}), 200

# Other helper routes maintained...
@sales_bp.route("/summary", methods=["GET"])
@jwt_required()
def get_sales_summary():
    branch_id = request.args.get("branch_id", type=int)
    user = User.query.get(get_jwt_identity())
    if user.role != "admin": branch_id = user.branch_id
    
    query = SalesTransaction.query.filter_by(status="completed")
    if branch_id: query = query.filter_by(branch_id=branch_id)
    
    transactions = query.all()
    total = sum(t.total_amount for t in transactions)
    return jsonify({"total_sales": total, "transaction_count": len(transactions)}), 200


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
        
        # Enforce staff-level isolation for daily summary
        if user.role == "staff":
            staff_id_filter = user_id
        else:
            staff_id_filter = request.args.get("staff_id", type=int)
    else:
        staff_id_filter = request.args.get("staff_id", type=int)

    query = SalesTransaction.query.filter(
        SalesTransaction.status == "completed",
        db.func.date(SalesTransaction.transaction_date) == target_date
    )

    if staff_id_filter:
        query = query.filter(SalesTransaction.staff_id == staff_id_filter)
    
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

