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
        status=data.get("status", "published"),
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
    announcements = Announcement.query.filter_by(status="published").order_by(Announcement.created_at.desc()).all()
    return jsonify({
        "announcements": [a.to_dict() for a in announcements],
        "total": len(announcements)
    }), 200

# =============================
# ADMIN: List All Drafts
# =============================
@announcements_bp.route("/drafts", methods=["GET"])
@jwt_required()
@roles_required("admin")
def get_draft_announcements():
    drafts = Announcement.query.filter_by(status="draft").order_by(Announcement.created_at.desc()).all()
    return jsonify({
        "drafts": [d.to_dict() for d in drafts],
        "total": len(drafts)
    }), 200

# =============================
# ADMIN: Publish Draft
# =============================
@announcements_bp.route("/<int:id>/publish", methods=["POST"])
@jwt_required()
@roles_required("admin")
def publish_announcement(id):
    announcement = Announcement.query.get_or_404(id)
    announcement.status = "published"
    announcement.created_at = datetime.utcnow()
    
    try:
        db.session.commit()
        return jsonify({"message": "Announcement published successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Failed to publish: {str(e)}"}), 500

# =============================
# ADMIN: Update Announcement
# =============================
@announcements_bp.route("/<int:id>", methods=["PUT"])
@jwt_required()
@roles_required("admin")
def update_announcement(id):
    announcement = Announcement.query.get_or_404(id)
    data = request.get_json()
    
    announcement.title = data.get("title", announcement.title).strip()
    announcement.message = data.get("message", announcement.message).strip()
    announcement.target_role = data.get("target_role", announcement.target_role)
    
    try:
        db.session.commit()
        return jsonify({"message": "Announcement updated successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Failed to update: {str(e)}"}), 500

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
        Announcement.created_at >= thirty_days_ago,
        Announcement.status == "published"
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
