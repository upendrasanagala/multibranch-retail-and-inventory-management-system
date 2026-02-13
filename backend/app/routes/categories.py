"""
Category Routes
CRUD operations for product categories
"""

from flask import request, jsonify
from flask_jwt_extended import jwt_required

from app.extensions import db
from app.models.category import Category
from app.utils.decorators import roles_required
from app.routes import category_bp


# =============================
# Get All Categories
# =============================
@category_bp.route("/", methods=["GET"])
@jwt_required()
def get_categories():
    print("DEBUG: GET /api/categories/ called")
    categories = Category.query.all()
    print(f"DEBUG: Found {len(categories)} categories")
    
    result = []
    for cat in categories:
        result.append({
            "category_id": cat.category_id,
            "name": cat.name,
            "description": cat.description,
            "parent_category_id": cat.parent_category_id
        })
    
    return jsonify(result), 200


# =============================
# Get Single Category
# =============================
@category_bp.route("/<int:category_id>", methods=["GET"])
@jwt_required()
def get_category(category_id):
    category = Category.query.get_or_404(category_id)
    
    return jsonify({
        "category_id": category.category_id,
        "name": category.name,
        "description": category.description,
        "parent_category_id": category.parent_category_id
    }), 200


# =============================
# Create Category (Admin/Manager)
# =============================
@category_bp.route("/", methods=["POST"])
@jwt_required()
@roles_required("admin", "manager")
def create_category():
    data = request.get_json() or {}
    
    name = data.get("name")
    if not name:
        return jsonify({"message": "Category name is required"}), 400
    
    # Check if category already exists
    if Category.query.filter_by(name=name).first():
        return jsonify({"message": "Category already exists"}), 409
    
    category = Category(
        name=name,
        description=data.get("description"),
        parent_category_id=data.get("parent_category_id")
    )
    
    db.session.add(category)
    db.session.commit()
    
    return jsonify({
        "message": "Category created successfully",
        "category_id": category.category_id
    }), 201


# =============================
# Update Category (Admin/Manager)
# =============================
@category_bp.route("/<int:category_id>", methods=["PUT"])
@jwt_required()
@roles_required("admin", "manager")
def update_category(category_id):
    category = Category.query.get_or_404(category_id)
    data = request.get_json() or {}
    
    category.name = data.get("name", category.name)
    category.description = data.get("description", category.description)
    category.parent_category_id = data.get("parent_category_id", category.parent_category_id)
    
    db.session.commit()
    
    return jsonify({"message": "Category updated successfully"}), 200


# =============================
# Delete Category (Admin Only)
# =============================
@category_bp.route("/<int:category_id>", methods=["DELETE"])
@jwt_required()
@roles_required("admin")
def delete_category(category_id):
    category = Category.query.get_or_404(category_id)
    
    db.session.delete(category)
    db.session.commit()
    
    return jsonify({"message": "Category deleted successfully"}), 200
