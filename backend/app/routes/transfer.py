"""
Stock Transfer Routes (Transitioned to Product Variants)
Inter-branch stock transfers
"""

from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime

from app.extensions import db
from app.models.stock_transfer import StockTransfer
from app.models.product import Product, ProductVariant
from app.models.branch import Branch
from app.utils.decorators import roles_required
from app.routes import transfer_bp


# =============================
# Create Stock Transfer Request
# =============================
@transfer_bp.route("/", methods=["POST"])
@jwt_required()
@roles_required("admin", "manager")
def create_transfer():
    data = request.get_json() or {}
    
    variant_id = data.get("variant_id") or data.get("product_id") # Back-compat
    from_branch_id = data.get("from_branch_id")
    to_branch_id = data.get("to_branch_id")
    quantity = data.get("quantity")
    notes = data.get("notes")
    
    if not all([variant_id, from_branch_id, to_branch_id, quantity]):
        return jsonify({"message": "Missing required fields"}), 400
    
    from app.models.user import User
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if user.role != "admin":
        if user.branch_id not in [from_branch_id, to_branch_id]:
            return jsonify({"message": "You can only create transfers involving your own branch"}), 403

    # Check source variant stock
    source_variant = ProductVariant.query.get(variant_id)
    if not source_variant or source_variant.branch_id != from_branch_id:
        # Try fallback if product_id was sent
        source_variant = ProductVariant.query.filter_by(product_id=variant_id, branch_id=from_branch_id).first()
        
    if not source_variant or source_variant.stock_quantity < quantity:
        available = source_variant.stock_quantity if source_variant else 0
        return jsonify({
            "message": f"Insufficient stock in source branch. Available: {available}"
        }), 400
    
    transfer = StockTransfer(
        variant_id=source_variant.variant_id,
        from_branch_id=from_branch_id,
        to_branch_id=to_branch_id,
        quantity=quantity,
        status="pending",
        notes=notes
    )
    
    db.session.add(transfer)
    db.session.commit()
    
    return jsonify({
        "message": "Transfer request created successfully",
        "transfer_id": transfer.transfer_id
    }), 201


# =============================
# Get All Transfers
# =============================
@transfer_bp.route("/", methods=["GET"])
@jwt_required()
def get_transfers():
    branch_id = request.args.get("branch_id", type=int)
    status = request.args.get("status")
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    
    from app.models.user import User
    user = User.query.get(get_jwt_identity())
    
    if user.role != "admin":
        branch_id = user.branch_id
    
    query = StockTransfer.query
    if branch_id:
        query = query.filter((StockTransfer.from_branch_id == branch_id) | (StockTransfer.to_branch_id == branch_id))
    if status:
        query = query.filter(StockTransfer.status == status)
    
    paginated = query.order_by(StockTransfer.request_date.desc()).paginate(page=page, per_page=per_page, error_out=False)
    
    transfers = []
    for t in paginated.items:
        variant = ProductVariant.query.get(t.variant_id)
        product = Product.query.get(variant.product_id) if variant else None
        from_branch = Branch.query.get(t.from_branch_id)
        to_branch = Branch.query.get(t.to_branch_id)
        
        transfers.append({
            "transfer_id": t.transfer_id,
            "product_id": variant.product_id if variant else None,
            "variant_id": t.variant_id,
            "product_name": product.name if product else "Unknown",
            "size": variant.variant_size if variant else None,
            "from_branch_name": from_branch.name if from_branch else None,
            "to_branch_name": to_branch.name if to_branch else None,
            "quantity": t.quantity,
            "status": t.status,
            "request_date": t.request_date.isoformat() if t.request_date else None,
            "notes": t.notes
        })
    
    return jsonify({"transfers": transfers, "total": paginated.total, "pages": paginated.pages}), 200


# =============================
# Approve Transfer
# =============================
@transfer_bp.route("/<int:transfer_id>/approve", methods=["PUT"])
@jwt_required()
@roles_required("admin", "manager")
def approve_transfer(transfer_id):
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    transfer = StockTransfer.query.get_or_404(transfer_id)
    
    if transfer.status != "pending":
        return jsonify({"message": f"Transfer already {transfer.status}"}), 400
    
    # Source Variant
    source_variant = ProductVariant.query.get(transfer.variant_id)
    if not source_variant or source_variant.stock_quantity < transfer.quantity:
        return jsonify({"message": "Insufficient stock in source variant"}), 400
    
    # Target Variant (must have same product and same size in destination branch)
    dest_variant = ProductVariant.query.filter_by(
        product_id=source_variant.product_id,
        variant_size=source_variant.variant_size,
        branch_id=transfer.to_branch_id
    ).first()
    
    if not dest_variant:
        # Create it if it doesn't exist? Most likely should already exist if products are distributed
        dest_variant = ProductVariant(
            product_id=source_variant.product_id,
            branch_id=transfer.to_branch_id,
            variant_size=source_variant.variant_size,
            sku_code=f"{source_variant.sku_code}_FORK", # Placeholder SKU
            price=source_variant.price,
            cost_price=source_variant.cost_price,
            stock_quantity=0
        )
        db.session.add(dest_variant)
    
    source_variant.stock_quantity -= transfer.quantity
    dest_variant.stock_quantity += transfer.quantity
    
    transfer.status = "completed"
    transfer.approved_by = user_id
    transfer.completed_date = datetime.utcnow()
    
    db.session.commit()
    return jsonify({"message": "Transfer completed"}), 200

# Reject Transfer
@transfer_bp.route("/<int:transfer_id>/reject", methods=["PUT"])
@jwt_required()
@roles_required("admin", "manager")
def reject_transfer(transfer_id):
    from app.models.user import User
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    transfer = StockTransfer.query.get_or_404(transfer_id)
    
    # Enforce branch isolation
    if user.role != "admin" and user.branch_id not in [transfer.from_branch_id, transfer.to_branch_id]:
        return jsonify({"message": "Access denied to this transfer"}), 403

    if transfer.status != "pending":
        return jsonify({"message": f"Transfer already {transfer.status}"}), 400
    
    data = request.get_json() or {}
    reason = data.get("reason", "Rejected by manager")
    
    transfer.status = "rejected"
    transfer.approved_by = user_id
    transfer.notes = f"{transfer.notes or ''}\nRejection reason: {reason}"
    
    db.session.commit()
    
    return jsonify({"message": "Transfer rejected"}), 200


# =============================
# Cancel Transfer (Creator only)
# =============================
@transfer_bp.route("/<int:transfer_id>/cancel", methods=["PUT"])
@jwt_required()
@roles_required("admin", "manager")
def cancel_transfer(transfer_id):
    transfer = StockTransfer.query.get_or_404(transfer_id)
    
    if transfer.status != "pending":
        return jsonify({"message": f"Cannot cancel {transfer.status} transfer"}), 400
    
    transfer.status = "cancelled"
    db.session.commit()
    
    return jsonify({"message": "Transfer cancelled"}), 200


# =============================
# Complete Transfer (Frontend compatible alias for approve)
# =============================
@transfer_bp.route("/<int:transfer_id>/complete", methods=["PUT"])
@jwt_required()
@roles_required("admin", "manager")
def complete_transfer(transfer_id):
    """Alias for approve - marks transfer as completed using variant logic"""
    return approve_transfer(transfer_id)

