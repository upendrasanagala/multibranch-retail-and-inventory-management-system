from app.extensions import db
from app import create_app
from app.models.user import User
from werkzeug.security import generate_password_hash

app = create_app()

with app.app_context():
    email = "admin@retail.com"
    new_pass = "Admin@123"
    
    user = User.query.filter_by(email=email).first()
    if user:
        print(f"Resetting password for {user.email}...")
        user.password_hash = generate_password_hash(new_pass)
        db.session.commit()
        print("✅ Password reset successfully.")
    else:
        print(f"❌ User {email} not found.")
