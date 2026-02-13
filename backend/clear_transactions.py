
from app import create_app
from app.extensions import db
from app.models.sales import SalesTransaction, TransactionItem
from app.models.stock_transfer import StockTransfer
from sqlalchemy import text

app = create_app()

def clear_data():
    with app.app_context():
        print("Starting cleanup of Transaction History...")
        
        try:
            # Delete Transaction Items first (Foreign Key dependency)
            num_items = db.session.query(TransactionItem).delete()
            print(f"Deleted {num_items} transaction items.")
            
            # Delete Sales Transactions
            num_sales = db.session.query(SalesTransaction).delete()
            print(f"Deleted {num_sales} sales transactions.")
            
            # Delete Stock Transfers
            num_transfers = db.session.query(StockTransfer).delete()
            print(f"Deleted {num_transfers} stock transfers.")
            
            # Reset Auto Increment (Optional, for clean IDs) - valid for SQLite/Postgres/MySQL
            # specific syntax might vary, keeping it simple for now.
            
            db.session.commit()
            print("Cleanup Successful! Products and Inventory remain untouched.")
            
        except Exception as e:
            db.session.rollback()
            print(f"Error during cleanup: {e}")

if __name__ == "__main__":
    clear_data()
