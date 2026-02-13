"""
Stock Transfer Routes
Inter-branch stock transfers
"""

from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime

from app.extensions import db
from app.models.stock_transfer import StockTransfer
from app.models.inventory import Inventory
from app.models.product import Product
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
    
    product_id = data.get("product_id")
    from_branch_id = data.get("from_branch_id")
    to_branch_id = data.get("to_branch_id")
    quantity = data.get("quantity")
    notes = data.get("notes")
    
    if not all([product_id, from_branch_id, to_branch_id, quantity]):
        return jsonify({"message": "Missing required fields"}), 400
    
    from app.models.user import User
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    # Enforce branch isolation for non-admins: They must be either source or destination
    if user.role != "admin":
        if user.branch_id not in [from_branch_id, to_branch_id]:
            return jsonify({"message": "You can only create transfers involving your own branch"}), 403

    # Check source inventory
    source_inventory = Inventory.query.filter_by(
        product_id=product_id, branch_id=from_branch_id
    ).first()
    
    if not source_inventory or source_inventory.quantity < quantity:
        available = source_inventory.quantity if source_inventory else 0
        return jsonify({
            "message": f"Insufficient stock in source branch. Available: {available}"
        }), 400
    
    transfer = StockTransfer(
        product_id=product_id,
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
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    # Enforce branch isolation for non-admins
    if user.role != "admin":
        branch_id = user.branch_id
        if not branch_id:
            return jsonify({"message": "User not assigned to a branch"}), 403
    
    query = StockTransfer.query
    
    if branch_id:
        query = query.filter(
            (StockTransfer.from_branch_id == branch_id) |
            (StockTransfer.to_branch_id == branch_id)
        )
    
    if status:
        query = query.filter(StockTransfer.status == status)
    
    paginated = query.order_by(
        StockTransfer.request_date.desc()
    ).paginate(page=page, per_page=per_page, error_out=False)
    
    transfers = []
    for t in paginated.items:
        product = Product.query.get(t.product_id)
        from_branch = Branch.query.get(t.from_branch_id)
        to_branch = Branch.query.get(t.to_branch_id)
        
        transfers.append({
            "transfer_id": t.transfer_id,
            "product_id": t.product_id,
            "product_name": product.name if product else None,
            "from_branch_id": t.from_branch_id,
            "from_branch_name": from_branch.name if from_branch else None,
            "to_branch_id": t.to_branch_id,
            "to_branch_name": to_branch.name if to_branch else None,
            "quantity": t.quantity,
            "status": t.status,
            "request_date": t.request_date.isoformat() if t.request_date else None,
            "completed_date": t.completed_date.isoformat() if t.completed_date else None,
            "notes": t.notes
        })
    
    return jsonify({
        "transfers": transfers,
        "total": paginated.total,
        "pages": paginated.pages,
        "current_page": page
    }), 200


# =============================
# Get Single Transfer
# =============================
@transfer_bp.route("/<int:transfer_id>", methods=["GET"])
@jwt_required()
def get_transfer(transfer_id):
    transfer = StockTransfer.query.get_or_404(transfer_id)
    
    product = Product.query.get(transfer.product_id)
    from_branch = Branch.query.get(transfer.from_branch_id)
    to_branch = Branch.query.get(transfer.to_branch_id)
    
    return jsonify({
        "transfer_id": transfer.transfer_id,
        "product_id": transfer.product_id,
        "product_name": product.name if product else None,
        "from_branch_id": transfer.from_branch_id,
        "from_branch_name": from_branch.name if from_branch else None,
        "to_branch_id": transfer.to_branch_id,
        "to_branch_name": to_branch.name if to_branch else None,
        "quantity": transfer.quantity,
        "status": transfer.status,
        "approved_by": transfer.approved_by,
        "request_date": transfer.request_date.isoformat() if transfer.request_date else None,
        "completed_date": transfer.completed_date.isoformat() if transfer.completed_date else None,
        "notes": transfer.notes
    }), 200


# =============================
# Approve Transfer (Admin/Manager)
# =============================
@transfer_bp.route("/<int:transfer_id>/approve", methods=["PUT"])
@jwt_required()
@roles_required("admin", "manager")
def approve_transfer(transfer_id):
    from app.models.user import User
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    transfer = StockTransfer.query.get_or_404(transfer_id)
    
    # Enforce branch isolation: non-admins must be part of the transfer
    if user.role != "admin" and user.branch_id not in [transfer.from_branch_id, transfer.to_branch_id]:
        return jsonify({"message": "Access denied to this transfer"}), 403

    if transfer.status != "pending":
        return jsonify({"message": f"Transfer already {transfer.status}"}), 400
    
    # Re-check source inventory
    source_inventory = Inventory.query.filter_by(
        product_id=transfer.product_id, branch_id=transfer.from_branch_id
    ).first()
    
    if not source_inventory or source_inventory.quantity < transfer.quantity:
        return jsonify({"message": "Insufficient stock in source branch"}), 400
    
    # Get or create destination inventory
    dest_inventory = Inventory.query.filter_by(
        product_id=transfer.product_id, branch_id=transfer.to_branch_id
    ).first()
    
    if not dest_inventory:
        dest_inventory = Inventory(
            product_id=transfer.product_id,
            branch_id=transfer.to_branch_id,
            quantity=0
        )
        db.session.add(dest_inventory)
    
    # Transfer stock
    source_inventory.quantity -= transfer.quantity
    dest_inventory.quantity += transfer.quantity
    
    # Update transfer status
    transfer.status = "completed"
    transfer.approved_by = user_id
    transfer.completed_date = datetime.utcnow()
    
    db.session.commit()
    
    return jsonify({"message": "Transfer approved and completed"}), 200


# =============================
# Reject Transfer
# =============================
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
# Complete Transfer (Frontend compatible)
# =============================
@transfer_bp.route("/<int:transfer_id>/complete", methods=["PUT"])
@jwt_required()
@roles_required("admin", "manager")
def complete_transfer(transfer_id):
    """Alias for approve - marks transfer as completed"""
    user_id = get_jwt_identity()
    transfer = StockTransfer.query.get_or_404(transfer_id)
    
    if transfer.status == "completed":
        return jsonify({"message": "Transfer already completed"}), 400
    
    if transfer.status not in ["pending", "approved"]:
        return jsonify({"message": f"Cannot complete {transfer.status} transfer"}), 400
    
    # Re-check source inventory if still pending
    if transfer.status == "pending":
        source_inventory = Inventory.query.filter_by(
            product_id=transfer.product_id, branch_id=transfer.from_branch_id
        ).first()
        
        if not source_inventory or source_inventory.quantity < transfer.quantity:
            return jsonify({"message": "Insufficient stock in source branch"}), 400
        
        # Get or create destination inventory
        dest_inventory = Inventory.query.filter_by(
            product_id=transfer.product_id, branch_id=transfer.to_branch_id
        ).first()
        
        if not dest_inventory:
            dest_inventory = Inventory(
                product_id=transfer.product_id,
                branch_id=transfer.to_branch_id,
                quantity=0
            )
            db.session.add(dest_inventory)
        
        # Transfer stock
        source_inventory.quantity -= transfer.quantity
        dest_inventory.quantity += transfer.quantity
    
    transfer.status = "completed"
    transfer.approved_by = user_id
    transfer.completed_date = datetime.utcnow()
    
    db.session.commit()
    
    return jsonify({"message": "Transfer completed successfully"}), 200

