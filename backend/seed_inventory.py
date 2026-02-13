
import os
import pandas as pd
from app import create_app, db
from app.models.product import Product
from app.models.category import Category
from app.models.inventory import Inventory
from app.models.branch import Branch
import uuid

def seed_data():
    app = create_app()
    with app.app_context():
        file_path = r"d:\multibranch-retail-and-inventory-management-system\inventory_dataset.csv"
        if not os.path.exists(file_path):
            print(f"File not found: {file_path}")
            return

        print("Reading CSV...")
        df = pd.read_csv(file_path)
        
        # Standardize columns
        df.columns = [c.lower().strip() for c in df.columns]
        
        # Cache existing data
        categories = {c.name.lower(): c for c in Category.query.all()}
        branches = Branch.query.all()
        
        print(f"Found {len(branches)} branches.")
        
        added = 0
        updated = 0
        
        for index, row in df.iterrows():
            try:
                name = str(row['name']).strip()
                if not name: continue
                
                # Category
                cat_name = str(row['category']).strip()
                category = categories.get(cat_name.lower())
                if not category:
                    category = Category(name=cat_name, description="Imported")
                    db.session.add(category)
                    db.session.flush()
                    categories[cat_name.lower()] = category
                
                # Product Check
                sku = str(row.get('sku', '')).strip()
                size = str(row.get('size', '')).strip()
                
                product = Product.query.filter_by(sku=sku).first()
                if not product:
                    product = Product.query.filter_by(name=name, size=size if size else None).first()
                
                if product:
                    # Update
                    product.unit_price = row['price']
                    if 'cost_price' in row: product.cost_price = row['cost_price']
                    product.stock_quantity = row['stock'] # This field might not exist on Product, wait. Stock is in Inventory.
                    updated += 1
                else:
                    # Create
                    product = Product(
                        name=name,
                        sku=sku if sku else f"GEN-{uuid.uuid4().hex[:8].upper()}",
                        barcode=str(row.get('barcode', '')),
                        category_id=category.category_id,
                        unit_price=row['price'],
                        cost_price=row.get('cost_price', row['price']*0.7),
                        unit=row.get('unit', 'pcs'),
                        size=size or None,
                        description=row.get('description', ''),
                        expiry_date=pd.to_datetime(row['expiry_date']).date() if pd.notna(row['expiry_date']) else None
                    )
                    db.session.add(product)
                    db.session.flush()
                    added += 1
                
                # Inventory
                qty = int(row.get('stock', 0))
                for branch in branches:
                    inv = Inventory.query.filter_by(product_id=product.product_id, branch_id=branch.branch_id).first()
                    if not inv:
                        inv = Inventory(
                            product_id=product.product_id,
                            branch_id=branch.branch_id,
                            quantity=qty,
                            min_threshold=10,
                            max_threshold=1000
                        )
                        db.session.add(inv)
                    else:
                        inv.quantity = qty # Reset stock to CSV value
                        
            except Exception as e:
                print(f"Error on row {index}: {e}")
                
        db.session.commit()
        print(f"Success! Added: {added}, Updated: {updated}")

if __name__ == "__main__":
    seed_data()
