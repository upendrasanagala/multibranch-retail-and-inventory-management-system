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
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
