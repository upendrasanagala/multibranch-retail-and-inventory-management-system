"""Add employee_id, must_reset_password, reset_token, reset_token_expiry to users table"""
import psycopg2
import os
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent / '.env')

db_url = os.getenv("DATABASE_URL", "postgresql://postgres:1111@localhost:5432/retail_inventory_db")
conn = psycopg2.connect(db_url)
cur = conn.cursor()

# Get existing columns
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='users'")
existing = [r[0] for r in cur.fetchall()]
print("Existing columns:", existing)

migrations = {
    "employee_id": "VARCHAR(20) UNIQUE",
    "must_reset_password": "BOOLEAN DEFAULT FALSE",
    "reset_token": "VARCHAR(10)",
    "reset_token_expiry": "TIMESTAMP"
}

for col, col_type in migrations.items():
    if col not in existing:
        sql = f"ALTER TABLE users ADD COLUMN {col} {col_type}"
        print(f"Running: {sql}")
        cur.execute(sql)
    else:
        print(f"Column '{col}' already exists, skipping.")

conn.commit()
print("\nMigration complete!")

# Verify
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position")
print("Updated columns:", [r[0] for r in cur.fetchall()])
conn.close()
