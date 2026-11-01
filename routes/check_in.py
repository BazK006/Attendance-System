from flask import (
    Blueprint,
    render_template,
    request,
    jsonify,
    flash,
    session,
    redirect,
    url_for,
    make_response,
)
from database import db
from models.class_session import ClassroomSession
from models.attendance import Attendance
from models.students import Student
from models import write_log
from datetime import datetime, timedelta
from .class_session import get_dynamic_key
import re

checkin_bp = Blueprint("check_in", __name__)


def get_standard_room(level_text, room_text=None, hint_prefix=""):
    text = str(level_text).replace(" ", "")
    if room_text is not None:
        text += "/" + str(room_text).replace(" ", "")

    prefix = ""

    if "ประถม" in text:
        prefix = "ป."
    elif "มัธยม" in text:
        prefix = "ม."
    elif "ป." in text:
        prefix = "ป."
    elif "ม." in text:
        prefix = "ม."
    elif text.startswith("ป"):
        prefix = "ป."
    elif text.startswith("ม"):
        prefix = "ม."

    numbers = re.sub(r"[^\d/]", "", text)
    parts = numbers.split("/")
    lvl = parts[0] if len(parts) > 0 else ""
    rm = parts[1] if len(parts) > 1 else ""

    if not prefix and lvl:
        if hint_prefix:
            prefix = hint_prefix
        else:
            prefix = "ม." if int(lvl) > 6 else "ป."

    return f"{prefix}{lvl}/{rm}" if rm else f"{prefix}{lvl}"


@checkin_bp.route("/<int:session_id>")
def show_checkin(session_id):
    s = ClassroomSession.query.get_or_404(session_id)

    if session.get(f"checked_in_sid_{session_id}"):
        flash("คุณได้ทำการเช็คชื่อในรายวิชานี้เรียบร้อยแล้ว", "info")
        return redirect(url_for("class_session.session_room", session_id=session_id))

    if s.status != "active":
        return render_template("errors/closed.html", s=s), 403

    response = make_response(render_template("checkin.html", s=s))
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response


@checkin_bp.route("/submit", methods=["POST"])
def submit_attendance():
    session_id = request.form.get("session_id")
    input_key = request.form.get("secret_key", "").replace(" ", "").strip().upper()
    s_id = request.form.get("student_id", "").strip()

    target_session = ClassroomSession.query.get(session_id)
    if not target_session:
        return jsonify({"success": False, "message": "ไม่พบข้อมูลห้องเรียน"}), 404

    now = datetime.now()
    expiry_time = target_session.start_time + timedelta(
        minutes=target_session.allowed_minutes
    )

    if now > expiry_time:
        return (
            jsonify(
                {
                    "success": False,
                    "message": f"ปิดรับเช็คชื่อแล้วเมื่อ {expiry_time.strftime('%H:%M')} น.",
                }
            ),
            403,
        )

    if input_key not in [
        get_dynamic_key(target_session.secret_key, 0),
        get_dynamic_key(target_session.secret_key, -1),
    ]:
        return (
            jsonify(
                {"success": False, "message": "รหัสยืนยันไม่ถูกต้องหรือหมดอายุแล้ว"}
            ),
            400,
        )

    student = Student.query.filter_by(student_id=s_id).first()
    if not student:
        return (
            jsonify({"success": False, "message": "รหัสนักเรียนคนนี้ไม่มีอยู่ในระบบ"}),
            400,
        )

    sess_room = get_standard_room(target_session.room_name)

    sess_prefix = (
        sess_room[:2]
        if sess_room.startswith("ม.") or sess_room.startswith("ป.")
        else ""
    )

    std_room = get_standard_room(
        student.student_level, student.student_room, hint_prefix=sess_prefix
    )

    if std_room != sess_room:
        return (
            jsonify(
                {
                    "success": False,
                    "message": f"นักเรียนอยู่ชั้น {std_room} ไม่มีสิทธิ์เช็คในห้อง {sess_room}",
                }
            ),
            403,
        )

    if Attendance.query.filter_by(student_id=s_id, session_id=session_id).first():
        return jsonify({"success": False, "message": "คุณเช็คชื่อวิชานี้ไปแล้ว!"}), 400

    late_threshold_minutes = target_session.allowed_minutes * 0.8
    late_time = target_session.start_time + timedelta(minutes=late_threshold_minutes)

    current_status = "present" if now <= late_time else "late"
    status_msg = "เช็คชื่อสำเร็จ!" if now <= late_time else "เช็คชื่อสำเร็จ! (มาสาย)"

    try:
        new_attendance = Attendance(
            student_id=s_id,
            student_name=student.full_name,
            student_number=student.student_number,
            session_id=session_id,
            room_tag=sess_room,
            check_in_time=now,
            status=current_status,
        )
        db.session.add(new_attendance)
        db.session.commit()
        session[f"checked_in_sid_{session_id}"] = True

        # status_thai = "มาเรียน" if current_status == "present" else "สาย"
        # write_log(
        #     action="บันทึกการเช็คชื่อ",
        #     details=(
        #         f"นักเรียนรหัส: {s_id} ({student.full_name}) "
        #         f"เช็คชื่อห้อง {sess_room} สำเร็จ "
        #         f"สถานะ: {status_thai}"
        #     ),
        # )

        return jsonify({"success": True, "message": status_msg})

    except Exception as e:
        db.session.rollback()
        return (
            jsonify({"success": False, "message": "เกิดข้อผิดพลาดในการเช็คชื่อ"}),
            500,
        )


@checkin_bp.route("/get_student_info/<int:session_id>/<student_id>")
def get_student_info(session_id, student_id):
    student = Student.query.filter_by(student_id=student_id).first()
    target_session = ClassroomSession.query.get_or_404(session_id)

    if student:
        sess_room = get_standard_room(target_session.room_name)
        sess_prefix = (
            sess_room[:2]
            if sess_room.startswith("ม.") or sess_room.startswith("ป.")
            else ""
        )

        std_room = get_standard_room(
            student.student_level, student.student_room, hint_prefix=sess_prefix
        )

        if std_room != sess_room:
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "รหัสนักเรียนคนนี้ไม่อยู่ในห้องเรียนปัจจุบัน",
                    }
                ),
                200,
            )

        already_checked = Attendance.query.filter_by(
            student_id=student_id, session_id=session_id
        ).first()

        if already_checked:
            return (
                jsonify(
                    {
                        "success": False,
                        "is_already_checked": True,
                        "message": f"นักเรียนคนนี้เช็คชื่อไปแล้ว! (เมื่อเวลา {already_checked.check_in_time.strftime('%H:%M')} น.)",
                    }
                ),
                200,
            )

        return jsonify(
            {
                "success": True,
                "full_name": student.full_name,
                "level": std_room.split("/")[0],
                "room": student.student_room,
                "number": student.student_number,
            }
        )

    return (
        jsonify(
            {"success": False, "message": "รหัสนักเรียนคนนี้ไม่ได้อยู่ในห้องเรียนนี้"}
        ),
        200,
    )
