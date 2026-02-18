from app.extensions import db
from datetime import datetime

class Branch(db.Model):
    __tablename__ = "branches"

    branch_id = db.Column(db.Integer, primary_key=True)
    branch_code = db.Column(db.String(10), unique=True, nullable=False) # e.g. NY01
    name = db.Column(db.String(100), nullable=False)
    address = db.Column(db.Text)
    city = db.Column(db.String(50))
    state = db.Column(db.String(50))
    postal_code = db.Column(db.String(10))
    phone = db.Column(db.String(20))
    upi_id = db.Column(db.String(100)) # e.g. branch_name@upi
    manager_id = db.Column(db.Integer)
    status = db.Column(db.String(20), default="active")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
