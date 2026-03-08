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

        # --- Branches ---
        print("Seeding sample data...")
        branch1 = Branch(name='Gayathri retails', branch_code='GR01', city='Unknown', state='Unknown', status='active')
        db.session.add(branch1)
        db.session.flush()

        # --- Categories ---
        cat1 = Category(name='Snacks', description='Snacks and munchies')
        cat2 = Category(name='Dairy (Milk, Eggs, Cheese)', description='Dairy products')
        db.session.add_all([cat1, cat2])
        db.session.flush()

        # --- Supplier ---
        sup1 = Supplier(name='Global Foods Ltd', contact_person='John Doe', email='john@globalfoods.com', phone='1234567890', address='123 Food St')
        db.session.add(sup1)
        db.session.flush()

        # --- Products ---
        from datetime import date, timedelta
        prod1 = Product(
            name='Sample Chips',
            sku='CHIPS-001',
            category_id=cat1.category_id,
            unit_price=20.0,
            cost_price=15.0,
            unit='pkt',
            size='50g',
            mfg_date=date.today() - timedelta(days=30),
            expiry_date=date.today() + timedelta(days=180),
            supplier_id=sup1.supplier_id
        )
        prod2 = Product(
            name='Fresh Milk',
            sku='MILK-001',
            category_id=cat2.category_id,
            unit_price=60.0,
            cost_price=45.0,
            unit='L',
            size='1L',
            mfg_date=date.today() - timedelta(days=2),
            expiry_date=date.today() + timedelta(days=5),
            supplier_id=sup1.supplier_id
        )
        db.session.add_all([prod1, prod2])
        db.session.flush()

        # --- Inventory ---
        inv1 = Inventory(product_id=prod1.product_id, branch_id=branch1.branch_id, quantity=100, min_threshold=10)
        inv2 = Inventory(product_id=prod2.product_id, branch_id=branch1.branch_id, quantity=50, min_threshold=5)
        db.session.add_all([inv1, inv2])

        db.session.commit()
        print("Data seeding completed successfully!")

if __name__ == "__main__":
    include_data = "--with-data" in sys.argv
    seed_database(include_sample_data=include_data)
