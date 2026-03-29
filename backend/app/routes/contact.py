"""
Contact Routes
Public: Submit contact message
Admin: View, mark read, delete messages
"""

from flask import request, jsonify
from flask_jwt_extended import jwt_required

from app.extensions import db
from app.models.contact import ContactMessage
from app.utils.decorators import roles_required
from app.routes import contact_bp


# =============================
# PUBLIC: Submit Contact Message
# =============================
@contact_bp.route("/", methods=["POST"])
def submit_contact():
    data = request.get_json()

    required = ["name", "email", "subject", "message"]
    for field in required:
        if not data.get(field, "").strip():
            return jsonify({"message": f"Missing required field: {field}"}), 400

    msg = ContactMessage(
        name=data["name"].strip(),
        email=data["email"].strip(),
        subject=data["subject"].strip(),
        message=data["message"].strip()
    )

    try:
        db.session.add(msg)
        db.session.commit()
        return jsonify({"message": "Your message has been sent successfully."}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Failed to send message: {str(e)}"}), 500


# =============================
# ADMIN: Get All Messages
# =============================
@contact_bp.route("/", methods=["GET"])
@jwt_required()
@roles_required("admin")
def get_messages():
    messages = ContactMessage.query.order_by(ContactMessage.created_at.desc()).all()
    unread = ContactMessage.query.filter_by(is_read=False).count()

    return jsonify({
        "messages": [m.to_dict() for m in messages],
        "total": len(messages),
        "unread": unread
    }), 200


# =============================
# ADMIN: Mark as Read
# =============================
@contact_bp.route("/<int:msg_id>/read", methods=["PUT"])
@jwt_required()
@roles_required("admin")
def mark_read(msg_id):
    msg = ContactMessage.query.get_or_404(msg_id)
    msg.is_read = True
    db.session.commit()
    return jsonify({"message": "Marked as read"}), 200


# =============================
# ADMIN: Delete Message
# =============================
@contact_bp.route("/<int:msg_id>", methods=["DELETE"])
@jwt_required()
@roles_required("admin")
def delete_message(msg_id):
    msg = ContactMessage.query.get_or_404(msg_id)
    try:
        db.session.delete(msg)
        db.session.commit()
        return jsonify({"message": "Message deleted"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Failed to delete: {str(e)}"}), 500
