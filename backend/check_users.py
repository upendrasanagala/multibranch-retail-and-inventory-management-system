import sys
import os

# Add the project root to sys.path
sys.path.append(os.getcwd())

from app import create_app
from app.extensions import db
from app.models.user import User
from app.models.branch import Branch

app = create_app()
with app.app_context():
    print("USERS AND BRANCHES:")
    users = User.query.all()
    for u in users:
        branch = Branch.query.get(u.branch_id) if u.branch_id else None
        branch_name = branch.name if branch else 'No Branch'
        print(f"Email: {u.email}, Role: {u.role}, Branch ID: {u.branch_id}, Branch Name: {branch_name}")
