from flask import (
    Blueprint,
    render_template,
    session,
    request,
    send_file,
    redirect,
    url_for,
    abort,
)
from sqlalchemy import func
from database import db
from datetime import datetime
from models.students import Student
from models.teachers import Teacher
from models.attendance import Attendance
from models.class_session import ClassroomSession
from models.session_student import SessionStudent
from types import SimpleNamespace
from models import write_log
from xhtml2pdf import pisa
import pandas as pd
import urllib.parse
import io

stat_summary_bp = Blueprint("stat_summary", __name__)


def teacher_access_response():
    if not session.get("user_id"):
        return redirect(url_for("auth.login"))

    if session.get("role") != "teacher":
        abort(403)

    return None


def get_teacher_subject_session(id_subject, room_name=None):
    query = ClassroomSession.query.filter_by(
        teacher_id_ref=session.get("user_id"),
        id_subject=id_subject,
    )

    if room_name is not None:
        query = query.filter_by(room_name=room_name)

    return query.first()


def datetime_name():
    return datetime.now().strftime("_%d-%m-%Y_%H-%M")


def collect_subject_summary_stats(id_subject, user_id, room_name=None):
    session_query = ClassroomSession.query.filter_by(
        teacher_id_ref=user_id,
        id_subject=id_subject,
    )

    if room_name:
        session_query = session_query.filter_by(room_name=room_name)

    target_sessions = session_query.order_by(
        ClassroomSession.created_at.asc(),
        ClassroomSession.id.asc(),
    ).all()

    student_aggregates = {}

    def get_student_aggregate(
        student_id,
        student_number,
        full_name,
        is_snapshot=False,
    ):
        key = str(student_id)

        if key not in student_aggregates:
            student_aggregates[key] = {
                "student_id": student_id,
                "student_number": student_number,
                "full_name": full_name,
                "present": 0,
                "late": 0,
                "leave": 0,
                "absent": 0,
                "eligible_sessions": 0,
                "has_snapshot": is_snapshot,
            }

        else:
            current = student_aggregates[key]

            if is_snapshot or not current["has_snapshot"]:
                current["student_number"] = student_number
                current["full_name"] = full_name

            if is_snapshot:
                current["has_snapshot"] = True

        return student_aggregates[key]

    for current_session in target_sessions:

        snapshot_students = (
            SessionStudent.query.filter_by(session_id=current_session.id)
            .order_by(SessionStudent.student_number)
            .all()
        )

        if snapshot_students:
            snapshot_ids = [str(std.student_id) for std in snapshot_students]

            for std in snapshot_students:
                aggregate = get_student_aggregate(
                    student_id=std.student_id,
                    student_number=std.student_number,
                    full_name=std.student_name,
                    is_snapshot=True,
                )
                aggregate["eligible_sessions"] += 1

            attendance_rows = Attendance.query.filter(
                Attendance.session_id == current_session.id,
                Attendance.student_id.in_(snapshot_ids),
            ).all()

            for att in attendance_rows:
                aggregate = student_aggregates.get(str(att.student_id))

                if aggregate and att.status in {
                    "present",
                    "late",
                    "leave",
                    "absent",
                }:
                    aggregate[att.status] += 1

        else:
            legacy_records = (
                db.session.query(Attendance, Student)
                .join(
                    Student,
                    Attendance.student_id == Student.student_id,
                )
                .filter(Attendance.session_id == current_session.id)
                .all()
            )

            legacy_seen_ids = set()

            for att, std in legacy_records:
                aggregate = get_student_aggregate(
                    student_id=std.student_id,
                    student_number=std.student_number,
                    full_name=std.full_name,
                    is_snapshot=False,
                )

                student_key = str(std.student_id)

                if student_key not in legacy_seen_ids:
                    aggregate["eligible_sessions"] += 1
                    legacy_seen_ids.add(student_key)

                if att.status in {
                    "present",
                    "late",
                    "leave",
                    "absent",
                }:
                    aggregate[att.status] += 1

    sorted_students = sorted(
        student_aggregates.values(),
        key=lambda item: (
            item["student_number"] is None,
            item["student_number"] if item["student_number"] is not None else 0,
            str(item["student_id"]),
        ),
    )

    return sorted_students, len(target_sessions)


@stat_summary_bp.context_processor
def inject_teacher_everywhere():
    from models import Teacher

    user_id = session.get("user_id")
    if user_id:
        teacher = Teacher.query.get(user_id)
        return dict(teacher=teacher)

    return dict(teacher=None)


@stat_summary_bp.route("/stat-main")
def stat_main():
    user_id = session.get("user_id")

    access_response = teacher_access_response()
    if access_response:
        return access_response

    # write_log(
    #     action="เข้าชมหน้าสรุปสถิติรายวิชา",
    #     details="คุณครูเข้าชมหน้ารวมรายวิชาและห้องเรียนเพื่อเลือกดูรายงานสถิติ",
    # )

    subject_groups = (
        db.session.query(
            ClassroomSession.id_subject,
            ClassroomSession.subject_name,
            ClassroomSession.room_name,
            func.max(Teacher.full_name).label("teacher_name"),
            func.max(ClassroomSession.created_at).label("created_at"),
            func.count(ClassroomSession.id).label("session_count"),
        )
        .join(Teacher, ClassroomSession.teacher_id_ref == Teacher.id)
        .filter(ClassroomSession.teacher_id_ref == user_id)
        .group_by(
            ClassroomSession.id_subject,
            ClassroomSession.subject_name,
            ClassroomSession.room_name,
        )
        .all()
    )

    return render_template("stat_sum_menu.html", subject_groups=subject_groups)


@stat_summary_bp.route("/stat-detail")
def subject_summary():
    access_response = teacher_access_response()
    if access_response:
        return access_response

    id_subject = request.args.get("id_subject")
    room_name = request.args.get("room_name")
    user_id = session.get("user_id")

    if not id_subject or not room_name:
        abort(404)

    session_info = get_teacher_subject_session(id_subject, room_name)

    if not session_info:
        abort(404)

    target_sessions = (
        ClassroomSession.query.filter_by(
            teacher_id_ref=user_id,
            id_subject=id_subject,
            room_name=room_name,
        )
        .order_by(
            ClassroomSession.created_at.asc(),
            ClassroomSession.id.asc(),
        )
        .all()
    )

    student_aggregates = {}

    def get_student_aggregate(
        student_id,
        student_number,
        full_name,
        is_snapshot=False,
    ):
        key = str(student_id)

        if key not in student_aggregates:
            student_aggregates[key] = {
                "student_id": student_id,
                "student_number": student_number,
                "full_name": full_name,
                "present": 0,
                "late": 0,
                "absent": 0,
                "leave": 0,
                "has_snapshot": is_snapshot,
                "eligible_sessions": 0,
            }

        else:
            current = student_aggregates[key]

            if is_snapshot or not current["has_snapshot"]:
                current["student_number"] = student_number
                current["full_name"] = full_name

            if is_snapshot:
                current["has_snapshot"] = True

        return student_aggregates[key]

    for current_session in target_sessions:

        snapshot_students = (
            SessionStudent.query.filter_by(session_id=current_session.id)
            .order_by(SessionStudent.student_number)
            .all()
        )

        if snapshot_students:
            snapshot_ids = [str(std.student_id) for std in snapshot_students]

            for std in snapshot_students:
                aggregate = get_student_aggregate(
                    student_id=std.student_id,
                    student_number=std.student_number,
                    full_name=std.student_name,
                    is_snapshot=True,
                )
                aggregate["eligible_sessions"] += 1

            attendance_rows = Attendance.query.filter(
                Attendance.session_id == current_session.id,
                Attendance.student_id.in_(snapshot_ids),
            ).all()

            for att in attendance_rows:
                aggregate = student_aggregates.get(str(att.student_id))

                if aggregate and att.status in {
                    "present",
                    "late",
                    "absent",
                    "leave",
                }:
                    aggregate[att.status] += 1

        else:
            legacy_records = (
                db.session.query(Attendance, Student)
                .join(
                    Student,
                    Attendance.student_id == Student.student_id,
                )
                .filter(Attendance.session_id == current_session.id)
                .all()
            )

            legacy_seen_ids = set()

            for att, std in legacy_records:
                aggregate = get_student_aggregate(
                    student_id=std.student_id,
                    student_number=std.student_number,
                    full_name=std.full_name,
                    is_snapshot=False,
                )

                student_key = str(std.student_id)

                if student_key not in legacy_seen_ids:
                    aggregate["eligible_sessions"] += 1
                    legacy_seen_ids.add(student_key)

                if att.status in {
                    "present",
                    "late",
                    "absent",
                    "leave",
                }:
                    aggregate[att.status] += 1

    sorted_students = sorted(
        student_aggregates.values(),
        key=lambda item: (
            item["student_number"] is None,
            item["student_number"] if item["student_number"] is not None else 0,
            str(item["student_id"]),
        ),
    )

    student_stats = [
        SimpleNamespace(
            student_id=item["student_id"],
            student_number=item["student_number"],
            full_name=item["full_name"],
            present=item["present"],
            late=item["late"],
            absent=item["absent"],
            leave=item["leave"],
            eligible_sessions=item["eligible_sessions"],
        )
        for item in sorted_students
    ]

    total_students = len(student_stats)

    subject_name = session_info.subject_name if session_info else "ไม่ระบุชื่อวิชา"

    teacher_name = (
        session_info.teacher.full_name
        if session_info and session_info.teacher
        else "ไม่ระบุชื่อผู้สอน"
    )

    total_sessions = len(target_sessions)

    # write_log(
    #     action="เข้าชมรายงานสรุปสถิติรายวิชา",
    #     details=(
    #         f"เข้าชมรายงานสถิติวิชา: {subject_name} "
    #         f"({id_subject}) ห้อง: {room_name} "
    #         f"จำนวน {total_sessions} คาบเรียน"
    #     ),
    # )

    return render_template(
        "stat_sum_dashboard.html",
        student_stats=student_stats,
        id_subject=id_subject,
        room_name=room_name,
        subject_name=subject_name,
        teacher_name=teacher_name,
        total_sessions=total_sessions,
        total_students=total_students,
    )


@stat_summary_bp.route("/export-excel")
def export_excel():
    access_response = teacher_access_response()
    if access_response:
        return access_response

    id_subject = request.args.get("id_subject")
    room_name = request.args.get("room_name")
    user_id = session.get("user_id")

    # 1. ตรวจสอบสิทธิ์และข้อมูลวิชา
    session_info = get_teacher_subject_session(id_subject)

    if not session_info:
        abort(404)

    if room_name and not get_teacher_subject_session(id_subject, room_name):
        abort(404)

    subject_name = session_info.subject_name

    student_stats, total_sessions = collect_subject_summary_stats(
        id_subject=id_subject,
        user_id=user_id,
        room_name=room_name,
    )

    data = []

    for std in student_stats:
        attended = std["present"] + std["late"]
        eligible_sessions = std["eligible_sessions"]

        rate = (
            round((attended / eligible_sessions * 100), 1)
            if eligible_sessions > 0
            else 0.0
        )

        data.append(
            {
                "เลขที่": std["student_number"] or "-",
                "รหัสนักเรียน": std["student_id"],
                "ชื่อ-นามสกุล": std["full_name"],
                "มาเรียน (ครั้ง)": std["present"],
                "สาย (ครั้ง)": std["late"],
                "ลา (ครั้ง)": std["leave"],
                "ขาด (ครั้ง)": std["absent"],
                "% การเข้าเรียน": f"{rate}%",
            }
        )

    columns = [
        "เลขที่",
        "รหัสนักเรียน",
        "ชื่อ-นามสกุล",
        "มาเรียน (ครั้ง)",
        "สาย (ครั้ง)",
        "ลา (ครั้ง)",
        "ขาด (ครั้ง)",
        "% การเข้าเรียน",
    ]

    df = pd.DataFrame(data, columns=columns)

    output = io.BytesIO()

    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(
            writer,
            index=False,
            sheet_name="สรุปการเข้าเรียน",
        )

        worksheet = writer.sheets["สรุปการเข้าเรียน"]

        worksheet.column_dimensions["A"].width = 10
        worksheet.column_dimensions["B"].width = 15
        worksheet.column_dimensions["C"].width = 35
        worksheet.column_dimensions["D"].width = 16
        worksheet.column_dimensions["E"].width = 16
        worksheet.column_dimensions["F"].width = 16
        worksheet.column_dimensions["G"].width = 16
        worksheet.column_dimensions["H"].width = 20

    output.seek(0)

    filename = f"รายงานสรุปเวลาเรียน_{subject_name}{datetime_name()}.xlsx"

    # write_log(
    #     action="ส่งออกรายงานสรุปเวลาเรียน Excel",
    #     details=(
    #         f"Export รายงานสรุปเวลาเรียนวิชา: {subject_name} "
    #         f"({id_subject}) ห้อง: {room_name or 'ทุกห้องเรียน'}"
    #     ),
    # )

    return send_file(
        output,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        as_attachment=True,
        download_name=filename,
    )


@stat_summary_bp.route("/export-pdf-summary")
def export_pdf_summary():
    access_response = teacher_access_response()
    if access_response:
        return access_response

    id_subject = request.args.get("id_subject")
    room_name = request.args.get("room_name")
    user_id = session.get("user_id")

    # 1. ตรวจสอบสิทธิ์และข้อมูลวิชา
    session_info = get_teacher_subject_session(id_subject)

    if not session_info:
        abort(404)

    if room_name and not get_teacher_subject_session(id_subject, room_name):
        abort(404)

    subject_name = session_info.subject_name

    # 2. เตรียมชื่อห้องเรียน
    if room_name:
        room_list_str = room_name
    else:
        all_rooms = (
            db.session.query(ClassroomSession.room_name)
            .filter_by(
                teacher_id_ref=user_id,
                id_subject=id_subject,
            )
            .distinct()
            .all()
        )

        room_list_str = (
            ", ".join([r.room_name for r in all_rooms if r.room_name]) or "ทุกห้องเรียน"
        )

    # 3. รวมสถิติจาก Snapshot ของแต่ละ Session
    raw_student_stats, total_sessions = collect_subject_summary_stats(
        id_subject=id_subject,
        user_id=user_id,
        room_name=room_name,
    )

    # 4. เตรียมข้อมูลรายบุคคลสำหรับ PDF
    student_stats = []

    for s in raw_student_stats:
        attended = s["present"] + s["late"]

        eligible_sessions = s["eligible_sessions"]

        # มาสายถือว่าเข้าเรียน
        pct = (
            round((attended / eligible_sessions * 100), 1)
            if eligible_sessions > 0
            else 0.0
        )

        # จำนวนสถานะที่มีการบันทึกจริง
        recorded_total = s["present"] + s["late"] + s["leave"] + s["absent"]

        student_stats.append(
            {
                "student_id": s["student_id"],
                "student_number": s["student_number"],
                "full_name": s["full_name"],
                "present": s["present"],
                "late": s["late"],
                "leave": s["leave"],
                "absent": s["absent"],
                # เก็บ total เดิมไว้เพื่อรักษาความเข้ากันได้กับ Template
                "total": recorded_total,
                # จำนวนคาบที่นักเรียนมีชื่อใน Snapshot
                "eligible_sessions": eligible_sessions,
                "recorded_total": recorded_total,
                "pct": pct,
                "percent": pct,
                "pct_attendance": pct,
            }
        )

    # 5. คำนวณยอดรวมทุกคน
    total_present = sum(s["present"] for s in student_stats)
    total_late = sum(s["late"] for s in student_stats)
    total_leave = sum(s["leave"] for s in student_stats)
    total_absent = sum(s["absent"] for s in student_stats)

    grand_total = total_present + total_late + total_leave + total_absent

    # 6. คำนวณเปอร์เซ็นต์สำหรับกราฟภาพรวม
    pct_present = round(total_present / grand_total * 100, 1) if grand_total > 0 else 0

    pct_late = round(total_late / grand_total * 100, 1) if grand_total > 0 else 0

    pct_leave = round(total_leave / grand_total * 100, 1) if grand_total > 0 else 0

    pct_absent = round(total_absent / grand_total * 100, 1) if grand_total > 0 else 0

    pct_total_attendance = (
        round(
            (total_present + total_late) / grand_total * 100,
            1,
        )
        if grand_total > 0
        else 0
    )

    # 7. เตรียมข้อมูล Summary สำหรับ PDF Template
    stats = {
        "total_students": len(student_stats),
        "grand_total": grand_total,
        "present": total_present,
        "late": total_late,
        "leave": total_leave,
        "absent": total_absent,
        "pct_present": pct_present,
        "pct_late": pct_late,
        "pct_leave": pct_leave,
        "pct_absent": pct_absent,
        "pct_total_attendance": pct_total_attendance,
    }

    # 8. สร้างกราฟ Doughnut Chart
    chart_config = f"""
    {{
        type: 'doughnut',
        data: {{
            labels: [
                'มาเรียน ({pct_present}%)',
                'มาสาย ({pct_late}%)',
                'ลา ({pct_leave}%)',
                'ขาดเรียน ({pct_absent}%)'
            ],
            datasets: [{{
                data: [
                    {total_present},
                    {total_late},
                    {total_leave},
                    {total_absent}
                ],
                backgroundColor: [
                    '#16a34a',
                    '#ca8a04',
                    '#0891b2',
                    '#dc2626'
                ],
                borderColor: '#ffffff',
                borderWidth: 1.5,
            }}]
        }},
        options: {{
            plugins: {{
                legend: {{
                    position: 'right',
                    labels: {{
                        color: '#334155',
                        font: {{
                            size: 12,
                            family: "'Sarabun', sans-serif",
                            weight: 'bold'
                        }}
                    }}
                }},
                datalabels: {{
                    color: '#ffffff',
                    font: {{
                        family: "'Sarabun', sans-serif",
                        size: 13,
                        weight: 'bold'
                    }},
                    formatter: (value) => value > 0 ? value + ' ครั้ง' : ''
                }}
            }},
            cutout: '55%'
        }}
    }}
    """

    chart_url = (
        f"https://quickchart.io/chart?c="
        f"{urllib.parse.quote(chart_config)}&w=650&h=260&bkg=white"
    )

    rendered_html = render_template(
        "pdf/stat_sum.html",
        student_stats=student_stats,
        id_subject=id_subject,
        subject_name=subject_name,
        room_list_str=room_list_str,
        total_sessions=total_sessions,
        stats=stats,
        chart_url=chart_url,
        print_date=datetime.now().strftime("%d/%m/%Y %H:%M"),
    )

    pdf_buffer = io.BytesIO()

    pisa_status = pisa.CreatePDF(
        rendered_html,
        dest=pdf_buffer,
        encoding="utf-8",
    )

    if pisa_status.err:
        return "เกิดข้อผิดพลาดในการสร้างไฟล์ PDF", 500

    # write_log(
    #     action="ส่งออกรายงานสรุปเวลาเรียน PDF",
    #     details=(
    #         f"Export รายงานสรุปเวลาเรียนพร้อมกราฟ "
    #         f"วิชา: {subject_name} ({id_subject}) "
    #         f"ห้อง: {room_list_str} จำนวน {total_sessions} คาบเรียน"
    #     ),
    # )

    now = datetime.now()
    date_str = now.strftime("%d-%m-%Y")
    time_str = now.strftime("%H-%M")

    pdf_buffer.seek(0)

    filename = f"รายงานสรุปเวลาเรียน_{subject_name}_{date_str}_{time_str}.pdf"

    return send_file(
        pdf_buffer,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=filename,
    )


@stat_summary_bp.route("/export-csv")
def export_csv():
    access_response = teacher_access_response()
    if access_response:
        return access_response

    id_subject = request.args.get("id_subject")
    room_name = request.args.get("room_name")
    user_id = session.get("user_id")

    session_info = get_teacher_subject_session(id_subject)

    if not session_info:
        abort(404)

    if room_name and not get_teacher_subject_session(id_subject, room_name):
        abort(404)

    subject_name = session_info.subject_name

    student_stats, total_sessions = collect_subject_summary_stats(
        id_subject=id_subject,
        user_id=user_id,
        room_name=room_name,
    )

    data = []

    for std in student_stats:
        attended = std["present"] + std["late"]
        eligible_sessions = std["eligible_sessions"]

        rate = (
            round((attended / eligible_sessions * 100), 1)
            if eligible_sessions > 0
            else 0.0
        )

        data.append(
            {
                "เลขที่": std["student_number"] or "-",
                "รหัสนักเรียน": std["student_id"],
                "ชื่อ-นามสกุล": std["full_name"],
                "มาเรียน (ครั้ง)": std["present"],
                "สาย (ครั้ง)": std["late"],
                "ลา (ครั้ง)": std["leave"],
                "ขาด (ครั้ง)": std["absent"],
                "% การเข้าเรียน": f"{rate}%",
            }
        )

    columns = [
        "เลขที่",
        "รหัสนักเรียน",
        "ชื่อ-นามสกุล",
        "มาเรียน (ครั้ง)",
        "สาย (ครั้ง)",
        "ลา (ครั้ง)",
        "ขาด (ครั้ง)",
        "% การเข้าเรียน",
    ]

    df = pd.DataFrame(data, columns=columns)

    output = io.BytesIO()
    df.to_csv(
        output,
        index=False,
        encoding="utf-8-sig",
    )
    output.seek(0)

    now = datetime.now()
    date_str = now.strftime("%d-%m-%Y")

    filename = f"รายงานสรุปเวลาเรียน_{subject_name}_{date_str}.csv"

    # write_log(
    #     action="ส่งออกรายงานสรุปเวลาเรียน CSV",
    #     details=(
    #         f"Export รายงานสรุปเวลาเรียน "
    #         f"วิชา: {subject_name} ({id_subject}) "
    #         f"ห้อง: {room_name or 'ทุกห้องเรียน'}"
    #     ),
    # )

    return send_file(
        output,
        mimetype="text/csv",
        as_attachment=True,
        download_name=filename,
    )
