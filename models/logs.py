from flask import request, session
from database import db
from datetime import datetime, timedelta
from flask_socketio import SocketIO
import random

socketio = SocketIO()


class AuditLog(db.Model):
    __tablename__ = "audit_logs"
    id = db.Column(db.Integer, primary_key=True)
    user_identifier = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(20), nullable=False)
    action = db.Column(db.String(50), nullable=False)
    details = db.Column(db.Text, nullable=True)
    ip_address = db.Column(db.String(45), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now, index=True)


def write_log(action, details=""):
    try:
        user_identifier = session.get("username", "Guest/Unknown")
        role = session.get("role", "guest")
        ip_address = request.remote_addr

        new_log = AuditLog(
            user_identifier=user_identifier,
            role=role,
            action=action,
            details=details,
            ip_address=ip_address,
        )
        db.session.add(new_log)
        db.session.commit()

        log_data = {
            "created_at": new_log.created_at.strftime("%d/%m/%Y %H:%M:%S"),
            "user_identifier": user_identifier,
            "role": role,
            "action": action,
            "details": details,
            "ip_address": ip_address if ip_address else "Unknown",
        }
        socketio.emit("broadcast_log", log_data, namespace="/")

        if random.random() < 0.01:
            retention_days = 90
            expiration_date = datetime.now() - timedelta(days=retention_days)

            deleted_rows = AuditLog.query.filter(
                AuditLog.created_at < expiration_date
            ).delete()

            db.session.commit()

            if deleted_rows > 0:
                print(
                    f"[INFO] [Log Rotation]: ทำความสะอาดฐานข้อมูลสำเร็จ ลบประวัติการใช้งานที่หมดอายุ (เกิน {retention_days} วัน) รวมทั้งสิ้น {deleted_rows} รายการ"
                )

    except Exception as e:
        db.session.rollback()
        print(f"❌ [Log Error]: บันทึกประวัติไม่สำเร็จเนื่องจาก {e}")
