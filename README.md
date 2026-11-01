# 🏫 Attendance System

### ระบบเช็คชื่อนักเรียน จัดการสถิติการเข้าเรียน และบริหารจัดการข้อมูลผู้สอน

[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-Framework-000000?style=for-the-badge&logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-ORM-D71F00?style=for-the-badge&logo=sqlalchemy&logoColor=white)](https://www.sqlalchemy.org/)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-5-7952B3?style=for-the-badge&logo=bootstrap&logoColor=white)](https://getbootstrap.com/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

เว็บแอปพลิเคชันที่พัฒนาด้วย Python Flask เพื่อช่วยให้ครูจัดการข้อมูลนักเรียน รายวิชา และห้องเรียน บันทึกการเข้าเรียน ติดตามสถิติ และส่งออกรายงานได้สะดวกยิ่งขึ้น

---

## 📌 ภาพรวมโครงการ

**Attendance System** เป็นเว็บแอปพลิเคชันสำหรับสนับสนุนงานด้านการเรียนการสอน โดยเน้นการจัดการข้อมูลการเข้าเรียนและการติดตามสถิติของนักเรียน

ระบบแบ่งการใช้งานตามบทบาทของผู้ใช้ ได้แก่ **Admin** และ **Teacher** พร้อมรองรับการเข้าสู่ระบบผ่าน Google สำหรับบัญชีครูที่ลงทะเบียนไว้ในระบบแล้ว

### 🎯 เป้าหมายของระบบ

- ช่วยให้ครูตรวจสอบและบันทึกการเข้าเรียนได้สะดวก
- จัดการข้อมูลนักเรียน รายวิชา และห้องเรียน
- สรุปสถิติการมาเรียน สาย ลา และขาดเรียน
- แสดงข้อมูลผ่าน Dashboard กราฟ และตาราง
- ส่งออกรายงานเพื่อนำไปใช้งานต่อ
- จัดการข้อมูลโปรไฟล์ครูตามสิทธิ์ที่กำหนด

---

## ✨ คุณสมบัติหลัก

### 1. 📊 ระบบเช็คชื่อและสถิติการเข้าเรียน

- บันทึกสถานะการเข้าเรียน ได้แก่ มาเรียน สาย ลา และขาดเรียน
- แสดงข้อมูลการเข้าเรียนผ่านตารางและกราฟ
- ดูสถิติรายบุคคลและภาพรวมของห้องเรียน
- คำนวณเปอร์เซ็นต์การเข้าเรียนของนักเรียน
- ตรวจสอบข้อมูลการเข้าเรียนย้อนหลัง

### 2. 📸 Student Snapshot

ระบบบันทึกรายชื่อนักเรียน ณ เวลาที่สร้างคาบเรียน เพื่อเก็บข้อมูลสมาชิกของห้องเรียนในแต่ละครั้ง

ช่วยป้องกันปัญหาเมื่อนักเรียนถูกเพิ่ม เปลี่ยนแปลงข้อมูล หรือย้ายห้องเรียนในภายหลัง แล้วส่งผลต่อรายชื่อของคาบเรียนที่ผ่านมา

### 3. 🏫 จัดการข้อมูลห้องเรียนและรายวิชา

- แสดงข้อมูลรายวิชา รหัสวิชา ห้องเรียน และครูผู้สอน
- จัดการข้อมูลตามสิทธิ์ของผู้ใช้
- รองรับการแก้ไขข้อมูลที่เกี่ยวข้อง
- มีกล่องยืนยันก่อนดำเนินการที่สำคัญ
- แจ้งผลการดำเนินการผ่าน SweetAlert2

### 4. 👤 จัดการโปรไฟล์ครู

- ดูและแก้ไขข้อมูลโปรไฟล์
- จัดการชื่อ นามสกุล แผนก และข้อมูลโรงเรียน
- ตรวจสอบอีเมลซ้ำก่อนบันทึก
- รองรับการล็อกช่องอีเมลสำหรับ Session ที่เข้าสู่ระบบผ่าน Google

### 5. 🔐 ระบบเข้าสู่ระบบ

- Admin Login
- Teacher Login
- Google OAuth 2.0 / OpenID Connect
- แยกสิทธิ์การใช้งานตาม Role
- จัดการ Flask Session หลังเข้าสู่ระบบและออกจากระบบ
- รองรับการเข้าสู่ระบบ Google สำหรับบัญชีครูที่มีอยู่ในฐานข้อมูลเท่านั้น

ระบบตรวจสอบสถานะอีเมลที่ยืนยันแล้วจาก Google ก่อนดำเนินการจับคู่กับบัญชีครูในฐานข้อมูล

### 6. 📄 ระบบส่งออกรายงาน

รองรับการส่งออกข้อมูล 3 รูปแบบ

| รูปแบบ | การใช้งาน |
|---|---|
| PDF | อ่าน พิมพ์ และจัดเก็บเป็นเอกสาร |
| Excel (.xlsx) | เปิด ตรวจสอบ และจัดการข้อมูลใน Spreadsheet |
| CSV (.csv) | นำข้อมูลไปประมวลผลต่อ |

---

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)

### ⚙️ Backend & Database

[![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Flask-SQLAlchemy](https://img.shields.io/badge/Flask--SQLAlchemy-ORM-D71F00?style=for-the-badge&logo=flask&logoColor=white)](https://flask-sqlalchemy.palletsprojects.com/)
[![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-ORM-D71F00?style=for-the-badge&logo=sqlalchemy&logoColor=white)](https://www.sqlalchemy.org/)

### 🎨 Frontend & UI

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Jinja2](https://img.shields.io/badge/Jinja2-Templates-B41717?style=for-the-badge)](https://jinja.palletsprojects.com/)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-7952B3?style=for-the-badge&logo=bootstrap&logoColor=white)](https://getbootstrap.com/)
[![Bootstrap Icons](https://img.shields.io/badge/Bootstrap_Icons-7952B3?style=for-the-badge&logo=bootstrap&logoColor=white)](https://icons.getbootstrap.com/)
[![SweetAlert2](https://img.shields.io/badge/SweetAlert2-Alert-8A2BE2?style=for-the-badge)](https://sweetalert2.github.io/)
[![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?style=for-the-badge&logo=chartdotjs&logoColor=white)](https://www.chartjs.org/)

### 🔐 Authentication & Data Processing

[![Werkzeug](https://img.shields.io/badge/Werkzeug-Security-333333?style=for-the-badge)](https://werkzeug.palletsprojects.com/)
[![Authlib](https://img.shields.io/badge/Authlib-OAuth-4B32C3?style=for-the-badge)](https://authlib.org/)
[![Google OAuth](https://img.shields.io/badge/Google_OAuth-2.0-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://developers.google.com/identity/protocols/oauth2)
[![Pandas](https://img.shields.io/badge/Pandas-150458?style=for-the-badge&logo=pandas&logoColor=white)](https://pandas.pydata.org/)
[![NumPy](https://img.shields.io/badge/NumPy-013243?style=for-the-badge&logo=numpy&logoColor=white)](https://numpy.org/)

### 🔄 Real-time Communication

[![Flask-SocketIO](https://img.shields.io/badge/Flask--SocketIO-Real--time-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://flask-socketio.readthedocs.io/)

### 📄 Report Formats

[![PDF](https://img.shields.io/badge/PDF-Report-B30B00?style=for-the-badge)](https://www.adobe.com/acrobat/about-adobe-pdf.html)
[![Excel](https://img.shields.io/badge/Excel-.xlsx-217346?style=for-the-badge&logo=microsoftexcel&logoColor=white)](https://www.microsoft.com/microsoft-365/excel)
[![CSV](https://img.shields.io/badge/CSV-Data_Format-3572A5?style=for-the-badge)](https://en.wikipedia.org/wiki/Comma-separated_values)

---

## 📁 โครงสร้างโปรเจกต์

```text
Attendance_System/
│
├── models/                     # Database Models
│   ├── __init__.py
│   ├── admin.py
│   ├── attendance.py
│   ├── class_session.py
│   ├── logs.py
│   ├── session_student.py
│   ├── students.py
│   └── teachers.py
│
├── routes/                     # Flask Routes / Blueprints
│   ├── admin.py
│   ├── check_in.py
│   ├── class_session.py
│   ├── dashboard.py
│   ├── data_student.py
│   ├── login.py
│   ├── logs_status.py
│   ├── stat_dashboard.py
│   ├── stat_summary.py
│   └── teacher.py
│
├── static/
│   ├── css/                    # Stylesheets
│   ├── js/                     # JavaScript
│   └── images/                 # Images and Icons
│
├── templates/                  # Jinja2 Templates
│   ├── components/
│   ├── errors/
│   ├── pdf/
│   └── ...
│
├── .gitignore
├── app.py                      # Flask Application
├── database.py                 # SQLAlchemy Instance
├── PROJECT.md                  # Project Information
├── requirements.txt            # Python Dependencies
├── run_dev.ps1                 # Development Startup Script
└── README.md
```

---

## 💻 การติดตั้งและเริ่มต้นใช้งาน

### 1. ดาวน์โหลดโปรเจกต์

เปิด PowerShell แล้วใช้คำสั่ง

```powershell
git clone https://github.com/BazK006/Attendance-System.git

cd Attendance-System
```

### 2. สร้าง Virtual Environment

```powershell
python -m venv .venv
```

เปิดใช้งาน Virtual Environment

```powershell
.\.venv\Scripts\Activate.ps1
```

### 3. ติดตั้ง Dependencies

```powershell
python -m pip install --upgrade pip

pip install -r requirements.txt
```

### 4. ตั้งค่าฐานข้อมูล

ระบบใช้ PostgreSQL เป็นฐานข้อมูลหลัก

- ติดตั้งและเตรียม PostgreSQL ให้พร้อมใช้งาน
- สร้างฐานข้อมูลสำหรับ Attendance System
- ตั้งค่าการเชื่อมต่อฐานข้อมูลให้ตรงกับ Configuration ที่กำหนดไว้ในโปรเจกต์
- ตรวจสอบสิทธิ์ของ Database User ก่อนเริ่มระบบ

**หมายเหตุ:** อย่าเผยแพร่ Database Password หรือ Connection String ที่มีข้อมูลรับรองลง GitHub

### 5. ตั้งค่า Environment Variables

สร้างไฟล์ `.env` ในโฟลเดอร์หลักของโปรเจกต์

ตัวอย่างการกำหนดค่า

```dotenv
# Flask
SECRET_KEY=your-secret-key

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://127.0.0.1:5000/login/google/callback

# Cookie Settings
SESSION_COOKIE_SECURE=false
```

| ตัวแปร | หน้าที่ |
|---|---|
| `SECRET_KEY` | ใช้สำหรับ Flask Session และการลงนามข้อมูล |
| `GOOGLE_CLIENT_ID` | ระบุ OAuth Client ของ Google |
| `GOOGLE_CLIENT_SECRET` | Secret สำหรับ Google OAuth |
| `GOOGLE_REDIRECT_URI` | URL สำหรับรับ Callback หลัง Google Login |
| `SESSION_COOKIE_SECURE` | กำหนดให้ Cookie ส่งผ่าน HTTPS เท่านั้นเมื่อเปิดใช้งาน |

**ข้อควรระวัง**
- สร้าง `SECRET_KEY` ใหม่ที่คาดเดายาก
- เก็บ `GOOGLE_CLIENT_SECRET` เป็นความลับ
- ค่าในตัวอย่างเป็น Placeholder ไม่ใช่ Credentials สำหรับใช้งานจริง
- ตรวจสอบให้ชื่อตัวแปรตรงกับที่แอปอ่านจาก Environment
- ห้าม Commit ไฟล์ `.env` ลง GitHub

### 6. เริ่มต้นระบบ

**วิธีที่ 1: ใช้ Development Script**

```powershell
.\run_dev.ps1
```

**วิธีที่ 2: เรียก Flask โดยตรง**

```powershell
python app.py
```

เมื่อเซิร์ฟเวอร์เริ่มทำงานแล้ว เปิดเบราว์เซอร์ที่

```text
http://127.0.0.1:5000
```

> การเริ่มต้นระบบครั้งแรกอาจต้องเตรียม Database Schema และบัญชี Admin ตามขั้นตอนที่ผู้ดูแลโครงการกำหนด

---

## 🌐 การตั้งค่า Google Login

ระบบใช้ **Google OAuth 2.0 / OpenID Connect** ร่วมกับ Authlib เพื่อให้ครูสามารถเข้าสู่ระบบด้วยบัญชี Google ที่มีอยู่ในระบบ

### ขั้นตอนการตั้งค่า

1. เปิด [Google Cloud Console](https://console.cloud.google.com/)
2. เลือก Google Cloud Project ของ Attendance System
3. เข้าเมนู Google Auth Platform
4. สร้างหรือเลือก OAuth Client ประเภท Web Application
5. กำหนด Authorized JavaScript origins
6. กำหนด Authorized redirect URIs
7. นำ Client ID และ Client Secret มาใส่ใน `.env`

### ตัวอย่าง Redirect URI

สำหรับ Local Development

```text
http://127.0.0.1:5000/login/google/callback
```

เมื่อ Deploy ระบบแล้ว ต้องเพิ่ม Domain และ Redirect URI ของ Production ให้ตรงกับ URL จริง รวมถึงปรับค่าใน Environment Variables ด้วย

### พฤติกรรมการเข้าสู่ระบบ

- รับข้อมูลผู้ใช้จาก Google ผ่าน OpenID Connect
- ตรวจสอบว่าอีเมลได้รับการยืนยันแล้ว
- ค้นหาบัญชีครูที่มีอีเมลตรงกันในฐานข้อมูล
- ไม่อนุญาตให้บัญชี Google ที่ยังไม่ได้ลงทะเบียนเป็นครูเข้าสู่ระบบ
- สร้าง Flask Session หลังยืนยันตัวตนสำเร็จ

**เอกสารเพิ่มเติม:** [Google Identity – OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect)

---

## 📐 หลักการคำนวณสถิติ

ระบบนับการมาเรียนและการมาสายเป็นการเข้าเรียน

### สูตรคำนวณเปอร์เซ็นต์การเข้าเรียน

```text
(Present + Late) / Eligible Sessions × 100
```

โดย `Eligible Sessions` คือจำนวนคาบที่นักเรียนมีรายชื่ออยู่ในห้องเรียนของคาบนั้น

### ตัวอย่าง

- มาเรียน 8 ครั้ง
- มาสาย 1 ครั้ง
- มีรายชื่อและสิทธิ์เข้าเรียนทั้งหมด 10 คาบ

```text
(8 + 1) / 10 × 100 = 90%
```

การลาและการขาดเรียนจะไม่ถูกนับเป็นการเข้าเรียน

การใช้จำนวน Eligible Sessions ช่วยให้การคำนวณสอดคล้องกับช่วงเวลาที่นักเรียนมีรายชื่ออยู่ในห้องเรียนจริง เช่น นักเรียนที่เพิ่งเข้ามาอยู่ในห้องภายหลังจะไม่ถูกนำไปหารด้วยคาบที่ยังไม่มีรายชื่อ

---

## 📤 การส่งออกรายงาน

### 📕 PDF

สำหรับอ่าน พิมพ์ และจัดเก็บรายงานในรูปแบบเอกสาร โดยรูปแบบการแสดงผลขึ้นอยู่กับ Template และเครื่องมือที่ใช้สร้าง PDF

### 📗 Excel (.xlsx)

สำหรับเปิด ตรวจสอบ และนำข้อมูลไปจัดการต่อใน Spreadsheet

### 📄 CSV (.csv)

สำหรับนำข้อมูลไปประมวลผลต่อในโปรแกรมหรือเครื่องมืออื่น รองรับ UTF-8 BOM เพื่อช่วยให้ Microsoft Excel แสดงข้อความภาษาไทยได้ถูกต้องในสภาพแวดล้อมที่เกี่ยวข้อง

---

## 🔐 ความปลอดภัย

ระบบมีแนวทางจัดการความปลอดภัยเบื้องต้น ได้แก่

- ใช้ Password Hash สำหรับจัดเก็บรหัสผ่าน
- แยกสิทธิ์การใช้งานระหว่าง Admin และ Teacher
- ใช้ Flask Session สำหรับจัดการสถานะผู้ใช้
- ใช้ Google OAuth สำหรับยืนยันตัวตน
- เก็บค่าความลับไว้ใน Environment Variables
- ไม่เผยแพร่ไฟล์ `.env` และ Credentials ลง GitHub
- ตรวจสอบสิทธิ์ฝั่ง Server ก่อนเข้าถึงหรือแก้ไขข้อมูล
- ควรใช้ HTTPS เมื่อ Deploy ใน Production
- สำรองฐานข้อมูลก่อนแก้ไขโครงสร้างหรือลบข้อมูล

---

## 🔀 Development Workflow

โครงการใช้ Git และ GitHub ในการจัดการ Source Code โดยแยก Branch สำหรับพัฒนาและ Branch หลัก

| Branch | วัตถุประสงค์ |
|---|---|
| `main` | เก็บโค้ดหลักที่พร้อมใช้งาน |
| `dev_baz_work` | ใช้พัฒนา แก้ไข และทดลองฟีเจอร์ |

เมื่อพัฒนาฟีเจอร์หรือแก้ไขโค้ดเรียบร้อยแล้ว จะใช้ **Pull Request** เพื่อตรวจสอบและรวมการเปลี่ยนแปลงกลับเข้าสู่ `main`

แนวทางนี้ช่วยให้การพัฒนาเป็นระเบียบ และลดผลกระทบต่อโค้ดหลักของระบบ

---

## ⚠️ หมายเหตุ

- โปรเจกต์นี้อยู่ระหว่างการพัฒนาและปรับปรุง
- การใช้งานบางส่วนอาจต้องตั้งค่าฐานข้อมูลและ Google OAuth ก่อน
- การสร้างรายงาน PDF อาจต้องติดตั้งเครื่องมือเพิ่มเติมตามไลบรารีที่ใช้งานจริง
- ควรสำรองฐานข้อมูลก่อนการแก้ไขโครงสร้างหรือลบข้อมูล
- ไม่ควรนำข้อมูลนักเรียนจริงหรือ Credentials ไปเผยแพร่ใน Repository
- การใช้งานใน Production ควรตรวจสอบความปลอดภัยและการตั้งค่าระบบก่อนเปิดให้บริการ

---

## 🚀 แนวทางพัฒนาต่อ

- ปรับปรุง Dashboard และการแสดงผลสถิติ
- เพิ่มระบบแจ้งเตือนและติดตามการเข้าเรียน
- พัฒนาระบบกู้คืนรหัสผ่าน
- ปรับปรุงการจัดการสิทธิ์และความปลอดภัย
- รองรับการใช้งานในสภาพแวดล้อม Production

---

**Attendance System**

*Developed with Dev Baz ❤️*