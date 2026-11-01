import os
from flask import Flask
from dotenv import load_dotenv
from database import db
from datetime import datetime
from models.students import Student
from models.teachers import Teacher
from models.attendance import Attendance
from models.class_session import ClassroomSession
from models.logs import socketio
from routes.login import auth_bp, oauth
from routes.dashboard import dashboard_bp
from routes.class_session import session_bp
from routes.check_in import checkin_bp
from routes.data_student import data_students_bp
from routes.stat_dashboard import stat_dashboard_bp
from routes.stat_summary import stat_summary_bp
from routes.admin import admin_bp
from routes.logs_status import logs_status_bp
from routes.teacher import teacher_bp
from flask_wtf.csrf import CSRFProtect

load_dotenv()

app = Flask(__name__)

csrf = CSRFProtect(app)

app.secret_key = os.getenv("SECRET_KEY", "attendance_system_secret_key")

DB_USER = os.getenv("DB_USER")
DB_PASS = os.getenv("DB_PASS")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")

app.config["SQLALCHEMY_DATABASE_URI"] = (
    f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)

app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["RATELIMIT_ENABLED"] = False

db.init_app(app)

app.register_blueprint(auth_bp)
app.register_blueprint(dashboard_bp, url_prefix="/dashboard")
app.register_blueprint(session_bp, url_prefix="/session")
app.register_blueprint(checkin_bp, url_prefix="/checkin")
app.register_blueprint(data_students_bp, url_prefix="/data_students")
app.register_blueprint(stat_dashboard_bp)
app.register_blueprint(stat_summary_bp)
app.register_blueprint(admin_bp)
app.register_blueprint(logs_status_bp)
app.register_blueprint(teacher_bp)

socketio.init_app(app)
oauth.init_app(app)


@app.context_processor
def inject_now():
    def format_thai_date(date_obj=None):
        if not date_obj:
            date_obj = datetime.now()
        months = [
            "มกราคม",
            "กุมภาพันธ์",
            "มีนาคม",
            "เมษายน",
            "พฤษภาคม",
            "มิถุนายน",
            "กรกฎาคม",
            "สิงหาคม",
            "กันยายน",
            "ตุลาคม",
            "พฤศจิกายน",
            "ธันวาคม",
        ]
        return f"{date_obj.day} {months[date_obj.month - 1]} {date_obj.year + 543}"

    def format_thai_time(date_obj=None):
        if not date_obj:
            date_obj = datetime.now()
        return date_obj.strftime("%H:%M")

    return dict(
        format_thai_date=format_thai_date,
        format_thai_time=format_thai_time,
    )


if __name__ == "__main__":
    with app.app_context():
        db.create_all()

    app.run(debug=os.getenv("FLASK_DEBUG") == "True", port=5000, host="0.0.0.0")

# deactivate ถอน .venv
