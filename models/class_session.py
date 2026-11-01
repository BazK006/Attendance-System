from database import db
from datetime import datetime


class ClassroomSession(db.Model):
    __tablename__ = "classroom_sessions"

    id = db.Column(db.Integer, primary_key=True)

    teacher_id_ref = db.Column(db.Integer, db.ForeignKey("teachers.id"), nullable=False)

    teacher = db.relationship(
        "Teacher", backref="sessions", foreign_keys=[teacher_id_ref]
    )

    id_subject = db.Column(db.String(50), nullable=False)
    subject_name = db.Column(db.String(150), nullable=False)
    room_name = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now)
    start_time = db.Column(db.DateTime, default=datetime.now)
    status = db.Column(db.String(20), default="active")
    allowed_minutes = db.Column(db.Integer, default=10)
    secret_key = db.Column(db.String(50), nullable=False)

    attendees = db.relationship(
        "Attendance", back_populates="session", cascade="all, delete-orphan"
    )

    session_students = db.relationship(
        "SessionStudent",
        back_populates="session",
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return f"<ClassroomSession {self.room_name}>"
