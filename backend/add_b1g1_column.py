from app import create_app
from app.extensions import db
from sqlalchemy import text

app = create_app()

with app.app_context():
    try:
        with db.engine.connect() as conn:
            # Postgres syntax for adding column if it doesn't exist
            print("Attempting to add is_b1g1 column...")
            conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS is_b1g1 BOOLEAN DEFAULT FALSE"))
            conn.commit()
            print("Column 'is_b1g1' ensured on table 'products'.")
                
    except Exception as e:
        print(f"Error: {e}")
