from app.extensions import db
from datetime import datetime

class User(db.Model):
    __tablename__ = "users"

    user_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), nullable=False)
    phone = db.Column(db.String(20))
    branch_id = db.Column(db.Integer, db.ForeignKey("branches.branch_id"))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
