from app import create_app, db
from app.models.user import User
from werkzeug.security import generate_password_hash

app = create_app()
with app.app_context():
    admin = User.query.filter_by(role='admin').first()
    if admin:
        admin.password_hash = generate_password_hash('admin123')
        print(f"Admin found: {admin.email}. Password reset to 'admin123'")
    else:
        admin = User(
            email='admin@retail.com',
            password_hash=generate_password_hash('admin123'),
            role='admin',
            first_name='Admin',
            last_name='User',
            mobile='9999999999',
            status='active'
        )
        db.session.add(admin)
        print("Admin created: admin@retail.com / admin123")
    
    db.session.commit()
