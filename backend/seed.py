import os
import random
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash
from app import create_app
from app.extensions import db
from app.models.user import User
from app.models.branch import Branch
from app.models.category import Category
from app.models.product import Product
from app.models.inventory import Inventory
from app.models.sales import SalesTransaction, TransactionItem
from app.models.supplier import Supplier

def seed_db():
    app = create_app()
    with app.app_context():
        print("Starting database seeding...")
        
        # 1. Clear existing data (Optional - use with caution)
        # print("Clearing existing data...")
        # db.drop_all()
        # db.create_all()

        # 2. Categories
        categories_data = [
            {"name": "Electronics", "description": "Laptops, phones, and accessories"},
            {"name": "Home Appliances", "description": "Kitchen and home utility items"},
            {"name": "Beverages", "description": "Soft drinks, tea, coffee"},
            {"name": "Groceries", "description": "Daily essentials and food items"},
            {"name": "Personal Care", "description": "Soaps, shampoos, and hygiene"}
        ]
        categories = []
        for cat_data in categories_data:
            cat = Category.query.filter_by(name=cat_data["name"]).first()
            if not cat:
                cat = Category(**cat_data)
                db.session.add(cat)
            categories.append(cat)
        db.session.commit()
        print(f"Seeded {len(categories)} categories.")

        # 3. Suppliers
        suppliers_data = [
            {"name": "Global Tech Corp", "contact_person": "John Doe", "email": "contact@globaltech.com", "phone": "1234567890"},
            {"name": "Fresh Foods Ltd", "contact_person": "Jane Smith", "email": "info@freshfoods.com", "phone": "0987654321"}
        ]
        suppliers = []
        for sup_data in suppliers_data:
            sup = Supplier.query.filter_by(name=sup_data["name"]).first()
            if not sup:
                sup = Supplier(**sup_data)
                db.session.add(sup)
            suppliers.append(sup)
        db.session.commit()
        print(f"Seeded {len(suppliers)} suppliers.")

        # 4. Branches
        branches_data = [
            {
                "name": "Downtown City Center", 
                "branch_code": "DT01", 
                "address": "123 Main St", 
                "city": "Mumbai", 
                "state": "Maharashtra", 
                "phone": "9876543210", 
                "upi_id": "downtown@upi"
            },
            {
                "name": "Airport Terminal 2", 
                "branch_code": "AT02", 
                "address": "Gate 4, Departure Level", 
                "city": "Mumbai", 
                "state": "Maharashtra", 
                "phone": "9876543211", 
                "upi_id": "airport@upi"
            },
            {
                "name": "Suburban Mall", 
                "branch_code": "SM03", 
                "address": "Floor 2, Phoenix Mall", 
                "city": "Pune", 
                "state": "Maharashtra", 
                "phone": "9876543212", 
                "upi_id": "suburban@upi"
            }
        ]
        branches = []
        for b_data in branches_data:
            branch = Branch.query.filter_by(branch_code=b_data["branch_code"]).first()
            if not branch:
                branch = Branch(**b_data)
                db.session.add(branch)
            branches.append(branch)
        db.session.commit()
        print(f"Seeded {len(branches)} branches.")

        # 5. Users (Admin, Manager, Staff)
        # Admin
        if not User.query.filter_by(role="admin").first():
            admin = User(
                first_name="Super",
                last_name="Admin",
                email="admin@retail.com",
                password_hash=generate_password_hash("admin123"),
                role="admin",
                status="approved",
                employee_id="ADM001"
            )
            db.session.add(admin)

        # Managers and Staff for each branch
        for i, branch in enumerate(branches):
            # Manager for this branch
            manager_email = f"manager{i+1}@retail.com"
            if not User.query.filter_by(email=manager_email).first():
                manager = User(
                    first_name=f"Manager",
                    last_name=f"Branch {i+1}",
                    email=manager_email,
                    password_hash=generate_password_hash("manager123"),
                    role="manager",
                    status="approved",
                    branch_id=branch.branch_id,
                    employee_id=f"MGR00{i+1}"
                )
                db.session.add(manager)
                db.session.flush() # Get manager.user_id
                branch.manager_id = manager.user_id

            # Staff for this branch
            staff_email = f"staff{i+1}@retail.com"
            if not User.query.filter_by(email=staff_email).first():
                staff = User(
                    first_name=f"Staff",
                    last_name=f"Branch {i+1}",
                    email=staff_email,
                    password_hash=generate_password_hash("staff123"),
                    role="staff",
                    status="approved",
                    branch_id=branch.branch_id,
                    employee_id=f"STF00{i+1}"
                )
                db.session.add(staff)
        
        db.session.commit()
        print("Seeded users (Admin, Managers, Staff).")

        # 6. Products
        products_data = [
            {"name": "Dell XPS 13", "sku": "LP-DEL-01", "barcode": "10001", "category_idx": 0, "unit_price": 95000, "cost_price": 80000},
            {"name": "iPhone 15 Pro", "sku": "MB-IPH-15", "barcode": "10002", "category_idx": 0, "unit_price": 125000, "cost_price": 105000},
            {"name": "Samsung Microwave", "sku": "HA-SAM-MW", "barcode": "10003", "category_idx": 1, "unit_price": 12000, "cost_price": 9500},
            {"name": "Coca Cola 500ml", "sku": "BV-COC-50", "barcode": "10004", "category_idx": 2, "unit_price": 40, "cost_price": 32},
            {"name": "Basmati Rice 5kg", "sku": "GR-RCE-05", "barcode": "10005", "category_idx": 3, "unit_price": 600, "cost_price": 450},
            {"name": "Dove Soap 100g", "sku": "PC-DOV-01", "barcode": "10006", "category_idx": 4, "unit_price": 55, "cost_price": 42},
            {"name": "Maggi Noodles", "sku": "GR-MAG-01", "barcode": "10007", "category_idx": 3, "unit_price": 14, "cost_price": 10},
            {"name": "Sony Headphones", "sku": "EL-SON-WH", "barcode": "10008", "category_idx": 0, "unit_price": 25000, "cost_price": 18000}
        ]
        products = []
        for p_data in products_data:
            prod = Product.query.filter_by(sku=p_data["sku"]).first()
            if not prod:
                cat_idx = p_data.pop("category_idx")
                prod = Product(**p_data, category_id=categories[cat_idx].category_id, supplier_id=suppliers[0].supplier_id if p_data["unit_price"] > 1000 else suppliers[1].supplier_id)
                db.session.add(prod)
            products.append(prod)
        db.session.commit()
        print(f"Seeded {len(products)} products.")

        # 7. Inventory (Initial Stock for all branches)
        print("Populating inventory...")
        for branch in branches:
            for product in products:
                inv = Inventory.query.filter_by(branch_id=branch.branch_id, product_id=product.product_id).first()
                if not inv:
                    inv = Inventory(
                        product_id=product.product_id,
                        branch_id=branch.branch_id,
                        quantity=random.randint(10, 100),
                        min_threshold=15,
                        max_threshold=150
                    )
                    db.session.add(inv)
        db.session.commit()

        # 8. Sales History (Generate some random sales for the last 30 days)
        print("Generating historical sales data...")
        sales_count = 0
        current_time = datetime.now()
        staff_users = User.query.filter_by(role="staff").all()
        
        if not SalesTransaction.query.first(): # Only seed if no sales exist
            for _ in range(50):
                branch = random.choice(branches)
                staff = random.choice([u for u in staff_users if u.branch_id == branch.branch_id])
                
                # Mock transaction
                txn_date = current_time - timedelta(days=random.randint(0, 30), hours=random.randint(0, 23))
                txn = SalesTransaction(
                    branch_id=branch.branch_id,
                    staff_id=staff.user_id,
                    total_amount=0,
                    payment_method=random.choice(["Cash", "UPI", "Card"]),
                    invoice_number=f"INV-{random.randint(100000, 999999)}",
                    transaction_date=txn_date
                )
                db.session.add(txn)
                db.session.flush() # Get txn.transaction_id
                
                total = 0
                for _ in range(random.randint(1, 4)):
                    product = random.choice(products)
                    qty = random.randint(1, 3)
                    subtotal = product.unit_price * qty
                    item = TransactionItem(
                        transaction_id=txn.transaction_id,
                        product_id=product.product_id,
                        quantity=qty,
                        unit_price=product.unit_price,
                        subtotal=subtotal
                    )
                    db.session.add(item)
                    total += subtotal
                
                txn.total_amount = total
                sales_count += 1
            
            db.session.commit()
            print(f"Seeded {sales_count} historical sales transactions.")

        print("\nDatabase seeding completed successfully!")
        print("--- DEMO LOGIN CREDENTIALS ---")
        print("Admin: admin@retail.com / admin123")
        print("Manager: manager1@retail.com / manager123")
        print("Staff: staff1@retail.com / staff123")
        print("-------------------------------")

if __name__ == "__main__":
    seed_db()
