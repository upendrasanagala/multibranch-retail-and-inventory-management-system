from functools import wraps
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from flask import jsonify

from app.models.user import User


def roles_required(*allowed_roles):

    def wrapper(fn):

        @wraps(fn)
        def decorator(*args, **kwargs):

            verify_jwt_in_request()

            user_id = get_jwt_identity()
            user = User.query.get(user_id)

            if not user:
                return jsonify({"error": "User not found"}), 404

            if user.role not in allowed_roles:
                return jsonify({"error": "Access denied"}), 403

            return fn(*args, **kwargs)

        return decorator

    return wrapper
