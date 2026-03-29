"""
Announcements Routes
Admin can create, list, delete.
Staff/Managers can fetch their relevant feed.
"""

from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta

from app.extensions import db
from app.models.announcement import Announcement
from app.models.user import User
from app.utils.decorators import roles_required
from app.routes import announcements_bp

# =============================
# ADMIN: Create Announcement
# =============================
@announcements_bp.route("/", methods=["POST"])
@jwt_required()
@roles_required("admin")
def create_announcement():
    data = request.get_json()
    user_id = get_jwt_identity()

    required = ["title", "message"]
    for field in required:
        if not data.get(field, "").strip():
            return jsonify({"message": f"Missing required field: {field}"}), 400

    target_role = data.get("target_role", "all")
    if target_role not in ["all", "manager", "staff"]:
        return jsonify({"message": "Invalid target_role"}), 400

    announcement = Announcement(
        title=data["title"].strip(),
        message=data["message"].strip(),
        target_role=target_role,
        created_by_id=user_id
    )

    try:
        db.session.add(announcement)
        db.session.commit()
        return jsonify({"message": "Announcement broadcast successfully", "announcement": announcement.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Failed to create announcement: {str(e)}"}), 500

# =============================
# ADMIN: List All Announcements
# =============================
@announcements_bp.route("/", methods=["GET"])
@jwt_required()
@roles_required("admin")
def get_all_announcements():
    announcements = Announcement.query.order_by(Announcement.created_at.desc()).all()
    return jsonify({
        "announcements": [a.to_dict() for a in announcements],
        "total": len(announcements)
    }), 200

# =============================
# ALL USERS: Get Feed
# =============================
@announcements_bp.route("/feed", methods=["GET"])
@jwt_required()
def get_feed():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({"message": "User not found"}), 404
        
    # Get announcements targeted to 'all' or specific to user's role
    # Optional logic: only show from last 30 days
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)

    query = Announcement.query.filter(
        Announcement.created_at >= thirty_days_ago
    )

    if user.role != "admin":
        query = query.filter(Announcement.target_role.in_(["all", user.role]))
        
    announcements = query.order_by(Announcement.created_at.desc()).all()

    return jsonify({
        "announcements": [a.to_dict() for a in announcements]
    }), 200

# =============================
# ADMIN: Delete Announcement
# =============================
@announcements_bp.route("/<int:id>", methods=["DELETE"])
@jwt_required()
@roles_required("admin")
def delete_announcement(id):
    announcement = Announcement.query.get_or_404(id)
    try:
        db.session.delete(announcement)
        db.session.commit()
        return jsonify({"message": "Announcement deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Failed to delete announcement: {str(e)}"}), 500
