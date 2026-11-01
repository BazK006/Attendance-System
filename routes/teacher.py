import re
from flask import (
    Blueprint,
    render_template,
    session,
    redirect,
    url_for,
    flash,
    request,
    jsonify,
    current_app,
)
from database import db
from models import Teacher, ClassroomSession, write_log
from functools import wraps
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

teacher_bp = Blueprint("teacher", __name__)


@teacher_bp.app_context_processor
def inject_teacher_global():
    if "user_id" in session:
        teacher = Teacher.query.get(session["user_id"])
        return dict(teacher=teacher)
    return dict(teacher=None)


def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "user_id" not in session or session.get("role") != "teacher":
            flash("กรุณาเข้าสู่ระบบก่อนใช้งาน", "danger")
            return redirect(url_for("auth.login"))
        return f(*args, **kwargs)

    return decorated_function


@teacher_bp.route("/dashboard")
@login_required
def dashboard():
    teacher = Teacher.query.get(session["user_id"])

    if not teacher:
        session.clear()
        return redirect(url_for("auth.login"))

    # write_log(
    #     action="เข้าชมแดชบอร์ดห้องเรียน",
    #     details=(
    #         f"คุณครู {teacher.full_name} "
    #         f"(รหัส: {teacher.teacher_id}) "
    #         f"เข้าชมแดชบอร์ดเพื่อตรวจสอบข้อมูลห้องเรียน"
    #     ),
    # )

    sessions = (
        ClassroomSession.query.filter_by(teacher_id_ref=teacher.id)
        .order_by(ClassroomSession.start_time.desc())
        .all()
    )

    return render_template("dashboard.html", teacher=teacher, sessions=sessions)


@teacher_bp.route("/edit-profile", methods=["GET", "POST"])
@login_required
def edit_profile():
    user_id = session.get("user_id")

    if not user_id:
        return redirect(url_for("auth.login"))

    teacher = db.session.get(Teacher, user_id)

    if not teacher:
        session.clear()
        flash("ไม่พบบัญชีผู้ใช้ กรุณาเข้าสู่ระบบอีกครั้ง", "warning")
        return redirect(url_for("auth.login"))

    is_google_user = (
        session.get("auth_provider") == "google"
        or bool(getattr(teacher, "google_sub", None))
        or getattr(teacher, "auth_provider", "local") == "google"
    )

    if request.method == "POST":
        full_name = (request.form.get("full_name") or "").strip()

        department = (request.form.get("department") or "").strip()

        school_name = (request.form.get("school_name") or "").strip()

        if not full_name:
            return jsonify({"status": "error", "message": "กรุณากรอกชื่อ-นามสกุล"}), 400

        new_email = None

        if not is_google_user:
            new_email = (request.form.get("email") or "").strip().lower()

            if not new_email or not re.fullmatch(
                r"[^@\s]+@[^@\s]+\.[^@\s]+", new_email
            ):
                return (
                    jsonify({"status": "error", "message": "กรุณากรอกอีเมลให้ถูกต้อง"}),
                    400,
                )

            existing_teacher = Teacher.query.filter(
                func.lower(Teacher.email) == new_email, Teacher.id != teacher.id
            ).first()

            if existing_teacher:
                return (
                    jsonify(
                        {
                            "status": "error",
                            "message": "อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น",
                        }
                    ),
                    409,
                )

        try:
            teacher.full_name = full_name
            teacher.department = department
            teacher.school_name = school_name

            if not is_google_user:
                teacher.email = new_email

            db.session.commit()

        # write_log(
        #     action="แก้ไขโปรไฟล์คุณครู",
        #     details=(
        #         f"คุณครู {teacher.full_name} "
        #         f"(รหัส: {teacher.teacher_id}) "
        #         f"อัปเดตข้อมูลโปรไฟล์สำเร็จ"
        #     ),
        # )

        except IntegrityError:
            db.session.rollback()

            return (
                jsonify(
                    {
                        "status": "error",
                        "message": "อีเมลนี้อาจถูกใช้งานแล้ว กรุณาตรวจสอบอีกครั้ง",
                    }
                ),
                409,
            )

        except SQLAlchemyError:
            db.session.rollback()

            current_app.logger.exception("Failed to update teacher profile")

            return (
                jsonify(
                    {
                        "status": "error",
                        "message": "ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่",
                    }
                ),
                500,
            )

        return jsonify(
            {
                "status": "success",
                "message": "อัปเดตข้อมูลเรียบร้อยแล้ว!",
                "teacher_name": teacher.full_name,
            }
        )

    return render_template(
        "edit_profile.html", teacher=teacher, is_google_user=is_google_user
    )
