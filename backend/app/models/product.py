from app.extensions import db
from datetime import datetime

class Product(db.Model):
    __tablename__ = "products"

    product_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    # Brand could be added later if needed, but for now we have Name
    
    category_id = db.Column(
        db.Integer,
        db.ForeignKey("categories.category_id"),
        nullable=False
    )
    description = db.Column(db.Text)
    image_path = db.Column(db.String(255))
    unit = db.Column(db.String(20)) # e.g. kg, L, pcs
    
    # Generic supplier for the product line
    supplier_id = db.Column(db.Integer, db.ForeignKey("suppliers.supplier_id"), nullable=False)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    category = db.relationship("Category", backref="products", lazy=True)
    variants = db.relationship("ProductVariant", backref="product", cascade="all, delete-orphan", lazy=True)

class ProductVariant(db.Model):
    __tablename__ = "product_variants"

    variant_id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("products.product_id"), nullable=False)
    branch_id = db.Column(db.Integer, db.ForeignKey("branches.branch_id"), nullable=False)
    
    variant_size = db.Column(db.String(50)) # e.g. "100g", "1L"
    sku_code = db.Column(db.String(100), unique=True)
    barcode = db.Column(db.String(100))
    
    stock_quantity = db.Column(db.Float, default=0.0) # Changed to Float for kg/L accuracy
    price = db.Column(db.Float, nullable=False)
    cost_price = db.Column(db.Float)
    
    discount_percent = db.Column(db.Float, default=0.0)
    gst_percent = db.Column(db.Float, default=0.0)
    
    mfg_date = db.Column(db.Date)
    expiry_date = db.Column(db.Date)
    
    is_b1g1 = db.Column(db.Boolean, default=False)
    
    min_threshold = db.Column(db.Integer, default=10)
    max_threshold = db.Column(db.Integer, default=100)
    
    last_updated = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship to branch
    branch = db.relationship("Branch", backref="variants", lazy=True)
