import sys
import os

# Add the project root to sys.path
sys.path.append(os.getcwd())

from flask import Flask
from flask_sqlalchemy import SQLAlchemy

# Manual minimal app for DB access
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///instance/retail.db'
if not os.path.exists('instance/retail.db'):
    # Try alternate path if needed
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///retail.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

class User(db.Model):
    __tablename__ = "users"
    user_id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    role = db.Column(db.String(50), nullable=False)
    branch_id = db.Column(db.Integer)

class Branch(db.Model):
    __tablename__ = "branches"
    branch_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)

with app.app_context():
    print("USERS AND BRANCHES DIAGNOSTIC:")
    try:
        users = User.query.all()
        branches = {b.branch_id: b.name for b in Branch.query.all()}
        for u in users:
            branch_name = branches.get(u.branch_id, 'No Branch')
            print(f"User: {u.email}, Role: {u.role}, Branch: {branch_name} (ID: {u.branch_id})")
    except Exception as e:
        print(f"Error: {e}")
