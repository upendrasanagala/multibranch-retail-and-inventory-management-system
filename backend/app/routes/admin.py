"""
Admin Routes
Dashboard statistics, user management, reports
"""

from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from sqlalchemy import func

from app.extensions import db
from app.models.user import User
from app.models.branch import Branch
from app.models.product import Product
from app.models.category import Category
from app.models.sales import SalesTransaction, TransactionItem
from app.models.stock_transfer import StockTransfer
from app.models.announcement import Announcement
from app.models.adjustment import InventoryAdjustment
from app.utils.decorators import roles_required
from app.routes import admin_bp
from app.utils.validators import is_valid_indian_mobile
from flask_mail import Message
from app.extensions import mail
from app.utils.ai_engine import (
    get_inventory_insights, 
    get_sales_forecast, 
    get_pricing_recommendations, 
    get_branch_rebalance_suggestions,
    get_wastage_alerts,
    simulate_profit_scenario,
    get_category_performance_matrix
)


# =============================
# Dashboard Statistics
# =============================
@admin_bp.route("/stats", methods=["GET"])
@jwt_required()
@roles_required("admin")
def get_dashboard_stats():
    # Counts
    total_users = User.query.count()
    total_branches = Branch.query.count()
    total_products = Product.query.count()
    
    # Sales stats (last 30 days)
    thirty_days_ago = datetime.now() - timedelta(days=30)
    
    recent_sales = SalesTransaction.query.filter(
        SalesTransaction.transaction_date >= thirty_days_ago,
        SalesTransaction.status == "completed"
    ).all()
    
    total_revenue = sum(s.total_amount or 0 for s in recent_sales)
    total_transactions = len(recent_sales)
    
    from app.models.product import ProductVariant
    # Low stock items (count variations below threshold)
    low_stock_count = ProductVariant.query.filter(
        ProductVariant.stock_quantity <= ProductVariant.min_threshold
    ).count()
    
    # Pending transfers
    pending_transfers = StockTransfer.query.filter(
        StockTransfer.status == "pending"
    ).count()
    
    # Pending user approvals
    pending_users = User.query.filter_by(status="pending").count()
    approved_users = User.query.filter_by(status="approved").count()
    
    # Today's Sales
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    today_sales = SalesTransaction.query.filter(
        SalesTransaction.transaction_date >= today_start,
        SalesTransaction.status == "completed"
    ).all()
    
    today_revenue = sum(s.total_amount or 0 for s in today_sales)
    today_cash = sum(s.total_amount or 0 for s in today_sales if s.payment_method and s.payment_method.lower() == 'cash')
    today_upi = sum(s.total_amount or 0 for s in today_sales if s.payment_method and s.payment_method.lower() == 'upi')
    today_qr = sum(s.total_amount or 0 for s in today_sales if s.payment_method and s.payment_method.lower() == 'qr')
    
    # Critical Low Stock (Top 5 Variants)
    critical_stock = db.session.query(
        ProductVariant, Product.name, Branch.name
    ).join(
        Product, ProductVariant.product_id == Product.product_id
    ).join(
        Branch, ProductVariant.branch_id == Branch.branch_id
    ).filter(
        ProductVariant.stock_quantity <= ProductVariant.min_threshold
    ).order_by(ProductVariant.stock_quantity.asc()).limit(5).all()
    
    critical_items = [{
        "product": f"{p_name} ({pv.variant_size})" if pv.variant_size else p_name,
        "branch": b_name,
        "qty": pv.stock_quantity,
        "min": pv.min_threshold
    } for pv, p_name, b_name in critical_stock]
    
    # Branch Sales Performance (Last 30 days)
    branch_performance = db.session.query(
        Branch.name, func.sum(SalesTransaction.total_amount)
    ).join(
        SalesTransaction, Branch.branch_id == SalesTransaction.branch_id
    ).filter(
        SalesTransaction.transaction_date >= thirty_days_ago,
        SalesTransaction.status == "completed"
    ).group_by(Branch.name).all()
    
    branch_stats = [{
        "name": name,
        "revenue": float(revenue or 0)
    } for name, revenue in branch_performance]

    return jsonify({
        "total_users": total_users,
        "total_branches": total_branches,
        "total_products": total_products,
        "total_revenue_30d": total_revenue,
        "total_transactions_30d": total_transactions,
        "low_stock_count": low_stock_count,
        "pending_transfers": pending_transfers,
        "pending_users": pending_users,
        "approved_users": approved_users,
        # New Stats
        "today_revenue": today_revenue,
        "today_cash": today_cash,
        "today_upi": today_upi,
        "today_qr": today_qr,
        "critical_items": critical_items,
        "branch_performance": branch_stats
    }), 200


@admin_bp.route("/stats/ai-insights", methods=["GET"])
@jwt_required()
@roles_required("admin")
def get_admin_ai_insights():
    """
    Returns system-wide AI-driven predictive insights.
    """
    insights = get_inventory_insights()
    forecast = get_sales_forecast()
    category_matrix = get_category_performance_matrix()
    
    return jsonify({
        "insights": insights,
        "forecast": forecast,
        "category_performance": category_matrix
    }), 200


@admin_bp.route("/stats/pricing-alerts", methods=["GET"])
@jwt_required()
@roles_required("admin")
def get_admin_pricing_alerts():
    """
    Returns AI-driven pricing recommendations.
    """
    alerts = get_pricing_recommendations()
    return jsonify({"alerts": alerts}), 200


@admin_bp.route("/stats/rebalance", methods=["GET"])
@jwt_required()
@roles_required("admin")
def get_admin_rebalance_suggestions():
    """
    Returns AI-driven inter-branch stock rebalancing suggestions.
    """
    suggestions = get_branch_rebalance_suggestions()
    return jsonify({"suggestions": suggestions}), 200


@admin_bp.route("/stats/wastage", methods=["GET"])
@jwt_required()
@roles_required("admin")
def get_admin_wastage_alerts():
    """
    Returns AI-driven wastage alerts for expiring stock.
    """
    alerts = get_wastage_alerts()
    print(f"DEBUG: Returning {len(alerts)} wastage alerts.")
    return jsonify({"alerts": alerts}), 200


@admin_bp.route("/stats/simulate", methods=["POST"])
@jwt_required()
@roles_required("admin")
def simulate_admin_profit():
    """
    Runs a 'What-If' profit simulation.
    """
    data = request.json
    price_change = data.get("price_change", 0)
    discount_change = data.get("discount_change", 0)
    
    result = simulate_profit_scenario(price_change, discount_change)
    print(f"DEBUG: Simulation result: {result}")
    return jsonify(result), 200


@admin_bp.route("/stats/trigger-announcements", methods=["POST"])
@jwt_required()
@roles_required("admin")
def trigger_ai_announcements():
    """
    Triggers the AI engine to generate announcement drafts based on system performance.
    """
    from app.utils.ai_engine import create_ai_announcement_drafts
    count = create_ai_announcement_drafts()
    return jsonify({
        "message": f"AI analysis complete. {count} new drafts created.",
        "drafts_created": count
    }), 200


# =============================
# Get All Users
# =============================
@admin_bp.route("/users", methods=["GET"])
@jwt_required()
@roles_required("admin")
def get_users():
    role = request.args.get("role")
    branch_id = request.args.get("branch_id", type=int)
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    
    query = User.query
    
    if role:
        query = query.filter(User.role == role)
    if branch_id:
        query = query.filter(User.branch_id == branch_id)
    
    paginated = query.order_by(User.user_id.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    users = []
    for u in paginated.items:
        branch = Branch.query.get(u.branch_id) if u.branch_id else None
        users.append({
            "user_id": u.user_id,
            "employee_id": u.employee_id,
            "firstName": u.first_name,
            "lastName": u.last_name,
            "email": u.email,
            "role": u.role,
            "phone": u.phone,
            "status": u.status,
            "branch_id": u.branch_id,
            "branch_name": branch.name if branch else None,
            "branch_upi": branch.upi_id if branch else None,
            "upi_id": u.upi_id,
            "bank_name": u.bank_name,
            "account_number": u.account_number,
            "ifsc_code": u.ifsc_code,
            "dob": u.dob.isoformat() if u.dob else None,
            "joining_date": u.joining_date.isoformat() if u.joining_date else None,
            "gender": u.gender,
            "pan_number": u.pan_number,
            "national_id": u.national_id,
            "emergency_name": u.emergency_contact_name,
            "emergency_phone": u.emergency_contact_phone,
            "address": u.address,
            "interview_status": u.interview_status,
            "interviewer_name": (
                f"{int_user.first_name} {int_user.last_name}" 
                if u.interviewer_id and (int_user := User.query.get(u.interviewer_id)) 
                else (
                    f"{bm.first_name} {bm.last_name}" 
                    if (bm := User.query.filter_by(branch_id=u.branch_id, role='manager').first()) 
                    else "N/A"
                )
            ),
            "score": u.score,
            "created_at": u.created_at.isoformat() if u.created_at else None
        })
    
    return jsonify({
        "users": users,
        "total": paginated.total,
        "pages": paginated.pages,
        "current_page": page
    }), 200


# =============================
# Update User Role/Branch
# =============================
@admin_bp.route("/users/<int:user_id>", methods=["PUT"])
@jwt_required()
@roles_required("admin")
def update_user(user_id):
    user = User.query.get_or_404(user_id)
    data = request.get_json() or {}
    
    user.role = data.get("role", user.role)
    user.branch_id = data.get("branch_id", user.branch_id)
    user.first_name = data.get("firstName", user.first_name)
    user.last_name = data.get("lastName", user.last_name)
    
    new_phone = data.get("phone", user.phone)
    if new_phone and not is_valid_indian_mobile(new_phone):
        return jsonify({"message": "Invalid mobile number. Must be 10 digits starting with 6,7,8,9"}), 400
    user.phone = new_phone
    
    user.address = data.get("address", user.address)
    user.upi_id = data.get("upi_id", user.upi_id)
    user.bank_name = data.get("bank_name", user.bank_name)
    user.account_number = data.get("account_number", user.account_number)
    user.ifsc_code = data.get("ifsc_code", user.ifsc_code)
    
    # HR Fields
    from datetime import datetime
    if "dob" in data:
        try: user.dob = datetime.strptime(data["dob"], "%Y-%m-%d").date() if data["dob"] else None
        except: pass
    if "joiningDate" in data:
        try: user.joining_date = datetime.strptime(data["joiningDate"], "%Y-%m-%d").date() if data["joiningDate"] else None
        except: pass
    
    user.gender = data.get("gender", user.gender)
    user.pan_number = data.get("panNumber", user.pan_number)
    user.national_id = data.get("nationalId", user.national_id)
    user.emergency_contact_name = data.get("emergencyName", user.emergency_contact_name)
    user.emergency_contact_phone = data.get("emergencyPhone", user.emergency_contact_phone)
    user.status = data.get("status", user.status)
    
    db.session.commit()
    
    return jsonify({"message": "User updated successfully"}), 200


# =============================
# Deactivate User (Soft Delete)
# =============================
@admin_bp.route("/users/<int:user_id>", methods=["DELETE"])
@jwt_required()
@roles_required("admin")
def delete_user(user_id):
    user = User.query.get_or_404(user_id)
    
    try:
        # Soft delete: Change status to 'suspended' to preserve history
        # (interviewer logs, sales records, etc.)
        user.status = 'suspended'
        # Optional: Append deleted tag to email to free up the address if needed, 
        # but better to keep it to prevent re-registration confusion.
        # user.email = f"{user.email}_deleted_{user.user_id}" 
        
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Failed to delete user: {str(e)}"}), 500
    
    return jsonify({"message": "User deactivated successfully"}), 200


# =============================
# Permanent Delete (Hard Delete)
# =============================
@admin_bp.route("/users/<int:user_id>/permanent", methods=["DELETE"])
@jwt_required()
@roles_required("admin")
def delete_user_permanent(user_id):
    user = User.query.get_or_404(user_id)
    
    # 🚨 SECURITY CHECK: Protect the primary admin
    if user.email == 'admin@retail.com':
        return jsonify({"message": "The primary administrator account cannot be deleted."}), 403

    try:
        # Check for historical records to prevent database inconsistency
        has_sales = SalesTransaction.query.filter_by(staff_id=user_id).first()
        has_transfers_approved = StockTransfer.query.filter_by(approved_by=user_id).first()
        has_adjustments = InventoryAdjustment.query.filter_by(adjusted_by=user_id).first()
        has_announcements = Announcement.query.filter_by(created_by_id=user_id).first()

        if any([has_sales, has_transfers_approved, has_adjustments, has_announcements]):
            return jsonify({
                "message": (
                    "User cannot be permanently deleted because they have historical activity records "
                    "(Sales, Transfers, Adjustments, or Announcements). "
                    "Please use 'Suspend' to deactivate this user instead."
                )
            }), 400

        db.session.delete(user)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Critical Error during permanent deletion: {str(e)}"}), 500
    
    return jsonify({"message": f"User {user.first_name} has been permanently deleted from the system."}), 200


# =============================
# Reactivate User
# =============================
@admin_bp.route("/users/<int:user_id>/reactivate", methods=["PUT"])
@jwt_required()
@roles_required("admin")
def reactivate_user(user_id):
    user = User.query.get_or_404(user_id)
    
    if user.status != 'suspended':
        return jsonify({"message": "User is not suspended"}), 400
    
    try:
        user.status = 'approved'
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Failed to reactivate user: {str(e)}"}), 500
    
    return jsonify({"message": "User reactivated successfully"}), 200


# =============================
# Create User (Admin Only)
# =============================
@admin_bp.route("/users", methods=["POST"])
@jwt_required()
@roles_required("admin")
def create_user():
    data = request.get_json()
    
    # Validation
    required_fields = ["firstName", "lastName", "email", "mobile", "branch_id"]
    for field in required_fields:
        if not data.get(field):
            return jsonify({"message": f"Missing required field: {field}"}), 400

    if not is_valid_indian_mobile(data.get("mobile")):
        return jsonify({"message": "Invalid mobile number. Must be 10 digits starting with 6,7,8,9"}), 400

    # Check if email exists
    existing_user = User.query.filter_by(email=data["email"]).first()
    
    # Password Logic
    from werkzeug.security import generate_password_hash
    raw_password = data.get("password") or "Manager@123"
    
    if existing_user:
        if existing_user.status == 'suspended':
            # Reactivate suspended user
            existing_user.first_name = data["firstName"]
            existing_user.last_name = data["lastName"]
            existing_user.phone = data["mobile"]
            existing_user.address = data.get("address", "")
            existing_user.branch_id = data["branch_id"]
            existing_user.role = "manager" # Ensure role is correct
            existing_user.status = "approved"
            existing_user.must_reset_password = True
            existing_user.password_hash = generate_password_hash(raw_password)
            
            db.session.commit()
            
            return jsonify({
                "message": "User reactivated successfully",
                "user": {
                    "id": existing_user.user_id,
                    "email": existing_user.email,
                    "employee_id": existing_user.employee_id,
                    "temp_password": raw_password
                }
            }), 201
        else:
            return jsonify({"message": "Email already exists"}), 400

    # Auto-generate Employee ID for new users
    import random, string
    last_emp = db.session.query(func.max(User.employee_id)).filter(User.employee_id.isnot(None)).scalar()
    if last_emp and last_emp.startswith("EMP-"):
        try:
            next_num = int(last_emp.split("-")[1]) + 1
        except ValueError:
            next_num = 10001
    else:
        next_num = 10001
    employee_id = f"EMP-{next_num}"
    
    # Parse Dates for HR
    dob = None
    if data.get("dob"):
        try: dob = datetime.strptime(data["dob"], "%Y-%m-%d").date()
        except: pass
    
    joining_date = None
    if data.get("joiningDate"):
        try: joining_date = datetime.strptime(data["joiningDate"], "%Y-%m-%d").date()
        except: pass

    new_user = User(
        first_name=data["firstName"],
        last_name=data["lastName"],
        email=data["email"],
        phone=data["mobile"],
        address=data.get("address", ""),
        role="manager",  # Hardcoded for this specific Admin action
        branch_id=data["branch_id"],
        employee_id=employee_id,
        status="approved", 
        must_reset_password=True,
        password_hash=generate_password_hash(raw_password),
        # New HR Fields
        dob=dob,
        joining_date=joining_date,
        gender=data.get("gender"),
        pan_number=data.get("panNumber"),
        national_id=data.get("nationalId"),
        emergency_contact_name=data.get("emergencyName"),
        emergency_contact_phone=data.get("emergencyPhone"),
        upi_id=data.get("upiId"),
        bank_name=data.get("bankName"),
        account_number=data.get("accountNumber"),
        ifsc_code=data.get("ifscCode")
    )
    
    try:
        db.session.add(new_user)
        db.session.commit()
        
        # Send Welcome Email
        email_sent = False
        try:
            msg = Message(
                "Welcome to Retail System - Manager Access",
                recipients=[new_user.email]
            )
            msg.body = f"""Hello {new_user.first_name},

You have been added as a Manager at {new_user.branch_id} (Branch ID).

Your Employee ID: {employee_id}
Temporary Password: {raw_password}

Please log in and change your password immediately.

Regards,
Admin Team
"""
            mail.send(msg)
            email_sent = True
        except Exception:
            # Email failure shouldn't block user creation
            pass

        return jsonify({
            "message": "User created successfully" + (" (Email sent)" if email_sent else " (Email failed, copy credentials below)"),
            "user": {
                "id": new_user.user_id,
                "email": new_user.email,
                "employee_id": employee_id,
                "temp_password": raw_password
            }
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Failed to create user: {str(e)}"}), 500


# =============================
# Approve User (Frontend compatible)
# =============================
@admin_bp.route("/users/<int:user_id>/approve", methods=["PUT"])
@jwt_required()
@roles_required("admin")
def approve_user(user_id):
    user = User.query.get_or_404(user_id)
    
    if user.status == "approved":
        return jsonify({"message": "User already approved", "employee_id": user.employee_id}), 200

    user.status = "approved"
    
    # Generate unique Employee ID
    import random, string
    last_emp = db.session.query(func.max(User.employee_id)).filter(User.employee_id.isnot(None)).scalar()
    if last_emp and last_emp.startswith("EMP-"):
        next_num = int(last_emp.split("-")[1]) + 1
    else:
        next_num = 10001
    user.employee_id = f"EMP-{next_num}"
    
    # For staff: generate default password and require reset
    default_password = None
    if user.role == "staff":
        from werkzeug.security import generate_password_hash
        default_password = ''.join(random.choices(string.ascii_letters + string.digits, k=8))
        user.password_hash = generate_password_hash(default_password)
        user.must_reset_password = True
    
    # Send Approval Email
    email_sent = False
    try:
        subject = "Account Approved - Retail System"
        body = f"""Hello {user.first_name},

Your account has been approved!

Employee ID: {user.employee_id}
"""
        if default_password:
            body += f"Temporary Password: {default_password}\n"
            body += "Please change your password upon first login.\n"
        
        body += "\nRegards,\nAdmin Team"
        
        msg = Message(subject, recipients=[user.email])
        msg.body = body
        mail.send(msg)
        email_sent = True
    except Exception:
        # Email failure shouldn't block approval
        pass

    db.session.commit()
    
    response_data = {
        "message": f"User approved. Employee ID: {user.employee_id}" + (" (Email sent)" if email_sent else " (Email failed)"),
        "employee_id": user.employee_id
    }
    
    if default_password:
        response_data["password"] = default_password
        response_data["message"] += f". Password: {default_password}"
        
    return jsonify(response_data), 200


# =============================
# Sales Report
# =============================
@admin_bp.route("/reports/sales", methods=["GET"])
@jwt_required()
@roles_required("admin", "manager")
def sales_report():
    branch_id = request.args.get("branch_id", type=int)
    period = request.args.get("period", "30")  # days
    
    start_date_str = request.args.get("start_date")
    end_date_str = request.args.get("end_date")
    
    start_date = None
    end_date = datetime.now()

    if start_date_str and end_date_str:
        try:
            start_date = datetime.strptime(start_date_str, "%Y-%m-%d")
            end_date = datetime.strptime(end_date_str, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
        except ValueError:
            start_date = None

    if not start_date:
        try:
            days = int(period)
        except ValueError:
            days = 30
        
        if days == 0:
            start_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        else:
            start_date = datetime.now() - timedelta(days=days)
    
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    # Enforce branch isolation for non-admins
    if user.role != "admin":
        branch_id = user.branch_id
        if not branch_id:
            return jsonify({"message": "User not assigned to a branch"}), 403

    # Query transactions with branch names
    query = db.session.query(
        SalesTransaction, 
        Branch.name.label("branch_name")
    ).join(
        Branch, SalesTransaction.branch_id == Branch.branch_id
    ).filter(
        SalesTransaction.transaction_date >= start_date,
        SalesTransaction.transaction_date <= end_date,
        SalesTransaction.status == "completed"
    )
    
    if branch_id:
        query = query.filter(SalesTransaction.branch_id == branch_id)
    
    results = query.all()
    
    # Process transactions and breakdowns
    daily_sales = {}
    branch_sales = {}
    all_transactions = []
    
    for t, b_name in results:
        # 1. Individual Transaction Entry
        all_transactions.append({
            "transaction_id": t.transaction_id,
            "branch_id": t.branch_id,
            "branch_name": b_name,
            "total_amount": t.total_amount,
            "payment_method": t.payment_method,
            "transaction_date": t.transaction_date.strftime("%Y-%m-%d %H:%M:%S")
        })

        # 2. Group by date
        date_key = t.transaction_date.strftime("%Y-%m-%d")
        if date_key not in daily_sales:
            daily_sales[date_key] = {"date": date_key, "total": 0, "count": 0}
        daily_sales[date_key]["total"] += t.total_amount
        daily_sales[date_key]["count"] += 1
        
        # 3. Group by branch
        if b_name not in branch_sales:
            branch_sales[b_name] = {"branch": b_name, "total": 0, "count": 0}
        branch_sales[b_name]["total"] += t.total_amount
        branch_sales[b_name]["count"] += 1
    
    # Sort results
    sorted_daily = sorted(daily_sales.values(), key=lambda x: x["date"])
    sorted_branch = sorted(branch_sales.values(), key=lambda x: x["total"], reverse=True)
    sorted_transactions = sorted(all_transactions, key=lambda x: x["transaction_date"], reverse=True)
    
    total_revenue = sum(t[0].total_amount for t in results)
    total_count = len(results)
    total_discount = sum(t[0].discount for t in results if t[0].discount)
    
    delta = end_date - start_date
    actual_days = max(delta.days, 1)
    avg_ticket = total_revenue / total_count if total_count > 0 else 0
    
    # Payment method breakdown
    payment_breakdown = {}
    for t, b_name in results:
        pm = (t.payment_method or 'cash').lower()
        if pm not in payment_breakdown:
            payment_breakdown[pm] = {"method": pm.upper(), "count": 0, "total": 0}
        payment_breakdown[pm]["count"] += 1
        payment_breakdown[pm]["total"] += t.total_amount
    
    for pm in payment_breakdown.values():
        pm["percentage"] = round((pm["total"] / total_revenue * 100) if total_revenue > 0 else 0, 1)
    
    sorted_payment = sorted(payment_breakdown.values(), key=lambda x: x["total"], reverse=True)
    
    # Top selling products (Variant-aware)
    transaction_ids = [t[0].transaction_id for t in results]
    top_products = []
    if transaction_ids:
        variant_sales = db.session.query(
            TransactionItem.variant_id,
            func.sum(TransactionItem.quantity).label("total_quantity"),
            func.sum(TransactionItem.subtotal).label("total_revenue")
        ).filter(
            TransactionItem.transaction_id.in_(transaction_ids)
        ).group_by(
            TransactionItem.variant_id
        ).order_by(
            func.sum(TransactionItem.subtotal).desc()
        ).limit(10).all()
        
        from app.models.product import ProductVariant
        for vid, total_qty, total_rev in variant_sales:
            variant = ProductVariant.query.get(vid)
            if variant:
                product = Product.query.get(variant.product_id)
                top_products.append({
                    "product_name": f"{product.name} ({variant.variant_size})" if variant.variant_size else product.name,
                    "total_quantity": total_qty,
                    "total_revenue": float(total_rev or 0),
                    "gst_percent": variant.gst_percent
                })
    
    # GST summary (breakup by slab)
    gst_summary = {}
    for t_id in transaction_ids:
        items = TransactionItem.query.filter_by(transaction_id=t_id).all()
        for item in items:
            variant = ProductVariant.query.get(item.variant_id)
            rate = variant.gst_percent if variant else 0
            if rate not in gst_summary:
                gst_summary[rate] = {"slab": f"{rate}%", "taxable": 0, "cgst": 0, "sgst": 0, "total_tax": 0}
            item_total = float(item.subtotal or 0)
            taxable = item_total / (1 + rate / 100) if rate > 0 else item_total
            tax = item_total - taxable
            gst_summary[rate]["taxable"] += round(taxable, 2)
            gst_summary[rate]["cgst"] += round(tax / 2, 2)
            gst_summary[rate]["sgst"] += round(tax / 2, 2)
            gst_summary[rate]["total_tax"] += round(tax, 2)
    
    sorted_gst = sorted(gst_summary.values(), key=lambda x: float(x["slab"].replace('%','')))
    
    return jsonify({
        "period_days": actual_days,
        "total_revenue": total_revenue,
        "total_transactions": total_count,
        "average_per_day": total_revenue / actual_days,
        "avg_ticket_size": round(avg_ticket, 2),
        "total_discount": total_discount,
        "daily_breakdown": sorted_daily,
        "branch_breakdown": sorted_branch,
        "transactions": sorted_transactions,
        "payment_breakdown": sorted_payment,
        "top_products": top_products,
        "gst_summary": sorted_gst
    }), 200


# =============================
# Inventory Report
# =============================
@admin_bp.route("/reports/inventory", methods=["GET"])
@jwt_required()
@roles_required("admin", "manager")
def inventory_report():
    branch_id = request.args.get("branch_id", type=int)
    
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    # Enforce branch isolation for non-admins
    if user.role != "admin":
        branch_id = user.branch_id
        if not branch_id:
            return jsonify({"message": "User not assigned to a branch"}), 403

    query = db.session.query(
        Inventory, Product, Branch.name.label("branch_name"), Category.name.label("cat_name")
    ).join(
        Product, Inventory.product_id == Product.product_id
    ).join(
        Branch, Inventory.branch_id == Branch.branch_id
    ).outerjoin(
        Category, Product.category_id == Category.category_id
    )
    
    if branch_id:
        query = query.filter(Inventory.branch_id == branch_id)
    
    results = query.all()
    
    total_items = len(results)
    total_stock_value = sum(inv.quantity * prod.unit_price for inv, prod, b_name, cat_name in results)
    
    # Full inventory list with severity
    all_items = []
    category_breakdown = {}
    out_of_stock = 0
    
    for inv, prod, b_name, cat_name in results:
        qty = inv.quantity
        threshold = inv.min_threshold
        
        # Severity levels
        if qty == 0:
            severity = "out_of_stock"
            out_of_stock += 1
        elif qty <= threshold:
            severity = "critical"
        elif qty <= threshold * 2:
            severity = "warning"
        else:
            severity = "ok"
        
        item_value = qty * prod.unit_price
        cat = cat_name or "Uncategorized"
        
        all_items.append({
            "product_id": prod.product_id,
            "product_name": prod.name,
            "sku": prod.sku,
            "category": cat,
            "branch_id": inv.branch_id,
            "branch_name": b_name,
            "quantity": qty,
            "unit_price": prod.unit_price,
            "stock_value": round(item_value, 2),
            "gst_percent": prod.gst_percent or 0,
            "min_threshold": threshold,
            "severity": severity
        })
        
        # Category breakdown
        if cat not in category_breakdown:
            category_breakdown[cat] = {"category": cat, "items": 0, "total_qty": 0, "total_value": 0}
        category_breakdown[cat]["items"] += 1
        category_breakdown[cat]["total_qty"] += qty
        category_breakdown[cat]["total_value"] += round(item_value, 2)
    
    low_stock_items = [i for i in all_items if i["severity"] in ("critical", "out_of_stock")]
    sorted_categories = sorted(category_breakdown.values(), key=lambda x: x["total_value"], reverse=True)
    
    return jsonify({
        "total_items": total_items,
        "total_stock_value": total_stock_value,
        "low_stock_count": len(low_stock_items),
        "out_of_stock_count": out_of_stock,
        "low_stock_items": low_stock_items,
        "all_items": all_items,
        "category_breakdown": sorted_categories
    }), 200


# =============================
# Top Selling Products Report
# =============================
@admin_bp.route("/reports/top-products", methods=["GET"])
@jwt_required()
@roles_required("admin", "manager")
def top_products_report():
    branch_id = request.args.get("branch_id", type=int)
    limit = request.args.get("limit", 10, type=int)
    period = request.args.get("period", "30")
    
    start_date_str = request.args.get("start_date")
    end_date_str = request.args.get("end_date")
    
    start_date = None
    end_date = datetime.now()

    if start_date_str and end_date_str:
        try:
            start_date = datetime.strptime(start_date_str, "%Y-%m-%d")
            end_date = datetime.strptime(end_date_str, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
        except ValueError:
            start_date = None

    if not start_date:
        try:
            days = int(period)
        except ValueError:
            days = 30
        
        if days == 0:
            start_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        else:
            start_date = datetime.now() - timedelta(days=days)
    
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    # Enforce branch isolation for non-admins
    if user.role != "admin":
        branch_id = user.branch_id
        if not branch_id:
            return jsonify({"message": "User not assigned to a branch"}), 403

    # Get transactions in period
    trans_query = SalesTransaction.query.filter(
        SalesTransaction.transaction_date >= start_date,
        SalesTransaction.transaction_date <= end_date,
        SalesTransaction.status == "completed"
    )
    
    if branch_id:
        trans_query = trans_query.filter(SalesTransaction.branch_id == branch_id)
    
    transaction_ids = [t.transaction_id for t in trans_query.all()]
    
    delta = end_date - start_date
    actual_days = max(delta.days, 1)

    if not transaction_ids:
        return jsonify({"top_products": [], "period_days": actual_days}), 200
    
    # Aggregate by product
    product_sales = db.session.query(
        TransactionItem.product_id,
        func.sum(TransactionItem.quantity).label("total_quantity"),
        func.sum(TransactionItem.subtotal).label("total_revenue")
    ).filter(
        TransactionItem.transaction_id.in_(transaction_ids)
    ).group_by(
        TransactionItem.product_id
    ).order_by(
        func.sum(TransactionItem.subtotal).desc()
    ).limit(limit).all()
    
    top_products = []
    for product_id, total_qty, total_rev in product_sales:
        product = Product.query.get(product_id)
        top_products.append({
            "product_id": product_id,
            "product_name": product.name if product else None,
            "total_quantity_sold": total_qty,
            "total_revenue": total_rev
        })
    
    return jsonify({
        "top_products": top_products,
        "period_days": actual_days
    }), 200


# =============================
# Profit Margin Analysis Report
# =============================
@admin_bp.route("/reports/profit-margins", methods=["GET"])
@jwt_required()
@roles_required("admin")
def profit_margin_report():
    # Calculate profit margin for all products: (unit_price - cost_price) / unit_price
    products = Product.query.all()
    
    analysis = []
    for p in products:
        cost = p.cost_price or 0
        price = p.unit_price or 0
        
        profit_per_unit = price - cost
        margin_percent = (profit_per_unit / price * 100) if price > 0 else 0
        
        # Get total units sold for this product (all-time or optional period)
        total_sold = db.session.query(func.sum(TransactionItem.quantity)).filter_by(product_id=p.product_id).scalar() or 0
        total_profit = profit_per_unit * total_sold
        
        analysis.append({
            "product_id": p.product_id,
            "name": p.name,
            "sku": p.sku,
            "cost_price": cost,
            "unit_price": price,
            "profit_per_unit": round(profit_per_unit, 2),
            "margin_percent": round(margin_percent, 2),
            "total_sold": total_sold,
            "total_profit": round(total_profit, 2)
        })
    
    # Sort by total profit descending
    analysis.sort(key=lambda x: x["total_profit"], reverse=True)
    
    return jsonify({
        "report_date": datetime.now().isoformat(),
        "analysis": analysis
    }), 200


# =============================
# Stock Rebalancing Assistant
# =============================
@admin_bp.route("/inventory/rebalance-suggestions", methods=["GET"])
@jwt_required()
@roles_required("admin")
def rebalance_suggestions():
    # Logic: Find products where some branches are low and others have surplus
    
    # 1. Get all inventory joined with Product and Branch names
    all_inventory = db.session.query(
        Inventory, 
        Product.name.label("product_name"),
        Branch.name.label("branch_name")
    ).join(
        Product, Inventory.product_id == Product.product_id
    ).join(
        Branch, Inventory.branch_id == Branch.branch_id
    ).all()
    
    # 2. Group by product_id
    products_map = {}
    for inv, p_name, b_name in all_inventory:
        pid = inv.product_id
        if pid not in products_map:
            products_map[pid] = {
                "product_id": pid,
                "product_name": p_name,
                "inventory": []
            }
        products_map[pid]["inventory"].append({
            "branch_id": inv.branch_id,
            "branch_name": b_name,
            "quantity": inv.quantity,
            "min_threshold": inv.min_threshold
        })
    
    suggestions = []
    
    # 3. Analyze each product for imbalances
    for pid, data in products_map.items():
        inv_list = data["inventory"]
        
        # Deficit: Qty <= Threshold
        deficits = [i for i in inv_list if i["quantity"] <= i["min_threshold"]]
        # Surplus: Qty > Threshold * 2 (or just significantly more)
        surpluses = [i for i in inv_list if i["quantity"] > (i["min_threshold"] * 2)]
        
        if deficits and surpluses:
            # Pair them up
            for def_item in deficits:
                for surp_item in surpluses:
                    # Suggest moving enough to reach threshold + 20% buffer
                    gap = (def_item["min_threshold"] - def_item["quantity"]) + int(def_item["min_threshold"] * 0.2)
                    if gap <= 0: gap = 5 # default small move
                    
                    # Don't take too much from surplus
                    available_to_give = surp_item["quantity"] - surp_item["min_threshold"]
                    actual_move = min(gap, available_to_give // 2)
                    
                    if actual_move > 0:
                        suggestions.append({
                            "product_id": pid,
                            "product_name": data["product_name"],
                            "from_branch_id": surp_item["branch_id"],
                            "from_branch_name": surp_item["branch_name"],
                            "to_branch_id": def_item["branch_id"],
                            "to_branch_name": def_item["branch_name"],
                            "suggested_quantity": actual_move,
                            "reason": f"Deficit at {def_item['branch_name']} vs Surplus at {surp_item['branch_name']}"
                        })
    
    return jsonify({
        "suggestions": suggestions,
        "total_imbalances": len(suggestions)
    }), 200
