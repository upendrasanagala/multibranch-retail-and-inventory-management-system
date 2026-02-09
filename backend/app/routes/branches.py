from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required

from app.extensions import db
from app.models.branch import Branch
from app.models.inventory import Inventory
from app.utils.decorators import roles_required


branch_bp = Blueprint("branches", __name__, url_prefix="/api/branches")


# =============================
# GET ALL BRANCHES
# =============================
@branch_bp.route("", methods=["GET"])
@jwt_required(optional=True)
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
                "status": b.status
            }
            for b in branches
        ]
    })


# =============================
# GET SINGLE BRANCH
# =============================
@branch_bp.route("/<int:id>", methods=["GET"])
@jwt_required(optional=True)
def get_branch(id):

    branch = Branch.query.get_or_404(id)

    return jsonify({
        "branch_id": branch.branch_id,
        "name": branch.name,
        "address": branch.address,
        "city": branch.city,
        "state": branch.state,
        "phone": branch.phone,
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
