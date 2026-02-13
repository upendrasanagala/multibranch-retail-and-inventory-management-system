from flask import request, jsonify
from flask_jwt_extended import jwt_required

from app.extensions import db
from app.models.branch import Branch
from app.models.inventory import Inventory
from app.utils.decorators import roles_required
from app.routes import branch_bp


# =============================
# GET ALL BRANCHES
# =============================
@branch_bp.route("", methods=["GET"])
def get_branches():

    branches = Branch.query.all()

    return jsonify({
        "branches": [
            {
                "branch_id": b.branch_id,
                "name": b.name,
                "city": b.city,
                "state": b.state,
                "phone": b.phone,
                "upi_id": b.upi_id,
                "status": b.status
            }
            for b in branches
        ]
    })


# =============================
# GET SINGLE BRANCH
# =============================
@branch_bp.route("/<int:id>", methods=["GET"])
def get_branch(id):

    branch = Branch.query.get_or_404(id)

    return jsonify({
        "branch_id": branch.branch_id,
        "name": branch.name,
        "address": branch.address,
        "city": branch.city,
        "state": branch.state,
        "phone": branch.phone,
        "upi_id": branch.upi_id,
        "status": branch.status
    })


# =============================
# CREATE BRANCH (ADMIN ONLY)
# =============================
@branch_bp.route("", methods=["POST"])
@jwt_required()
@roles_required("admin")
def create_branch():

    data = request.get_json()

    if not data.get("name"):
        return {"error": "Branch name is required"}, 400

    branch = Branch(
        name=data.get("name"),
        address=data.get("address"),
        city=data.get("city"),
        state=data.get("state"),
        postal_code=data.get("postal_code"),
        phone=data.get("phone"),
        upi_id=data.get("upi_id"),
        status="active"
    )

    db.session.add(branch)
    db.session.commit()

    return {"message": "Branch created successfully"}, 201


# =============================
# UPDATE BRANCH (ADMIN / MANAGER)
# =============================
@branch_bp.route("/<int:id>", methods=["PUT"])
@jwt_required()
@roles_required("admin", "manager")
def update_branch(id):

    branch = Branch.query.get_or_404(id)
    data = request.get_json()

    branch.name = data.get("name", branch.name)
    branch.address = data.get("address", branch.address)
    branch.city = data.get("city", branch.city)
    branch.state = data.get("state", branch.state)
    branch.phone = data.get("phone", branch.phone)
    branch.upi_id = data.get("upi_id", branch.upi_id)
    branch.status = data.get("status", branch.status)

    db.session.commit()

    return {"message": "Branch updated successfully"}


# =============================
# GET BRANCH INVENTORY
# =============================
@branch_bp.route("/<int:id>/inventory", methods=["GET"])
@jwt_required()
def get_branch_inventory(id):

    inventory = Inventory.query.filter_by(branch_id=id).all()

    return jsonify({
        "inventory": [
            {
                "inventory_id": item.inventory_id,
                "product_id": item.product_id,
                "quantity": item.quantity
            }
            for item in inventory
        ]
    })


# =============================
# DELETE BRANCH (HARD DELETE)
# =============================
@branch_bp.route("/<int:id>", methods=["DELETE"])
@jwt_required()
@roles_required("admin")
def delete_branch(id):
    branch = Branch.query.get_or_404(id)
    
    # 1. Delete Inventory
    Inventory.query.filter_by(branch_id=id).delete()
    
    # 2. Delete Stock Transfers (From/To)
    from app.models.stock_transfer import StockTransfer
    StockTransfer.query.filter((StockTransfer.from_branch_id == id) | (StockTransfer.to_branch_id == id)).delete()
    
    # 3. Delete Sales Transactions & Items
    from app.models.sales import Transaction, TransactionItem
    # Find all transactions for this branch
    transactions = Transaction.query.filter_by(branch_id=id).all()
    txn_ids = [t.transaction_id for t in transactions]
    
    if txn_ids:
        # Delete items first
        TransactionItem.query.filter(TransactionItem.transaction_id.in_(txn_ids)).delete(synchronize_session=False)
        # Delete transactions
        Transaction.query.filter(Transaction.transaction_id.in_(txn_ids)).delete(synchronize_session=False)

    # 4. Delete Associated Staff (Managers & Staff)
    # Safety: Do NOT delete admins even if linked (though they shouldn't be)
    from app.models.user import User
    User.query.filter(User.branch_id == id, User.role != 'admin').delete()
    
    # Just in case an admin was linked, unlink them
    User.query.filter(User.branch_id == id, User.role == 'admin').update({User.branch_id: None})

    # 5. Delete Branch
    db.session.delete(branch)
    db.session.commit()

    return jsonify({"message": f"Branch '{branch.name}' and all associated data (including staff) permanently deleted"}), 200
