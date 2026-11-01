from database import db


class SessionStudent(db.Model):
    __tablename__ = "session_students"

    id = db.Column(db.Integer, primary_key=True)

    session_id = db.Column(
        db.Integer,
        db.ForeignKey("classroom_sessions.id"),
        nullable=False,
    )

    student_id = db.Column(db.String(20), nullable=False)
    student_name = db.Column(db.String(100), nullable=False)
    student_number = db.Column(db.Integer, nullable=False)

    education_level = db.Column(db.String(20), nullable=False)
    student_level = db.Column(db.String(10), nullable=True)
    student_room = db.Column(db.String(10), nullable=True)

    __table_args__ = (
        db.UniqueConstraint(
            "session_id",
            "student_id",
            name="uq_session_student",
        ),
    )

    session = db.relationship(
        "ClassroomSession",
        back_populates="session_students",
    )

    def __repr__(self):
        return (
            f"<SessionStudent {self.student_id} - "
            f"{self.student_name} (Session {self.session_id})>"
        )
