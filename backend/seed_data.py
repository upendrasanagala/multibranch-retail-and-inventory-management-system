from app import create_app, db
from app.models import User, Branch, Category, Product, Inventory, SalesTransaction, TransactionItem, StockTransfer, InventoryAdjustment, Supplier
from werkzeug.security import generate_password_hash
import sys
from sqlalchemy import text

def seed_database(include_sample_data=False):
    app = create_app()
    with app.app_context():
        print("Ensuring all tables exist...")
        db.create_all()
        
        print("Clearing transactional data...")
        # Use execute text for bulk delete to handle missing tables or FKs more directly if needed
        # but standard delete should work if tables exist
        try:
            db.session.execute(text("DELETE FROM inventory_adjustments"))
            db.session.execute(text("DELETE FROM stock_transfers"))
            db.session.execute(text("DELETE FROM transaction_items"))
            db.session.execute(text("DELETE FROM sales_transactions"))
            db.session.execute(text("DELETE FROM inventory"))
            
            print("Unbinding users and branches...")
            db.session.execute(text("UPDATE users SET branch_id = NULL"))
            db.session.execute(text("UPDATE branches SET manager_id = NULL"))
            db.session.commit()
            
            print("Clearing master data...")
            db.session.execute(text("DELETE FROM users WHERE role != 'admin'"))
            db.session.execute(text("DELETE FROM branches"))
            db.session.execute(text("DELETE FROM products"))
            db.session.execute(text("DELETE FROM categories"))
            db.session.execute(text("DELETE FROM suppliers"))
            db.session.commit()
            print("Database cleared. Only Admin preserved.")
        except Exception as e:
            print(f"Warning during cleanup: {e}")
            db.session.rollback()

        if not include_sample_data:
            print("No sample data added as requested.")
            return

        # --- Seeding Logic ---
        print("Seeding sample data...")
        branch1 = Branch(name='Gayathri retails', branch_code='GR01', city='Unknown', state='Unknown', status='active')
        db.session.add(branch1)
        db.session.flush()

        manager1 = User(
            email='upendrasanagala13@gmail.com',
            password_hash=generate_password_hash('123456'),
            role='manager',
            first_name='Upendra',
            last_name='Sanagala',
            employee_id='EMP-M001',
            branch_id=branch1.branch_id,
            status='active'
        )
        db.session.add(manager1)
        db.session.flush()
        branch1.manager_id = manager1.user_id

        staff1a = User(email='upendrasanagala0906@gmail.com', password_hash=generate_password_hash('Keerthi123@'), role='staff', first_name='Keerthi', last_name='User', employee_id='EMP-S001', branch_id=branch1.branch_id, status='active')
        staff1b = User(email='manipriyakoppula@gmail.com', password_hash=generate_password_hash('ManiPriy@18'), role='staff', first_name='Mani', last_name='Priya', employee_id='EMP-S002', branch_id=branch1.branch_id, status='active')
        db.session.add_all([staff1a, staff1b])

        branch2 = Branch(name='Edubot.in', branch_code='EB01', city='Unknown', state='Unknown', status='active')
        db.session.add(branch2)
        db.session.flush()

        manager2 = User(email='kingthor803@gmail.com', password_hash=generate_password_hash('123456'), role='manager', first_name='King', last_name='Thor', employee_id='EMP-M002', branch_id=branch2.branch_id, status='active')
        db.session.add(manager2)
        db.session.flush()
        branch2.manager_id = manager2.user_id

        staff2 = User(email='sontijagadeesh088@gmail.com', password_hash=generate_password_hash('Jagadeesh1@'), role='staff', first_name='Jagadeesh', last_name='Sonti', employee_id='EMP-S003', branch_id=branch2.branch_id, status='active')
        db.session.add(staff2)

        db.session.commit()
        print("Data seeding completed successfully!")

if __name__ == "__main__":
    include_data = "--with-data" in sys.argv
    seed_database(include_sample_data=include_data)
