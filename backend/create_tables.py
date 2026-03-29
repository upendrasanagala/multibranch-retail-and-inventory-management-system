from app import create_app
from app.extensions import db

app = create_app()

with app.app_context():
    try:
        db.create_all()
        print("Successfully created missing tables.")
    except Exception as e:
        print(f"Error creating tables: {e}")
