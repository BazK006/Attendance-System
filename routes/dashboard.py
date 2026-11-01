from flask import Blueprint, render_template, session, redirect, url_for, flash, request
from models.teachers import Teacher
from models.class_session import ClassroomSession
from models.attendance import Attendance
from models.students import Student
from models import write_log
from database import db
from datetime import date, datetime, timedelta
import random

dashboard_bp = Blueprint("dashboard", __name__)


def get_greeting():
    hour = datetime.now().hour
    if 5 <= hour < 12:
        main = "อรุณสวัสดิ์ครับ"
        sub = [
            "เริ่มต้นวันใหม่ด้วยพลังงานบวกนะครับ ☀️",
            "กาแฟสักแก้ว แล้วมาจัดการห้องเรียนกันนะครับ ☕",
            "วันนี้เป็นวันที่ดีในการสร้างแรงบันดาลใจให้นักเรียนครับ ✨",
        ]
    elif 12 <= hour < 17:
        main = "สวัสดีตอนบ่ายครับ"
        sub = [
            "สู้ๆ กับคาบบ่ายนะครับ อีกนิดเดียวจะเลิกเรียนแล้ว ✌️",
            "วันนี้เด็กๆ ตั้งใจเรียนกันไหมครับ? 😊",
            "จัดการเช็คชื่อให้เรียบร้อย แล้วไปพักทานขนมกันครับ 🍰",
        ]
    elif 17 <= hour < 21:
        main = "สวัสดีตอนเย็นครับ"
        sub = [
            "เหนื่อยไหมครับวันนี้? พักผ่อนสายตาบ้างนะครับ 🌙",
            "สรุปยอดรวมวันนี้เป็นยังไงบ้างครับ? 📊",
            "เก่งมากครับที่จัดการห้องเรียนจนเสร็จสิ้นวัน 🎉",
        ]
    else:
        main = "สวัสดีตอนดึกครับ"
        sub = [
            "ยังไม่นอนอีกเหรอครับ? อย่าลืมดูแลสุขภาพนะ 💤",
            "ระบบสแตนด์บายรอคุณเสมอ แต่คุณควรพักผ่อนได้แล้วครับ 🤗",
            "เตรียมแผนการสอนสำหรับพรุ่งนี้อยู่ใช่ไหมครับ? สู้ๆ นะครับ 💻",
        ]

    return main, random.choice(sub)


@dashboard_bp.route("/")
def dashboard():
    if "user_id" not in session or session.get("role") != "teacher":
        flash("กรุณาเข้าสู่ระบบในฐานะครู", "danger")
        return redirect(url_for("auth.login"))

    teacher_id = session.get("user_id")
    teacher = Teacher.query.get(teacher_id)
    now = datetime.now()
    today = date.today()

    start_param = request.args.get("start")
    end_param = request.args.get("end")

    if not start_param or not end_param:
        sessions = (
            ClassroomSession.query.filter(ClassroomSession.teacher_id_ref == teacher_id)
            .order_by(ClassroomSession.start_time.desc())
            .all()
        )
        start_date_str = ""
        end_date_str = ""
    else:
        start_date, end_date = get_date_range(start_param, end_param)
        sessions = (
            ClassroomSession.query.filter(
                ClassroomSession.teacher_id_ref == teacher_id,
                ClassroomSession.created_at.between(start_date, end_date),
            )
            .order_by(ClassroomSession.start_time.desc())
            .all()
        )
        start_date_str = start_date.strftime("%Y-%m-%d")
        end_date_str = end_date.strftime("%Y-%m-%d")

    updated_any = False
    auto_closed_sessions = []
    auto_close_failed = False

    for s in sessions:
        expire_time = s.start_time + timedelta(minutes=s.allowed_minutes)

        if s.status == "active" and now > expire_time:
            try:
                present_ids = [
                    a.student_id
                    for a in Attendance.query.filter_by(session_id=s.id).all()
                ]

                clean_room = s.room_name.replace(" ", "")

                edu_level = (
                    "มัธยมศึกษา"
                    if "ม" in clean_room
                    else "ประถมศึกษา" if "ป" in clean_room else ""
                )

                import re

                numbers = re.sub(r"[^\d/]", "", clean_room)
                parts = numbers.split("/")

                level_num = parts[0] if len(parts) > 0 else ""
                r_part = parts[1] if len(parts) > 1 else ""

                all_students = Student.query.filter_by(
                    education_level=edu_level,
                    student_level=level_num,
                    student_room=r_part,
                ).all()

                new_absents = []

                for std in all_students:
                    if std.student_id not in present_ids:
                        new_absents.append(
                            Attendance(
                                student_id=std.student_id,
                                student_name=std.full_name,
                                student_number=std.student_number,
                                session_id=s.id,
                                room_tag=s.room_name,
                                status="absent",
                                check_in_time=now,
                            )
                        )

                # เปลี่ยนสถานะห้องเรียนหลังเตรียมข้อมูลสำเร็จ
                s.status = "closed"

                if new_absents:
                    db.session.bulk_save_objects(new_absents)

                updated_any = True

                # เก็บข้อมูลไว้สำหรับ Audit Log
                auto_closed_sessions.append(
                    {
                        "id": s.id,
                        "subject": s.subject_name,
                        "room": s.room_name,
                        "absent_count": len(new_absents),
                    }
                )

            except Exception as e:
                auto_close_failed = True

                print(f"Error updating absents for session {s.id}: {e}")
                break
    if auto_close_failed:
        db.session.rollback()
        auto_closed_sessions.clear()
        updated_any = False

    elif updated_any:
        db.session.commit()

        # for item in auto_closed_sessions:
        #     write_log(
        #         action="ระบบปิดห้องเรียนอัตโนมัติ",
        #         details=(
        #             f"ระบบปิดห้องเรียนวิชา {item['subject']} "
        #             f"ชั้น {item['room']} "
        #             f"(Session ID: {item['id']}) "
        #             f"พร้อมบันทึกสถานะขาดเรียนเพิ่ม "
        #             f"{item['absent_count']} คน"
        #         )
        #     )

    my_session_ids = [s.id for s in sessions]

    checked_today_count = Attendance.query.filter(
        db.func.date(Attendance.check_in_time) == today,
        Attendance.session_id.in_(my_session_ids) if my_session_ids else False,
    ).count()

    rooms_query = (
        db.session.query(
            Student.education_level, Student.student_level, Student.student_room
        )
        .distinct()
        .all()
    )

    available_rooms = []
    for r in rooms_query:
        prefix = "ม." if r[0] == "มัธยมศึกษา" else "ป." if r[0] == "ประถมศึกษา" else ""
        available_rooms.append(f"{prefix}{r[1]}/{r[2]}")
    available_rooms.sort()

    main_greeting, sub_greeting = get_greeting()

    # write_log(
    #     action="เข้าชมแดชบอร์ด",
    #     details="คุณครูเข้าชมหน้าแดชบอร์ดเพื่อติดตามภาพรวมและข้อมูลห้องเรียน"
    # )

    return render_template(
        "dashboard.html",
        teacher=teacher,
        sessions=sessions,
        checked_today_count=checked_today_count,
        available_rooms=available_rooms,
        main_greeting=main_greeting,
        sub_greeting=sub_greeting,
        total_students_count=Student.query.count(),
        start_date=start_date_str,
        end_date=end_date_str,
        stats={"total_sessions": len(sessions)},
    )


def get_date_range(start_str, end_str):
    try:
        if start_str and end_str:
            start_date = datetime.strptime(start_str, "%Y-%m-%d").replace(
                hour=0, minute=0, second=0, microsecond=0
            )
            end_date = datetime.strptime(end_str, "%Y-%m-%d").replace(
                hour=23, minute=59, second=59, microsecond=999999
            )
            return start_date, end_date
    except (ValueError, TypeError):
        pass

    end_date = datetime.now().replace(hour=23, minute=59, second=59, microsecond=999999)
    start_date = (end_date - timedelta(days=30)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    return start_date, end_date
