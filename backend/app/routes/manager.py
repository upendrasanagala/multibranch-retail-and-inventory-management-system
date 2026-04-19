from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash

from app.extensions import db
from app.models.user import User
from app.utils.decorators import roles_required
from app.utils.validators import is_valid_indian_mobile
from app.utils.ai_engine import get_inventory_insights, get_sales_forecast
from app.utils.staff_ai import get_staff_performance_metrics
from datetime import datetime

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
    # password = data.get("password")  <-- REMOVED
    address = data.get("address")
    phone = data.get("mobile") or data.get("phone")
    score = data.get("score")
    interview_status = data.get("interview_status", "completed")
    
    # Global HR Fields
    gender = data.get("gender")
    dob_str = data.get("dob")
    joining_date_str = data.get("joining_date")
    pan_number = data.get("pan_number")
    national_id = data.get("national_id")
    emergency_contact_name = data.get("emergency_name")
    emergency_contact_phone = data.get("emergency_phone")
    
    # Banking Fields
    bank_name = data.get("bank_name")
    account_number = data.get("account_number")
    ifsc_code = data.get("ifsc_code")
    upi_id = data.get("upi_id")
    
    def parse_date(date_str):
        if not date_str: return None
        try: return datetime.strptime(date_str, "%Y-%m-%d").date()
        except: return None
    
    if not first_name or not last_name or not email:
        return jsonify({"message": "Missing required fields"}), 400

    if phone and not is_valid_indian_mobile(phone):
        return jsonify({"message": "Invalid mobile number. Must be 10 digits starting with 6,7,8,9"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"message": "Email already registered"}), 409

    # Generate a random 16-char placeholder password
    import secrets
    import string
    alphabet = string.ascii_letters + string.digits
    placeholder_password = ''.join(secrets.choice(alphabet) for i in range(16))

    # Create staff user with manager's branch
    staff = User(
        first_name=first_name,
        last_name=last_name,
        email=email,
        password_hash=generate_password_hash(placeholder_password),
        role="staff",
        branch_id=manager.branch_id,
        interviewer_id=manager_id,
        address=address,
        phone=phone,
        status="pending",
        interview_status=interview_status, 
        score=int(score) if score is not None else 0,
        gender=gender,
        dob=parse_date(dob_str),
        joining_date=parse_date(joining_date_str),
        pan_number=pan_number,
        national_id=national_id,
        emergency_contact_name=emergency_contact_name,
        emergency_contact_phone=emergency_contact_phone,
        bank_name=bank_name,
        account_number=account_number,
        ifsc_code=ifsc_code,
        upi_id=upi_id
    )

    db.session.add(staff)
    db.session.commit()

    return jsonify({
        "message": "Staff account created. Interview marked as completed. Waiting for admin approval.",
        "user_id": staff.user_id
    }), 201


@manager_bp.route("/stats/ai-insights", methods=["GET"])
@jwt_required()
@roles_required("manager")
def get_manager_ai_insights():
    """
    Returns branch-specific AI predictive insights for the manager.
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user.branch_id:
        return jsonify({"message": "User not assigned to a branch"}), 403
        
    insights = get_inventory_insights(branch_id=user.branch_id)
    forecast = get_sales_forecast(branch_id=user.branch_id)
    
    return jsonify({
        "insights": insights,
        "forecast": forecast
    }), 200


@manager_bp.route("/stats/staff-performance", methods=["GET"])
@jwt_required()
@roles_required("manager")
def get_manager_staff_performance():
    """
    Returns AI-driven staff performance metrics for the branch.
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user.branch_id:
        return jsonify({"message": "User not assigned to a branch"}), 403
        
    metrics = get_staff_performance_metrics(branch_id=user.branch_id)
    return jsonify({"performance_metrics": metrics}), 200


@manager_bp.route("/staff", methods=["GET"])
@jwt_required()
@roles_required("manager")
def get_staff():
    manager_id = get_jwt_identity()
    manager = User.query.get(int(manager_id))
    
    if not manager or not manager.branch_id:
        return jsonify({"message": "Manager not associated with a branch"}), 400
        
    staff_members = User.query.filter_by(
        branch_id=manager.branch_id, 
        role="staff"
    ).all()
    
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
            "dob": s.dob.isoformat() if s.dob else None,
            "joining_date": s.joining_date.isoformat() if s.joining_date else None,
            "gender": s.gender,
            "pan_number": s.pan_number,
            "national_id": s.national_id,
            "emergency_name": s.emergency_contact_name,
            "emergency_phone": s.emergency_contact_phone,
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
        
    # Prevent changing status if already completed (unless admin overrides, but this is manager route)
    if staff.interview_status == "completed":
        return jsonify({"message": "Interview process is already completed. Cannot modify status."}), 400

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
    
    # Check for duplicate email if it has changed
    new_email = data.get("email", staff.email)
    if new_email and new_email != staff.email:
        if User.query.filter_by(email=new_email).first():
            return jsonify({"message": "Email already registered"}), 409
            
    # Managers can edit everything except role (for now)
    staff.first_name = data.get("firstName", staff.first_name)
    staff.last_name = data.get("lastName", staff.last_name)
    staff.email = new_email
    
    new_phone = data.get("mobile", staff.phone)
    if new_phone and not is_valid_indian_mobile(new_phone):
        return jsonify({"message": "Invalid mobile number. Must be 10 digits starting with 6,7,8,9"}), 400
    staff.phone = new_phone
    
    staff.address = data.get("address", staff.address)
    staff.status = data.get("status", staff.status)
    staff.bank_name = data.get("bank_name", staff.bank_name)
    staff.account_number = data.get("account_number", staff.account_number)
    staff.ifsc_code = data.get("ifsc_code", staff.ifsc_code)
    
    def parse_date(date_str):
        if not date_str: return None
        try: return datetime.strptime(date_str, "%Y-%m-%d").date()
        except: return None
        
    if "dob" in data: staff.dob = parse_date(data["dob"])
    if "joining_date" in data: staff.joining_date = parse_date(data["joining_date"])
    if "gender" in data: staff.gender = data["gender"]
    if "pan_number" in data: staff.pan_number = data["pan_number"]
    if "national_id" in data: staff.national_id = data["national_id"]
    if "emergency_name" in data: staff.emergency_contact_name = data["emergency_name"]
    if "emergency_phone" in data: staff.emergency_contact_phone = data["emergency_phone"]
    
    if "score" in data:
        score_val = data["score"]
        if score_val == "":
            staff.score = 0
        else:
            try: staff.score = int(score_val)
            except: pass
            
    if "interview_status" in data: staff.interview_status = data["interview_status"]
    
    if "password" in data and data["password"]:
        staff.password_hash = generate_password_hash(data["password"])
        
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Database error: {str(e)}"}), 500
    
    return jsonify({"message": "Staff details updated successfully"}), 200
