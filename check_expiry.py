import sys
import os

# Add the backend directory to sys.path
sys.path.append(r"d:\multibranch-retail-and-inventory-management-system\backend")

from app import create_app
from app.models.product import Product
from datetime import datetime

app = create_app()
with app.app_context():
    try:
        now = datetime.now()
        # Explicitly check for products expiring soon
        products = Product.query.filter(Product.expiry_date != None).all()
        for p in products[:5]:
            days = (datetime.combine(p.expiry_date, datetime.min.time()) - now).days
            print(f"Product: {p.name}, Expiry: {p.expiry_date}, Days: {days}")
    except Exception as e:
        print(f"ERROR: {str(e)}")
