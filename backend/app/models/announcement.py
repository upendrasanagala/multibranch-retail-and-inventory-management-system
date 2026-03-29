from app.extensions import db
from datetime import datetime

class Announcement(db.Model):
    __tablename__ = "announcements"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    message = db.Column(db.Text, nullable=False)
    target_role = db.Column(db.String(50), nullable=False, default="all")  # all, manager, staff
    created_by_id = db.Column(db.Integer, db.ForeignKey("users.user_id"), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Optional relationship to track who created it
    creator = db.relationship("User", foreign_keys=[created_by_id])

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "message": self.message,
            "target_role": self.target_role,
            "created_by_id": self.created_by_id,
            "creator_name": f"{self.creator.first_name} {self.creator.last_name}" if self.creator else "Admin",
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None
        }
