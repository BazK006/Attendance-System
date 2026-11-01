from flask import (
    Blueprint,
    request,
    redirect,
    url_for,
    flash,
    session,
    send_file,
    jsonify,
    render_template,
    abort,
    Response,
    current_app,
)
from database import db
from models.class_session import ClassroomSession
from models.attendance import Attendance
from models.teachers import Teacher
from models.students import Student
from models.session_student import SessionStudent
from models import write_log
import qrcode
from io import BytesIO
import time, random, string
from datetime import datetime, timedelta, timezone
from urllib.parse import quote
from sqlalchemy import func, Integer, cast
from types import SimpleNamespace
import pdfkit
import csv
import io

session_bp = Blueprint("class_session", __name__)


@session_bp.context_processor
def inject_teacher_everywhere():
    user_id = session.get("user_id")
    if user_id:
        teacher = Teacher.query.get(user_id)
        return dict(teacher=teacher)

    return dict(teacher=None)


def get_dynamic_key(base_secret, offset=0):
    interval = int(time.time() / 30) + offset
    seed_value = f"{base_secret}{interval}"
    random.seed(seed_value)
    letters = string.ascii_uppercase + string.digits
    return "".join(random.choice(letters) for i in range(6))


@session_bp.route("/get_current_key/<int:session_id>")
def get_current_key(session_id):
    s = ClassroomSession.query.get_or_404(session_id)

    is_closed = s.status in {"closed", "ปิดรับแล้ว"}

    is_expired = False

    if s.start_time and s.allowed_minutes is not None:
        expire_time = s.start_time + timedelta(minutes=int(s.allowed_minutes))

        is_expired = datetime.now() >= expire_time

    if is_closed or is_expired:
        return jsonify(
            {
                "current_key": "ปิดใช้งาน",
                "prev_key": "ปิดใช้งาน",
                "is_expired": True,
            }
        )

    return jsonify(
        {
            "current_key": get_dynamic_key(s.secret_key, offset=0),
            "prev_key": get_dynamic_key(s.secret_key, offset=-1),
            "is_expired": False,
        }
    )


# ฟังก์ชันสุ่ม Qr code
@session_bp.route("/generate_qr")
def generate_qr():
    data = request.args.get("data")
    if not data:
        return "No data provided", 400

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=2,
    )
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#1a237e", back_color="white")

    buf = BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return send_file(buf, mimetype="image/png")


# สร้างห้องเรียน
@session_bp.route("/create", methods=["POST"])
def create_session():
    if "user_id" not in session or session.get("role") != "teacher":
        flash("กรุณาเข้าสู่ระบบก่อนทำรายการ", "danger")
        return redirect(url_for("auth.login"))

    id_subject = request.form.get("id_subject")
    room_name = request.form.get("room_name")
    subject_name = request.form.get("subject_name")
    allowed_minutes = request.form.get("allowed_minutes")
    secret_key = request.form.get("secret_key")

    if secret_key:
        secret_key = secret_key.upper()
    else:
        secret_key = "ABC123"

    try:
        now_time = datetime.now()

        # 1. สร้าง ClassroomSession
        new_session = ClassroomSession(
            id_subject=id_subject,
            room_name=room_name,
            subject_name=subject_name,
            allowed_minutes=int(allowed_minutes),
            secret_key=secret_key,
            teacher_id_ref=session["user_id"],
            start_time=now_time,
            created_at=now_time,
            status="active",
        )

        db.session.add(new_session)

        # 2. บันทึก Session ก่อน เพื่อให้ได้ ID
        #    แต่ยังไม่ Commit ลงฐานข้อมูล
        db.session.flush()

        # 3. ดึงรายชื่อนักเรียนของห้อง ณ เวลาที่สร้าง Session
        edu_val, level_val, room_val = parse_room_info(room_name)

        room_students = (
            Student.query.filter(
                Student.education_level == edu_val,
                func.trim(Student.student_level) == level_val,
                func.trim(Student.student_room) == room_val,
            )
            .order_by(Student.student_number)
            .all()
        )

        # 4. สร้าง Snapshot เก็บรายชื่อนักเรียน
        snapshot_rows = [
            SessionStudent(
                session_id=new_session.id,
                student_id=std.student_id,
                student_name=std.full_name,
                student_number=std.student_number,
                education_level=std.education_level,
                student_level=std.student_level,
                student_room=std.student_room,
            )
            for std in room_students
        ]

        if snapshot_rows:
            db.session.add_all(snapshot_rows)

        # 5. Commit พร้อมกันทั้ง Session และ Snapshot
        db.session.commit()

        # write_log(
        #     action="สร้างห้องเรียน",
        #     details=(
        #         f"สร้างห้องเรียนวิชา ({new_session.id_subject}) "
        #         f"{new_session.subject_name} ชั้น {new_session.room_name} "
        #         f"(Session ID: {new_session.id}) สำเร็จ"
        #     )
        # )

        flash("สร้างห้องเรียนเรียบร้อยแล้ว", "success")

    except Exception as e:
        db.session.rollback()
        flash(f"เกิดข้อผิดพลาด: {str(e)}", "danger")

    return redirect(url_for("dashboard.dashboard"))


# แก้ไขข้อมูลห้องเรียน
@session_bp.route("/update/<int:session_id>", methods=["POST"])
def update_session(session_id):
    if "user_id" not in session or session.get("role") != "teacher":
        flash("กรุณาเข้าสู่ระบบก่อนทำรายการ", "danger")
        return redirect(url_for("auth.login"))

    target_session = ClassroomSession.query.filter_by(
        id=session_id, teacher_id_ref=session["user_id"]
    ).first()

    if not target_session:
        flash("ไม่พบห้องเรียน หรือคุณไม่มีสิทธิ์แก้ไขห้องของผู้อื่น", "danger")
        return redirect(url_for("dashboard.dashboard"))

    try:
        target_session.id_subject = request.form.get("id_subject").strip()
        target_session.subject_name = request.form.get("subject_name").strip()

        db.session.commit()

        # write_log(
        #     action="แก้ไขข้อมูลห้องเรียน",
        #     details=(
        #         f"แก้ไขห้องเรียนวิชา ({target_session.id_subject}) "
        #         f"{target_session.subject_name} ชั้น {target_session.room_name} "
        #         f"(Session ID: {target_session.id})"
        #     )
        # )

        flash(
            f"อัปเดตข้อมูลวิชา ({target_session.id_subject}) {target_session.subject_name} เรียบร้อยแล้ว",
            "success",
        )
    except Exception as e:
        db.session.rollback()
        flash(f"เกิดข้อผิดพลาด: {str(e)}", "danger")

    return redirect(url_for("dashboard.dashboard"))


# แก้ไขสถานะ มาเรียน สาย ขาด ลา โดยตรง
@session_bp.route("/attendance/update_status/<int:id>", methods=["POST"])
def update_attendance_status(id):
    if not session.get("user_id") or session.get("role") != "teacher":
        return jsonify({"success": False, "error": "Unauthorized"}), 403

    data = request.get_json(silent=True)

    if not data or "status" not in data:
        return jsonify({"success": False, "error": "Bad Request"}), 400

    new_status = data["status"]

    status_map = {
        "present": "มาเรียน",
        "late": "มาสาย",
        "leave": "ลา",
        "absent": "ขาดเรียน",
    }

    if new_status not in status_map:
        return jsonify({"success": False, "error": "Invalid status"}), 400

    att_record = Attendance.query.get(id)

    if not att_record:
        return jsonify({"success": False, "error": "Not Found"}), 404

    target_session = ClassroomSession.query.filter_by(
        id=att_record.session_id, teacher_id_ref=session.get("user_id")
    ).first()

    if not target_session:
        return (
            jsonify(
                {"success": False, "error": "ไม่มีสิทธิ์แก้ไขสถานะเช็กชื่อของห้องนี้"}
            ),
            403,
        )

    try:
        tz_thailand = timezone(timedelta(hours=7))
        now_th = datetime.now(tz_thailand)

        update_data = {"status": new_status, "updated_at": now_th}

        student_info = (
            f"(รหัสนักเรียน: {att_record.student_id}) " f"{att_record.student_name}"
        )

        old_status_thai = status_map.get(att_record.status, att_record.status)

        updated_rows = Attendance.query.filter_by(id=id).update(update_data)

        if updated_rows == 0:
            db.session.rollback()
            return jsonify({"success": False, "error": "Not Found"}), 404

        db.session.commit()

        thai_status = status_map[new_status]

        # write_log(
        #     action="แก้ไขสถานะการเข้าเรียน",
        #     details=(
        #         f"{student_info} "
        #         f"เปลี่ยนสถานะจาก '{old_status_thai}' "
        #         f"เป็น '{thai_status}' "
        #         f"วิชา {target_session.subject_name} "
        #         f"ห้อง {target_session.room_name}"
        #     )
        # )

        updated_str = (
            f"{now_th.strftime('%d/%m')}/{now_th.year + 543} "
            f"{now_th.strftime('%H:%M:%S น.')}"
        )

        return jsonify(
            {
                "success": True,
                "updated_at": updated_str,
            }
        )

    except Exception:
        db.session.rollback()
        current_app.logger.exception(
            "Failed to update attendance status: attendance_id=%s",
            id,
        )

        return (
            jsonify(
                {
                    "success": False,
                    "error": "ไม่สามารถแก้ไขสถานะเช็กชื่อได้ กรุณาลองใหม่",
                }
            ),
            500,
        )


# ลบห้องเรียน
@session_bp.route("/delete/<int:session_id>", methods=["POST"])
def delete_session(session_id):
    if "user_id" not in session or session.get("role") != "teacher":
        flash("กรุณาเข้าสู่ระบบก่อนทำรายการ", "danger")
        return redirect(url_for("auth.login"))

    target_session = ClassroomSession.query.filter_by(
        id=session_id, teacher_id_ref=session["user_id"]
    ).first()

    if target_session:
        try:
            log_details = f"ลบห้องเรียน วิชา ({target_session.id_subject}) {target_session.subject_name} ชั้น {target_session.room_name} พร้อมล้างประวัติเช็คชื่อทั้งหมด"

            Attendance.query.filter_by(session_id=session_id).delete()
            db.session.delete(target_session)
            db.session.commit()

            # write_log(
            #     action="ลบห้องเรียน",
            #     details=log_details
            # )

            flash(
                f"ลบห้องเรียนวิชา ({target_session.id_subject}) {target_session.subject_name} เรียบร้อยแล้ว",
                "success",
            )
        except Exception as e:
            db.session.rollback()
            flash(f"ไม่สามารถลบห้องเรียนได้เนื่องจาก: {str(e)}", "danger")
    else:
        flash("ไม่พบข้อมูล หรือคุณไม่มีสิทธิ์ลบห้องเรียนนี้", "danger")

    return redirect(url_for("dashboard.dashboard"))


# # ลบนักเรียนรายคนออกจากรายการเช็กชื่อ
# @session_bp.route("/attendance/delete/<int:id>", methods=["POST"])
# def delete_attendance(id):
#     if not session.get("user_id") or session.get("role") != "teacher":
#         return jsonify({"success": False, "message": "ไม่มีสิทธิ์เข้าถึง"}), 403

#     attendance = Attendance.query.get_or_404(id)

#     target_session = ClassroomSession.query.filter_by(
#         id=attendance.session_id, teacher_id_ref=session.get("user_id")
#     ).first()

#     if not target_session:
#         return (
#             jsonify(
#                 {"success": False, "message": "ไม่มีสิทธิ์ลบรายการเช็กชื่อของห้องนี้"}
#             ),
#             403,
#         )

#     try:
#         log_details = (
#             f"ลบรายการเช็กชื่อของ "
#             f"(รหัสนักเรียน: {attendance.student_id}) "
#             f"{attendance.student_name} ออกจากระบบ"
#         )

#         # 4. ลบเฉพาะรายการเช็กชื่อที่เลือก
#         db.session.delete(attendance)
#         db.session.commit()

#         # write_log(
#         #     action="ลบประวัติเช็คชื่อ",
#         #     details=log_details
#         # )

#         return jsonify({"success": True, "message": "ลบรายชื่อสำเร็จ"})

#     except Exception as e:
#         db.session.rollback()

#         current_app.logger.exception(
#             "Failed to delete attendance: attendance_id=%s", id
#         )

#         return (
#             jsonify(
#                 {
#                     "success": False,
#                     "message": "ไม่สามารถลบรายการเช็กชื่อได้ กรุณาลองใหม่",
#                 }
#             ),
#             500,
#         )


@session_bp.route("/room/<int:session_id>")
def session_room(session_id):
    s = ClassroomSession.query.get_or_404(session_id)
    user_id = session.get("user_id")
    user_role = session.get("role")

    if user_role == "teacher" and s.teacher_id_ref != user_id:
        abort(404)

    is_owner = user_role == "teacher" and s.teacher_id_ref == user_id

    if not is_owner and s.status == "closed":
        return render_template("errors/closed.html", s=s)

    # 1. ลองดึงรายชื่อจาก Snapshot ก่อน
    snapshot_students = (
        SessionStudent.query.filter_by(session_id=session_id)
        .order_by(SessionStudent.student_number)
        .all()
    )

    student_list = []

    if snapshot_students:
        # 2. ห้องใหม่ที่มี Snapshot ใช้ข้อมูลย้อนหลังที่บันทึกไว้
        for std in snapshot_students:
            prefix = "ป." if std.education_level == "ประถมศึกษา" else "ม."
            room_display = f"{prefix}{std.student_level}/{std.student_room}"

            student_list.append(
                {
                    "student_id": std.student_id,
                    "full_name": std.student_name,
                    "student_number": std.student_number,
                    "room_display": room_display,
                }
            )

    else:
        # 3. ห้องเก่าที่ไม่มี Snapshot ใช้วิธีดึงข้อมูลแบบเดิม
        edu_val, level_val, room_val = parse_room_info(s.room_name)

        legacy_students = (
            Student.query.filter(
                Student.education_level == edu_val,
                func.trim(Student.student_level) == level_val,
                func.trim(Student.student_room) == room_val,
            )
            .order_by(Student.student_number)
            .all()
        )

        for std in legacy_students:
            prefix = "ป." if std.education_level == "ประถมศึกษา" else "ม."
            room_display = f"{prefix}{std.student_level}/{std.student_room}"

            student_list.append(
                {
                    "student_id": std.student_id,
                    "full_name": std.full_name,
                    "student_number": std.student_number,
                    "room_display": room_display,
                }
            )

    total_students = len(student_list)

    teacher = Teacher.query.get(s.teacher_id_ref)

    return render_template(
        "session_room.html",
        s=s,
        student_list=student_list,
        teacher_name=teacher.full_name if teacher else "ไม่พบข้อมูล",
        is_teacher=is_owner,
        total_students=total_students,
    )


# --- ฟังก์ชันช่วยแงะระดับชั้นและห้อง ---
def parse_room_info(room_name):
    edu_val = "มัธยมศึกษา" if room_name.startswith("ม.") else "ประถมศึกษา"
    clean_room = room_name.replace("ม.", "").replace("ป.", "").strip()

    if "/" in clean_room:
        level_val, room_val = clean_room.split("/")
    else:
        level_val, room_val = clean_room, ""

    return edu_val, level_val.strip(), room_val.strip()


@session_bp.route("/api/attendees/<int:session_id>")
def get_attendees_api(session_id):
    if not session.get("user_id") or session.get("role") != "teacher":
        return jsonify({"success": False, "message": "ไม่มีสิทธิ์เข้าถึง"}), 403

    s = ClassroomSession.query.get_or_404(session_id)

    if str(s.teacher_id_ref) != str(session.get("user_id")):
        return (
            jsonify({"success": False, "message": "ไม่มีสิทธิ์เข้าถึงห้องเรียนนี้"}),
            403,
        )

    attendees = Attendance.query.filter_by(session_id=session_id).all()

    data = []
    for a in attendees:
        std = SessionStudent.query.filter_by(
            session_id=session_id, student_id=a.student_id
        ).first()

        if not std:
            std = Student.query.filter_by(student_id=a.student_id).first()

        updated_time_str = "-"
        if getattr(a, "updated_at", None):
            updated_time_str = f"{a.updated_at.strftime('%d/%m')}/{a.updated_at.year + 543} {a.updated_at.strftime('%H:%M:%S น.')}"

        if a.check_in_time:
            try:
                raw_date = (
                    f"{a.check_in_time.strftime('%d/%m')}/{a.check_in_time.year + 543}"
                )
                check_in_date_str = f'<div class="fw-semibold text-dark mb-1" style="font-size: 0.75rem;">{raw_date}</div>'
            except Exception:
                check_in_date_str = "-"
        else:
            check_in_date_str = "-"

        data.append(
            {
                "id": a.id,
                "no": a.student_number,
                "student_id": a.student_id,
                "name": a.student_name,
                "room": a.room_tag,
                "education_level": std.education_level if std else "มัธยมศึกษา",
                "status": a.status,
                "time": (
                    a.check_in_time.strftime("%H:%M:%S น.") if a.check_in_time else "-"
                ),
                "date_only": check_in_date_str,
                "updated_at": updated_time_str,
            }
        )
    return jsonify({"status": s.status, "attendees": data})


@session_bp.route("/api/room/attendees/<int:session_id>")
def get_room_attendees_api(session_id):
    s = ClassroomSession.query.get_or_404(session_id)

    if s.status != "active":
        return jsonify({"status": s.status, "attendees": []})

    attendees = Attendance.query.filter_by(session_id=session_id).all()

    data = []

    for a in attendees:
        if a.status not in {"present", "late"}:
            continue

        if a.check_in_time:
            try:
                raw_date = (
                    f"{a.check_in_time.strftime('%d/%m')}/"
                    f"{a.check_in_time.year + 543}"
                )
                check_in_date_str = (
                    f'<div class="fw-semibold text-dark mb-1" '
                    f'style="font-size: 0.75rem;">{raw_date}</div>'
                )
            except Exception:
                check_in_date_str = "-"
        else:
            check_in_date_str = "-"

        data.append(
            {
                "no": a.student_number,
                "student_id": a.student_id,
                "name": a.student_name,
                "room": a.room_tag,
                "status": a.status,
                "time": (
                    a.check_in_time.strftime("%H:%M:%S น.") if a.check_in_time else "-"
                ),
                "date_only": check_in_date_str,
            }
        )

    return jsonify({"status": s.status, "attendees": data})


@session_bp.route("/api/attendance/finalize/<int:session_id>", methods=["POST"])
def finalize_attendance(session_id):
    if not session.get("user_id") or session.get("role") != "teacher":
        return jsonify({"success": False, "message": "ไม่มีสิทธิ์"}), 403

    try:
        s = ClassroomSession.query.get_or_404(session_id)

        if s.teacher_id_ref != session.get("user_id"):
            return (
                jsonify({"success": False, "message": "ไม่มีสิทธิ์จัดการห้องเรียนนี้"}),
                403,
            )

        # ดึงรายชื่อนักเรียนจาก Snapshot ของ Session นี้
        snapshot_students = (
            SessionStudent.query.filter_by(session_id=session_id)
            .order_by(SessionStudent.student_number)
            .all()
        )

        # ป้องกันการสรุปขาดเรียนจาก Session เก่าที่ไม่มี Snapshot
        if not snapshot_students:
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "ไม่พบข้อมูลรายชื่อ Snapshot ของห้องเรียนนี้",
                    }
                ),
                400,
            )

        already_ids = {
            str(a.student_id)
            for a in Attendance.query.filter_by(session_id=session_id).all()
        }

        new_absents = []
        now = datetime.now()

        for std in snapshot_students:
            if str(std.student_id) not in already_ids:
                new_absents.append(
                    Attendance(
                        student_id=std.student_id,
                        student_name=std.student_name,
                        student_number=std.student_number,
                        session_id=session_id,
                        room_tag=s.room_name,
                        status="absent",
                        check_in_time=now,
                    )
                )

        if new_absents:
            db.session.bulk_save_objects(new_absents)

        db.session.commit()

        # if new_absents:
        #     write_log(
        #         action="สรุปรายชื่อนักเรียนขาดเรียน",
        #         details=(
        #             f"บันทึกสถานะขาดเรียนเพิ่ม "
        #             f"{len(new_absents)} คน "
        #             f"วิชา {s.subject_name} "
        #             f"ห้อง {s.room_name} "
        #             f"(Session ID: {s.id})"
        #         )
        #     )

        return jsonify(
            {"success": True, "message": f"บันทึกคนขาด {len(new_absents)} คน"}
        )

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@session_bp.route("/close/<int:session_id>", methods=["POST"])
def close_session(session_id):
    if not session.get("user_id") or session.get("role") != "teacher":
        return jsonify({"success": False}), 403

    try:
        s = ClassroomSession.query.get_or_404(session_id)

        if str(s.teacher_id_ref) != str(session.get("user_id")):
            return (
                jsonify({"success": False, "message": "ไม่มีสิทธิ์จัดการห้องเรียนนี้"}),
                403,
            )

        # 1. ดึงรายชื่อนักเรียนจาก Snapshot ของ Session นี้
        snapshot_students = (
            SessionStudent.query.filter_by(session_id=session_id)
            .order_by(SessionStudent.student_number)
            .all()
        )

        # ป้องกันการปิดห้องโดยไม่มีข้อมูล Snapshot
        if not snapshot_students:
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "ไม่พบข้อมูลรายชื่อ Snapshot ของห้องเรียนนี้",
                    }
                ),
                400,
            )

        # 2. กำหนดจำนวนรายชื่อนักเรียนตาม Snapshot
        total_in_room = len(snapshot_students)

        # 3. ปิดสถานะห้องเรียน
        s.status = "closed"

        # 4. ตรวจสอบนักเรียนที่มีข้อมูล Attendance อยู่แล้ว
        already_checked_ids = {
            str(a.student_id)
            for a in Attendance.query.filter_by(session_id=session_id).all()
        }

        # 5. สร้างรายการขาดเรียนจาก Snapshot เท่านั้น
        new_absents = []
        now = datetime.now()

        for std in snapshot_students:
            if str(std.student_id) not in already_checked_ids:
                new_absents.append(
                    Attendance(
                        student_id=std.student_id,
                        student_name=std.student_name,
                        student_number=std.student_number,
                        session_id=session_id,
                        room_tag=s.room_name,
                        status="absent",
                        check_in_time=now,
                    )
                )

        if new_absents:
            db.session.bulk_save_objects(new_absents)
            db.session.flush()

        # 6. สรุปสถานะการเข้าเรียน
        all_att = Attendance.query.filter_by(session_id=session_id).all()

        p = len([a for a in all_att if a.status == "present"])
        l = len([a for a in all_att if a.status == "late"])
        v = len([a for a in all_att if a.status == "leave"])
        a_count = len([a for a in all_att if a.status == "absent"])

        # 7. บันทึกข้อมูลทั้งหมดพร้อมกัน
        db.session.commit()

        # write_log(
        #     action="ปิดห้องเรียน",
        #     details=(
        #         f"ปิดห้องเรียนวิชา {s.subject_name} "
        #         f"ชั้น {s.room_name} "
        #         f"สรุปผลการเข้าเรียน "
        #         f"(มาเรียน: {p} | มาสาย: {l} | "
        #         f"ลา: {v} | ขาดเรียน: {a_count})"
        #     )
        # )

        return jsonify(
            {
                "success": True,
                "message": f"ปิดห้องสำเร็จ! มา: {p} สาย: {l} ลา: {v} ขาด: {a_count}",
                "data": {
                    "present": p,
                    "late": l,
                    "leave": v,
                    "absent": a_count,
                    "total": total_in_room,
                },
            }
        )

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@session_bp.route("/api/quick_attendance", methods=["POST"])
def quick_attendance():
    if "user_id" not in session or session.get("role") != "teacher":
        return jsonify({"success": False, "message": "กรุณาเข้าสู่ระบบในฐานะครู"}), 403

    data = request.get_json()
    if not data or "session_id" not in data or "student_id" not in data:
        return jsonify({"success": False, "message": "ข้อมูลไม่ครบถ้วน"}), 400

    try:
        s = ClassroomSession.query.get_or_404(data["session_id"])

        if s.teacher_id_ref != session["user_id"]:
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "คุณไม่มีสิทธิ์จัดการห้องเรียนของครูท่านอื่น",
                    }
                ),
                403,
            )

        student_id = str(data["student_id"]).strip()

        # 1. ตรวจสอบนักเรียนจาก Snapshot ของ Session
        snapshot_student = SessionStudent.query.filter_by(
            session_id=s.id,
            student_id=student_id,
        ).first()

        if snapshot_student:
            # Session ใหม่: ใช้ข้อมูลจาก Snapshot
            student_name = snapshot_student.student_name
            student_number = snapshot_student.student_number

        else:
            # 2. ตรวจสอบว่า Session นี้มี Snapshot หรือไม่
            has_snapshot = SessionStudent.query.filter_by(session_id=s.id).first()

            if has_snapshot:
                # มี Snapshot แต่ไม่พบรหัสนักเรียน
                # หมายถึงนักเรียนคนนี้ไม่ได้อยู่ในรายชื่อของ Session
                return (
                    jsonify(
                        {
                            "success": False,
                            "message": "ไม่พบรายชื่อนักเรียนในห้องเรียนนี้",
                        }
                    ),
                    400,
                )

            # 3. Session เก่าที่ไม่มี Snapshot ใช้วิธีเดิม
            edu_val, level_val, room_val = parse_room_info(s.room_name)

            legacy_student = Student.query.filter(
                Student.student_id == student_id,
                Student.education_level == edu_val,
                func.trim(Student.student_level) == level_val,
                func.trim(Student.student_room) == room_val,
            ).first()

            if not legacy_student:
                return (
                    jsonify(
                        {
                            "success": False,
                            "message": "ไม่พบรายชื่อนักเรียนในห้องเรียนนี้",
                        }
                    ),
                    400,
                )

            student_name = legacy_student.full_name
            student_number = legacy_student.student_number

        # 4. ตรวจสอบข้อมูล Attendance เดิม
        exists = Attendance.query.filter_by(
            session_id=s.id,
            student_id=student_id,
        ).first()

        status_val = data.get("status", "present")
        now = datetime.now()

        thai_year = now.year + 543
        formatted_time = (
            f"{now.strftime('%d/%m')}/{thai_year} {now.strftime('%H:%M:%S')}"
        )

        status_map = {
            "present": "มาเรียน",
            "late": "มาสาย",
            "leave": "ลา",
            "absent": "ขาดเรียน",
        }
        thai_status = status_map.get(status_val, status_val)

        if exists:
            old_status_thai = status_map.get(exists.status, exists.status)

            exists.status = status_val
            exists.updated_at = now
            db.session.commit()

            # write_log(
            #     action="แก้ไขสถานะเช็คชื่อโดยคุณครู",
            #     details=(
            #         f"(รหัสนักเรียน: {student_id}) "
            #         f"{exists.student_name} "
            #         f"เปลี่ยนสถานะจาก '{old_status_thai}' "
            #         f"เป็น '{thai_status}' "
            #         f"วิชา {s.subject_name} ห้อง {s.room_name}"
            #     )
            # )

            return jsonify(
                {
                    "success": True,
                    "message": "อัปเดตสถานะสำเร็จ",
                    "updated_at": formatted_time,
                }
            )

        else:
            new_entry = Attendance(
                student_id=student_id,
                student_name=student_name,
                student_number=student_number,
                session_id=s.id,
                room_tag=s.room_name,
                status=status_val,
                check_in_time=now,
                updated_at=now,
            )
            db.session.add(new_entry)
            db.session.commit()

            # write_log(
            #     action="บันทึกการเช็คชื่อโดยคุณครู",
            #     details=(
            #         f"ครูบันทึกการเข้าเรียนให้ "
            #         f"(รหัสนักเรียน: {new_entry.student_id}) "
            #         f"{new_entry.student_name} "
            #         f"วิชา {s.subject_name} ห้อง {s.room_name} "
            #         f"สถานะ: '{thai_status}'"
            #     )
            # )

            return jsonify(
                {
                    "success": True,
                    "message": "เช็คชื่อสำเร็จ",
                    "updated_at": formatted_time,
                }
            )

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"เกิดข้อผิดพลาด: {str(e)}"}), 500


# Export Excel
@session_bp.route("/export_excel/<int:session_id>")
def export_excel(session_id):
    import pandas as pd
    from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
    from openpyxl.utils import get_column_letter
    from io import BytesIO
    from datetime import datetime
    from sqlalchemy import func

    s = ClassroomSession.query.get_or_404(session_id)

    # ดึงรายชื่อนักเรียนจาก Snapshot ก่อน
    snapshot_students = (
        SessionStudent.query.filter_by(session_id=session_id)
        .order_by(SessionStudent.student_number)
        .all()
    )

    if snapshot_students:
        # Session ใหม่: ใช้ข้อมูล ณ วันที่สร้างห้อง
        all_students = [
            SimpleNamespace(
                student_id=std.student_id,
                full_name=std.student_name,
                student_number=std.student_number,
            )
            for std in snapshot_students
        ]

    else:
        # Session เก่า: ใช้วิธีดึงรายชื่อแบบเดิม
        edu_val, level_val, room_val = parse_room_info(s.room_name)

        all_students = (
            Student.query.filter(
                Student.education_level == edu_val,
                func.trim(Student.student_level) == level_val,
                func.trim(Student.student_room) == room_val,
            )
            .order_by(Student.student_number)
            .all()
        )

    attendances = Attendance.query.filter_by(session_id=session_id).all()
    att_map = {str(a.student_id): a for a in attendances}

    status_config = {
        "present": {"label": "มาเรียน", "color": "C6EFCE"},
        "late": {"label": "มาสาย", "color": "FFEB9C"},
        "leave": {"label": "ลา", "color": "DEEBF7"},
        "absent": {"label": "ขาดเรียน", "color": "FFC7CE"},
    }

    data = []
    for index, std in enumerate(all_students, 1):
        att = att_map.get(str(std.student_id))
        status_key = att.status if att else "absent"
        config = status_config.get(status_key)

        updated_time_str = "-"
        if att and getattr(att, "updated_at", None):
            updated_time_str = f"{att.updated_at.strftime('%d/%m')}/{att.updated_at.year + 543} {att.updated_at.strftime('%H:%M:%S')}"

        data.append(
            {
                "ลำดับ": index,
                "เลขที่": std.student_number,
                "รหัสนักเรียน": std.student_id,
                "ชื่อ-นามสกุล": std.full_name,
                "ห้อง": s.room_name,
                "เวลาเช็คชื่อ": (
                    att.check_in_time.strftime("%H:%M:%S")
                    if att and att.check_in_time
                    else "-"
                ),
                "สถานะ": config["label"],
                "อัปเดตล่าสุด": updated_time_str,
                "color_code": config["color"],
            }
        )

    if not data:
        return "ไม่พบข้อมูลรายชื่อนักเรียนในห้องนี้สำหรับการดึงรายงาน", 404

    df = pd.DataFrame(data)
    color_codes = df["color_code"].tolist()
    df = df.drop(columns=["color_code"])

    output = BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="รายงานการเช็คชื่อ")
        worksheet = writer.sheets[f"รายงานการเช็คชื่อ"]

        header_fill = PatternFill(
            start_color="0047AB", end_color="0047AB", fill_type="solid"
        )
        header_font = Font(color="FFFFFF", bold=True)
        thin_border = Border(
            left=Side(style="thin"),
            right=Side(style="thin"),
            top=Side(style="thin"),
            bottom=Side(style="thin"),
        )

        for col_num in range(1, len(df.columns) + 1):
            cell = worksheet.cell(row=1, column=col_num)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal="center", vertical="center")
            cell.border = thin_border

        for row_idx, color in enumerate(color_codes, start=2):
            status_cell = worksheet.cell(row=row_idx, column=7)
            status_cell.fill = PatternFill(
                start_color=color, end_color=color, fill_type="solid"
            )

            for col_idx in range(1, len(df.columns) + 1):
                c = worksheet.cell(row=row_idx, column=col_idx)
                c.border = thin_border
                if df.columns[col_idx - 1] == "ชื่อ-นามสกุล":
                    c.alignment = Alignment(horizontal="left", vertical="center")
                else:
                    c.alignment = Alignment(horizontal="center", vertical="center")

        for i, col in enumerate(df.columns, 1):
            if col == "ชื่อ-นามสกุล":
                w = 30
            elif col == "อัปเดตล่าสุด":
                w = 22
            else:
                w = 12
            worksheet.column_dimensions[get_column_letter(i)].width = w

    output.seek(0)
    safe_subject = s.subject_name.replace("/", "-").replace(":", "-").replace(" ", "_")
    date_str = datetime.now().strftime("%Y%m%d")
    time_file = datetime.now().strftime("%H_%M_%S")

    filename = f"รายงานการเช็คชื่อ_{safe_subject}_ห้อง_{s.room_name}_{date_str}_{time_file}.xlsx"

    # write_log(action="ส่งออก Excel", details=f"ดาวน์โหลดรายงาน Excel วิชา {s.subject_name} ห้อง {s.room_name}")

    return send_file(
        output,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        as_attachment=True,
        download_name=filename,
    )


# Export PDF
@session_bp.route("/export_pdf/<int:session_id>")
def export_pdf(session_id):
    import os

    if "user_id" not in session or session.get("role") != "teacher":
        flash("กรุณาเข้าสู่ระบบก่อนทำรายการ", "danger")
        return redirect(url_for("auth.login"))

    if os.name == "nt":
        path_wkhtmltopdf = r"C:\Program Files\wkhtmltopdf\bin\wkhtmltopdf.exe"
        config = pdfkit.configuration(wkhtmltopdf=path_wkhtmltopdf)
    else:
        config = pdfkit.configuration()

    s = ClassroomSession.query.get_or_404(session_id)

    # ดึงรายชื่อนักเรียนจาก Snapshot ก่อน
    snapshot_students = (
        SessionStudent.query.filter_by(session_id=session_id)
        .order_by(SessionStudent.student_number)
        .all()
    )

    if snapshot_students:
        # Session ใหม่: แปลง Snapshot ให้มี Attribute
        # ที่ PDF Template เดิมใช้งาน
        all_students = [
            SimpleNamespace(
                student_id=std.student_id,
                full_name=std.student_name,
                student_number=std.student_number,
                education_level=std.education_level,
                student_level=std.student_level,
                student_room=std.student_room,
            )
            for std in snapshot_students
        ]

    else:
        # Session เก่า: ใช้ข้อมูลนักเรียนแบบเดิม
        edu_val, level_val, room_val = parse_room_info(s.room_name)

        all_students = (
            Student.query.filter(
                Student.education_level == edu_val,
                func.trim(Student.student_level) == level_val,
                func.trim(Student.student_room) == room_val,
            )
            .order_by(Student.student_number)
            .all()
        )

    attendances = Attendance.query.filter_by(session_id=session_id).all()
    att_map = {str(a.student_id): a for a in attendances}

    stats = {
        "total": len(all_students),
        "present": 0,
        "late": 0,
        "leave": 0,
        "absent": 0,
    }
    for std in all_students:
        att = att_map.get(str(std.student_id))
        status_key = att.status if att else "absent"
        if status_key in stats:
            stats[status_key] += 1
        else:
            stats["absent"] += 1

    create_time = s.created_at if s.created_at else datetime.now()
    th_year = create_time.year + 543
    month_names = [
        "",
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
    th_day = create_time.day

    now = datetime.now()
    time_print_today = now.strftime("%H:%M:%S น.")

    today_th = f"{th_day} {month_names[create_time.month]} {th_year}"
    today_th_print = (
        f"{th_day} {month_names[create_time.month]} {th_year} เวลา: {time_print_today}"
    )
    time_th = create_time.strftime("%H:%M:%S น.")

    def format_pdf_updated_at(attendance_obj):
        if attendance_obj and getattr(attendance_obj, "updated_at", None):
            return f"{attendance_obj.updated_at.strftime('%d/%m')}/{attendance_obj.updated_at.year + 543} {attendance_obj.updated_at.strftime('%H:%M:%S')}"
        return "-"

    rendered_html = render_template(
        "pdf/attendance_report.html",
        s=s,
        students=all_students,
        att_map=att_map,
        stats=stats,
        today=today_th,
        today_print=today_th_print,
        session_time=time_th,
        teacher_name=session.get("full_name", "ผู้สอน"),
        format_updated_at=format_pdf_updated_at,
    )

    options = {
        "page-size": "A4",
        "margin-top": "0.75in",
        "margin-right": "0.75in",
        "margin-bottom": "0.75in",
        "margin-left": "0.75in",
        "encoding": "UTF-8",
        "no-outline": None,
        "enable-local-file-access": "",
        "quiet": "",
    }

    try:
        pdf = pdfkit.from_string(
            rendered_html, False, options=options, configuration=config
        )

        time_file = datetime.now().strftime("%H_%M_%S")

        filename = f"ใบสรุปรายชื่อเข้าเรียน_{s.subject_name}_ห้อง{s.room_name}_{datetime.now().strftime('%Y%m%d')}_{time_file}.pdf"

        # write_log(action="ส่งออก PDF", details=f"ดาวน์โหลดใบสรุปรายงาน PDF วิชา {s.subject_name} ห้อง {s.room_name}")

        return send_file(
            BytesIO(pdf),
            mimetype="application/pdf",
            as_attachment=True,
            download_name=filename,
        )
    except Exception as e:
        return f"เกิดข้อผิดพลาดในการสร้าง PDF: {str(e)}", 500


@session_bp.route("/export_csv/<int:session_id>")
def export_csv(session_id):
    user_id = session.get("user_id")

    session_data = ClassroomSession.query.get_or_404(session_id)
    # ตรวจสอบว่ามี Snapshot ของ Session นี้หรือไม่
    snapshot_students = SessionStudent.query.filter_by(session_id=session_id).all()

    if snapshot_students:
        # Session ใหม่: ส่งออกเฉพาะนักเรียนที่อยู่ใน Snapshot
        snapshot_ids = [std.student_id for std in snapshot_students]

        records = (
            Attendance.query.filter(
                Attendance.session_id == session_id,
                Attendance.student_id.in_(snapshot_ids),
            )
            .order_by(Attendance.student_number.asc())
            .all()
        )

    else:
        # Session เก่า: ใช้ Query เดิม
        records = (
            db.session.query(Attendance)
            .join(Student, Attendance.student_id == Student.student_id)
            .filter(Attendance.session_id == session_id)
            .order_by(cast(Student.student_number, Integer).asc())
            .all()
        )

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(
        [
            "เลขที่",
            "รหัสนักเรียน",
            "ชื่อ-นามสกุล",
            "ห้องเรียน",
            "สถานะ",
            "เวลาที่เช็คชื่อ",
            "อัปเดตล่าสุด",
        ]
    )

    status_map = {
        "present": "มาเรียน",
        "late": "มาสาย",
        "leave": "ลา",
        "absent": "ขาดเรียน",
    }

    for r in records:
        time_val = getattr(r, "check_in_time", None)
        time_str = time_val.strftime("%Y-%m-%d %H:%M:%S") if time_val else "-"

        updated_val = getattr(r, "updated_at", getattr(r, "updated_time", None))
        updated_str = updated_val.strftime("%Y-%m-%d %H:%M:%S") if updated_val else "-"

        writer.writerow(
            [
                getattr(r, "student_number", getattr(r, "number", "-")),
                getattr(r, "student_id", getattr(r, "id_student", "-")),
                getattr(r, "student_name", getattr(r, "full_name", "-")),
                session_data.room_name or "-",
                status_map.get(r.status, r.status),
                time_str,
                updated_str,
            ]
        )

    csv_bytes = output.getvalue().encode("utf-8-sig")

    clean_room = str(session_data.room_name).replace("/", "-")
    clean_subject = (
        str(session_data.subject_name).replace("/", "-")
        if hasattr(session_data, "subject_name") and session_data.subject_name
        else str(session_data.id_subject).replace("/", "-")
    )
    current_datetime = datetime.now().strftime("%Y_%m_%d_%H-%M-%S")

    raw_filename = (
        f"รายงานสรุปสถิติ_วิชา_{clean_subject}_ห้อง_{clean_room}_{current_datetime}.csv"
    )
    encoded_filename = quote(raw_filename)

    # write_log(
    #     action="ส่งออกรายงาน CSV (รายคาบ)",
    #     details=(
    #         f"Export รายงานสรุปสถิติการเช็คชื่อไฟล์ CSV วิชา {clean_subject}"
    #         f" ({session_data.id_subject}) ห้อง {clean_room} (Session ID:"
    #         f" {session_id})"
    #     ),
    # )

    # 7. ส่งไฟล์ออกไปดาวน์โหลด
    return Response(
        csv_bytes,
        mimetype="text/csv; charset=utf-8-sig",
        headers={
            "Content-Disposition": (f"attachment; filename*=UTF-8''{encoded_filename}"),
            "Content-Type": "text/csv; charset=utf-8-sig",
        },
    )
