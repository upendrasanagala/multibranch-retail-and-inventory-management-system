
from app import create_app
from app.extensions import db
from app.models.user import User
from app.models.sales import SalesTransaction, TransactionItem
from app.models.inventory import Inventory
from app.models.product import Product
from datetime import datetime, timedelta

app = create_app()

TARGET_EMAIL = "upendrasanagala0906@gmail.com"
OLD_BRANCH_ID = 6
NEW_BRANCH_ID = 5

def run_migration():
    with app.app_context():
        print(f"Starting migration for user: {TARGET_EMAIL}")
        
        # 1. Get User
        user = User.query.filter_by(email=TARGET_EMAIL).first()
        if not user:
            print("User not found!")
            return

        print(f"User found: {user.first_name} {user.last_name} (ID: {user.user_id})")
        print(f"Current Branch: {user.branch_id}")

        # 2. Get Sales to Migrate (Today's sales in Branch 6)
        # Assuming 'today' is correct context. Let's look for sales in the last 24 hours to be safe.
        start_time = datetime.utcnow() - timedelta(hours=24)
        
        sales_to_move = SalesTransaction.query.filter(
            SalesTransaction.staff_id == user.user_id,
            SalesTransaction.branch_id == OLD_BRANCH_ID,
            SalesTransaction.transaction_date >= start_time
        ).all()
        
        print(f"Found {len(sales_to_move)} sales to migrate from Branch {OLD_BRANCH_ID} to {NEW_BRANCH_ID}.")
        
        if not sales_to_move:
            print("No sales to migrate.")
        else:
            for sale in sales_to_move:
                print(f"Migrating Sale ID: {sale.transaction_id} (Amount: {sale.total_amount})")
                
                # Update Branch
                sale.branch_id = NEW_BRANCH_ID
                
                # Adjust Inventory
                items = TransactionItem.query.filter_by(transaction_id=sale.transaction_id).all()
                for item in items:
                    # 1. Revert Old Branch Inventory (Add back)
                    old_inv = Inventory.query.filter_by(branch_id=OLD_BRANCH_ID, product_id=item.product_id).first()
                    if old_inv:
                        old_inv.quantity += item.quantity
                        print(f"  - Reverted {item.quantity} of Product {item.product_id} in Branch {OLD_BRANCH_ID}")
                    
                    # 2. Deduct New Branch Inventory (Remove)
                    new_inv = Inventory.query.filter_by(branch_id=NEW_BRANCH_ID, product_id=item.product_id).first()
                    if new_inv:
                        new_inv.quantity -= item.quantity
                        print(f"  - Deducted {item.quantity} of Product {item.product_id} in Branch {NEW_BRANCH_ID}")
                    else:
                        # Create if missing
                        print(f"  - Inventory record missing for Product {item.product_id} in Branch {NEW_BRANCH_ID}. Creating...")
                        new_inv = Inventory(
                            product_id=item.product_id,
                            branch_id=NEW_BRANCH_ID,
                            quantity=-item.quantity, # Negative stock if we don't know the base
                            min_threshold=10
                        )
                        db.session.add(new_inv)

        # 3. Update User Branch
        print(f"Updating user branch assignment to {NEW_BRANCH_ID}...")
        user.branch_id = NEW_BRANCH_ID
        
        try:
            db.session.commit()
            print("Migration and User Update Successful!")
        except Exception as e:
            db.session.rollback()
            print(f"Error during commit: {e}")

if __name__ == "__main__":
    run_migration()
