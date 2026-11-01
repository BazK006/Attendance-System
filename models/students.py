from database import db
from datetime import datetime


class Student(db.Model):
    __tablename__ = "students"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.String(20), unique=True, nullable=False)
    full_name = db.Column(db.String(100), nullable=False)
    student_number = db.Column(db.Integer, nullable=False)

    education_level = db.Column(db.String(20), nullable=False)
    student_level = db.Column(db.String(10))
    student_room = db.Column(db.String(10))
    school_name = db.Column(db.String(150))

    created_at = db.Column(db.DateTime, default=datetime.now)
    last_checkin = db.Column(db.DateTime, nullable=True)

    def __repr__(self):
        return f"<{self.education_level} {self.student_id} - {self.full_name} ({self.student_level}/{self.student_room})>"
