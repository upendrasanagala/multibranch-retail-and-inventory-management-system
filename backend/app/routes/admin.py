"""
Admin Routes
Dashboard statistics, user management, reports
"""

from flask import request, jsonify
from flask_jwt_extended import jwt_required
from datetime import datetime, timedelta
from sqlalchemy import func

from app.extensions import db
from app.models.user import User
from app.models.branch import Branch
from app.models.product import Product
from app.models.inventory import Inventory
from app.models.sales import SalesTransaction, TransactionItem
from app.models.stock_transfer import StockTransfer
from app.utils.decorators import roles_required
from app.routes import admin_bp
from flask_mail import Message
from app.extensions import mail


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
    
    total_revenue = sum(s.total_amount for s in recent_sales)
    total_transactions = len(recent_sales)
    
    # Low stock items
    low_stock_count = Inventory.query.filter(
        Inventory.quantity <= Inventory.min_threshold
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
    
    today_revenue = sum(s.total_amount for s in today_sales)
    today_cash = sum(s.total_amount for s in today_sales if s.payment_method and s.payment_method.lower() == 'cash')
    today_upi = sum(s.total_amount for s in today_sales if s.payment_method and s.payment_method.lower() == 'upi')
    
    # Critical Low Stock (Top 5)
    critical_stock = db.session.query(
        Inventory, Product.name, Branch.name
    ).join(Product).join(Branch).filter(
        Inventory.quantity <= Inventory.min_threshold
    ).order_by(Inventory.quantity.asc()).limit(5).all()
    
    critical_items = [{
        "product": p_name,
        "branch": b_name,
        "qty": inv.quantity,
        "min": inv.min_threshold
    } for inv, p_name, b_name in critical_stock]
    
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
        "critical_items": critical_items
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
            "address": u.address,
            "interview_status": u.interview_status,
            "interviewer_name": (
                f"{int_user.first_name} {int_user.last_name}" 
                if (int_user := User.query.get(u.interviewer_id)) 
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
    user.phone = data.get("phone", user.phone)
    user.address = data.get("address", user.address)
    user.upi_id = data.get("upi_id", user.upi_id)
    user.status = data.get("status", user.status)
    
    db.session.commit()
    
    return jsonify({"message": "User updated successfully"}), 200


# =============================
# Delete User
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
    
    new_user = User(
        first_name=data["firstName"],
        last_name=data["lastName"],
        email=data["email"],
        phone=data["mobile"],
        address=data.get("address", ""),
        role="manager",  # Hardcoded for this specific Admin action usually
        branch_id=data["branch_id"],
        employee_id=employee_id,
        status="approved", # Auto-approve admin created users
        must_reset_password=True,
        password_hash=generate_password_hash(raw_password)
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
        except Exception as e:
            print(f"Failed to send welcome email: {e}")

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
    except Exception as e:
        print(f"Failed to send approval email: {e}")

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
    
    delta = end_date - start_date
    actual_days = max(delta.days, 1)
    
    return jsonify({
        "period_days": actual_days,
        "total_revenue": total_revenue,
        "total_transactions": total_count,
        "average_per_day": total_revenue / actual_days,
        "daily_breakdown": sorted_daily,
        "branch_breakdown": sorted_branch,
        "transactions": sorted_transactions
    }), 200


# =============================
# Inventory Report
# =============================
@admin_bp.route("/reports/inventory", methods=["GET"])
@jwt_required()
@roles_required("admin", "manager")
def inventory_report():
    branch_id = request.args.get("branch_id", type=int)
    
    query = db.session.query(
        Inventory, Product, Branch.name.label("branch_name")
    ).join(
        Product, Inventory.product_id == Product.product_id
    ).join(
        Branch, Inventory.branch_id == Branch.branch_id
    )
    
    if branch_id:
        query = query.filter(Inventory.branch_id == branch_id)
    
    results = query.all()
    
    total_items = len(results)
    total_stock_value = sum(inv.quantity * prod.unit_price for inv, prod, b_name in results)
    low_stock_items = [
        {
            "product_id": prod.product_id,
            "product_name": prod.name,
            "branch_id": inv.branch_id,
            "branch_name": b_name,
            "quantity": inv.quantity,
            "min_threshold": inv.min_threshold
        }
        for inv, prod, b_name in results
        if inv.quantity <= inv.min_threshold
    ]
    
    return jsonify({
        "total_items": total_items,
        "total_stock_value": total_stock_value,
        "low_stock_count": len(low_stock_items),
        "low_stock_items": low_stock_items
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
    
    # Get transactions in period
    trans_query = SalesTransaction.query.filter(
        SalesTransaction.transaction_date >= start_date,
        SalesTransaction.transaction_date <= end_date,
        SalesTransaction.status == "completed"
    )
    
    if branch_id:
        trans_query = trans_query.filter(SalesTransaction.branch_id == branch_id)
    
    transaction_ids = [t.transaction_id for t in trans_query.all()]
    
    if not transaction_ids:
        return jsonify({"top_products": [], "period_days": days}), 200
    
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
        "period_days": days
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
