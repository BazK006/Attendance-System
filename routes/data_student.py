from flask import (
    Blueprint,
    render_template,
    request,
    redirect,
    url_for,
    flash,
    jsonify,
    session,
    current_app,
)
from database import db
from models import Student, write_log
from sqlalchemy import func

data_students_bp = Blueprint("data_students", __name__)


def is_teacher_logged_in():
    return bool(session.get("user_id") and session.get("role") == "teacher")


def write_student_audit_log(action, details):
    try:
        write_log(action=action, details=details)
    except Exception:
        db.session.rollback()
        current_app.logger.exception("Failed to write student audit log")


@data_students_bp.context_processor
def inject_teacher_everywhere():
    from models import Teacher

    user_id = session.get("user_id")
    if user_id:
        teacher = Teacher.query.get(user_id)
        return dict(teacher=teacher)

    return dict(teacher=None)


@data_students_bp.route("/data_students")
def data_students():
    if "user_id" not in session or session.get("role") != "teacher":
        flash("กรุณาเข้าสู่ระบบในฐานะครู", "danger")
        return redirect(url_for("auth.login"))

    # write_log(
    # action="เข้าชมข้อมูลรายชื่อนักเรียน",
    # details="เข้าตรวจสอบข้อมูลรายชื่อนักเรียนทั้งหมดในระบบการจัดการข้อมูล"
    # )

    students = Student.query.order_by(
        Student.education_level.desc(),
        Student.student_level,
        Student.student_room,
        Student.student_number,
    ).all()

    rooms = (
        db.session.query(
            Student.education_level, Student.student_level, Student.student_room
        )
        .distinct()
        .order_by(Student.education_level, Student.student_level, Student.student_room)
        .all()
    )

    room_list = []
    for r in rooms:
        prefix = "ม." if r[0] == "มัธยมศึกษา" else "ป." if r[0] == "ประถมศึกษา" else ""
        room_list.append(f"{prefix}{r[1]}/{r[2]}")

    return render_template("data_students.html", students=students, room_list=room_list)


@data_students_bp.route("/students/add", methods=["POST"])
def add_student():
    if not is_teacher_logged_in():
        return jsonify({"status": "error", "message": "กรุณาเข้าสู่ระบบในฐานะครู"}), 403

    if request.method == "POST":
        s_id = request.form.get("student_id")
        full_name = request.form.get("full_name")
        s_num = request.form.get("student_number")
        edu_level = request.form.get("education_level")
        s_level = request.form.get("student_level")
        s_room = request.form.get("student_room")
        school = request.form.get("school_name")

        existing_student = Student.query.filter_by(student_id=s_id).first()
        if existing_student:
            flash(f"รหัสนักเรียน {s_id} มีในระบบแล้ว!", "danger")
            return redirect(url_for("data_students.data_students"))

        new_student = Student(
            student_id=s_id,
            full_name=full_name,
            student_number=s_num,
            education_level=edu_level,
            student_level=s_level,
            student_room=s_room,
            school_name=school,
        )

        try:
            db.session.add(new_student)
            db.session.commit()

            prefix = (
                "ม."
                if edu_level == "มัธยมศึกษา"
                else "ป." if edu_level == "ประถมศึกษา" else ""
            )

            # write_student_audit_log(
            #     action="เพิ่มข้อมูลนักเรียนโดยคุณครู",
            #     details=(
            #         f"เพิ่มนักเรียนใหม่ รหัส: {s_id} "
            #         f"ชื่อ: {full_name} "
            #         f"ชั้น: {prefix}{s_level}/{s_room}"
            #     )
            # )

            return jsonify(
                {"status": "success", "message": "เพิ่มข้อมูลนักเรียนสำเร็จแล้ว!"}
            )
        except Exception as e:
            db.session.rollback()
            return jsonify({"status": "error", "message": str(e)}), 500

    return redirect(url_for("data_students.data_students"))


@data_students_bp.route("/students/edit/<int:id>", methods=["POST"])
def edit_student(id):
    if not is_teacher_logged_in():
        flash("กรุณาเข้าสู่ระบบในฐานะครู", "danger")
        return redirect(url_for("auth.login"))

    student = Student.query.get_or_404(id)

    if request.method == "POST":
        student.student_id = request.form.get("student_id")
        student.full_name = request.form.get("full_name")
        student.student_number = request.form.get("student_number")
        student.education_level = request.form.get("education_level")
        student.student_level = request.form.get("student_level")
        student.student_room = request.form.get("student_room")
        student.school_name = request.form.get("school_name")

        try:
            db.session.commit()

            prefix = (
                "ม."
                if student.education_level == "มัธยมศึกษา"
                else "ป." if student.education_level == "ประถมศึกษา" else ""
            )

            # write_student_audit_log(
            #     action="แก้ไขข้อมูลนักเรียนโดยคุณครู",
            #     details=(
            #         f"อัปเดตข้อมูลนักเรียน รหัส: {student.student_id} "
            #         f"ชื่อ: {student.full_name} "
            #         f"ชั้น: {prefix}{student.student_level}/{student.student_room}"
            #     )
            # )

            flash("แก้ไขข้อมูลนักเรียนสำเร็จ!", "success")
        except Exception as e:
            db.session.rollback()
            flash(f"เกิดข้อผิดพลาด: {str(e)}", "danger")

        return redirect(url_for("data_students.data_students"))


@data_students_bp.route("/students/delete/<int:id>")
def delete_student(id):
    if not is_teacher_logged_in():
        flash("กรุณาเข้าสู่ระบบในฐานะครู", "danger")
        return redirect(url_for("auth.login"))

    student = Student.query.get_or_404(id)

    log_details = f"ลบข้อมูลนักเรียนออกจากระบบ ชื่อ: {student.full_name} (รหัสประจำตัว: {student.student_id})"

    try:
        db.session.delete(student)
        db.session.commit()

        # write_student_audit_log(action="ลบข้อมูลนักเรียนโดยคุณครู", details=log_details)

        flash("ลบข้อมูลนักเรียนเรียบร้อย", "success")
    except:
        db.session.rollback()
        flash("ไม่สามารถลบข้อมูลได้", "danger")

    return redirect(url_for("data_students.data_students"))
