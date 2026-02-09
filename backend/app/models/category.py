from app.extensions import db

class Category(db.Model):
    __tablename__ = "categories"

    category_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)

    parent_category_id = db.Column(
        db.Integer,
        db.ForeignKey("categories.category_id"),
        nullable=True
    )
