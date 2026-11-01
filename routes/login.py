from flask import (
    Blueprint,
    render_template,
    request,
    session,
    redirect,
    url_for,
    flash,
    current_app,
    Flask,
    jsonify,
)
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from models import Teacher, write_log
from models.admin import Admin
from database import db
from datetime import datetime
from sqlalchemy import or_, func, desc
from werkzeug.security import check_password_hash
from authlib.integrations.flask_client import OAuth
from sqlalchemy.exc import SQLAlchemyError
from dotenv import load_dotenv
import os
import time

app = Flask(__name__)

load_dotenv()

auth_bp = Blueprint("auth", __name__)

oauth = OAuth()
oauth.register(
    name="google",
    client_id=os.environ.get("GOOGLE_CLIENT_ID"),
    client_secret=os.environ.get("GOOGLE_CLIENT_SECRET"),
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)

limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://",
)


@auth_bp.app_errorhandler(429)
def ratelimit_handler(e):
    session["lockout_until"] = time.time() + 60

    flash("คุณพยายามเข้าสู่ระบบบ่อยเกินไป ระบบถูกล็อคชั่วคราว", "danger")
    return redirect(url_for("auth.login"))


def generate_teacher_id():
    current_thai_year = datetime.now().year + 543
    yy = str(current_thai_year)[-2:]
    prefix = f"T-{yy}"

    last_teacher = (
        Teacher.query.filter(Teacher.teacher_id.like(f"{prefix}%"))
        .order_by(desc(Teacher.teacher_id))
        .first()
    )

    if last_teacher and len(last_teacher.teacher_id) == 7:
        try:
            last_num = int(last_teacher.teacher_id[-3:])
            new_num = last_num + 1
        except ValueError:
            new_num = 1
    else:
        new_num = 1

    return f"{prefix}{new_num:03d}"


@auth_bp.route("/", methods=["GET", "POST"])
@limiter.limit("5 per minute", methods=["POST"])
def login():
    if request.method == "GET":
        lockout_until = session.get("lockout_until", 0)

        remaining_time = int(lockout_until - time.time())

        if remaining_time <= 0:
            session.pop("lockout_until", None)
            remaining_time = 0

        return render_template("login.html", remaining_time=remaining_time)

    login_input = (request.form.get("username") or "").strip()

    password_input = request.form.get("password") or ""

    if not login_input or not password_input:
        flash("กรุณากรอกชื่อผู้ใช้และรหัสผ่าน", "danger")
        return redirect(url_for("auth.login"))

    login_key = login_input.lower()

    try:
        admin = Admin.query.filter(func.lower(Admin.id_admin) == login_key).first()

    except SQLAlchemyError:
        db.session.rollback()

        current_app.logger.exception("Failed to query Admin during login")

        flash("ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง", "danger")
        return redirect(url_for("auth.login"))

    if admin:
        if not admin.password or not check_password_hash(
            admin.password, password_input
        ):
            flash("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง", "danger")
            return redirect(url_for("auth.login"))

        try:
            admin.last_login = datetime.now()
            db.session.commit()

        except SQLAlchemyError:
            db.session.rollback()

            current_app.logger.exception("Failed to update Admin last_login")

            flash("ไม่สามารถเข้าสู่ระบบได้ในขณะนี้ " "กรุณาลองใหม่อีกครั้ง", "danger")
            return redirect(url_for("auth.login"))

        session.clear()

        session["user_id"] = admin.id
        session["role"] = "admin"
        session["username"] = admin.username

        try:
            write_log(
                action="เข้าสู่ระบบ",
                details=(
                    f"ผู้ดูแลระบบ ชื่อบัญชี: " f"{admin.username} เข้าสู่ระบบสำเร็จ"
                ),
            )

        except Exception:
            db.session.rollback()

            current_app.logger.exception("Failed to write Admin login log")

        flash(f"ยินดีต้อนรับผู้ดูแลระบบ คุณ {admin.username}!", "success")

        return redirect(url_for("admin.manage_system"))

    try:
        teacher = Teacher.query.filter(
            or_(
                func.lower(Teacher.email) == login_key,
                func.lower(Teacher.teacher_id) == login_key,
            )
        ).first()

    except SQLAlchemyError:
        db.session.rollback()

        current_app.logger.exception("Failed to query Teacher during login")

        flash("ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง", "danger")
        return redirect(url_for("auth.login"))

    if teacher and teacher.check_password(password_input):
        try:
            teacher.last_login = datetime.now()
            db.session.commit()

        except SQLAlchemyError:
            db.session.rollback()

            current_app.logger.exception("Failed to update Teacher last_login")

            flash("ไม่สามารถเข้าสู่ระบบได้ในขณะนี้ " "กรุณาลองใหม่อีกครั้ง", "danger")
            return redirect(url_for("auth.login"))

        if not teacher.password:
            flash(
                "บัญชีนี้เชื่อมต่อกับ Google ไว้ กรุณากดปุ่ม 'เข้าสู่ระบบด้วย Google'",
                "warning",
            )
            return redirect(url_for("auth.login"))

        session.clear()

        session["user_id"] = teacher.id
        session["role"] = "teacher"

        session["username"] = teacher.full_name
        session["auth_provider"] = "local"

        write_log(
            action="เข้าสู่ระบบ",
            details=(
                f"คุณครู {teacher.full_name} "
                f"(รหัส: {teacher.teacher_id}) "
                f"เข้าสู่ระบบสำเร็จผ่านบัญชีปกติ"
            ),
        )

        flash(f"ยินดีต้อนรับสู่ระบบเช็คชื่อ! คุณครู {teacher.full_name}", "success")

        return redirect(url_for("dashboard.dashboard"))

    flash("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง", "danger")
    return redirect(url_for("auth.login"))


@auth_bp.route("/login/google")
def google_login():
    redirect_uri = os.environ.get("GOOGLE_REDIRECT_URI")

    if not redirect_uri:
        current_app.logger.error("GOOGLE_REDIRECT_URI is not configured")
        flash("ระบบเข้าสู่ระบบ Google ยังไม่ได้ตั้งค่า", "danger")
        return redirect(url_for("auth.login"))

    try:
        return oauth.google.authorize_redirect(redirect_uri)

    except Exception:
        current_app.logger.exception("Failed to start Google OAuth login")
        flash("ไม่สามารถเริ่มเข้าสู่ระบบด้วย Google ได้", "danger")
        return redirect(url_for("auth.login"))


@auth_bp.route("/login/google/callback")
def google_callback():
    try:
        token = oauth.google.authorize_access_token()
        user_info = token.get("userinfo")

        if not user_info:
            flash("ไม่สามารถดึงข้อมูลโปรไฟล์จาก Google ได้", "danger")
            return redirect(url_for("auth.login"))

        google_email = (user_info.get("email") or "").strip().lower()
        google_sub = (user_info.get("sub") or "").strip()
        email_verified = user_info.get("email_verified") is True

        if not google_email or not google_sub or not email_verified:
            flash("ไม่สามารถยืนยันตัวตน Google ได้", "danger")
            return redirect(url_for("auth.login"))

        teacher = Teacher.query.filter(
            func.lower(Teacher.email) == google_email
        ).first()

        if not teacher:
            session.clear()
            session["temp_google_email"] = google_email
            session["temp_google_name"] = user_info.get("name", "")

            return redirect(url_for("auth.complete_profile"))

        teacher.auth_provider = "google"
        teacher.last_login = datetime.now()

        db.session.commit()

        session.clear()
        session.permanent = True

        session["user_id"] = teacher.id
        session["role"] = "teacher"

        session["username"] = teacher.full_name
        session["auth_provider"] = "google"

        write_log(
            action="เข้าสู่ระบบ",
            details=(
                f"คุณครู {teacher.full_name} "
                f"(รหัส: {teacher.teacher_id}) "
                f"เข้าสู่ระบบสำเร็จผ่าน Google"
            ),
        )

        flash(f"ยินดีต้อนรับสู่ระบบเช็คชื่อ! คุณครู {teacher.full_name}!", "success")
        return redirect(url_for("dashboard.dashboard"))

    except Exception:
        db.session.rollback()
        current_app.logger.exception("Google OAuth callback failed")
        flash("ระบบยืนยันตัวตน Google ขัดข้อง โปรดลองใหม่อีกครั้งในภายหลัง", "danger")
        return redirect(url_for("auth.login"))


@auth_bp.route("/complete-profile", methods=["GET", "POST"])
def complete_profile():
    if "temp_google_email" not in session:
        flash("กรุณาเข้าสู่ระบบผ่าน Google ก่อน", "warning")
        return redirect(url_for("auth.login"))

    if request.method == "POST":
        full_name = request.form.get("full_name", "").strip()
        school_name = request.form.get("school_name", "").strip()

        department = request.form.get("department", "").strip()
        if department == "อื่นๆ":
            department = request.form.get("other_department", "").strip()

        email = session.pop("temp_google_email")
        session.pop("temp_google_name", None)

        new_teacher_id = generate_teacher_id()

        try:
            teacher = Teacher(
                teacher_id=new_teacher_id,
                email=email,
                full_name=full_name,
                role="teacher",
                school_name=school_name,
                department=department,
                password=None,
            )
            db.session.add(teacher)
            db.session.commit()

            teacher.last_login = datetime.now()
            db.session.commit()

            session.clear()
            session.permanent = True

            session["user_id"] = teacher.id
            session["role"] = "teacher"
            session["username"] = teacher.full_name

            write_log(
                action="สร้างบัญชีคุณครู",
                details=(
                    f"สร้างบัญชีคุณครูผ่าน Google "
                    f"รหัส: {teacher.teacher_id} "
                    f"ชื่อ: {teacher.full_name}"
                ),
            )

            flash(
                f"ตั้งค่าโปรไฟล์สำเร็จ! ยินดีต้อนรับคุณครู {teacher.full_name}",
                "success",
            )
            return redirect(url_for("dashboard.dashboard"))

        except Exception as e:
            db.session.rollback()
            current_app.logger.exception("Error saving new teacher profile")
            flash("เกิดข้อผิดพลาดในการสร้างบัญชี กรุณาลองใหม่อีกครั้ง", "danger")
            return redirect(url_for("auth.login"))

    email = session.get("temp_google_email", "")
    default_name = session.get("temp_google_name", "")

    preview_teacher_id = generate_teacher_id()

    return render_template(
        "complete_profile.html",
        email=email,
        default_name=default_name,
        teacher_id=preview_teacher_id,
    )


@auth_bp.route("/cancel-setup")
def cancel_setup():
    session.pop("temp_google_email", None)
    session.pop("temp_google_name", None)

    flash("ยกเลิกการเข้าสู่ระบบและกลับสู่หน้าหลักเรียบร้อย", "info")
    return redirect(url_for("auth.login"))


@auth_bp.route("/logout")
def logout():
    try:
        write_log(
            action="ออกจากระบบ",
            details=(
                f"ชื่อผู้ใช้งาน: "
                f"{session.get('username', 'ไม่ระบุชื่อ')} "
                f"ออกจากระบบเรียบร้อยแล้ว!"
            ),
        )

    except Exception:
        db.session.rollback()
        current_app.logger.exception("Failed to write logout log")

    session.clear()
    flash("ออกจากระบบเรียบร้อยแล้ว ขอบคุณที่ใช้งานครับ", "success")

    return redirect(url_for("auth.login"))
