# 📚 PROJECT CONTEXT: Attendance System (ระบบเช็คชื่อนักเรียนและกิจกรรม)

## 🎯 1. Project Overview (ภาพรวมของโปรเจกต์)
**Attendance System** คือเว็บแอปพลิเคชันสำหรับจัดการการเช็คชื่อนักเรียนและการเข้าร่วมกิจกรรมของโรงเรียน ถูกออกแบบมาเพื่อแก้ปัญหาความล่าช้าในการเช็คชื่อด้วยกระดาษ โดยเน้นที่ความรวดเร็ว ใช้งานง่าย (Frictionless) และมีความปลอดภัยสูง 

**หัวใจสำคัญของระบบ:** 
* **Data Isolation (100% Private):** ข้อมูลของคุณครูแต่ละท่าน (ห้องเรียน, นักเรียน, สถิติ) จะถูกแยกจากกันโดยเด็ดขาดผ่าน `session["user_id"]` ครูจะมองเห็นเฉพาะข้อมูลของตัวเองเท่านั้น
* **UX/UI Excellence:** ยึดหลักการออกแบบ UX Honeycomb (Peter Morville) ลดการเลื่อนจอ (Zero-Scroll), มี Contextual Actions, และใช้การสื่อสารด้วยภาพที่นุ่มนวล (Micro-interactions & Opacity transitions)

---

## 🛠️ 2. Technology Stack (เครื่องมือที่ใช้พัฒนา)
* **Backend Framework:** Python (Flask)
* **Database & ORM:** SQLAlchemy (รองรับ PostgreSQL/MySQL)
* **Authentication:** Flask-Session, Authlib (Google OAuth 2.0), Werkzeug (Password Hashing)
* **Frontend:** HTML5, Bootstrap 5 (CSS Framework), Custom Inline CSS, JavaScript (Vanilla DOM Manipulation)
* **Template Engine:** Jinja2
* **Security & Config:** `python-dotenv` (แยก Environment Variables ซ่อนคีย์ความลับ)

---

## ✨ 3. Core Features (ฟีเจอร์หลักของระบบ)

### 3.1 ระบบ Authentication & Authorization (การยืนยันตัวตน)
* **Admin Login:** ล็อกอินด้วย Username/Password สำหรับผู้ดูแลระบบ
* **Teacher Login (Dual Mode):**
  1. **Manual Login:** ล็อกอินด้วย รหัสครู/อีเมล และ รหัสผ่าน (สำหรับครูที่มีบัญชีเดิม)
  2. **Google OAuth 2.0:** ล็อกอินผ่านปุ่ม "Sign in with Google" 
     * *Auto-Registration:* หากเป็นครูใหม่ (อีเมลไม่เคยมีในระบบ) ระบบจะสร้างบัญชีให้ทันที (Generate รหัส `T-G-XXXXX` อัตโนมัติ) และตั้งค่า `password` เป็น `NULL`
     * *Seamless Login:* หากเป็นครูเก่า ระบบจะจับคู่อีเมลและเข้าสู่ระบบด้วยสิทธิ์เดิมทันที
* **System Logging:** มีฟังก์ชัน `write_log` บันทึกทุกกิจกรรม (เข้าสู่ระบบสำเร็จ/ล้มเหลว, สร้างห้อง, ออกจากระบบ)

### 3.2 Dashboard & UI (หน้าจอควบคุมหลัก)
* **Dynamic Data Display:** แสดงสถิติจำนวนห้องเรียน จำนวนนักเรียนที่เช็คชื่อรายวัน
* **Smart UI States:** 
  * ใช้ Jinja2 ผสม CSS ควบคุมการแสดงผล เช่น หากตัวเลขเป็น 0 จะปรับ `opacity: 0.3` เพื่อลดความรกของหน้าจอ แต่หากมีข้อมูลจะสว่างขึ้น (`opacity: 1`) พร้อม `transition` ที่นุ่มนวล
* **Action Shortcuts (URL Parameters):** 
  * ใช้ JavaScript ดักจับ URL (เช่น `?action=create`) เพื่อสั่งเปิด Bootstrap Modal (สร้างห้องเรียน) อัตโนมัติทันทีที่โหลดหน้าจอเสร็จ ช่วยลดคลิกและการเลื่อนหาปุ่มของผู้ใช้

### 3.3 Classroom Management (การจัดการห้องเรียน) - *In Progress*
* ครูสามารถสร้างห้องเรียน (กำหนดวิชา/ระดับชั้น) ผ่าน Modal ลอยตัว
* ข้อมูลห้องเรียนถูกผูกกับ `teacher_id` อย่างแน่นหนา
* **UI Component:** ปุ่มสร้างห้องเรียนถูกออกแบบให้กลมกลืน (Inline Text/Capsule) แทนปุ่มขนาดใหญ่ เพื่อให้หน้าจอ Clean และ Minimal ที่สุด

---

## 🗄️ 4. Database Schema Structure (โครงสร้างฐานข้อมูลเบื้องต้น)

### 4.1 Table: `teachers` (ข้อมูลครูผู้สอน)
* `id` (Integer, Primary Key)
* `teacher_id` (String(20), Unique, Not Null) - รหัสประจำตัวครู (เช่น T-001, T-G-12345)
* `email` (String(120), Unique, Not Null)
* `password` (String(255), Nullable=True) - ยอมรับค่า NULL สำหรับ Google Auth
* `full_name` (String(100), Not Null)
* `department` (String(100)) - กลุ่มสาระการเรียนรู้
* `role` (String(20), Default='teacher')
* `last_login`, `created_at` (DateTime)

### 4.2 Table: `admins` (ข้อมูลผู้ดูแลระบบ)
* `id_admin` (String, Unique)
* `username` (String)
* `password` (String - Hashed)

### 4.3 Table: `classrooms` (ห้องเรียน - *แผนการพัฒนา*)
* `id` (Integer, Primary Key)
* `teacher_id` (Integer, ForeignKey('teachers.id'))
* `class_name` (String)
* `subject_name` (String)

---

## 🔒 5. Security & Best Practices (ความปลอดภัยและมาตรฐาน)
1. **Secret Management:** จัดเก็บ `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` และ `SECRET_KEY` ไว้ในไฟล์ `.env` ห้าม Hardcode ลงใน Source Code เด็ดขาด
2. **Password Validation:** ระบบเช็ค `if not self.password: return False` ในโมเดล Teacher เพื่อป้องกันช่องโหว่จากบัญชี Google ที่ไม่มีรหัสผ่าน
3. **Route Protection:** ทุก Route ที่เป็น Dashboard หรือจัดการข้อมูล ต้องมีการเช็ค `session.get("user_id")` เสมอ

---

## 🤖 6. Instruction for AI Assistants (คำแนะนำสำหรับ AI ที่อ่านไฟล์นี้)
* **Tone & Persona:** เมื่อสนทนากับผู้ใช้ (เดฟเจ้าของโปรเจกต์) ให้ใช้ภาษาที่เป็นกันเอง กระตือรือร้น ให้กำลังใจ (เช่น ใช้คำว่า "นาย", "คุณน้า", ลงท้าย "555")
* **Code Generation:** ทุกครั้งที่เขียนโค้ด ให้คำนึงถึงเรื่อง **UX/UI ที่นุ่มนวล (Transitions, Hover effects)** และ **ลดจำนวนการคลิก (Frictionless)** เป็นหลัก
* **Data Privacy:** หากต้องเขียน Query ฐานข้อมูลเกี่ยวกับห้องเรียนหรือนักเรียน **ต้องแนบฟิลเตอร์ `.filter_by(teacher_id=session["user_id"])` เสมอ**