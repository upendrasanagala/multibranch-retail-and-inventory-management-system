from app import create_app, db
from sqlalchemy import text

def check_and_fix_schema():
    app = create_app()
    with app.app_context():
        # Check branches table
        print("Checking 'branches' table...")
        result = db.session.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'branches'"))
        columns = [row[0] for row in result]
        print(f"Current columns in 'branches': {columns}")
        
        if 'branch_code' not in columns:
            print("Adding 'branch_code' to 'branches'...")
            db.session.execute(text("ALTER TABLE branches ADD COLUMN branch_code VARCHAR(10) UNIQUE"))
            db.session.commit()
            print("'branch_code' added successfully.")
        else:
            print("'branch_code' already exists.")

        # Check sales_transactions table (based on migration history)
        print("\nChecking 'sales_transactions' table...")
        result = db.session.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'sales_transactions'"))
        columns = [row[0] for row in result]
        print(f"Current columns in 'sales_transactions': {columns}")
        
        if 'transaction_uuid' not in columns:
            print("Adding 'transaction_uuid' to 'sales_transactions'...")
            db.session.execute(text("ALTER TABLE sales_transactions ADD COLUMN transaction_uuid VARCHAR(36)"))
            db.session.commit()
            print("'transaction_uuid' added successfully.")

        if 'invoice_number' not in columns:
            print("Adding 'invoice_number' to 'sales_transactions'...")
            db.session.execute(text("ALTER TABLE sales_transactions ADD COLUMN invoice_number VARCHAR(50) UNIQUE"))
            db.session.commit()
            print("'invoice_number' added successfully.")

if __name__ == "__main__":
    check_and_fix_schema()
