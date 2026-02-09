from app.extensions import db
from datetime import datetime

class StockTransfer(db.Model):
    __tablename__ = "stock_transfers"

    transfer_id = db.Column(db.Integer, primary_key=True)

    product_id = db.Column(
        db.Integer,
        db.ForeignKey("products.product_id"),
        nullable=False
    )

    from_branch_id = db.Column(
        db.Integer,
        db.ForeignKey("branches.branch_id"),
        nullable=False
    )

    to_branch_id = db.Column(
        db.Integer,
        db.ForeignKey("branches.branch_id"),
        nullable=False
    )

    quantity = db.Column(db.Integer, nullable=False)

    request_date = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    status = db.Column(db.String(30), default="pending")

    approved_by = db.Column(
        db.Integer,
        db.ForeignKey("users.user_id")
    )

    completed_date = db.Column(db.DateTime)
    notes = db.Column(db.Text)
