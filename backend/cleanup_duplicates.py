from app import create_app
from app.extensions import db
from app.models.product import Product
from app.models.inventory import Inventory
from app.models.sales import TransactionItem
from app.models.stock_transfer import StockTransfer
from app.models.adjustment import InventoryAdjustment

app = create_app()

with app.app_context():
    print("Starting Product Cleanup...")
    
    # 1. Provide a list of products with empty sizes
    orphans = Product.query.filter((Product.size == None) | (Product.size == '')).all()
    orphan_map = {p.product_id: p for p in orphans}
    orphan_names = set(p.name for p in orphans)
    
    print(f"Found {len(orphans)} products with missing sizes.")
    
    deleted_count = 0
    merged_count = 0
    
    for name in orphan_names:
        # Find all products with this name
        candidates = Product.query.filter_by(name=name).all()
        
        # If we have multiple candidates for this name
        if len(candidates) > 1:
            # Separate them
            has_size = [p for p in candidates if p.size]
            no_size = [p for p in candidates if not p.size]
            
            # If we have both types, prioritize the one WITH size
            if has_size and no_size:
                target_product = has_size[0] # Just pick the first one with a size (usually newest)
                
                print(f"Processing '{name}': Keeping ID {target_product.product_id} (Size: {target_product.size})")
                
                for bad_prod in no_size:
                    print(f"  -> Merging/Deleting old ID {bad_prod.product_id} (No Size)")
                    
                    # Move Inventory? Or just delete?
                    # Since the new import set the stock for the sized product, we trust the new stock.
                    # But if there's history...
                    # For safety, let's just delete the bad product and its related records to clean up the UI.
                    
                    Inventory.query.filter_by(product_id=bad_prod.product_id).delete()
                    # Creating a transaction log or transfer might fail due to FKs if we delete product.
                    # So we delete related children first.
                    try:
                        TransactionItem.query.filter_by(product_id=bad_prod.product_id).delete()
                        StockTransfer.query.filter_by(product_id=bad_prod.product_id).delete()
                        InventoryAdjustment.query.filter_by(product_id=bad_prod.product_id).delete()
                        
                        db.session.delete(bad_prod)
                        deleted_count += 1
                    except Exception as e:
                        print(f"  Error deleting ID {bad_prod.product_id}: {e}")
            else:
                # If ALL have no size, we can't do much automatically without guessing.
                pass
                
    db.session.commit()
    print(f"Cleanup Complete. Deleted {deleted_count} duplicate products.")
