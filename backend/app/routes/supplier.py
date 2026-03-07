from flask import request, jsonify
from flask_jwt_extended import jwt_required
from app.extensions import db
from app.models.supplier import Supplier
from app.utils.decorators import roles_required
from app.routes import supplier_bp
from app.utils.validators import is_valid_indian_mobile

@supplier_bp.route("/", methods=["GET"])
@jwt_required()
def get_suppliers():
    suppliers = Supplier.query.all()
    return jsonify({"suppliers": [s.to_dict() for s in suppliers]}), 200

@supplier_bp.route("/", methods=["POST"])
@jwt_required()
@roles_required("admin")
def create_supplier():
    data = request.get_json() or {}
    if not data.get("name"):
        return jsonify({"message": "Supplier name is required"}), 400
        
    phone = data.get("phone")
    if phone and not is_valid_indian_mobile(phone):
        return jsonify({"message": "Invalid mobile number. Must be 10 digits starting with 6,7,8,9"}), 400
        
    supplier = Supplier(
        name=data.get("name"),
        contact_person=data.get("contact_person"),
        phone=data.get("phone"),
        email=data.get("email"),
        address=data.get("address")
    )
    db.session.add(supplier)
    db.session.commit()
    return jsonify({"message": "Supplier created successfully", "supplier": supplier.to_dict()}), 201

@supplier_bp.route("/<int:supplier_id>", methods=["GET"])
@jwt_required()
def get_supplier(supplier_id):
    supplier = Supplier.query.get_or_404(supplier_id)
    return jsonify({"supplier": supplier.to_dict()}), 200

@supplier_bp.route("/<int:supplier_id>", methods=["PUT"])
@jwt_required()
@roles_required("admin")
def update_supplier(supplier_id):
    supplier = Supplier.query.get_or_404(supplier_id)
    data = request.get_json() or {}
    
    supplier.name = data.get("name", supplier.name)
    supplier.contact_person = data.get("contact_person", supplier.contact_person)
    
    new_phone = data.get("phone", supplier.phone)
    if new_phone and not is_valid_indian_mobile(new_phone):
        return jsonify({"message": "Invalid mobile number. Must be 10 digits starting with 6,7,8,9"}), 400
    supplier.phone = new_phone
    
    supplier.email = data.get("email", supplier.email)
    supplier.address = data.get("address", supplier.address)
    
    db.session.commit()
    return jsonify({"message": "Supplier updated successfully", "supplier": supplier.to_dict()}), 200

@supplier_bp.route("/<int:supplier_id>", methods=["DELETE"])
@jwt_required()
@roles_required("admin")
def delete_supplier(supplier_id):
    supplier = Supplier.query.get_or_404(supplier_id)
    db.session.delete(supplier)
    db.session.commit()
    return jsonify({"message": "Supplier deleted successfully"}), 200
