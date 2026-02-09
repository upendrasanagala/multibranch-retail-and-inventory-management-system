from app.extensions import db
from datetime import datetime

class Inventory(db.Model):
    __tablename__ = "inventory"

    inventory_id = db.Column(db.Integer, primary_key=True)

    product_id = db.Column(
        db.Integer,
        db.ForeignKey("products.product_id"),
        nullable=False
    )

    branch_id = db.Column(
        db.Integer,
        db.ForeignKey("branches.branch_id"),
        nullable=False
    )

    quantity = db.Column(db.Integer, default=0)
    min_threshold = db.Column(db.Integer, default=0)
    max_threshold = db.Column(db.Integer)
    last_updated = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )
