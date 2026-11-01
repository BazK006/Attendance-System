from database import db
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash


class Teacher(db.Model):
    __tablename__ = "teachers"

    id = db.Column(db.Integer, primary_key=True)

    teacher_id = db.Column(db.String(20), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    auth_provider = db.Column(db.String(20), nullable=False, default="local")
    password = db.Column(db.String(255), nullable=False)

    full_name = db.Column(db.String(100), nullable=False)
    department = db.Column(db.String(100))
    school_name = db.Column(db.String(150))
    role = db.Column(db.String(20), default="teacher")
    last_login = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.now)

    def set_password(self, password):
        self.password = generate_password_hash(password)

    def check_password(self, password):
        if not self.password:
            return False
        return check_password_hash(self.password, password)
