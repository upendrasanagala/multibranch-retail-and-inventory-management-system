from app.extensions import db
from datetime import datetime

class User(db.Model):
    __tablename__ = "users"

    user_id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.String(20), unique=True)  # e.g. EMP-10001
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), nullable=False)
    phone = db.Column(db.String(20))
    address = db.Column(db.Text)
    status = db.Column(db.String(20), default="pending")  # pending, approved, suspended
    must_reset_password = db.Column(db.Boolean, default=False)
    interview_status = db.Column(db.String(30), default="not_started") # not_started, round_1, round_2, final_round, completed
    score = db.Column(db.Integer, default=0)
    upi_id = db.Column(db.String(100)) # Individual payment address
    bank_name = db.Column(db.String(100))
    account_number = db.Column(db.String(50))
    ifsc_code = db.Column(db.String(20))
    
    # Global HR Fields
    dob = db.Column(db.Date)
    joining_date = db.Column(db.Date)
    gender = db.Column(db.String(15))
    pan_number = db.Column(db.String(20))
    national_id = db.Column(db.String(50))
    emergency_contact_name = db.Column(db.String(100))
    emergency_contact_phone = db.Column(db.String(20))

    interviewer_id = db.Column(db.Integer, db.ForeignKey("users.user_id"))
    branch_id = db.Column(db.Integer, db.ForeignKey("branches.branch_id"))
    reset_token = db.Column(db.String(10))  # OTP for password reset
    reset_token_expiry = db.Column(db.DateTime)  # OTP expiration
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
