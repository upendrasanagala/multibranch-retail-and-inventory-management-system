from flask import request, jsonify
from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    get_jwt_identity
)
from werkzeug.security import generate_password_hash, check_password_hash

from app.extensions import db
from app.models.user import User
from app.routes import auth_bp
from app.utils.decorators import roles_required


# =============================
# Register User (PENDING)
# =============================
@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}

    first_name = data.get("firstName")
    last_name = data.get("lastName")
    email = data.get("email")
    password = data.get("password")
    role = data.get("role", "staff")
    branch_id = data.get("branch_id")
    address = data.get("address")

    if not first_name or not last_name or not email or not password:
        return jsonify({"message": "Missing required fields"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"message": "Email already exists"}), 409

    user = User(
        name=f"{first_name} {last_name}",
        email=email,
        password_hash=generate_password_hash(password),
        role=role,
        branch_id=branch_id
    )

    # OPTIONAL: if your model has status
    if hasattr(user, "status"):
        user.status = "PENDING"

    db.session.add(user)
    db.session.commit()

    return jsonify({
        "message": "Registration successful. Please wait for admin approval."
    }), 201


# =============================
# Login User
# =============================
@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}

    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"message": "Email and password required"}), 400

    user = User.query.filter_by(email=email).first()

    if not user:
        return jsonify({"message": "Invalid email or password"}), 401

    # OPTIONAL approval check
    if hasattr(user, "status") and user.status != "APPROVED":
        return jsonify({"message": "Account pending admin approval"}), 403

    if not check_password_hash(user.password_hash, password):
        return jsonify({"message": "Invalid email or password"}), 401

    access_token = create_access_token(
        identity=user.user_id,
        additional_claims={"role": user.role}
    )

    return jsonify({
        "access_token": access_token,
        "user": {
            "id": user.user_id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "branch_id": user.branch_id
        }
    }), 200


# =============================
# Get User Profile
# =============================
@auth_bp.route("/profile", methods=["GET"])
@jwt_required()
def profile():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user:
        return jsonify({"message": "User not found"}), 404

    return jsonify({
        "id": user.user_id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "branch_id": user.branch_id
    }), 200


# =============================
# Update Profile
# =============================
@auth_bp.route("/profile", methods=["PUT"])
@jwt_required()
def update_profile():
    user_id = get_jwt_identity()
    user = User.query.get_or_404(user_id)

    data = request.get_json() or {}

    user.name = data.get("name", user.name)
    user.email = data.get("email", user.email)

    db.session.commit()

    return jsonify({"message": "Profile updated successfully"}), 200


# =============================
# Admin Test Route
# =============================
@auth_bp.route("/admin-test", methods=["GET"])
@jwt_required()
@roles_required("admin")
def admin_test():
    return jsonify({"message": "Admin access granted"}), 200
