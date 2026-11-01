from app import app 
from database import db
from models.admin import Admin
from werkzeug.security import generate_password_hash

def create_Admin():
    with app.app_context():
        target_id_admin = input("กรุณาใส่ id_admin (เช่น A-12345): ")
        target_username = input("กรุณาใส่ username (เช่น Admin System): ")
        raw_password = input("กรุณาใส่รหัสผ่าน (เช่น admin12345): ")

        existing = Admin.query.filter_by(id_admin=target_id_admin).first()
        if existing:
            print(f"⚠️ [แจ้งเตือน] รหัส id_admin '{target_id_admin}' มีอยู่ในฐานข้อมูลแล้วนะคุณน้า!")
            return

        hashed_password = generate_password_hash(raw_password)

        new_admin = Admin(
            id_admin=target_id_admin,
            username=target_username,
            password=hashed_password
        )

        db.session.add(new_admin)
        db.session.commit()
                
        print("============== SEED ADMIN SUCCESS! ==============")
        print(f"✅ สร้างบัญชี Admin สำเร็จ!")
        print(f"👤 id_admin (ใช้ล็อกอิน): {target_id_admin}")
        print(f"📛 username (ชื่อแสดงผล): {target_username}")
        print(f"🔑 รหัสผ่าน: {raw_password}")
        print("================================================")

def choice_menu_admin():
    while True:
        print("------ โปรดเลือกเมนูจัดการ Admin Management ------")
        print("1 = สร้างบัญชี Admin")
        print("2 = ออกจากโปรแกรม")
            
        choice = input("กรอกหมายเลขเมนู: ")
        if choice == "1":
            create_Admin()
        elif choice == "2":
            print("ออกจากโปรแกรมแล้ว!")
            break
        else:
            print("Error (Try Again!)")

if __name__ == "__main__":
    choice_menu_admin()