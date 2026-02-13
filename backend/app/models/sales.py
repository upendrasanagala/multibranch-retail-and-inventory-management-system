from app.extensions import db
from datetime import datetime

class SalesTransaction(db.Model):
    __tablename__ = "sales_transactions"

    transaction_id = db.Column(db.Integer, primary_key=True)

    branch_id = db.Column(
        db.Integer,
        db.ForeignKey("branches.branch_id"),
        nullable=False
    )

    staff_id = db.Column(
        db.Integer,
        db.ForeignKey("users.user_id"),
        nullable=False
    )

    total_amount = db.Column(db.Float, nullable=False)
    payment_method = db.Column(db.String(50))
    discount = db.Column(db.Float, default=0.0)
    status = db.Column(db.String(30), default="completed")

    transaction_date = db.Column(
        db.DateTime,
        default=datetime.now
    )
class TransactionItem(db.Model):
    __tablename__ = "transaction_items"

    item_id = db.Column(db.Integer, primary_key=True)

    transaction_id = db.Column(
        db.Integer,
        db.ForeignKey("sales_transactions.transaction_id"),
        nullable=False
    )

    product_id = db.Column(
        db.Integer,
        db.ForeignKey("products.product_id"),
        nullable=False
    )

    quantity = db.Column(db.Integer, nullable=False)
    unit_price = db.Column(db.Float, nullable=False)
    subtotal = db.Column(db.Float, nullable=False)
