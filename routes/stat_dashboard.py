from flask import (
    Blueprint,
    render_template,
    session,
    abort,
    send_file,
    flash,
    redirect,
    url_for,
    request,
    current_app,
    jsonify,
    make_response,
    Response,
)
from models import ClassroomSession, Attendance, Student, Teacher, write_log
from models.session_student import SessionStudent
from sqlalchemy import func, or_
from datetime import datetime, timedelta, timezone
from io import BytesIO
from urllib.parse import quote
from types import SimpleNamespace
import io
import pandas as pd
import csv
import pdfkit
import re

stat_dashboard_bp = Blueprint("stat_dashboard", __name__)


@stat_dashboard_bp.context_processor
def inject_teacher_everywhere():
    from models import Teacher

    user_id = session.get("user_id")
    if user_id:
        teacher = Teacher.query.get(user_id)
        return dict(teacher=teacher)

    return dict(teacher=None)


def get_thai_date_full(dt):
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
    return f"{dt.day} {month_names[dt.month]} {dt.year + 543}"


def get_teacher_owned_session(session_id):
    if not session.get("user_id"):
        return None, "login"

    if session.get("role") != "teacher":
        return None, "forbidden"

    s = ClassroomSession.query.get_or_404(session_id)

    if str(s.teacher_id_ref) != str(session.get("user_id")):
        return None, "forbidden"

    return s, None


@stat_dashboard_bp.route("/stats/<int:session_id>")
def show_stats(session_id):
    s, access_error = get_teacher_owned_session(session_id)

    if access_error == "login":
        return redirect(url_for("auth.login"))

    if access_error == "forbidden":
        flash("คุณไม่มีสิทธิ์เข้าถึงรายงานสถิติของผู้อื่น", "danger")
        return redirect(url_for("dashboard.dashboard"))

    # write_log(
    #     action="เข้าชมรายงานสถิติการเข้าเรียน",
    #     details=(
    #         f"เข้าชมรายงานสถิติรายห้อง "
    #         f"วิชา: {s.subject_name} "
    #         f"ห้อง: {s.room_name} "
    #         f"(Session ID: {s.id})"
    #     ),
    # )

    snapshot_students = (
        SessionStudent.query.filter_by(session_id=session_id)
        .order_by(SessionStudent.student_number)
        .all()
    )

    student_list = []

    if snapshot_students:
        for std in snapshot_students:
            if std.education_level == "ประถมศึกษา":
                display_prefix = "ป."
            elif std.education_level == "มัธยมศึกษา":
                display_prefix = "ม."
            else:
                display_prefix = ""

            clean_std_level = re.sub(r"[^\d]", "", std.student_level or "")

            student_list.append(
                {
                    "student_id": std.student_id,
                    "full_name": std.student_name,
                    "student_level": std.student_level,
                    "student_room": std.student_room,
                    "student_number": std.student_number,
                    "room_tag": (
                        f"{display_prefix}{clean_std_level}/{std.student_room}"
                    ),
                }
            )

        snapshot_ids = {str(std.student_id) for std in snapshot_students}

        total_count = len(snapshot_students)

        attendees = [a for a in s.attendees if str(a.student_id) in snapshot_ids]

    else:
        clean_session_room = s.room_name.replace(" ", "")

        sess_prefix = (
            "ป."
            if "ป." in clean_session_room or "ประถม" in clean_session_room
            else (
                "ม."
                if "ม." in clean_session_room or "มัธยม" in clean_session_room
                else ""
            )
        )

        numbers = re.sub(r"[^\d/]", "", clean_session_room)
        parts = numbers.split("/")
        level_val = parts[0] if len(parts) > 0 else ""
        room_val = parts[1] if len(parts) > 1 else ""

        student_filters = [
            or_(
                func.trim(Student.student_level) == level_val,
                func.trim(Student.student_level) == f"{sess_prefix}{level_val}",
                func.trim(Student.student_level)
                == f"{sess_prefix.strip('.')}{level_val}",
            ),
            func.trim(Student.student_room) == room_val,
        ]

        if sess_prefix == "ป.":
            student_filters.append(Student.education_level == "ประถมศึกษา")
        elif sess_prefix == "ม.":
            student_filters.append(Student.education_level == "มัธยมศึกษา")

        all_students_in_room = (
            Student.query.filter(*student_filters)
            .order_by(Student.student_number)
            .all()
        )

        total_count = len(all_students_in_room)

        for std in all_students_in_room:
            if std.education_level == "ประถมศึกษา":
                display_prefix = "ป."
            elif std.education_level == "มัธยมศึกษา":
                display_prefix = "ม."
            else:
                display_prefix = ""

            clean_std_level = re.sub(r"[^\d]", "", std.student_level or "")

            student_list.append(
                {
                    "student_id": std.student_id,
                    "full_name": std.full_name,
                    "student_level": std.student_level,
                    "student_room": std.student_room,
                    "student_number": std.student_number,
                    "room_tag": (
                        f"{display_prefix}{clean_std_level}/{std.student_room}"
                    ),
                }
            )

        attendees = s.attendees

    p_count = len([a for a in attendees if a.status == "present"])
    l_count = len([a for a in attendees if a.status == "late"])
    v_count = len([a for a in attendees if a.status == "leave"])

    absent_count = max(0, total_count - (p_count + l_count + v_count))

    stats = {
        "present": p_count,
        "late": l_count,
        "leave": v_count,
        "absent": absent_count,
        "total_all": total_count,
        "total_checked": len(attendees),
    }

    return render_template(
        "stat_dashboard.html",
        s=s,
        stats=stats,
        attendees=attendees,
        student_list=student_list,
        now=datetime.now(),
    )


@stat_dashboard_bp.route("/api/student_quick_view/<string:student_id>/<int:session_id>")
def student_quick_view(student_id, session_id):
    s, access_error = get_teacher_owned_session(session_id)

    if access_error == "login":
        return jsonify({"success": False, "message": "Unauthorized"}), 401

    if access_error == "forbidden":
        return jsonify({"success": False, "message": "Forbidden"}), 403

    if s.teacher_id_ref != session["user_id"]:
        return jsonify({"success": False, "message": "Forbidden"}), 403

    snapshot_student = SessionStudent.query.filter_by(
        session_id=session_id,
        student_id=student_id,
    ).first()

    if snapshot_student:
        student_name = snapshot_student.student_name
        student_number = snapshot_student.student_number
        education_level = snapshot_student.education_level
        student_level = snapshot_student.student_level
        student_room = snapshot_student.student_room

    else:
        has_snapshot = SessionStudent.query.filter_by(session_id=session_id).first()

        if has_snapshot:
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "ไม่พบรายชื่อนักเรียนในห้องเรียนนี้",
                    }
                ),
                404,
            )

        std = Student.query.filter_by(student_id=student_id).first()

        if not std:
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "ไม่พบข้อมูลนักเรียน",
                    }
                ),
                404,
            )

        student_name = std.full_name
        student_number = std.student_number
        education_level = std.education_level
        student_level = std.student_level
        student_room = std.student_room

    att = Attendance.query.filter_by(
        student_id=student_id, session_id=session_id
    ).first()

    if att and att.check_in_time:
        date_thai = get_thai_date_full(att.check_in_time)
        time_part = att.check_in_time.strftime("%H:%M")
        check_time_display = f"{date_thai} {time_part} น."
    else:
        check_time_display = "ยังไม่ได้เช็คชื่อ"

    prefix = "ป." if education_level == "ประถมศึกษา" else "ม."
    room_display = f"{prefix}{student_level}/{student_room}"

    return jsonify(
        {
            "full_name": student_name,
            "id": student_id,
            "number": student_number,
            "subject": s.subject_name,
            "session_room": s.room_name,
            "student_room_info": room_display,
            "teacher": (s.teacher.full_name if s.teacher else "ไม่ระบุ"),
            "check_time": check_time_display,
            "status": att.status if att else "absent",
        }
    )


@stat_dashboard_bp.route("/api/history/<int:session_id>", methods=["GET"])
def get_attendance_history_by_date(session_id):
    _, access_error = get_teacher_owned_session(session_id)

    if access_error == "login":
        return jsonify({"success": False, "error": "Unauthorized"}), 401

    if access_error == "forbidden":
        return (
            jsonify(
                {"success": False, "error": "คุณไม่มีสิทธิ์เข้าถึงประวัติห้องเรียนนี้"}
            ),
            403,
        )

    start_date_str = request.args.get("start_date")
    end_date_str = request.args.get("end_date")

    try:
        tz_thailand = timezone(timedelta(hours=7))

        if (
            start_date_str
            and end_date_str
            and start_date_str != ""
            and end_date_str != ""
        ):
            start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
            end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date()

            history_data = (
                Attendance.query.filter(
                    Attendance.session_id == session_id,
                    or_(
                        func.date(Attendance.updated_at).between(start_date, end_date),
                        func.date(Attendance.check_in_time).between(
                            start_date, end_date
                        ),
                    ),
                )
                .order_by(Attendance.check_in_time.desc())
                .all()
            )
        else:
            history_data = (
                Attendance.query.filter(Attendance.session_id == session_id)
                .order_by(Attendance.check_in_time.desc())
                .all()
            )

            start_date = None
            end_date = None

        result = []
        for att in history_data:
            check_in_time_only = (
                att.check_in_time.strftime("%H:%M:%S น.") if att.check_in_time else "-"
            )
            date_display = (
                get_thai_date_full(att.check_in_time) if att.check_in_time else "-"
            )

            updated_time_only = (
                att.updated_at.strftime("%H:%M:%S น.") if att.updated_at else "-"
            )
            updated_date_display = (
                get_thai_date_full(att.updated_at) if att.updated_at else "-"
            )

            result.append(
                {
                    "no": att.student_number,
                    "student_id": att.student_id,
                    "name": att.student_name,
                    "room_tag": att.room_tag if att.room_tag else "-",
                    "status": att.status,
                    "date_only": date_display,
                    "check_in_time": check_in_time_only,
                    "updated_date_only": updated_date_display,
                    "updated_time": updated_time_only,
                }
            )

        return jsonify(
            {
                "success": True,
                "start_date": start_date.strftime("%Y-%m-%d") if start_date else "",
                "end_date": end_date.strftime("%Y-%m-%d") if end_date else "",
                "total_updated": len(result),
                "attendees": result,
            }
        )

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# --- EXPORT EXCEL (.xlsx) ---
@stat_dashboard_bp.route("/export_excel_stats/<int:session_id>")
def export_excel_stats(session_id):
    from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
    from openpyxl.utils import get_column_letter

    s, access_error = get_teacher_owned_session(session_id)

    if access_error == "login":
        return redirect(url_for("auth.login"))

    if access_error == "forbidden":
        abort(403)

    prefix = "ป." if s.room_name.startswith("ป.") else "ม."

    clean_room = s.room_name.replace("ม.", "").replace("ป.", "").strip()
    level_val = clean_room.split("/")[0].strip() if "/" in clean_room else clean_room
    room_val = clean_room.split("/")[1].strip() if "/" in clean_room else ""

    snapshot_students = (
        SessionStudent.query.filter_by(session_id=session_id)
        .order_by(SessionStudent.student_number)
        .all()
    )

    if snapshot_students:
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
        legacy_query = Student.query.filter(
            func.trim(Student.student_level) == level_val,
            func.trim(Student.student_room) == room_val,
        )

        if prefix == "ป.":
            legacy_query = legacy_query.filter(Student.education_level == "ประถมศึกษา")
        else:
            legacy_query = legacy_query.filter(Student.education_level == "มัธยมศึกษา")

        all_students = legacy_query.order_by(Student.student_number).all()

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
        config = status_config.get(status_key, status_config["absent"])

        student_prefix = "ป." if std.education_level == "ประถมศึกษา" else "ม."

        data.append(
            {
                "เลขที่": std.student_number,
                "รหัสนักเรียน": std.student_id,
                "ชื่อ-นามสกุล": std.full_name,
                "ห้อง": f"{student_prefix}{std.student_level}/{std.student_room}",
                "เวลาเช็คชื่อ": (
                    att.check_in_time.strftime("%H:%M:%S")
                    if att and att.check_in_time
                    else "-"
                ),
                "สถานะ": config["label"],
                "color_code": config["color"],
            }
        )

    if not data:
        return "ไม่พบข้อมูลรายชื่อนักเรียนในห้องนี้สำหรับการดึงรายงาน", 404

    df = pd.DataFrame(data)
    color_codes = df["color_code"].tolist()
    df = df.drop(columns=["color_code"])

    # 4. สร้างไฟล์ Excel
    output = BytesIO()

    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="รายงานสถิติ")
        worksheet = writer.sheets["รายงานสถิติ"]

        column_widths = {
            "A": 10,
            "B": 15,
            "C": 35,
            "D": 15,
            "E": 18,
            "F": 15,
        }

        for col, width in column_widths.items():
            worksheet.column_dimensions[col].width = width

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
            status_cell = worksheet.cell(row=row_idx, column=6)
            status_cell.fill = PatternFill(
                start_color=color, end_color=color, fill_type="solid"
            )

            for col_num in range(1, len(df.columns) + 1):
                cell = worksheet.cell(row=row_idx, column=col_num)
                cell.border = thin_border

                if col_num != 3:
                    cell.alignment = Alignment(horizontal="center")

    output.seek(0)

    safe_subject = s.subject_name.replace("/", "-")
    filename = (
        f"รายงานสถิติการเข้าเรียน_วิชา_{safe_subject}_"
        f"ห้อง_{s.room_name}_{datetime.now().strftime('%Y%m%d')}.xlsx"
    )

    # write_log(
    #     action="ส่งออกรายงานสถิติ Excel",
    #     details=(
    #         f"สร้างรายงานสถิติการเข้าเรียนรูปแบบ Excel "
    #         f"วิชา: {s.subject_name} "
    #         f"ห้อง: {s.room_name} "
    #         f"(Session ID: {session_id})"
    #     ),
    # )

    return send_file(
        output,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        as_attachment=True,
        download_name=filename,
    )


# --- EXPORT PDF (.pdf) ---
@stat_dashboard_bp.route("/export_pdf_stats/<int:session_id>")
def export_pdf_stats(session_id):
    from types import SimpleNamespace

    s, access_error = get_teacher_owned_session(session_id)

    if access_error == "login":
        return redirect(url_for("auth.login"))

    if access_error == "forbidden":
        abort(403)

    path_wkhtmltopdf = r"C:\Program Files\wkhtmltopdf\bin\wkhtmltopdf.exe"
    config = pdfkit.configuration(wkhtmltopdf=path_wkhtmltopdf)

    snapshot_students = (
        SessionStudent.query.filter_by(session_id=session_id)
        .order_by(SessionStudent.student_number)
        .all()
    )

    if snapshot_students:
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

        snapshot_ids = {str(std.student_id) for std in snapshot_students}

        attendances = [
            a
            for a in Attendance.query.filter_by(session_id=session_id).all()
            if str(a.student_id) in snapshot_ids
        ]

    else:
        raw_room = s.room_name.replace("ม.", "").replace("ป.", "").strip()
        level_val = raw_room.split("/")[0].strip() if "/" in raw_room else raw_room
        room_val = raw_room.split("/")[1].strip() if "/" in raw_room else ""

        legacy_query = Student.query.filter_by(
            student_level=level_val,
            student_room=room_val,
        )

        if s.room_name.startswith("ป."):
            legacy_query = legacy_query.filter(Student.education_level == "ประถมศึกษา")
        else:
            legacy_query = legacy_query.filter(Student.education_level == "มัธยมศึกษา")

        all_students = legacy_query.order_by(Student.student_number).all()

        attendances = Attendance.query.filter_by(session_id=session_id).all()

    att_map = {str(a.student_id): a for a in attendances}

    p_count = len([a for a in attendances if a.status == "present"])
    l_count = len([a for a in attendances if a.status == "late"])
    v_count = len([a for a in attendances if a.status == "leave"])

    total = len(all_students)
    absent = total - (p_count + l_count + v_count)

    stats = {
        "total": total,
        "present": p_count,
        "late": l_count,
        "leave": v_count,
        "absent": max(0, absent),
    }

    rendered_html = render_template(
        "pdf/stat_report.html",
        s=s,
        students=all_students,
        att_map=att_map,
        stats=stats,
        today_th=get_thai_date_full(s.created_at),
    )

    options = {
        "page-size": "A4",
        "encoding": "UTF-8",
        "no-outline": None,
        "enable-local-file-access": "",
    }

    pdf = pdfkit.from_string(
        rendered_html,
        False,
        options=options,
        configuration=config,
    )

    filename = (
        f"รายงานสรุปสถิติ_วิชา{s.subject_name}_"
        f"ห้อง{s.room_name}_{datetime.now().strftime('%Y%m%d')}.pdf"
    )

    # write_log(
    #     action="ส่งออกรายงานสถิติ PDF",
    #     details=(
    #         f"สร้างรายงานสถิติการเข้าเรียนรูปแบบ PDF "
    #         f"วิชา: {s.subject_name} "
    #         f"ห้อง: {s.room_name} "
    #         f"(Session ID: {session_id})"
    #     ),
    # )

    return send_file(
        BytesIO(pdf),
        mimetype="application/pdf",
        as_attachment=True,
        download_name=filename,
    )


@stat_dashboard_bp.route("/export_csv_stats/<int:session_id>")
def export_csv_stats(session_id):
    session_data, access_error = get_teacher_owned_session(session_id)

    if access_error == "login":
        return redirect(url_for("auth.login"))

    if access_error == "forbidden":
        abort(403)

    snapshot_students = (
        SessionStudent.query.filter_by(session_id=session_id)
        .order_by(SessionStudent.student_number)
        .all()
    )

    snapshot_map = {}

    if snapshot_students:
        snapshot_map = {str(std.student_id): std for std in snapshot_students}

        records = (
            Attendance.query.filter(
                Attendance.session_id == session_id,
                Attendance.student_id.in_(list(snapshot_map.keys())),
            )
            .order_by(Attendance.student_number.asc())
            .all()
        )

    else:
        records = (
            Attendance.query.join(Student, Attendance.student_id == Student.student_id)
            .filter(Attendance.session_id == session_id)
            .order_by(Student.student_number.asc())
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

        snapshot = snapshot_map.get(str(r.student_id))

        student_number = (
            snapshot.student_number
            if snapshot
            else getattr(r, "student_number", getattr(r, "number", "-"))
        )

        student_name = (
            snapshot.student_name
            if snapshot
            else getattr(r, "student_name", getattr(r, "full_name", "-"))
        )

        writer.writerow(
            [
                student_number,
                r.student_id,
                student_name,
                session_data.room_name or "-",
                status_map.get(r.status, r.status),
                time_str,
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
        f"รายงานสรุปสถิติ_วิชา{clean_subject}_ห้อง_{clean_room}_{current_datetime}.csv"
    )

    encoded_filename = quote(raw_filename)

    # write_log(
    #     action="ส่งออกรายงานสถิติ CSV",
    #     details=(
    #         f"สร้างรายงานสถิติการเข้าเรียนรูปแบบ CSV "
    #         f"วิชา: {clean_subject} "
    #         f"ห้อง: {clean_room} "
    #         f"(Session ID: {session_id})"
    #     ),
    # )

    return Response(
        csv_bytes,
        mimetype="text/csv; charset=utf-8-sig",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}",
            "Content-Type": "text/csv; charset=utf-8-sig",
        },
    )
