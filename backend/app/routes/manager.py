from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash

from app.extensions import db
from app.models.user import User
from app.utils.decorators import roles_required

manager_bp = Blueprint("manager", __name__, url_prefix="/api/manager")

@manager_bp.route("/staff", methods=["POST"])
@jwt_required()
@roles_required("manager")
def create_staff():
    manager_id = get_jwt_identity()
    manager = User.query.get(manager_id)
    
    if not manager or not manager.branch_id:
        return jsonify({"message": "Manager not associated with a branch"}), 400
        
    data = request.get_json() or {}
    
    first_name = data.get("firstName")
    last_name = data.get("lastName")
    email = data.get("email")
    password = data.get("password")
    address = data.get("address")
    phone = data.get("mobile") or data.get("phone")

    if not first_name or not last_name or not email or not password:
        return jsonify({"message": "Missing required fields"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"message": "Email already registered"}), 409

    # Create staff user with manager's branch
    staff = User(
        first_name=first_name,
        last_name=last_name,
        email=email,
        password_hash=generate_password_hash(password),
        role="staff",
        branch_id=manager.branch_id,
        interviewer_id=manager_id,
        address=address,
        phone=phone,
        status="pending"
    )

    db.session.add(staff)
    db.session.commit()

    return jsonify({
        "message": "Staff account created. Waiting for admin approval.",
        "user_id": staff.user_id
    }), 201

@manager_bp.route("/staff", methods=["GET"])
@jwt_required()
@roles_required("manager")
def get_staff():
    manager_id = get_jwt_identity()
    manager = User.query.get(int(manager_id))
    
    if not manager or not manager.branch_id:
        print(f"DEBUG: Manager {manager_id} not found or has no branch_id")
        return jsonify({"message": "Manager not associated with a branch"}), 400
        
    staff_members = User.query.filter_by(
        branch_id=manager.branch_id, 
        role="staff"
    ).all()
    
    print(f"DEBUG: Manager {manager.email} (Branch {manager.branch_id}) found {len(staff_members)} staff")
    
    users = []
    for s in staff_members:
        # Get interviewer name
        interviewer = None
        if s.interviewer_id:
            interviewer = User.query.get(s.interviewer_id)
        
        # Fallback to branch manager if no interviewer assigned
        if not interviewer:
            interviewer = User.query.filter_by(branch_id=s.branch_id, role='manager').first()
            
        interviewer_name = f"{interviewer.first_name} {interviewer.last_name}" if interviewer else "N/A"
        
        # Get branch name
        from app.models.branch import Branch
        branch = Branch.query.get(s.branch_id)
        branch_name = branch.name if branch else "N/A"

        users.append({
            "user_id": s.user_id,
            "firstName": s.first_name,
            "lastName": s.last_name,
            "email": s.email,
            "status": s.status,
            "interview_status": s.interview_status,
            "interviewer_name": interviewer_name,
            "branch_name": branch_name,
            "score": s.score,
            "phone": s.phone,
            "address": s.address,
            "bank_name": s.bank_name,
            "account_number": s.account_number,
            "ifsc_code": s.ifsc_code,
            "created_at": s.created_at.isoformat() if s.created_at else None
        })
        
    return jsonify({"users": users}), 200

@manager_bp.route("/staff/<int:user_id>/interview", methods=["PUT"])
@jwt_required()
@roles_required("manager")
def update_interview_status(user_id):
    manager_id = get_jwt_identity()
    manager = User.query.get(manager_id)
    
    staff = User.query.get_or_404(user_id)
    
    # Ensure manager only updates staff in their own branch
    if staff.branch_id != manager.branch_id or staff.role != "staff":
        return jsonify({"message": "Unauthorized"}), 403
        
    data = request.get_json() or {}
    new_status = data.get("interview_status")
    
    valid_statuses = ["not_started", "round_1", "round_2", "final_round", "completed"]
    if new_status not in valid_statuses:
        return jsonify({"message": "Invalid status"}), 400
        
    staff.interview_status = new_status
    db.session.commit()
    
    return jsonify({"message": "Interview status updated successfully"}), 200

@manager_bp.route("/staff/<int:user_id>/score", methods=["PUT"])
@jwt_required()
@roles_required("manager")
def update_staff_score(user_id):
    manager_id = get_jwt_identity()
    manager = User.query.get(manager_id)
    
    staff = User.query.get_or_404(user_id)
    
    # Ensure manager only updates staff in their own branch
    if staff.branch_id != manager.branch_id or staff.role != "staff":
        return jsonify({"message": "Unauthorized"}), 403
        
    data = request.get_json() or {}
    score = data.get("score")
    
    if score is None or not isinstance(score, int):
        return jsonify({"message": "Invalid score"}), 400
        
    staff.score = score
    db.session.commit()
    
    return jsonify({"message": "Staff score updated successfully"}), 200

@manager_bp.route("/staff/<int:user_id>", methods=["PUT"])
@jwt_required()
@roles_required("manager")
def update_staff(user_id):
    manager_id = get_jwt_identity()
    manager = User.query.get(manager_id)
    
    staff = User.query.get_or_404(user_id)
    
    # Ensure manager only updates staff in their own branch
    if staff.branch_id != manager.branch_id or staff.role != "staff":
        return jsonify({"message": "Unauthorized"}), 403
        
    data = request.get_json() or {}
    
    # Managers can edit everything except role (for now)
    staff.first_name = data.get("firstName", staff.first_name)
    staff.last_name = data.get("lastName", staff.last_name)
    staff.email = data.get("email", staff.email)
    staff.phone = data.get("mobile", staff.phone)
    staff.address = data.get("address", staff.address)
    staff.status = data.get("status", staff.status)
    staff.bank_name = data.get("bank_name", staff.bank_name)
    staff.account_number = data.get("account_number", staff.account_number)
    staff.ifsc_code = data.get("ifsc_code", staff.ifsc_code)
    
    if "password" in data and data["password"]:
        staff.password_hash = generate_password_hash(data["password"])
        
    db.session.commit()
    
    return jsonify({"message": "Staff details updated successfully"}), 200
