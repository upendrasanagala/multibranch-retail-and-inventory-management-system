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
    phone = data.get("mobile")

    if not first_name or not last_name or not email or not password:
        return jsonify({"message": "Missing required fields"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"message": "Email already exists"}), 409

    user = User(
        first_name=first_name,
        last_name=last_name,
        email=email,
        password_hash=generate_password_hash(password),
        role=role,
        branch_id=branch_id,
        address=address,
        phone=phone,
        status="pending"
    )

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

    # Only check approval for non-admin users
    if user.role != "admin" and user.status != "approved":
        return jsonify({"message": "Account pending admin approval"}), 403

    if not check_password_hash(user.password_hash, password):
        return jsonify({"message": "Invalid email or password"}), 401

    access_token = create_access_token(
        identity=str(user.user_id),
        additional_claims={"role": user.role}
    )

    # Look up branch name and UPI ID
    branch_name = None
    upi_id = user.upi_id # Start with individual user UPI
    if user.branch_id:
        from app.models.branch import Branch
        branch = Branch.query.get(user.branch_id)
        if branch:
            branch_name = branch.name
            if not upi_id: # Fallback to branch UPI if individual not set
                upi_id = branch.upi_id

    return jsonify({
        "access_token": access_token,
        "user": {
            "id": user.user_id,
            "employee_id": user.employee_id,
            "firstName": user.first_name,
            "lastName": user.last_name,
            "name": f"{user.first_name} {user.last_name}",
            "email": user.email,
            "role": user.role,
            "branch_id": user.branch_id,
            "branch_name": branch_name,
            "upi_id": upi_id,
            "status": user.status,
            "must_reset_password": user.must_reset_password or False
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
        "firstName": user.first_name,
        "lastName": user.last_name,
        "email": user.email,
        "role": user.role,
        "branch_id": user.branch_id,
        "phone": user.phone,
        "address": user.address,
        "status": user.status,
        "bank_name": user.bank_name,
        "account_number": user.account_number,
        "ifsc_code": user.ifsc_code
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

    user.first_name = data.get("firstName", user.first_name)
    user.last_name = data.get("lastName", user.last_name)
    user.email = data.get("email", user.email)
    user.phone = data.get("phone", user.phone)
    user.address = data.get("address", user.address)
    
    # Allow staff to update their own bank details for now
    user.bank_name = data.get("bank_name", user.bank_name)
    user.account_number = data.get("account_number", user.account_number)
    user.ifsc_code = data.get("ifsc_code", user.ifsc_code)

    db.session.commit()

    return jsonify({"message": "Profile updated successfully"}), 200




# =============================
# Forgot Password - Send OTP
# =============================
@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    data = request.get_json() or {}
    email = data.get("email")
    
    if not email:
        return jsonify({"message": "Email is required"}), 400
    
    user = User.query.filter_by(email=email).first()
    if not user:
        # Don't reveal if email exists
        return jsonify({"message": "If the email exists, an OTP has been sent."}), 200
    
    import random
    from datetime import datetime, timedelta
    otp = str(random.randint(100000, 999999))
    user.reset_token = otp
    user.reset_token_expiry = datetime.utcnow() + timedelta(minutes=10)
    db.session.commit()
    
    # Send OTP email
    email_sent = False
    try:
        from flask_mail import Message
        from app.extensions import mail
        msg = Message(
            "Password Reset OTP - Retail System",
            recipients=[user.email]
        )
        msg.body = f"""Hello {user.first_name},

Your password reset OTP is:

    {otp}

This OTP is valid for 10 minutes. Do not share it with anyone.

Regards,
Retail & Inventory Management System
"""
        mail.send(msg)
        print(f"OTP sent to {user.email}")
        email_sent = True
    except Exception as e:
        print(f"Failed to send OTP email: {e}")
        # Fallback to returning OTP in response if email fails
    
    if email_sent:
        return jsonify({"message": "OTP sent to your email. Please check your inbox."}), 200
    else:
        return jsonify({
            "message": f"Failed to send email. (Fallback Config: OTP is {otp})"
        }), 200


# =============================
# Reset Password with OTP
# =============================
@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    data = request.get_json() or {}
    email = data.get("email")
    otp = data.get("otp")
    new_password = data.get("new_password")
    
    if not email or not otp or not new_password:
        return jsonify({"message": "Email, OTP, and new password are required"}), 400
    
    if len(new_password) < 8:
        return jsonify({"message": "Password must be at least 8 characters"}), 400
    
    import re
    if not re.search(r'[A-Z]', new_password):
        return jsonify({"message": "Password must contain at least one uppercase letter"}), 400
    if not re.search(r'[a-z]', new_password):
        return jsonify({"message": "Password must contain at least one lowercase letter"}), 400
    if not re.search(r'[0-9]', new_password):
        return jsonify({"message": "Password must contain at least one number"}), 400
    if not re.search(r'[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?]', new_password):
        return jsonify({"message": "Password must contain at least one special symbol"}), 400
    
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"message": "Invalid email or OTP"}), 400
    
    from datetime import datetime
    if not user.reset_token or user.reset_token != otp:
        return jsonify({"message": "Invalid OTP"}), 400
    
    if user.reset_token_expiry and user.reset_token_expiry < datetime.utcnow():
        return jsonify({"message": "OTP has expired. Please request a new one."}), 400
    
    user.password_hash = generate_password_hash(new_password)
    user.must_reset_password = False
    user.reset_token = None
    user.reset_token_expiry = None
    db.session.commit()
    
    return jsonify({"message": "Password reset successfully. You can now log in with your new password."}), 200
