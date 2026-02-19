from app import create_app, db
from app.models.user import User
from werkzeug.security import generate_password_hash
import os

app = create_app()
with app.app_context():
    print("Initializing database tables...")
    db.create_all()
    print("Tables created.")
    
    admin = User.query.filter_by(role='admin').first()
    if admin:
        admin.password_hash = generate_password_hash('Admin@123')
        print(f"Admin found: {admin.email}. Password reset to 'Admin@123'")
    else:
        admin = User(
            email='admin@retail.com',
            password_hash=generate_password_hash('Admin@123'),
            role='admin',
            first_name='Admin',
            last_name='User',
            phone='9999999999',
            employee_id='EMP-00001',
            status='active'
        )
        db.session.add(admin)
        print("Admin created: admin@retail.com / Admin@123")
    
    db.session.commit()
    print("Seeding complete.")
