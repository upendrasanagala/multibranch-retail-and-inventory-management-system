from app.extensions import db
from datetime import datetime

class Supplier(db.Model):
    __tablename__ = "suppliers"

    supplier_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    contact_person = db.Column(db.String(150))
    phone = db.Column(db.String(20))
    email = db.Column(db.String(100))
    address = db.Column(db.Text)
    
    # Relationship to products
    products = db.relationship("Product", backref="supplier", lazy=True)
    
    # Relationship to returns (adjustments)
    adjustments = db.relationship("InventoryAdjustment", backref="supplier", lazy=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "supplier_id": self.supplier_id,
            "name": self.name,
            "contact_person": self.contact_person,
            "phone": self.phone,
            "email": self.email,
            "address": self.address,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
