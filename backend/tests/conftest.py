import pytest
import os
from app import create_app
from app.extensions import db
from app.models.user import User
from werkzeug.security import generate_password_hash
from flask_jwt_extended import create_access_token

@pytest.fixture(scope='module')
def app():
    # Use an in-memory SQLite database for fast testing
    os.environ['DATABASE_URL'] = 'sqlite:///:memory:'
    app = create_app()
    app.config.update({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": 'sqlite:///:memory:',
        "JWT_SECRET_KEY": "test-secret-key"
    })

    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()

@pytest.fixture(scope='module')
def client(app):
    return app.test_client()

@pytest.fixture(scope='module')
def auth_headers(app):
    with app.app_context():
        # Create a test admin user
        test_user = User(
            first_name="Test",
            last_name="Admin",
            email="testadmin@example.com",
            password_hash=generate_password_hash("password"),
            role="admin",
            status="approved"
        )
        db.session.add(test_user)
        db.session.commit()
        
        access_token = create_access_token(identity=str(test_user.user_id))
        return {
            'Authorization': f'Bearer {access_token}'
        }
