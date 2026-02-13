from app.extensions import db
from app import create_app
from app.models.product import Product
from app.models.inventory import Inventory

app = create_app()

with app.app_context():
    print("⚠ WARNING: This will delete ALL products and inventory data!")
    # Confirm with user interaction if run manually, but for now we auto-run as per request
    
    try:
        # Import all necessary models
        from app.models.sales import SalesTransaction, TransactionItem
        from app.models.adjustment import InventoryAdjustment
        from app.models.stock_transfer import StockTransfer
        
        print("1. Deleting Transaction Items...")
        num_items = TransactionItem.query.delete()
        
        print("2. Deleting Sales Transactions...")
        num_sales = SalesTransaction.query.delete()
        
        print("3. Deleting Inventory Adjustments...")
        num_adj = InventoryAdjustment.query.delete()
        
        print("4. Deleting Stock Transfers...")
        num_transfers = StockTransfer.query.delete()

        print("5. Deleting Inventory...")
        num_inv = Inventory.query.count()
        Inventory.query.delete()
        
        print("6. Deleting Products...")
        num_prod = Product.query.count()
        Product.query.delete()
        
        db.session.commit()
        print(f"\n✅ CLEANUP COMPLETE:")
        print(f"   - Products: {num_prod}")
        print(f"   - Inventory Records: {num_inv}")
        print(f"   - Sales Transactions: {num_sales}")
        print(f"   - Transaction Items: {num_items}")
        print(f"   - Stock Transfers: {num_transfers}")
        print(f"   - Adjustments: {num_adj}")
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error deleting data: {e}")
