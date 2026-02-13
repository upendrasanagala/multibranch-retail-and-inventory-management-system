import random
from app import create_app
from app.extensions import db
from app.models.category import Category
from app.models.product import Product
from app.models.inventory import Inventory
from app.models.branch import Branch

def seed_inventory():
    print("Seeding inventory data...")
    
    # 1. Categories
    categories_data = [
        {"name": "Kitchen Products", "description": "Kitchenware and utensils"},
        {"name": "Clothes", "description": "Apparel and clothing items"},
        {"name": "Grocery", "description": "Food and household supplies"},
        {"name": "Home Appliances", "description": "Electrical appliances for home use"}
    ]
    
    category_map = {}
    for cat_data in categories_data:
        cat = Category.query.filter_by(name=cat_data["name"]).first()
        if not cat:
            cat = Category(name=cat_data["name"], description=cat_data["description"])
            db.session.add(cat)
            db.session.flush()
        category_map[cat_data["name"]] = cat.category_id
        
    # 2. Products
    products_data = [
        # Kitchen Products
        {"name": "Non-stick Frying Pan", "sku": "KIT-001", "category": "Kitchen Products", "price": 25.99},
        {"name": "Chef's Knife Set", "sku": "KIT-002", "category": "Kitchen Products", "price": 89.50},
        {"name": "Electric Toaster", "sku": "KIT-003", "category": "Kitchen Products", "price": 45.00},
        
        # Clothes
        {"name": "Cotton T-Shirt (White)", "sku": "CLO-001", "category": "Clothes", "price": 12.99},
        {"name": "Denim Jeans (Blue)", "sku": "CLO-002", "category": "Clothes", "price": 49.95},
        {"name": "Winter Jacket (Navy)", "sku": "CLO-003", "category": "Clothes", "price": 120.00},
        
        # Grocery
        {"name": "Organic Milk (1L)", "sku": "GRO-001", "category": "Grocery", "price": 3.50},
        {"name": "Whole Wheat Bread", "sku": "GRO-002", "category": "Grocery", "price": 2.80},
        {"name": "Espresso Coffee Beans", "sku": "GRO-003", "category": "Grocery", "price": 18.00},
        
        # Home Appliances
        {"name": "Smart Vacuum Cleaner", "sku": "HAP-001", "category": "Home Appliances", "price": 299.00},
        {"name": "Air Purifier", "sku": "HAP-002", "category": "Home Appliances", "price": 150.00},
        {"name": "Microwave Oven", "sku": "HAP-003", "category": "Home Appliances", "price": 185.00}
    ]
    
    product_ids = []
    for prod_data in products_data:
        prod = Product.query.filter_by(sku=prod_data["sku"]).first()
        if not prod:
            prod = Product(
                name=prod_data["name"],
                sku=prod_data["sku"],
                category_id=category_map[prod_data["category"]],
                unit_price=prod_data["price"],
                cost_price=prod_data["price"] * 0.7
            )
            db.session.add(prod)
            db.session.flush()
        product_ids.append(prod.product_id)
        
    # 3. Inventory for all branches
    branches = Branch.query.all()
    for branch in branches:
        for p_id in product_ids:
            inv = Inventory.query.filter_by(product_id=p_id, branch_id=branch.branch_id).first()
            if not inv:
                qty = random.randint(10, 100)
                inv = Inventory(
                    product_id=p_id,
                    branch_id=branch.branch_id,
                    quantity=qty,
                    min_threshold=5,
                    max_threshold=200
                )
                db.session.add(inv)
                
    db.session.commit()
    print("Seeding completed successfully!")

if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        seed_inventory()
