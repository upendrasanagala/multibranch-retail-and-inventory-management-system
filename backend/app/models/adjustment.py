from app.extensions import db
from datetime import datetime

class InventoryAdjustment(db.Model):
    __tablename__ = "inventory_adjustments"

    adjustment_id = db.Column(db.Integer, primary_key=True)

    variant_id = db.Column(
        db.Integer,
        db.ForeignKey("product_variants.variant_id"),
        nullable=False
    )
    
    product_id = db.Column(
        db.Integer,
        db.ForeignKey("products.product_id"),
        nullable=True
    )

    branch_id = db.Column(
        db.Integer,
        db.ForeignKey("branches.branch_id"),
        nullable=False
    )

    adjustment_type = db.Column(db.String(50), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    reason = db.Column(db.Text)

    adjusted_by = db.Column(
        db.Integer,
        db.ForeignKey("users.user_id")
    )
    supplier_id = db.Column(db.Integer, db.ForeignKey("suppliers.supplier_id"), nullable=True)

    adjustment_date = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )
