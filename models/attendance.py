from database import db
from datetime import datetime


class Attendance(db.Model):
    __tablename__ = "attendance"

    id = db.Column(db.Integer, primary_key=True)

    student_id = db.Column(db.String(20), nullable=False)

    student_name = db.Column(db.String(100), nullable=False)
    student_number = db.Column(db.Integer, nullable=False)

    session_id = db.Column(
        db.Integer, db.ForeignKey("classroom_sessions.id"), nullable=False
    )
    room_tag = db.Column(db.String(50))

    check_in_time = db.Column(db.DateTime, default=datetime.now)
    status = db.Column(db.String(20), default="present")
    updated_at = db.Column(db.DateTime, nullable=True)

    session = db.relationship("ClassroomSession", back_populates="attendees")

    def __init__(self, **kwargs):
        super(Attendance, self).__init__(**kwargs)
        if self.session:
            if not self.room_tag:
                self.room_tag = self.session.room_name

            time_diff = (datetime.now() - self.session.start_time).total_seconds() / 60
            if time_diff > 5:
                self.status = "late"

    def __repr__(self):
        return f"<Attendance {self.student_name} ({self.room_tag}) - {self.status}>"
