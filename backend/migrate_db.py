from app import create_app
from app.extensions import db
from sqlalchemy import text

app = create_app()
with app.app_context():
    try:
        # Check if status column exists in announcements table
        # This works for both SQLite and PostgreSQL
        if app.config['SQLALCHEMY_DATABASE_URI'].startswith('postgresql'):
            check_sql = "SELECT column_name FROM information_schema.columns WHERE table_name='announcements' AND column_name='status';"
            add_sql = "ALTER TABLE announcements ADD COLUMN status VARCHAR(20) DEFAULT 'published';"
        else:
            check_sql = "PRAGMA table_info(announcements);"
            add_sql = "ALTER TABLE announcements ADD COLUMN status VARCHAR(20) DEFAULT 'published';"

        result = db.session.execute(text(check_sql)).fetchall()
        
        column_exists = False
        if app.config['SQLALCHEMY_DATABASE_URI'].startswith('postgresql'):
            column_exists = len(result) > 0
        else:
            column_exists = any(row[1] == 'status' for row in result)

        if not column_exists:
            print("Adding 'status' column to 'announcements' table...")
            db.session.execute(text(add_sql))
            db.session.commit()
            print("Column added successfully.")
        else:
            print("'status' column already exists.")
    except Exception as e:
        print(f"Error during migration: {e}")
        db.session.rollback()
