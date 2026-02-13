from app.extensions import db
from datetime import datetime

class Product(db.Model):
    __tablename__ = "products"

    product_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    sku = db.Column(db.String(100), unique=True)
    barcode = db.Column(db.String(100))
    category_id = db.Column(
        db.Integer,
        db.ForeignKey("categories.category_id"),
        nullable=False
    )
    description = db.Column(db.Text)
    unit_price = db.Column(db.Float, nullable=False)
    cost_price = db.Column(db.Float)
    image_path = db.Column(db.String(255))
    unit = db.Column(db.String(20)) # e.g. kg, L, pcs
    
    # New Fields for Import
    size = db.Column(db.String(50))
    discount_percent = db.Column(db.Float, default=0.0)
    gst_percent = db.Column(db.Float, default=0.0)
    expiry_date = db.Column(db.Date)
    is_b1g1 = db.Column(db.Boolean, default=False) # Buy 1 Get 1 Free Offer
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
