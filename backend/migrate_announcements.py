import sqlite3
import os

db_path = os.path.join('instance', 'retail_manager.db')

def migrate():
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Check if column exists
        cursor.execute("PRAGMA table_info(announcements)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'status' not in columns:
            print("Adding 'status' column to 'announcements' table...")
            cursor.execute("ALTER TABLE announcements ADD COLUMN status VARCHAR(20) DEFAULT 'published'")
            conn.commit()
            print("Column added successfully.")
        else:
            print("'status' column already exists.")

    except Exception as e:
        print(f"Error during migration: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
