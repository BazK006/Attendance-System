from flask import (
    Blueprint,
    render_template,
    request,
    redirect,
    url_for,
    flash,
    session,
    current_app,
    jsonify,
)
from datetime import datetime
from database import db
from models import Student, Teacher, ClassroomSession, Attendance
from models.admin import Admin
from models.logs import write_log
from werkzeug.security import generate_password_hash
from datetime import datetime
from collections import Counter
from datetime import date, datetime, time, timedelta
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
import calendar
import re

admin_bp = Blueprint("admin", __name__)


def generate_next_teacher_id():
    year_code = f"{(datetime.now().year + 543) % 100:02d}"
    prefix = f"T-{year_code}"

    existing_ids = (
        db.session.query(Teacher.teacher_id)
        .filter(Teacher.teacher_id.like(f"{prefix}%"))
        .all()
    )

    pattern = re.compile(rf"^{re.escape(prefix)}(\d+)$")

    sequences = []

    for (teacher_id,) in existing_ids:
        match = pattern.fullmatch(teacher_id or "")

        if match:
            sequences.append(int(match.group(1)))

    latest_sequence = max(sequences, default=0)

    return f"{prefix}{latest_sequence + 1:03d}"


@admin_bp.route("/admin/teachers/next-id", methods=["GET"])
def next_teacher_id():
    if not session.get("user_id") or session.get("role") != "admin":
        return jsonify({"error": "ไม่มีสิทธิ์การเข้าถึง"}), 403

    return jsonify({"teacher_id": generate_next_teacher_id()})


@admin_bp.route("/admin/management")
@admin_bp.route("/admin/dashboard")
@admin_bp.route("/admin")
def manage_system():
    if not session.get("user_id") or session.get("role") != "admin":
        flash(
            "ไม่มีสิทธิ์การเข้าถึง! บัญชีของคุณไม่มีสิทธิ์ในการเข้าใช้งานส่วนนี้",
            "danger",
        )
        return redirect(url_for("auth.login"))

    period = (request.args.get("period") or "day").strip().lower()

    if period not in {"day", "month", "year", "range"}:
        period = "day"

    today = date.today()

    def parse_iso_date(raw_value, fallback):
        """แปลง YYYY-MM-DD เป็น date และรองรับกรณีไม่มีวันที่"""
        try:
            value = date.fromisoformat(raw_value) if raw_value else fallback

            if value is None:
                return None

            if not 2000 <= value.year <= 2100:
                return fallback

            return value

        except (TypeError, ValueError):
            return fallback

    selected_date = parse_iso_date(
        request.args.get("date", ""),
        today,
    )

    raw_month = (request.args.get("month") or "").strip()

    try:
        selected_month_date = (
            datetime.strptime(raw_month, "%Y-%m").date().replace(day=1)
            if raw_month
            else today.replace(day=1)
        )

        if not 2000 <= selected_month_date.year <= 2100:
            selected_month_date = today.replace(day=1)

    except (TypeError, ValueError):
        selected_month_date = today.replace(day=1)

    try:
        selected_year = int(request.args.get("year") or today.year)

        if not 2000 <= selected_year <= 2100:
            selected_year = today.year

    except (TypeError, ValueError):
        selected_year = today.year

    raw_range_start = (request.args.get("start_date") or "").strip()

    raw_range_end = (request.args.get("end_date") or "").strip()

    selected_range_start = parse_iso_date(
        raw_range_start,
        None,
    )

    selected_range_end = parse_iso_date(
        raw_range_end,
        None,
    )

    if selected_range_start is None or selected_range_end is None:
        selected_range_start = None

    range_has_selection = (
        selected_range_start is not None and selected_range_end is not None
    )

    if period == "range" and range_has_selection:

        if selected_range_end < selected_range_start:
            selected_range_start, selected_range_end = (
                selected_range_end,
                selected_range_start,
            )

            flash(
                "วันที่สิ้นสุดอยู่ก่อนวันที่เริ่มต้น " "ระบบสลับวันให้แล้ว",
                "warning",
            )

        if (selected_range_end - selected_range_start).days > 365:
            selected_range_end = selected_range_start + timedelta(days=365)

            flash(
                "ช่วงวันที่เลือกได้สูงสุด 366 วันต่อครั้ง " "ระบบปรับวันสิ้นสุดให้แล้ว",
                "warning",
            )

    if period == "day":
        start_date = selected_date
        end_date = start_date + timedelta(days=1)

        chart_labels = [f"{hour:02d}:00" for hour in range(24)]

    elif period == "month":
        start_date = selected_month_date

        end_date = start_date.replace(
            day=calendar.monthrange(
                start_date.year,
                start_date.month,
            )[1],
        ) + timedelta(days=1)

        chart_labels = [
            str(day)
            for day in range(
                1,
                calendar.monthrange(
                    start_date.year,
                    start_date.month,
                )[1]
                + 1,
            )
        ]

    elif period == "year":
        start_date = date(selected_year, 1, 1)
        end_date = date(selected_year + 1, 1, 1)

        chart_labels = [
            "ม.ค.",
            "ก.พ.",
            "มี.ค.",
            "เม.ย.",
            "พ.ค.",
            "มิ.ย.",
            "ก.ค.",
            "ส.ค.",
            "ก.ย.",
            "ต.ค.",
            "พ.ย.",
            "ธ.ค.",
        ]

    elif range_has_selection:
        start_date = selected_range_start

        end_date = selected_range_end + timedelta(days=1)

        crosses_year = start_date.year != selected_range_end.year

        label_format = "%d/%m/%y" if crosses_year else "%d/%m"

        chart_labels = [
            (start_date + timedelta(days=index)).strftime(label_format)
            for index in range((end_date - start_date).days)
        ]

    else:
        start_date = today
        end_date = today + timedelta(days=1)

        chart_labels = [today.strftime("%d/%m")]

    start_dt = datetime.combine(start_date, time.min)
    end_dt = datetime.combine(end_date, time.min)

    def bucket_index(value):
        if value is None:
            return None

        if isinstance(value, date) and not isinstance(value, datetime):
            value = datetime.combine(value, time.min)

        if getattr(value, "tzinfo", None) is not None:
            value = value.replace(tzinfo=None)

        if value < start_dt or value >= end_dt:
            return None

        if period == "day":
            return value.hour

        if period == "month":
            return value.day - 1

        if period == "year":
            return value.month - 1

        return (value.date() - start_date).days

    login_counts = [0] * len(chart_labels)
    student_created_counts = [0] * len(chart_labels)
    teacher_created_counts = [0] * len(chart_labels)

    total_students = 0
    total_teachers = 0

    new_student_dates = []
    new_teacher_dates = []
    logged_teachers = []
    logged_admins = []
    department_rows = []

    should_load_period_data = period != "range" or range_has_selection

    try:
        total_students = Student.query.count()
        total_teachers = Teacher.query.count()

        if should_load_period_data:

            new_student_dates = [
                row[0]
                for row in Student.query.with_entities(Student.created_at)
                .filter(
                    Student.created_at >= start_dt,
                    Student.created_at < end_dt,
                )
                .all()
            ]

            new_teacher_dates = [
                row[0]
                for row in Teacher.query.with_entities(Teacher.created_at)
                .filter(
                    Teacher.created_at >= start_dt,
                    Teacher.created_at < end_dt,
                )
                .all()
            ]

            logged_teachers = (
                Teacher.query.with_entities(
                    Teacher.full_name,
                    Teacher.last_login,
                )
                .filter(
                    Teacher.last_login >= start_dt,
                    Teacher.last_login < end_dt,
                )
                .all()
            )

            logged_admins = (
                Admin.query.with_entities(
                    Admin.username,
                    Admin.last_login,
                )
                .filter(
                    Admin.last_login >= start_dt,
                    Admin.last_login < end_dt,
                )
                .all()
            )

        department_rows = Teacher.query.with_entities(Teacher.department).all()

    except SQLAlchemyError:
        db.session.rollback()

        current_app.logger.exception("Failed to load admin analytics dashboard")

        flash(
            "ไม่สามารถโหลดสถิติได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง",
            "danger",
        )

        total_students = 0
        total_teachers = 0

        new_student_dates = []
        new_teacher_dates = []
        logged_teachers = []
        logged_admins = []
        department_rows = []

    for created_at in new_student_dates:
        index = bucket_index(created_at)

        if index is not None:
            student_created_counts[index] += 1

    for created_at in new_teacher_dates:
        index = bucket_index(created_at)

        if index is not None:
            teacher_created_counts[index] += 1

    for _, last_login in [*logged_teachers, *logged_admins]:
        index = bucket_index(last_login)

        if index is not None:
            login_counts[index] += 1

    dept_counter = Counter(
        ((department or "ไม่ระบุกลุ่มสาระ").strip() or "ไม่ระบุกลุ่มสาระ")
        for (department,) in department_rows
    )

    dept_items = sorted(
        dept_counter.items(),
        key=lambda item: (-item[1], item[0]),
    )

    top_departments = dept_items[:7]

    if len(dept_items) > 7:
        top_departments.append(
            (
                "อื่น ๆ",
                sum(count for _, count in dept_items[7:]),
            )
        )

    department_labels = [name for name, _ in top_departments]

    department_counts = [count for _, count in top_departments]

    recent_logins = []

    for name, last_login in logged_teachers:
        recent_logins.append(
            {
                "name": name,
                "role": "teacher",
                "last_login": last_login,
            }
        )

    for name, last_login in logged_admins:
        recent_logins.append(
            {
                "name": name,
                "role": "admin",
                "last_login": last_login,
            }
        )

    def login_sort_key(item):
        value = item["last_login"]

        if value is None:
            return datetime.min

        if getattr(value, "tzinfo", None) is not None:
            return value.replace(tzinfo=None)

        return value

    recent_logins.sort(
        key=login_sort_key,
        reverse=True,
    )

    recent_logins = recent_logins[:6]

    return render_template(
        "admin.html",
        period=period,
        selected_date=selected_date.isoformat(),
        selected_date_display=selected_date.strftime("%d/%m/%Y"),
        selected_month=selected_month_date.strftime("%Y-%m"),
        selected_month_display=selected_month_date.strftime("%m/%Y"),
        selected_year=selected_year,
        selected_range_start=(
            selected_range_start.isoformat() if selected_range_start else ""
        ),
        selected_range_end=(
            selected_range_end.isoformat() if selected_range_end else ""
        ),
        selected_range_start_display=(
            selected_range_start.strftime("%d/%m/%Y")
            if selected_range_start
            else "ยังไม่ได้เลือก"
        ),
        selected_range_end_display=(
            selected_range_end.strftime("%d/%m/%Y")
            if selected_range_end
            else "ยังไม่ได้เลือก"
        ),
        range_has_selection=range_has_selection,
        total_students=total_students,
        total_teachers=total_teachers,
        period_new_students=len(new_student_dates),
        period_login_accounts=(len(logged_teachers) + len(logged_admins)),
        chart_labels=chart_labels,
        login_counts=login_counts,
        student_created_counts=student_created_counts,
        teacher_created_counts=teacher_created_counts,
        department_labels=department_labels,
        department_counts=department_counts,
        recent_logins=recent_logins,
    )


@admin_bp.route("/admin/manage-students")
def manage_students():
    if not session.get("user_id") or session.get("role") != "admin":
        flash("ไม่มีสิทธิ์การเข้าถึง!", "danger")
        return redirect(url_for("auth.login"))

    students = Student.query.order_by(
        Student.education_level,
        Student.student_level,
        Student.student_room,
        Student.student_number.asc(),
    ).all()

    # DEV: เปิดใช้งาน Audit Log เมื่อ Deploy
    # write_log(
    #     action="เข้าถึงหน้าจัดการข้อมูลนักเรียน",
    #     details="ผู้ดูแลระบบเปิดหน้าจัดการข้อมูลนักเรียน"
    # )

    return render_template("manage_student.html", students=students)


@admin_bp.route("/admin/manage-teachers")
def manage_teachers():
    if not session.get("user_id") or session.get("role") != "admin":
        flash("ไม่มีสิทธิ์การเข้าถึง!", "danger")
        return redirect(url_for("auth.login"))

    teachers = Teacher.query.order_by(
        Teacher.created_at.desc().nulls_last(),
        Teacher.id.desc(),
    ).all()

    # DEV: เปิดใช้งาน Audit Log เมื่อ Deploy
    # write_log(
    #     action="เข้าถึงหน้าจัดการข้อมูลคุณครู",
    #     details="ผู้ดูแลระบบเปิดหน้าจัดการข้อมูลคุณครู"
    # )

    return render_template("manage_teacher.html", teachers=teachers)


# CRUD สำหรับนักเรียน
@admin_bp.route("/admin/students/add", methods=["POST"])
def add_student():
    if request.method == "POST":
        student_id = request.form.get("student_id")
        full_name = request.form.get("full_name")
        student_number = request.form.get("student_number")
        education_level = request.form.get("education_level")
        student_level = request.form.get("student_level")
        student_room = request.form.get("student_room")
        school_name = request.form.get("school_name", "ไม่ระบุสถานศึกษา")

        existing_student = Student.query.filter_by(student_id=student_id).first()

        if existing_student:
            flash(
                f"ไม่สามารถเพิ่มข้อมูลได้!\n"
                f"รหัสนักเรียน: {student_id} มีอยู่ในระบบแล้ว",
                "danger",
            )
            return redirect(url_for("admin.manage_students"))

        new_student = Student(
            student_id=student_id,
            full_name=full_name,
            student_number=int(student_number) if student_number else 0,
            education_level=education_level,
            student_level=student_level,
            student_room=student_room,
            school_name=school_name,
        )

        db.session.add(new_student)
        db.session.commit()

        # DEV: เปิดใช้งาน Audit Log เมื่อ Deploy
        # write_log(
        #     action="เพิ่มข้อมูลนักเรียน",
        #     details=f"เพิ่มนักเรียนใหม่ รหัส: {student_id} ชื่อ: {full_name}"
        # )

        flash(
            f"ชื่อ-นามสกุล: {new_student.full_name}\n"
            f"รหัสนักเรียน: {new_student.student_id}",
            "student_added",
        )

    return redirect(url_for("admin.manage_students"))


@admin_bp.route("/admin/students/edit/<int:id>", methods=["POST"])
def edit_student(id):
    student = Student.query.get_or_404(id)

    if request.method == "POST":
        input_student_id = request.form.get("student_id")

        duplicate_check = Student.query.filter(
            Student.student_id == input_student_id, Student.id != id
        ).first()

        if duplicate_check:
            flash(
                f"ไม่สามารถแก้ไขข้อมูลได้!\n"
                f"รหัสนักเรียน: {input_student_id} "
                f"มีผู้ใช้งานในระบบแล้ว",
                "danger",
            )
            return redirect(url_for("admin.manage_students"))

        student.student_id = input_student_id
        student.full_name = request.form.get("full_name")

        student_num = request.form.get("student_number")
        student.student_number = (
            int(student_num) if student_num else student.student_number
        )

        student.education_level = request.form.get("education_level")
        student.student_level = request.form.get("student_level")
        student.student_room = request.form.get("student_room")

        new_school = request.form.get("school_name")
        if new_school:
            student.school_name = new_school

        db.session.commit()

        # DEV: เปิดใช้งาน Audit Log เมื่อ Deploy
        # write_log(
        #     action="แก้ไขข้อมูลนักเรียน",
        #     details=f"แก้ไขข้อมูลนักเรียน รหัส: {student.student_id} ชื่อ: {student.full_name}"
        # )

        flash(
            f"ชื่อ-นามสกุล: {student.full_name}\n"
            f"รหัสนักเรียน: {student.student_id}",
            "student_updated",
        )

    return redirect(url_for("admin.manage_students"))


# ลบนักเรียน พร้อมประวัติเช็กชื่อทั้งหมด
@admin_bp.route("/admin/students/delete/<int:id>", methods=["POST"])
def delete_student(id):
    student = Student.query.get_or_404(id)

    deleted_name = student.full_name
    deleted_student_id = student.student_id

    try:
        Attendance.query.filter_by(student_id=student.student_id).delete(
            synchronize_session=False
        )

        db.session.delete(student)
        db.session.commit()

    except SQLAlchemyError:
        db.session.rollback()

        current_app.logger.exception(
            "Failed to delete student and related data: id=%s",
            id,
        )

        flash(
            "ไม่สามารถลบนักเรียนและประวัติที่เกี่ยวข้องได้ กรุณาลองใหม่",
            "danger",
        )

        return redirect(url_for("admin.manage_students"))

    # DEV: เปิดใช้งาน Audit Log เมื่อ Deploy
    # write_log(
    #     action="ลบข้อมูลนักเรียน",
    #     details=f"ลบนักเรียน รหัส: {deleted_student_id} ชื่อ: {deleted_name}"
    # )

    flash(
        f"ชื่อ-นามสกุล: {deleted_name}\n"
        f"รหัสนักเรียน: {deleted_student_id}\n"
        f"ลบประวัติเช็กชื่อที่เกี่ยวข้องแล้ว",
        "student_deleted",
    )

    return redirect(url_for("admin.manage_students"))


# CRUD สำหรับคุณครู
@admin_bp.route("/admin/teachers/add", methods=["POST"])
def add_teacher():
    email = (request.form.get("email") or "").strip()
    password = request.form.get("password") or ""
    confirm_password = request.form.get("confirm_password") or ""
    full_name = (request.form.get("full_name") or "").strip()

    if Teacher.query.filter_by(email=email).first():
        flash(
            "ไม่สามารถเพิ่มข้อมูลได้! " "อีเมลนี้มีผู้ใช้งานในระบบแล้ว",
            "danger",
        )
        return redirect(url_for("admin.manage_teachers"))

    if password != confirm_password:
        flash(
            "ไม่สามารถเพิ่มข้อมูลได้ " "เนื่องจากรหัสผ่านและรหัสผ่านยืนยันไม่ตรงกัน",
            "danger",
        )
        return redirect(url_for("admin.manage_teachers"))

    for attempt in range(5):
        generated_teacher_id = generate_next_teacher_id()

        new_teacher = Teacher(
            teacher_id=generated_teacher_id,
            email=email,
            password=generate_password_hash(password),
            full_name=full_name,
            department=request.form.get("department"),
            school_name=request.form.get("school_name", "ไม่ระบุสถานศึกษา"),
            auth_provider="local",
        )

        db.session.add(new_teacher)

        try:
            db.session.commit()
            break

        except IntegrityError:
            db.session.rollback()

            if Teacher.query.filter_by(email=email).first():
                flash(
                    "ไม่สามารถเพิ่มข้อมูลได้! " "อีเมลนี้มีผู้ใช้งานในระบบแล้ว",
                    "danger",
                )
                return redirect(url_for("admin.manage_teachers"))

    else:
        flash(
            "ไม่สามารถสร้างรหัสคุณครูได้ในขณะนี้ " "กรุณาลองใหม่อีกครั้ง",
            "danger",
        )
        return redirect(url_for("admin.manage_teachers"))

    # DEV: เปิดใช้งาน Audit Log เมื่อ Deploy
    # write_log(
    #     action="เพิ่มข้อมูลคุณครู",
    #     details=f"เพิ่มคุณครูใหม่ รหัส: {new_teacher.teacher_id} ชื่อ: {new_teacher.full_name}"
    # )

    flash(
        f"ชื่อ-นามสกุล: {new_teacher.full_name}\n"
        f"รหัสประจำตัว: {new_teacher.teacher_id}",
        "teacher_added",
    )

    return redirect(url_for("admin.manage_teachers"))


# แก้ไขข้อมูลคุณครู
@admin_bp.route("/admin/teachers/edit/<int:id>", methods=["POST"])
def edit_teacher(id):
    teacher = Teacher.query.get_or_404(id)
    input_teacher_id = (request.form.get("teacher_id") or "").strip()
    input_email = (request.form.get("email") or "").strip()

    is_google_account = (
        getattr(teacher, "auth_provider", "local") or "local"
    ).strip().lower() == "google"

    new_password = request.form.get("password") or ""
    confirm_password = request.form.get("confirm_password") or ""

    if input_teacher_id != teacher.teacher_id:
        flash(
            "ไม่สามารถแก้ไขรหัสประจำตัวคุณครูได้!",
            "danger",
        )
        return redirect(url_for("admin.manage_teachers"))

    if (
        is_google_account
        and input_email.lower() != (teacher.email or "").strip().lower()
    ):
        flash(
            "บัญชีที่เชื่อมต่อ Google ไม่สามารถแก้ไขอีเมลได้!",
            "danger",
        )
        return redirect(url_for("admin.manage_teachers"))

    if is_google_account and (new_password or confirm_password):
        flash(
            "บัญชีที่เชื่อมต่อ Google ไม่สามารถเปลี่ยนรหัสผ่านผ่านระบบนี้ได้!",
            "danger",
        )
        return redirect(url_for("admin.manage_teachers"))

    if not is_google_account:
        email_check = Teacher.query.filter(
            Teacher.email == input_email,
            Teacher.id != id,
        ).first()

        if email_check:
            flash(
                f"ระบบไม่สามารถแก้ไขข้อมูลได้!\n"
                f"อีเมล: {input_email} มีผู้ใช้งานในระบบแล้ว",
                "danger",
            )
            return redirect(url_for("admin.manage_teachers"))

    if not is_google_account and (new_password or confirm_password):
        if not new_password or not confirm_password:
            flash(
                "กรุณากรอกรหัสผ่านและยืนยันรหัสผ่านให้ครบทั้งสองช่อง!",
                "danger",
            )
            return redirect(url_for("admin.manage_teachers"))

        if new_password != confirm_password:
            flash(
                "รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน!",
                "danger",
            )
            return redirect(url_for("admin.manage_teachers"))

    if not is_google_account:
        teacher.email = input_email

    teacher.full_name = request.form.get("full_name")
    teacher.department = request.form.get("department")

    new_school = request.form.get("school_name")
    if new_school:
        teacher.school_name = new_school

    if not is_google_account and new_password:
        teacher.password = generate_password_hash(new_password)

    db.session.commit()

    # DEV: เปิดใช้งาน Audit Log เมื่อ Deploy
    # write_log(
    #     action="แก้ไขข้อมูลคุณครู",
    #     details=f"แก้ไขข้อมูลคุณครู รหัส: {teacher.teacher_id} ชื่อ: {teacher.full_name}"
    # )

    flash(
        f"ชื่อ-นามสกุล: {teacher.full_name}\n" f"รหัสประจำตัว: {teacher.teacher_id}",
        "teacher_updated",
    )

    return redirect(url_for("admin.manage_teachers"))


@admin_bp.route("/admin/teachers/delete/<int:id>", methods=["POST"])
def delete_teacher(id):
    teacher = Teacher.query.get_or_404(id)

    deleted_name = teacher.full_name
    deleted_teacher_id = teacher.teacher_id

    try:
        teacher_session_ids = db.session.query(ClassroomSession.id).filter(
            ClassroomSession.teacher_id_ref == teacher.id
        )

        Attendance.query.filter(Attendance.session_id.in_(teacher_session_ids)).delete(
            synchronize_session=False
        )

        ClassroomSession.query.filter_by(teacher_id_ref=teacher.id).delete(
            synchronize_session=False
        )

        db.session.delete(teacher)
        db.session.commit()

    except SQLAlchemyError:
        db.session.rollback()

        current_app.logger.exception(
            "Failed to delete teacher and related data: id=%s",
            id,
        )

        flash(
            "ไม่สามารถลบคุณครูและข้อมูลที่เกี่ยวข้องได้ กรุณาลองใหม่",
            "danger",
        )

        return redirect(url_for("admin.manage_teachers"))

    # DEV: เปิดใช้งาน Audit Log เมื่อ Deploy
    # write_log(
    #     action="ลบข้อมูลคุณครู",
    #     details=f"ลบคุณครู รหัส: {deleted_teacher_id} ชื่อ: {deleted_name}"
    # )

    flash(
        f"ชื่อ-นามสกุล: {deleted_name}\n"
        f"รหัสประจำตัว: {deleted_teacher_id}\n"
        f"ลบห้องเรียนและประวัติเช็กชื่อที่เกี่ยวข้องแล้ว",
        "teacher_deleted",
    )

    return redirect(url_for("admin.manage_teachers"))
