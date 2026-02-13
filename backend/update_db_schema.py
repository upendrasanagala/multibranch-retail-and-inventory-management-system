from app import create_app, db
from sqlalchemy import text

app = create_app()

with app.app_context():
    with db.engine.connect() as conn:
        # Check and add 'size'
        try:
            conn.execute(text("ALTER TABLE products ADD COLUMN size VARCHAR(50);"))
            print("Added column: size")
        except Exception as e:
            print(f"Column 'size' likely exists: {e}")

        # Check and add 'discount_percent'
        try:
            conn.execute(text("ALTER TABLE products ADD COLUMN discount_percent FLOAT DEFAULT 0.0;"))
            print("Added column: discount_percent")
        except Exception as e:
            print(f"Column 'discount_percent' likely exists: {e}")

        # Check and add 'gst_percent'
        try:
            conn.execute(text("ALTER TABLE products ADD COLUMN gst_percent FLOAT DEFAULT 0.0;"))
            print("Added column: gst_percent")
        except Exception as e:
            print(f"Column 'gst_percent' likely exists: {e}")

        # Check and add 'expiry_date'
        try:
            conn.execute(text("ALTER TABLE products ADD COLUMN expiry_date DATE;"))
            print("Added column: expiry_date")
        except Exception as e:
            print(f"Column 'expiry_date' likely exists: {e}")

        conn.commit()
        print("Schema update complete.")
