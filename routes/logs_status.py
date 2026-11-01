from flask import Blueprint, render_template, request, session, redirect, url_for
from database import db
from datetime import datetime, timedelta
from models import AuditLog, write_log
from sqlalchemy import or_, cast, String

logs_status_bp = Blueprint("logs_status", __name__)


@logs_status_bp.route("/admin/logs")
def view_logs():
    if not session.get("user_id") or session.get("role") != "admin":
        return redirect(url_for("auth.login"))

    page = request.args.get("page", 1, type=int)
    page = max(1, page)

    per_page = 20

    search_query = (request.args.get("q") or "").strip()

    role_filter = (request.args.get("role") or "latest").strip().lower()

    allowed_filters = {"latest", "all", "admin", "teacher", "other"}

    if role_filter not in allowed_filters:
        role_filter = "latest"

    query = AuditLog.query

    if role_filter == "admin":
        query = query.filter(AuditLog.role == "admin")

    elif role_filter == "teacher":
        query = query.filter(AuditLog.role == "teacher")

    elif role_filter == "other":
        query = query.filter(
            or_(AuditLog.role.notin_(["admin", "teacher"]), AuditLog.role.is_(None))
        )

    if search_query:
        pattern = f"%{search_query}%"

        search_conditions = [
            AuditLog.user_identifier.ilike(pattern),
            AuditLog.role.ilike(pattern),
            AuditLog.action.ilike(pattern),
            AuditLog.details.ilike(pattern),
            AuditLog.ip_address.ilike(pattern),
            cast(AuditLog.created_at, String).ilike(pattern),
        ]

        date_formats = [
            ("%d/%m/%Y %H:%M:%S", timedelta(seconds=1)),
            ("%d/%m/%Y %H:%M", timedelta(minutes=1)),
            ("%d-%m-%Y %H:%M:%S", timedelta(seconds=1)),
            ("%d-%m-%Y %H:%M", timedelta(minutes=1)),
            ("%Y-%m-%d %H:%M:%S", timedelta(seconds=1)),
            ("%Y-%m-%d %H:%M", timedelta(minutes=1)),
            ("%d/%m/%Y", timedelta(days=1)),
            ("%d-%m-%Y", timedelta(days=1)),
            ("%Y-%m-%d", timedelta(days=1)),
        ]

        for date_format, time_range in date_formats:
            try:
                searched_datetime = datetime.strptime(search_query, date_format)
            except ValueError:
                continue

            search_conditions.append(
                (AuditLog.created_at >= searched_datetime)
                & (AuditLog.created_at < searched_datetime + time_range)
            )

            break

        query = query.filter(or_(*search_conditions))

    pagination = query.order_by(AuditLog.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    if not request.args:
        write_log(
            action="เข้าชมประวัติการใช้งานระบบ",
            details="ผู้ดูแลระบบเข้าชมหน้าตรวจสอบประวัติและกิจกรรมการใช้งานระบบ (Audit Logs)",
        )

    return render_template(
        "logs_status.html",
        logs=pagination.items,
        pagination=pagination,
        search_query=search_query,
        role_filter=role_filter,
    )
