window.BOARD_DATA = {
  "commit": "9b33d857111903728e2217fd0a3a299bf766924c",
  "groups": [
    {
      "id": "start",
      "title": "01 · เริ่มใช้งาน",
      "description": "หน้าแนะนำ เข้าสู่ระบบ สมัคร และเส้นทางทดลอง"
    },
    {
      "id": "platform",
      "title": "02 · แอดมินระบบ",
      "description": "สร้างโรงเรียนและเชิญผู้ดูแลคนแรก แล้วดูข้อมูลการใช้งาน"
    },
    {
      "id": "school",
      "title": "03 · โรงเรียนและครู",
      "description": "จัดห้อง ส่งคำเชิญครู เพิ่มนักเรียน และค้นข้อมูลตามสิทธิ์"
    },
    {
      "id": "family",
      "title": "04 · เชื่อมผู้ปกครอง",
      "description": "เปิดใช้บัญชี รับคำเชิญ เลือกเด็ก และจัดการผู้ปกครองร่วม"
    },
    {
      "id": "practice",
      "title": "05 · ฝึกและเรียน",
      "description": "แผนวันนี้ เลือกชุดฝึก เปิดกิจกรรม เล่นและบันทึกรอบ"
    },
    {
      "id": "reports",
      "title": "06 · ติดตามผลและตั้งค่า",
      "description": "มุมมองครู ผู้ปกครอง และผู้ดูแลโรงเรียน"
    }
  ],
  "frames": [
    {
      "id": "01",
      "title": "หน้าแรก",
      "route": "/",
      "group": "start",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "01"
      ]
    },
    {
      "id": "02",
      "title": "เข้าสู่ระบบ",
      "route": "/auth/signin",
      "group": "start",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "02",
        "57",
        "64",
        "67"
      ]
    },
    {
      "id": "57",
      "title": "เข้าสู่ระบบ · ตัวเลือกบทบาทอัตโนมัติ",
      "route": "/auth/signin",
      "group": "start",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "57"
      ]
    },
    {
      "id": "67",
      "title": "ทางเข้าใช้บัญชีครั้งแรกจากหน้าเข้าสู่ระบบ",
      "route": "/auth/signin",
      "group": "start",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "67"
      ]
    },
    {
      "id": "03",
      "title": "สมัครสมาชิก",
      "route": "/auth/signup",
      "group": "start",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "03"
      ]
    },
    {
      "id": "04",
      "title": "เริ่มโหมดทดลอง",
      "route": "/onboarding",
      "group": "start",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "04"
      ]
    },
    {
      "id": "onboarding-name",
      "title": "โหมดทดลอง · ตั้งค่าผู้เรียน",
      "route": "/onboarding",
      "group": "start",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "59",
        "69"
      ]
    },
    {
      "id": "onboarding-edit",
      "title": "แก้ไขข้อมูลเด็กในโหมดทดลอง",
      "route": "/profile",
      "group": "start",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "42"
      ]
    },
    {
      "id": "59",
      "title": "กล่องเพิ่มเด็กในโหมดทดลอง",
      "route": "/profile",
      "group": "start",
      "size": "1440 × 960",
      "note": "ทดสอบ Tab อยู่ในกล่องและ Esc คืนโฟกัส",
      "checks": [
        "59"
      ]
    },
    {
      "id": "58",
      "title": "เมนูมือถือเปิดและปิดด้วย Escape",
      "route": "/dashboard",
      "group": "start",
      "size": "390 × 800",
      "note": "",
      "checks": [
        "58"
      ]
    },
    {
      "id": "alias-in",
      "title": "เส้นทางเข้าสู่ระบบเดิม",
      "route": "/auth/signin",
      "group": "start",
      "size": "1440 × 960",
      "note": "เส้นทาง /sign-in เปิดหน้าปลายทางนี้",
      "checks": []
    },
    {
      "id": "alias-up",
      "title": "เส้นทางสมัครสมาชิกเดิม",
      "route": "/auth/signup",
      "group": "start",
      "size": "1440 × 960",
      "note": "เส้นทาง /sign-up เปิดหน้าปลายทางนี้",
      "checks": []
    },
    {
      "id": "invite-invalid",
      "title": "ตรวจลิงก์คำเชิญ",
      "route": "/invite/invalid",
      "group": "start",
      "size": "1440 × 960",
      "note": "",
      "checks": []
    },
    {
      "id": "61",
      "title": "กรอกลิงก์คำเชิญผิดรูปแบบ",
      "route": "/settings#invitations",
      "group": "start",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "50",
        "61"
      ]
    },
    {
      "id": "43",
      "title": "Showcase จากทางเข้าทดลอง",
      "route": "/demo",
      "group": "start",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "43"
      ]
    },
    {
      "id": "05",
      "title": "แอดมินระบบ · รายการโรงเรียน",
      "route": "/platform",
      "group": "platform",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "05"
      ]
    },
    {
      "id": "06",
      "title": "เพิ่มโรงเรียนและอีเมลผู้ดูแลคนแรก",
      "route": "/platform",
      "group": "platform",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "06",
        "83"
      ]
    },
    {
      "id": "83",
      "title": "โฟกัสคีย์บอร์ดในฟอร์มเพิ่มโรงเรียน",
      "route": "/platform",
      "group": "platform",
      "size": "1440 × 960",
      "note": "ตรวจ Tab และ Shift+Tab แล้วกลับมาที่ช่องชื่อโรงเรียน",
      "checks": [
        "83"
      ]
    },
    {
      "id": "07",
      "title": "รายละเอียดโรงเรียนและสถานะเชิญผู้ดูแล",
      "route": "/platform",
      "group": "platform",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "07"
      ]
    },
    {
      "id": "75",
      "title": "ค้นโรงเรียนตามชื่อ",
      "route": "/platform",
      "group": "platform",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "75"
      ]
    },
    {
      "id": "52",
      "title": "ค้นใหม่และเคลียร์รายละเอียดเดิม",
      "route": "/platform",
      "group": "platform",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "52"
      ]
    },
    {
      "id": "51",
      "title": "จอแคบ · เปิดรายละเอียดโรงเรียน",
      "route": "/platform",
      "group": "platform",
      "size": "390 × 800",
      "note": "",
      "checks": [
        "51",
        "58"
      ]
    },
    {
      "id": "11",
      "title": "คำเชิญผู้ดูแลโรงเรียน",
      "route": "/invite/school-admin",
      "group": "platform",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "11"
      ]
    },
    {
      "id": "08",
      "title": "พฤติกรรมการใช้งานจากฐานทดสอบ",
      "route": "/platform",
      "group": "platform",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "08",
        "56"
      ]
    },
    {
      "id": "53",
      "title": "จำตัวกรอง 30 วันเมื่อสลับแท็บ",
      "route": "/platform",
      "group": "platform",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "08",
        "53",
        "56"
      ]
    },
    {
      "id": "55",
      "title": "กำลังอัปเดตโดยคงกราฟเดิม",
      "route": "/platform",
      "group": "platform",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "08",
        "55"
      ]
    },
    {
      "id": "56",
      "title": "เวลาไม่ถึงนาทีและสองช่วงเวลาที่เสมอกัน",
      "route": "/platform",
      "group": "platform",
      "size": "1440 × 960",
      "note": "ป้อนผลสรุปจำลองให้ UI เพื่อให้เห็น 15 วินาทีและช่วงเปิดเว็บที่เสมอกัน",
      "checks": [
        "56"
      ]
    },
    {
      "id": "09",
      "title": "ตัวอย่างรายงานการฝึก · ข้อมูลสมมุติ",
      "route": "/platform",
      "group": "platform",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "09"
      ]
    },
    {
      "id": "10",
      "title": "ตารางเปรียบเทียบโรงเรียนตัวอย่าง",
      "route": "/platform",
      "group": "platform",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "10",
        "54"
      ]
    },
    {
      "id": "54",
      "title": "เลื่อนตารางเปรียบเทียบแนวนอน",
      "route": "/platform",
      "group": "platform",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "10",
        "54"
      ]
    },
    {
      "id": "school-overview",
      "title": "ผู้ดูแลโรงเรียน · ภาพรวมและห้องเรียน",
      "route": "/school",
      "group": "school",
      "size": "1440 × 960",
      "note": "",
      "checks": []
    },
    {
      "id": "12",
      "title": "เพิ่มห้องเรียน",
      "route": "/school",
      "group": "school",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "12"
      ]
    },
    {
      "id": "13",
      "title": "ส่งคำเชิญครูและดูสถานะ",
      "route": "/school",
      "group": "school",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "13"
      ]
    },
    {
      "id": "14",
      "title": "คำเชิญครู",
      "route": "/invite/school-teacher",
      "group": "school",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "13",
        "14"
      ]
    },
    {
      "id": "15",
      "title": "จัดครูและนักเรียนในห้อง",
      "route": "/school",
      "group": "school",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "13",
        "15",
        "82"
      ]
    },
    {
      "id": "82",
      "title": "โฟกัสอยู่ในกล่องจัดการห้อง",
      "route": "/school",
      "group": "school",
      "size": "1440 × 960",
      "note": "ทดสอบ Tab อยู่ในกล่อง และปิดด้วย Esc",
      "checks": [
        "82"
      ]
    },
    {
      "id": "65",
      "title": "ผู้ดูแลโรงเรียน · เตรียมบัญชีผู้ปกครอง",
      "route": "/school",
      "group": "school",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "65",
        "66",
        "76",
        "77"
      ]
    },
    {
      "id": "setup-confirm",
      "title": "โรงเรียนเตรียมบัญชีและออกรหัสสำเร็จ",
      "route": "/school",
      "group": "school",
      "size": "1440 × 960",
      "note": "ปิดบังรหัสเปิดใช้ของบัญชีสมมุติ",
      "checks": []
    },
    {
      "id": "77",
      "title": "อีเมลนี้ใช้กับบทบาทอื่น",
      "route": "/school",
      "group": "school",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "65",
        "77"
      ]
    },
    {
      "id": "81",
      "title": "ผลค้นหานักเรียนและทางเปิดห้องหรือรายงาน",
      "route": "/school",
      "group": "school",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "48",
        "75",
        "81"
      ]
    },
    {
      "id": "16",
      "title": "ครู · เพิ่มนักเรียนในห้อง",
      "route": "/teacher",
      "group": "school",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "16",
        "69"
      ]
    },
    {
      "id": "70",
      "title": "ค้นนักเรียนตามรหัส",
      "route": "/teacher",
      "group": "school",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "70"
      ]
    },
    {
      "id": "17",
      "title": "ส่งคำเชิญผู้ปกครองเข้ากล่องข้อความ",
      "route": "/teacher",
      "group": "school",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "17",
        "71",
        "76",
        "77"
      ]
    },
    {
      "id": "71",
      "title": "ส่งคำเชิญก่อนบัญชีผู้ปกครองเปิดใช้",
      "route": "/teacher",
      "group": "school",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "71"
      ]
    },
    {
      "id": "74",
      "title": "สถานะคำเชิญที่ครูติดตามและยกเลิกได้",
      "route": "/teacher",
      "group": "school",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "17",
        "20",
        "71",
        "74"
      ]
    },
    {
      "id": "66",
      "title": "เปิดใช้บัญชีผู้ปกครองครั้งแรก",
      "route": "/auth/activate",
      "group": "family",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "65",
        "66",
        "67",
        "76"
      ]
    },
    {
      "id": "68",
      "title": "ผู้ปกครองใหม่ · ยังไม่มีเด็กเชื่อม",
      "route": "/dashboard",
      "group": "family",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "68",
        "78"
      ]
    },
    {
      "id": "78",
      "title": "ผู้ปกครอง · กำลังโหลดข้อมูลเด็ก",
      "route": "/dashboard",
      "group": "family",
      "size": "1440 × 960",
      "note": "หน่วงคำขออ่านสิทธิ์ในเบราว์เซอร์ทดสอบ",
      "checks": [
        "78"
      ]
    },
    {
      "id": "children-error",
      "title": "ผู้ปกครอง · โหลดสิทธิ์ผิดพลาดและลองอีกครั้งได้",
      "route": "/dashboard",
      "group": "family",
      "size": "1440 × 960",
      "note": "จำลองคำขออ่านสิทธิ์ล้มเหลว",
      "checks": [
        "78"
      ]
    },
    {
      "id": "72",
      "title": "เมนูกล่องข้อความของผู้ปกครอง",
      "route": "/dashboard",
      "group": "family",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "72"
      ]
    },
    {
      "id": "79",
      "title": "กล่องข้อความ · รายการที่ต้องทำก่อนประวัติ",
      "route": "/inbox",
      "group": "family",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "19",
        "72",
        "79",
        "80"
      ]
    },
    {
      "id": "80",
      "title": "กำลังตรวจคำเชิญล่าสุด",
      "route": "/inbox",
      "group": "family",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "80"
      ]
    },
    {
      "id": "19",
      "title": "คำเชิญใหม่กำลังรอผู้ปกครองตอบรับ",
      "route": "/inbox",
      "group": "family",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "19"
      ]
    },
    {
      "id": "18",
      "title": "ผู้ปกครอง · ระบุความสัมพันธ์",
      "route": "/inbox",
      "group": "family",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "18",
        "19",
        "73",
        "76",
        "79"
      ]
    },
    {
      "id": "21",
      "title": "ตอบรับแล้วและเปิดข้อมูลลูก",
      "route": "/inbox",
      "group": "family",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "21",
        "66",
        "73",
        "76",
        "79"
      ]
    },
    {
      "id": "22",
      "title": "ข้อมูลลูกที่เชื่อมกับโรงเรียน",
      "route": "/profile",
      "group": "family",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "21",
        "22",
        "26",
        "42",
        "69",
        "73"
      ]
    },
    {
      "id": "42",
      "title": "ข้อมูลจากโรงเรียนและสิทธิ์แก้ไข",
      "route": "/profile",
      "group": "family",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "22",
        "42",
        "59"
      ]
    },
    {
      "id": "23",
      "title": "ข้อมูลลูก · ส่วนผู้ปกครองร่วม",
      "route": "/profile",
      "group": "family",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "23"
      ]
    },
    {
      "id": "24",
      "title": "ผู้ปกครองร่วม · เปิดคำเชิญและระบุความสัมพันธ์",
      "route": "/inbox",
      "group": "family",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "24",
        "76"
      ]
    },
    {
      "id": "25",
      "title": "ผู้ปกครองร่วม · ตอบรับแล้ว",
      "route": "/inbox",
      "group": "family",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "24",
        "25",
        "76"
      ]
    },
    {
      "id": "26",
      "title": "ผู้ปกครองร่วมเปิดข้อมูลนักเรียนคนเดียวกัน",
      "route": "/profile",
      "group": "family",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "26",
        "76"
      ]
    },
    {
      "id": "49",
      "title": "จัดการผู้ปกครองร่วมของเด็กที่เลือก",
      "route": "/profile",
      "group": "family",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "23",
        "26",
        "49"
      ]
    },
    {
      "id": "27",
      "title": "หน้าหลักผู้ปกครอง · เลือกเด็กและเริ่มฝึก",
      "route": "/dashboard",
      "group": "family",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "27",
        "72",
        "78"
      ]
    },
    {
      "id": "60",
      "title": "ตัวเลือกเด็กและการใช้คีย์บอร์ด",
      "route": "/dashboard",
      "group": "family",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "58",
        "60"
      ]
    },
    {
      "id": "76",
      "title": "เปิดใช้บัญชี รับคำเชิญ และเปิดข้อมูลลูกสำเร็จ",
      "route": "/profile",
      "group": "family",
      "size": "1440 × 960",
      "note": "ทดสอบครบตั้งแต่ออกรหัส ส่งคำเชิญ เปิดใช้บัญชี และเชื่อมเด็กใน Docker",
      "checks": [
        "76"
      ]
    },
    {
      "id": "legacy-invite",
      "title": "คำขอแบบเดิมจากลิงก์",
      "route": "/invite/accept",
      "group": "family",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "20",
        "61"
      ]
    },
    {
      "id": "legacy-review",
      "title": "คำขอจากลิงก์เดิม · รออนุมัติ",
      "route": "/invite/accept",
      "group": "family",
      "size": "1440 × 960",
      "note": "",
      "checks": []
    },
    {
      "id": "20",
      "title": "ครูเห็นคำขอเดิมแยกจากคำเชิญใหม่",
      "route": "/teacher",
      "group": "family",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "20"
      ]
    },
    {
      "id": "28",
      "title": "ฝึกและเรียน · แผนวันนี้",
      "route": "/training#home",
      "group": "practice",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "28",
        "64"
      ]
    },
    {
      "id": "29",
      "title": "การ์ดฝึกตามแผนวันนี้",
      "route": "/training#home",
      "group": "practice",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "28",
        "29"
      ]
    },
    {
      "id": "30",
      "title": "จัดชุดฝึก · ฝึกออกเสียง",
      "route": "/training#plan",
      "group": "practice",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "30"
      ]
    },
    {
      "id": "plan-save",
      "title": "บันทึกและดูเส้นทาง · ท้ายฟอร์มจัดชุดฝึก",
      "route": "/training#plan",
      "group": "practice",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "30"
      ]
    },
    {
      "id": "31",
      "title": "จัดชุดฝึก · เรียนเสียงไทย",
      "route": "/training#plan",
      "group": "practice",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "31"
      ]
    },
    {
      "id": "32",
      "title": "เส้นทางของฉัน",
      "route": "/training#path",
      "group": "practice",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "32"
      ]
    },
    {
      "id": "33",
      "title": "คลังกิจกรรมในห้องฝึก",
      "route": "/training#library",
      "group": "practice",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "33"
      ]
    },
    {
      "id": "34",
      "title": "ดูตัวอย่างกิจกรรมท่าปากก่อนเริ่ม",
      "route": "/training#library",
      "group": "practice",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "34"
      ]
    },
    {
      "id": "listening",
      "title": "ฝึกฟังและเลือกภาพ",
      "route": "/training#practice",
      "group": "practice",
      "size": "1440 × 960",
      "note": "",
      "checks": []
    },
    {
      "id": "35",
      "title": "ท่าปาก คำตัวอย่าง และไมค์บนจอคอม",
      "route": "/training#practice",
      "group": "practice",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "34",
        "35",
        "36",
        "84"
      ]
    },
    {
      "id": "36",
      "title": "ฟังเสียงที่อัดและบันทึกการลองทำ",
      "route": "/training#practice",
      "group": "practice",
      "size": "1440 × 960",
      "note": "ใช้สัญญาณไมโครโฟนจำลองของเบราว์เซอร์ทดสอบ",
      "checks": [
        "35",
        "36"
      ]
    },
    {
      "id": "84",
      "title": "จอแคบ · ไมค์และคำสั่งมาก่อนภาพปาก",
      "route": "/training#practice",
      "group": "practice",
      "size": "390 × 800",
      "note": "",
      "checks": [
        "35",
        "84"
      ]
    },
    {
      "id": "37",
      "title": "สรุปรอบฝึกที่ทำจบ",
      "route": "/training#summary",
      "group": "practice",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "37"
      ]
    },
    {
      "id": "38",
      "title": "ผลรอบที่บันทึกบนเครื่อง",
      "route": "/training#progress",
      "group": "practice",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "37",
        "38"
      ]
    },
    {
      "id": "39",
      "title": "คู่มือห้องฝึก",
      "route": "/training#guide",
      "group": "practice",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "39"
      ]
    },
    {
      "id": "40",
      "title": "คลังเนื้อหาตามขั้น",
      "route": "/library",
      "group": "practice",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "40"
      ]
    },
    {
      "id": "41",
      "title": "รางวัล",
      "route": "/rewards",
      "group": "practice",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "41"
      ]
    },
    {
      "id": "redirect-learning",
      "title": "เส้นทาง /learning ไปยังห้องฝึก",
      "route": "/training",
      "group": "practice",
      "size": "1440 × 960",
      "note": "",
      "checks": []
    },
    {
      "id": "legacy-stage",
      "title": "ทางเข้า Pre-test เดิม · เปิดเส้นทางฝึกปัจจุบัน",
      "route": "/training#path",
      "group": "practice",
      "size": "1440 × 960",
      "note": "",
      "checks": []
    },
    {
      "id": "legacy-phonics",
      "title": "ทางเข้าบทเรียนเดิม · เปิดเส้นทางฝึกปัจจุบัน",
      "route": "/training#path",
      "group": "practice",
      "size": "1440 × 960",
      "note": "",
      "checks": []
    },
    {
      "id": "44",
      "title": "ครู · ผลฝึกและประวัติเดิม",
      "route": "/progress",
      "group": "reports",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "44"
      ]
    },
    {
      "id": "45",
      "title": "ข้อสังเกตส่วนตัวและข้อที่แชร์",
      "route": "/progress",
      "group": "reports",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "45"
      ]
    },
    {
      "id": "46",
      "title": "ผู้ปกครอง · ความก้าวหน้าและผลที่ซิงก์",
      "route": "/progress",
      "group": "reports",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "46"
      ]
    },
    {
      "id": "47",
      "title": "ผู้ปกครอง · รายงานและตัวกรองวันที่",
      "route": "/report",
      "group": "reports",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "47",
        "48",
        "62",
        "63"
      ]
    },
    {
      "id": "62",
      "title": "เปลี่ยนช่วงวันที่และรอแสดงรายงาน",
      "route": "/report",
      "group": "reports",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "62",
        "63"
      ]
    },
    {
      "id": "63",
      "title": "รายงานโหลดผิดพลาดและคงหัวรายงาน",
      "route": "/report",
      "group": "reports",
      "size": "1440 × 960",
      "note": "จำลองคำขอรายงานล้มเหลวในเบราว์เซอร์ทดสอบ",
      "checks": [
        "63"
      ]
    },
    {
      "id": "48",
      "title": "รายงานนักเรียน · สิทธิ์ผู้ดูแลโรงเรียน",
      "route": "/report",
      "group": "reports",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "48",
        "81"
      ]
    },
    {
      "id": "50",
      "title": "ตั้งค่าบัญชีผู้ปกครอง",
      "route": "/settings",
      "group": "reports",
      "size": "1440 × 960",
      "note": "",
      "checks": [
        "50",
        "61"
      ]
    }
  ],
  "palettes": {
    "โหมดสว่าง": [
      {
        "name": "หลัก",
        "hex": "#5548D4"
      },
      {
        "name": "รอง",
        "hex": "#FFB347"
      },
      {
        "name": "สำเร็จ",
        "hex": "#4CAF82"
      },
      {
        "name": "ผิดพลาด",
        "hex": "#B42335"
      },
      {
        "name": "ข้อมูล",
        "hex": "#5BC0EB"
      },
      {
        "name": "พื้นหน้า",
        "hex": "#F8FAFC"
      },
      {
        "name": "พื้นการ์ด",
        "hex": "#FFFFFF"
      },
      {
        "name": "ข้อความ",
        "hex": "#1E293B"
      },
      {
        "name": "ข้อความรอง",
        "hex": "#64748B"
      },
      {
        "name": "ปิดใช้งาน",
        "hex": "#CBD5E1"
      },
      {
        "name": "เส้นขอบ",
        "hex": "#E2E8F0"
      }
    ],
    "สีประจำขั้น": [
      {
        "name": "ทดสอบก่อนเรียน",
        "hex": "#A29BFE"
      },
      {
        "name": "ท่าปาก",
        "hex": "#FD79A8"
      },
      {
        "name": "ฟังแยกเสียง",
        "hex": "#00CEC9"
      },
      {
        "name": "พยางค์",
        "hex": "#FDCB6E"
      },
      {
        "name": "คำ",
        "hex": "#E17055"
      },
      {
        "name": "ประโยค",
        "hex": "#6C5CE7"
      },
      {
        "name": "ทบทวน",
        "hex": "#A29BFE"
      }
    ],
    "สีที่เปลี่ยนในโหมดมืด": [
      {
        "name": "ผิดพลาด",
        "hex": "#FF939E"
      },
      {
        "name": "พื้นหน้า",
        "hex": "#0B1829"
      },
      {
        "name": "พื้นการ์ด",
        "hex": "#111E33"
      },
      {
        "name": "ข้อความ",
        "hex": "#E1E8F0"
      },
      {
        "name": "ข้อความรอง",
        "hex": "#7A90A8"
      },
      {
        "name": "ปิดใช้งาน",
        "hex": "#2A3F58"
      },
      {
        "name": "เส้นขอบ",
        "hex": "#1E3050"
      },
      {
        "name": "ข้อความสีหลัก",
        "hex": "#B8AEFF"
      }
    ]
  },
  "flows": [
    {
      "title": "01 · เริ่มใช้งาน",
      "note": "มีทางเข้าใช้บัญชีที่โรงเรียนเตรียม ทางสมัครบัญชี และทางทดลองแบบเก็บบนเครื่อง",
      "steps": [
        {
          "title": "เข้าเว็บไซต์",
          "text": "จากหน้าแรก เลือกเข้าสู่ระบบ สมัครสมาชิก หรือทดลอง",
          "ids": [
            "01",
            "02",
            "03",
            "04"
          ]
        },
        {
          "title": "ยืนยันบัญชี",
          "text": "ใช้บัญชีเดิม หรือเปิดใช้ครั้งแรกด้วยอีเมลและรหัสจากโรงเรียน",
          "ids": [
            "02",
            "66"
          ]
        },
        {
          "title": "เริ่มโหมดทดลอง",
          "text": "ตั้งชื่อและอายุ แล้วเลือกเป้าหมายการฝึก",
          "ids": [
            "04",
            "onboarding-name",
            "28"
          ]
        }
      ]
    },
    {
      "title": "02 · แอดมินระบบ → ผู้ดูแลโรงเรียน",
      "steps": [
        {
          "title": "สร้างโรงเรียน",
          "text": "กรอกชื่อโรงเรียนและอีเมลผู้ดูแลคนแรก",
          "ids": [
            "05",
            "06"
          ]
        },
        {
          "title": "ส่งลิงก์ให้ผู้ดูแล",
          "text": "เปิดรายละเอียดโรงเรียนและดูสถานะคำเชิญ",
          "ids": [
            "07"
          ]
        },
        {
          "title": "ผู้ดูแลตอบรับ",
          "text": "เปิดลิงก์โดยใช้บัญชีที่ตรงกับอีเมลผู้รับ",
          "ids": [
            "11"
          ]
        },
        {
          "title": "ดูข้อมูลรวม",
          "text": "ใช้แท็บข้อมูลจริงจากฐานที่รัน และตัวอย่างรายงานตามป้ายกำกับ",
          "ids": [
            "08",
            "09",
            "10"
          ]
        }
      ]
    },
    {
      "title": "03 · ผู้ดูแลโรงเรียน → ครูประจำห้อง",
      "steps": [
        {
          "title": "เพิ่มห้องเรียน",
          "text": "ตั้งชื่อห้อง ชั้น และปีการศึกษา",
          "ids": [
            "school-overview",
            "12"
          ]
        },
        {
          "title": "เชิญครู",
          "text": "กรอกอีเมล สร้างลิงก์ แล้วติดตามสถานะ",
          "ids": [
            "13"
          ]
        },
        {
          "title": "ครูตอบรับ",
          "text": "ใช้บัญชีครูที่อีเมลตรงกับคำเชิญ",
          "ids": [
            "14"
          ]
        },
        {
          "title": "จัดครูเข้าห้อง",
          "text": "เปิดจัดการห้อง เลือกครูที่ตอบรับแล้ว",
          "ids": [
            "15",
            "82"
          ]
        },
        {
          "title": "ครูเพิ่มนักเรียน",
          "text": "สร้างหรือค้นหานักเรียนในห้องของตน",
          "ids": [
            "16",
            "70"
          ]
        }
      ]
    },
    {
      "title": "04 · ครู → ผู้ปกครอง",
      "note": "คำเชิญใหม่ไปกล่องข้อความและเชื่อมทันทีเมื่อกดรับ คำขอแบบเดิมจากลิงก์ยังมีขั้นรอตรวจ",
      "steps": [
        {
          "title": "เตรียมบัญชีเมื่อจำเป็น",
          "text": "ผู้ดูแลโรงเรียนออกรหัสให้ผู้ปกครอง เปิดใช้ครั้งแรกแล้วตั้งรหัสผ่าน",
          "ids": [
            "65",
            "66",
            "77"
          ]
        },
        {
          "title": "ครูส่งคำเชิญ",
          "text": "เลือกนักเรียน กรอกอีเมลผู้ปกครอง ส่งได้ก่อนเปิดบัญชี",
          "ids": [
            "17",
            "74"
          ]
        },
        {
          "title": "ผู้ปกครองเปิดกล่องข้อความ",
          "text": "รายการที่ต้องตอบอยู่ก่อนประวัติ บัญชีที่ยังไม่เชื่อมเด็กเข้า Inbox และตั้งค่าได้",
          "ids": [
            "68",
            "72",
            "79"
          ]
        },
        {
          "title": "ยืนยันความสัมพันธ์",
          "text": "เลือกคำเชิญ กรอกความสัมพันธ์ แล้วกดตอบรับ",
          "ids": [
            "18",
            "21"
          ]
        },
        {
          "title": "เปิดข้อมูลลูก",
          "text": "เลือกนักเรียนที่เชื่อมแล้วหรือชวนผู้ปกครองร่วม",
          "ids": [
            "22",
            "23",
            "49"
          ]
        }
      ]
    },
    {
      "title": "05 · ผู้ปกครองร่วม",
      "steps": [
        {
          "title": "ส่งคำเชิญร่วม",
          "text": "ผู้ปกครองที่เชื่อมแล้วเปิดหน้าข้อมูลลูกและกรอกอีเมลผู้ดูแลอีกคน",
          "ids": [
            "23",
            "49"
          ]
        },
        {
          "title": "ผู้รับเปิดบัญชีตัวเอง",
          "text": "เปิดคำเชิญจาก Inbox และระบุความสัมพันธ์",
          "ids": [
            "24"
          ]
        },
        {
          "title": "เด็กคนเดิม ผู้ดูแลเพิ่ม",
          "text": "กดตอบรับแล้วเปิดข้อมูลเด็กคนเดียวกันจากอีกบัญชี",
          "ids": [
            "25",
            "26"
          ]
        }
      ]
    },
    {
      "title": "06 · ฝึก → บันทึก → รายงาน",
      "steps": [
        {
          "title": "เลือกเด็กและเริ่มฝึก",
          "text": "เปิดหน้าหลักหรือฝึกและเรียน เลือกทำแผนวันนี้หรือจัดแผนใหม่",
          "ids": [
            "27",
            "28",
            "30",
            "31"
          ]
        },
        {
          "title": "เลือกกิจกรรม",
          "text": "จากเส้นทางหรือคลัง ดูตัวอย่างก่อนเปิดไมค์",
          "ids": [
            "32",
            "33",
            "34"
          ]
        },
        {
          "title": "ลองแล้วบันทึก",
          "text": "ข้อฟังเลือกภาพ ข้อพูดอัดและฟังกลับได้ หรือใช้โหมดไม่อัด",
          "ids": [
            "listening",
            "35",
            "36",
            "84"
          ]
        },
        {
          "title": "จบรอบ",
          "text": "ดูสรุปและผลในเครื่อง สรุปรอบที่ซิงก์สำเร็จไปหน้าความก้าวหน้าและรายงาน",
          "ids": [
            "37",
            "38",
            "46"
          ]
        },
        {
          "title": "ผู้ใหญ่ติดตามผล",
          "text": "ครูดูผลและบันทึกข้อสังเกต ผู้ปกครองเห็นรายการที่แชร์ ผู้ดูแลโรงเรียนเปิดรายงานตามสิทธิ์",
          "ids": [
            "44",
            "45",
            "47",
            "48"
          ]
        }
      ]
    }
  ],
  "coverage": [
    {
      "id": "01",
      "page": "/ · src/app/page.tsx, src/components/home/HeroSectionV2.tsx, src/components/home/HowItWorksSection.tsx",
      "description": "ส่วนบนยาวและมีตัวอย่างหลายชิ้น → เหลือตัวอย่างแบบฝึกหลักชิ้นเดียว ถ่ายหน้าแรกที่ตำแหน่งบนสุด",
      "ids": [
        "01"
      ],
      "direct": true
    },
    {
      "id": "02",
      "page": "/auth/signin · src/app/auth/signin/page.tsx",
      "description": "ฟอร์มและตัวเลือกบทบาทแยกความสำคัญไม่ชัด → กรอกอีเมลและรหัสก่อน เลือกบทบาทด้านล่างหรือใช้บทบาทอัตโนมัติ ถ่ายฟอร์มใหม่",
      "ids": [
        "02"
      ],
      "direct": true
    },
    {
      "id": "03",
      "page": "/auth/signup · src/app/auth/signup/page.tsx",
      "description": "ฟอร์มเดิมอ่านยาก → ขยายพื้นที่และจัดบทบาทกับฟอร์มให้ชัด ถ่ายหน้าสมัครพร้อมทางเข้าใช้ครั้งแรกถ้ามองเห็น",
      "ids": [
        "03"
      ],
      "direct": true
    },
    {
      "id": "04",
      "page": "/onboarding · src/app/onboarding/page.tsx",
      "description": "หน้าต้อนรับก่อนทดลองมีรายละเอียดมาก → ย่อข้อความและเน้นเริ่มต้น ถ่ายด้วยโหมดทดลอง",
      "ids": [
        "04"
      ],
      "direct": true
    },
    {
      "id": "05",
      "page": "/platform · src/app/platform/page.tsx",
      "description": "พื้นที่ขวาว่างเมื่อยังไม่เลือก → รายการโรงเรียนใช้พื้นที่เต็มและแบ่งหน้า ถ่ายสถานะก่อนเลือก",
      "ids": [
        "05"
      ],
      "direct": true
    },
    {
      "id": "06",
      "page": "/platform · src/app/platform/page.tsx",
      "description": "ฟอร์มสร้างโรงเรียนอยู่แยกจากรายละเอียด → กด เพิ่มโรงเรียน แล้วกรอกชื่อและอีเมลผู้ดูแลคนแรกในพื้นที่รายละเอียด",
      "ids": [
        "06"
      ],
      "direct": true
    },
    {
      "id": "07",
      "page": "/platform · src/app/platform/page.tsx",
      "description": "หลังสร้างต้องไล่หาส่วนเชิญ → เปิดรายละเอียดโรงเรียนใหม่เพื่อดูสถานะและคัดลอกคำเชิญผู้ดูแลคนแรก",
      "ids": [
        "07"
      ],
      "direct": true
    },
    {
      "id": "08",
      "page": "/platform · src/app/platform/PlatformUsage.tsx",
      "description": "ตัวชี้วัดจริงกับรายงานตัวอย่างแยกไม่ชัด → เข้าแท็บพฤติกรรมแล้วเลือก ข้อมูลจริง ถ่ายการ์ดบัญชีที่ใช้งาน จำนวนครั้ง เวลารวม และช่วงเวลาที่เปิด",
      "ids": [
        "08",
        "53",
        "55"
      ],
      "direct": true
    },
    {
      "id": "09",
      "page": "/platform · src/app/platform/UsageDashboard.tsx, src/app/platform/usageDemoData.ts",
      "description": "ตัวเลขตัวอย่างอาจดูเหมือนข้อมูลจริง → เลือก ตัวอย่างรายงานการฝึก และใส่ป้ายกำกับว่าเป็นข้อมูลสมมุติ",
      "ids": [
        "09"
      ],
      "direct": true
    },
    {
      "id": "10",
      "page": "/platform · src/app/platform/UsageDashboard.tsx",
      "description": "ตารางเปรียบเทียบอ่านยากเมื่อยาว → ถ่ายหัวตารางและการเลือกโรงเรียน พร้อมภาพเลื่อนแนวนอนที่ชื่อโรงเรียนยังอยู่",
      "ids": [
        "10",
        "54"
      ],
      "direct": true
    },
    {
      "id": "11",
      "page": "/invite/school-admin · src/components/school/SchoolInvitationPage.tsx",
      "description": "หน้ารับเชิญอ่านยากว่าใช้บัญชีไหน → แยกชื่อโรงเรียน บทบาท และบัญชีที่จะตอบรับ ถ่ายจากลิงก์ทดสอบของผู้ดูแล",
      "ids": [
        "11"
      ],
      "direct": true
    },
    {
      "id": "12",
      "page": "/school · src/app/school/page.tsx",
      "description": "หาฟอร์มเพิ่มห้องและข้อมูลโรงเรียนยาก → เปิดโรงเรียนแล้วกด เพิ่มห้องเรียน ถ่ายฟอร์มชื่อห้อง ชั้น และปีการศึกษา",
      "ids": [
        "12"
      ],
      "direct": true
    },
    {
      "id": "13",
      "page": "/school · src/components/school/SchoolTeacherInvitations.tsx",
      "description": "เชิญครูกับจัดครูเข้าห้องดูเหมือนขั้นเดียว → ถ่ายส่วนคำเชิญครูพร้อมอีเมลและสถานะ แยกภาพจัดเข้าห้องในข้อ 15",
      "ids": [
        "13",
        "14",
        "15"
      ],
      "direct": true
    },
    {
      "id": "14",
      "page": "/invite/school-teacher · src/components/school/SchoolInvitationPage.tsx",
      "description": "บทบาทและบัญชีผู้รับมองไม่ชัด → ถ่ายคำเชิญครูที่แสดงโรงเรียนและบัญชีตรงอีเมล",
      "ids": [
        "14"
      ],
      "direct": true
    },
    {
      "id": "15",
      "page": "/school · src/components/school/ClassroomManagementPanel.tsx",
      "description": "กล่องจัดครูมีหลายสถานะปนกัน → เปิด จัดการห้อง แล้วถ่ายรายการครูที่ตอบรับและพร้อมจัดเข้าห้อง",
      "ids": [
        "15"
      ],
      "direct": true
    },
    {
      "id": "16",
      "page": "/teacher · src/app/teacher/page.tsx, src/components/teacher/GuardianLinkSection.tsx",
      "description": "ฟอร์มสร้างเด็กกับส่วนเชิญแยกไม่ชัด → ใช้บัญชีครูประจำห้อง กด เพิ่มนักเรียน แล้วถ่ายชื่อ รหัส อายุ และชื่อเล่น",
      "ids": [
        "16"
      ],
      "direct": true
    },
    {
      "id": "17",
      "page": "/teacher · src/components/teacher/GuardianLinkSection.tsx",
      "description": "สร้างลิงก์เชิญ → เลือกเด็กแล้วกรอกอีเมลเพื่อ ส่งคำเชิญ เข้ากล่องข้อความ อัปเดตทั้งภาพและลูกศร",
      "ids": [
        "17",
        "74"
      ],
      "direct": true
    },
    {
      "id": "18",
      "page": "/inbox · src/app/inbox/page.tsx, src/app/invite/accept/page.tsx",
      "description": "ผู้ปกครองเปิดลิงก์แล้วส่งคำขอ → คำเชิญใหม่เปิดจากซองจดหมายในเว็บ ถ่ายฟอร์มระบุความสัมพันธ์",
      "ids": [
        "18"
      ],
      "direct": true
    },
    {
      "id": "19",
      "page": "/inbox · src/app/inbox/page.tsx",
      "description": "รอครูอนุมัติเป็นสถานะหลัก → คำเชิญใหม่รอผู้ปกครองกดรับ สถานะ รอตรวจคำขอ ใช้กับรายการเดิม",
      "ids": [
        "19",
        "79",
        "18"
      ],
      "direct": true
    },
    {
      "id": "20",
      "page": "/teacher · src/components/teacher/GuardianLinkSection.tsx",
      "description": "ครูอนุมัติทุกคำขอ → ครูส่งและติดตามคำเชิญใหม่ ส่วนคำขอเก่าที่ยังรอตรวจแสดงแยกเหนือฟอร์มส่ง",
      "ids": [
        "20",
        "74",
        "legacy-invite"
      ],
      "direct": true
    },
    {
      "id": "21",
      "page": "/inbox → /profile · src/app/inbox/page.tsx, src/app/profile/page.tsx",
      "description": "รอผลอนุมัติแล้วค่อยเปิดข้อมูล → กดตอบรับแล้วเชื่อมทันที ถ่าย ตอบรับแล้ว และปุ่ม เปิดข้อมูลลูก",
      "ids": [
        "21",
        "22"
      ],
      "direct": true
    },
    {
      "id": "22",
      "page": "/profile · src/app/profile/page.tsx",
      "description": "โปรไฟล์เป็นคอลัมน์แคบ → จอกว้างแสดงข้อมูลเด็กกับผู้ปกครองร่วมตามสิทธิ์ ถ่ายสถานะที่เชื่อมเด็กแล้ว",
      "ids": [
        "22",
        "42"
      ],
      "direct": true
    },
    {
      "id": "23",
      "page": "/profile#co-guardians · src/components/layout/SharedGuardianSettings.tsx",
      "description": "ฟอร์มเชิญและรายการรอตรวจปะปน → แยกคำขอเก่าที่รอตรวจออกจากส่วนส่งคำเชิญใหม่และรายการที่ส่งแล้ว",
      "ids": [
        "23",
        "49"
      ],
      "direct": true
    },
    {
      "id": "24",
      "page": "/inbox · src/app/inbox/page.tsx",
      "description": "ผู้ปกครองร่วมต้องส่งคำขอจากลิงก์ → ผู้รับเชิญเปิดกล่องข้อความของบัญชีตัวเองและกรอกความสัมพันธ์",
      "ids": [
        "24",
        "25"
      ],
      "direct": true
    },
    {
      "id": "25",
      "page": "/inbox · src/app/inbox/page.tsx",
      "description": "ผู้ปกครองร่วมรออนุมัติซ้ำ → คำเชิญใหม่เชื่อมเมื่อกดรับ ถ่ายสถานะ รอตอบรับ และ ตอบรับแล้ว",
      "ids": [
        "25"
      ],
      "direct": true
    },
    {
      "id": "26",
      "page": "/profile#co-guardians · src/components/layout/SharedGuardianSettings.tsx",
      "description": "การอนุมัติเป็นขั้นบังคับ → ตรวจรายชื่อผู้ปกครองร่วมหลังตอบรับคำเชิญใหม่ เก็บการอนุมัติไว้ในเส้นทางรองสำหรับคำขอเก่า",
      "ids": [
        "26",
        "22",
        "49"
      ],
      "direct": true
    },
    {
      "id": "27",
      "page": "/dashboard · src/app/dashboard/page.tsx",
      "description": "ปุ่มเริ่มฝึกและตัวเลือกเด็กซ้ำ → ใช้ตัวเลือกเด็กจากเมนูและมีปุ่มฝึกหลักหนึ่งจุด",
      "ids": [
        "27"
      ],
      "direct": true
    },
    {
      "id": "28",
      "page": "/training · src/features/learning-studio/LearningStudio.tsx",
      "description": "ทางเข้าและการ์ดหลายอันแข่งกัน → เปิดห้องฝึกจาก ฝึกและเรียน แล้วถ่ายหน้าภาพรวมที่เน้นแผนวันนี้",
      "ids": [
        "28",
        "29"
      ],
      "direct": true
    },
    {
      "id": "29",
      "page": "/training · src/features/learning-studio/LearningStudio.tsx",
      "description": "แผนวันนี้จมหาย → ถ่าย ฝึกตามแผนวันนี้ พร้อมเป้าหมายและปุ่มหลัก",
      "ids": [
        "29"
      ],
      "direct": true
    },
    {
      "id": "30",
      "page": "/training → จัดชุดฝึก · src/features/learning-studio/LearningStudio.tsx, src/features/learning-studio/LevelPicker.tsx",
      "description": "ปุ่มบันทึกมาก่อนกรอกจบ → อยู่ท้ายฟอร์ม บันทึกและดูเส้นทาง ถ่ายฟอร์มและท้ายหน้า",
      "ids": [
        "30",
        "plan-save"
      ],
      "direct": true
    },
    {
      "id": "31",
      "page": "/training → จัดชุดฝึกเรียนเสียงไทย · src/features/learning-studio/LearningStudio.tsx",
      "description": "โหมดเรียนเสียงไทยมองคล้ายโหมดฝึกออกเสียง → ถ่ายทางเลือกและตัวอย่างของแผนเรียนเสียงไทยแยกภาพ",
      "ids": [
        "31"
      ],
      "direct": true
    },
    {
      "id": "32",
      "page": "/training → เส้นทางของฉัน · src/features/learning-studio/LearningStudio.tsx",
      "description": "เส้นทางมองไม่ออกว่าต้องเริ่มตรงไหน → ถ่ายการ์ดช่วงที่เลือกไว้เป็นจุดเริ่ม",
      "ids": [
        "32"
      ],
      "direct": true
    },
    {
      "id": "33",
      "page": "/training → คลังกิจกรรม · src/features/learning-studio/LearningStudio.tsx",
      "description": "คำเป้าหมายกลืนกับข้อความการ์ด → ใช้ภาพที่เห็นคำเป้าหมายชัดและตัวกรองด้านบน",
      "ids": [
        "33"
      ],
      "direct": true
    },
    {
      "id": "34",
      "page": "/training → คลังกิจกรรม → เลือกกิจกรรม · src/features/learning-studio/LearningStudio.tsx",
      "description": "หน้าตัวอย่างดูแน่น → ถ่ายกล่องตัวอย่างที่เห็นชื่อ เป้าหมาย ภาพท่าปาก และ ทดลองข้อนี้",
      "ids": [
        "34",
        "35"
      ],
      "direct": true
    },
    {
      "id": "35",
      "page": "/training → ทดลองข้อนี้ → พร้อมแล้ว เริ่มเลย · src/features/learning-studio/LearningStudio.tsx, src/features/learning-studio/host-theme.css",
      "description": "สื่อสาธิตกับไมค์อยู่ห่าง → จอกว้างวางคู่กัน เห็นคำเป้าหมายและปุ่มฟังตัวอย่างกับไมค์ในภาพเดียว",
      "ids": [
        "35",
        "36",
        "84"
      ],
      "direct": true
    },
    {
      "id": "36",
      "page": "/training → อัดแล้วกดหยุด · src/features/learning-studio/LearningStudio.tsx",
      "description": "ตรวจเสียงกับขั้นถัดไปแยกไม่ชัด → ถ่ายตัวเล่นเสียง อัดใหม่ และบันทึกการลองทำ",
      "ids": [
        "36",
        "35"
      ],
      "direct": true
    },
    {
      "id": "37",
      "page": "/training → ดูสรุปรอบนี้ · src/features/learning-studio/LearningStudio.tsx",
      "description": "ตัวเลขและรายละเอียดอ่านยาก → ถ่ายยอดของรอบนี้กับปุ่มไปต่อและกลับเส้นทาง",
      "ids": [
        "37",
        "38"
      ],
      "direct": true
    },
    {
      "id": "38",
      "page": "/training → ผลการฝึก · src/features/learning-studio/LearningStudio.tsx",
      "description": "ผลในเครื่องอาจสับสนกับรายงานโรงเรียน → ถ่ายหน้าผลของเด็กที่เลือกและระบุขอบเขตข้อมูลในเครื่อง",
      "ids": [
        "38"
      ],
      "direct": true
    },
    {
      "id": "39",
      "page": "/training → คู่มือ · src/features/learning-studio/LearningStudio.tsx",
      "description": "รายละเอียดยาวเปิดทั้งหมด → แสดงขั้นหลักก่อนและพับรายละเอียดระดับ เสียง และการเก็บข้อมูล",
      "ids": [
        "39"
      ],
      "direct": true
    },
    {
      "id": "40",
      "page": "/library · src/app/library/page.tsx",
      "description": "สับสนระหว่างระดับกับขั้น → หัวหน้าคลังอธิบายว่า 4 ระดับในห้องฝึกใช้กำหนดความยาก ส่วนคลังนี้แบ่งตามขั้นเดิม",
      "ids": [
        "40"
      ],
      "direct": true
    },
    {
      "id": "41",
      "page": "/rewards · src/app/rewards/page.tsx",
      "description": "ข้อความและคำชวนทำซ้ำ → ถ่ายหน้ารางวัลฉบับย่อของเด็กที่เลือก",
      "ids": [
        "41"
      ],
      "direct": true
    },
    {
      "id": "42",
      "page": "/profile → แก้ไขข้อมูลลูก · src/app/profile/page.tsx, src/app/onboarding/page.tsx",
      "description": "ขั้นแก้ไขคล้ายสร้างใหม่ → ถ่ายฟอร์มแก้และปุ่มบันทึกจากโปรไฟล์เดิมที่บัญชีมีสิทธิ์แก้ สำหรับเด็กโรงเรียนให้ถ่ายสถานะอ่านข้อมูลตามสิทธิ์",
      "ids": [
        "42",
        "onboarding-edit",
        "22"
      ],
      "direct": true
    },
    {
      "id": "43",
      "page": "/demo · src/app/demo/page.tsx, src/components/layout/AppSidebar.tsx",
      "description": "Showcase อยู่ในแผนภาพเมนูหลัก → เอาออกจากบอร์ดเมนูด้านซ้าย หน้า Demo ที่เข้าจากทางทดลองยังอยู่",
      "ids": [
        "43"
      ],
      "direct": true
    },
    {
      "id": "44",
      "page": "/teacher → เลือกเด็ก → ดูความก้าวหน้า · src/components/speech-adventure/SchoolChildProgressView.tsx",
      "description": "ผลฝึกใหม่ปะปนกับผลเดิม → ถ่ายหน้าครูที่แสดงผลห้องฝึกใหม่ก่อนประวัติเดิม",
      "ids": [
        "44"
      ],
      "direct": true
    },
    {
      "id": "45",
      "page": "/progress?child=… → ข้อสังเกต · src/components/observations/SchoolObservations.tsx",
      "description": "สถานะบันทึกส่วนตัวกับที่แชร์มองคล้ายกัน → ถ่ายหนึ่งตัวอย่างต่อสถานะและปุ่มแชร์หรือยกเลิกแชร์",
      "ids": [
        "45"
      ],
      "direct": true
    },
    {
      "id": "46",
      "page": "/progress · src/app/progress/page.tsx, src/components/speech-adventure/SchoolChildProgressView.tsx",
      "description": "ผลห้องฝึกใหม่หาได้ยาก → เลือกเด็กแล้วถ่ายผลใหม่และประวัติเดิมตามสิทธิ์ผู้ปกครอง",
      "ids": [
        "46"
      ],
      "direct": true
    },
    {
      "id": "47",
      "page": "/report · src/app/report/page.tsx, src/components/report/SchoolProgressReportView.tsx, src/components/report/PrintActions.tsx",
      "description": "หัวรายงานและปุ่มพิมพ์ขยับตามสถานะ → ถ่ายหัวรายงาน ตัวกรองวันที่ และ พิมพ์ / บันทึก PDF",
      "ids": [
        "47"
      ],
      "direct": true
    },
    {
      "id": "48",
      "page": "/school → ห้อง → รายงานนักเรียน · src/components/school/ClassroomManagementPanel.tsx, src/components/report/SchoolProgressReportView.tsx",
      "description": "ภาพเดิมแยกบทบาทไม่ชัด → ถ่ายรายงานในบัญชีผู้ดูแลโรงเรียนโดยใช้ข้อมูลนักเรียนสมมุติ",
      "ids": [
        "48",
        "81",
        "47"
      ],
      "direct": true
    },
    {
      "id": "49",
      "page": "/profile#co-guardians · src/app/profile/page.tsx, src/components/layout/SharedGuardianSettings.tsx",
      "description": "บอร์ดใช้ภาพยังไม่ได้เลือกเด็ก → เลือกเด็กที่เชื่อมแล้วและถ่ายรายชื่อ สถานะเชิญ และทางออกจากการเชื่อม",
      "ids": [
        "49"
      ],
      "direct": true
    },
    {
      "id": "50",
      "page": "/settings · src/app/settings/page.tsx",
      "description": "ตั้งค่าปนกับงานข้อมูลลูก → ถ่ายการตั้งค่าบัญชีและตัวเลือกตามบทบาท แยกการดูแลเด็กไปหน้าข้อมูลลูก",
      "ids": [
        "50",
        "61"
      ],
      "direct": true
    },
    {
      "id": "51",
      "page": "/platform · src/app/platform/page.tsx",
      "description": "บนมือถือเลือกโรงเรียนแล้วรายละเอียดอยู่นอกจอ → เลื่อนรายละเอียดเข้าจอ ใส่ภาพมือถือประกอบหากบอร์ดมีแผง Responsive",
      "ids": [
        "51"
      ],
      "direct": true
    },
    {
      "id": "52",
      "page": "/platform · src/app/platform/page.tsx",
      "description": "ค้นใหม่แล้วยังเห็นรายละเอียดโรงเรียนเก่าที่ไม่ตรงคำค้น → แสดงรายละเอียดเฉพาะรายการที่อยู่ในผลค้นหา",
      "ids": [
        "52"
      ],
      "direct": true
    },
    {
      "id": "53",
      "page": "/platform · src/app/platform/page.tsx, src/app/platform/PlatformUsage.tsx",
      "description": "ตัวกรองรีเซ็ตเมื่อสลับแท็บ → เลือก 30 วัน สลับข้อมูลจริงกับตัวอย่าง แล้วกลับมาดูค่าที่จำไว้",
      "ids": [
        "53"
      ],
      "direct": true
    },
    {
      "id": "54",
      "page": "/platform · src/app/platform/UsageDashboard.tsx",
      "description": "คอลัมน์ท้ายหลุดพื้นที่ → ตารางเลื่อนในกรอบและตรึงชื่อโรงเรียน",
      "ids": [
        "54",
        "10"
      ],
      "direct": true
    },
    {
      "id": "55",
      "page": "/platform · src/app/platform/PlatformUsage.tsx",
      "description": "กราฟหายขณะเปลี่ยนช่วง → คงกราฟเดิมและขึ้นข้อความกำลังอัปเดต",
      "ids": [
        "55"
      ],
      "direct": true
    },
    {
      "id": "56",
      "page": "/platform · src/app/platform/PlatformUsage.tsx",
      "description": "เวลาน้อยกว่านาทีดูเป็นศูนย์และชั่วโมงสูงสุดเสมอกันอ่านไม่ชัด → แสดงวินาทีเมื่อเหมาะสมและระบุทุกช่วงที่เสมอกัน",
      "ids": [
        "56",
        "08",
        "53"
      ],
      "direct": true
    },
    {
      "id": "57",
      "page": "/auth/signin · src/app/auth/signin/page.tsx",
      "description": "เลือกบทบาทแล้วกลับอัตโนมัติไม่ได้ → ถ่ายตัวเลือกบทบาทอัตโนมัติในฟอร์ม",
      "ids": [
        "57",
        "02"
      ],
      "direct": true
    },
    {
      "id": "58",
      "page": "เมนูจอแคบ · src/components/layout/AppSidebar.tsx, src/components/layout/useOverlayFocus.ts",
      "description": "Esc ไม่ปิดเมนู → เปิดเมนู กด Esc และยืนยันว่าโฟกัสกลับปุ่มเปิด",
      "ids": [
        "58",
        "51",
        "60"
      ],
      "direct": true
    },
    {
      "id": "59",
      "page": "กล่องเพิ่มเด็กในโหมดทดลอง · src/components/layout/AddChildModal.tsx, src/components/layout/useOverlayFocus.ts",
      "description": "โฟกัสหลุดนอกกล่อง → ทดสอบ Tab ในกล่องและ Esc กลับปุ่มเดิม ระบุว่าเป็นโหมดทดลอง",
      "ids": [
        "59",
        "onboarding-name",
        "42"
      ],
      "direct": true
    },
    {
      "id": "60",
      "page": "ตัวเลือกเด็ก · src/components/layout/ChildSelector.tsx",
      "description": "เมนูเลือกเด็กพึ่งเมาส์ → ใช้ลูกศรเลือกและ Esc ปิดได้",
      "ids": [
        "60"
      ],
      "direct": true
    },
    {
      "id": "61",
      "page": "/settings#invitations · src/app/settings/page.tsx",
      "description": "ฟอร์มลิงก์เชิญเดิมสื่อข้อผิดพลาดไม่ชัด → ถ่ายช่องผิดพลาดพร้อมข้อความกำกับถ้าบอร์ดยังแสดงทางเข้าเดิม",
      "ids": [
        "61",
        "50",
        "legacy-invite"
      ],
      "direct": true
    },
    {
      "id": "62",
      "page": "/report · src/components/report/SchoolProgressReportView.tsx, src/components/report/PrintActions.tsx",
      "description": "ปุ่มกลับและพิมพ์หายเมื่อเปลี่ยนวันที่ → ปุ่มอยู่ที่เดิมและปุ่มพิมพ์รอให้ข้อมูลพร้อม",
      "ids": [
        "62",
        "47"
      ],
      "direct": true
    },
    {
      "id": "63",
      "page": "/report · src/components/report/SchoolProgressReportView.tsx",
      "description": "โหลดล้มเหลวแล้วหัวรายงานหาย → คงหัวรายงานและแสดงข้อความในพื้นที่ผล",
      "ids": [
        "63",
        "47",
        "62"
      ],
      "direct": true
    },
    {
      "id": "64",
      "page": "ปุ่มและข้อความทั่วเว็บ · src/app/globals.css",
      "description": "ตัวอักษรบนปุ่มหลักแยกจากพื้นได้ยาก → ใช้สีจากภาพเว็บล่าสุดสำหรับปุ่มและสถานะ",
      "ids": [
        "02",
        "28"
      ],
      "direct": false
    },
    {
      "id": "65",
      "page": "/school · src/components/school/SchoolGuardianTools.tsx, src/app/api/parent-activation/route.ts",
      "description": "ให้ผู้ปกครองสมัครเองอย่างเดียว → ผู้ดูแลโรงเรียนกรอกอีเมลและเตรียมบัญชีได้ ถ่ายฟอร์มโดยไม่เผยรหัสจริง",
      "ids": [
        "65",
        "77",
        "66"
      ],
      "direct": true
    },
    {
      "id": "66",
      "page": "/school → /auth/activate · src/app/api/parent-activation/route.ts, src/app/auth/activate/page.tsx",
      "description": "ขั้นเตรียมบัญชีไม่มีทางตั้งรหัสด้วยตนเอง → ส่งรหัสเปิดใช้ครั้งเดียว ผู้ปกครองตั้งรหัสผ่าน การออกรหัสใหม่ยกเลิกรหัสเดิม",
      "ids": [
        "66",
        "65",
        "21"
      ],
      "direct": true
    },
    {
      "id": "67",
      "page": "/auth/signin · src/app/auth/signin/page.tsx",
      "description": "ไม่มีทางเข้าสำหรับบัญชีที่โรงเรียนเตรียม → เพิ่ม เข้าใช้ครั้งแรก ไปหน้าเปิดใช้ ถ่ายทั้งสองหน้า",
      "ids": [
        "67",
        "02",
        "66"
      ],
      "direct": true
    },
    {
      "id": "68",
      "page": "/dashboard · src/components/layout/GuardianWorkspace.tsx, src/components/layout/AppShell.tsx",
      "description": "บัญชีใหม่เข้าแล้วไม่มีขั้นถัดไปชัดเจน → ถ่ายหน้า ยังไม่มีนักเรียนเชื่อมกับบัญชีนี้ และปุ่มเปิดกล่องข้อความ ผู้ปกครองเข้าตั้งค่าได้",
      "ids": [
        "68"
      ],
      "direct": true
    },
    {
      "id": "69",
      "page": "/teacher และ /profile · src/components/teacher/GuardianLinkSection.tsx, src/app/onboarding/page.tsx, src/app/profile/page.tsx",
      "description": "เส้นทางโรงเรียนปะปนกับการสร้างโปรไฟล์เอง → ครูสร้างเด็กโรงเรียน ผู้ปกครองรับสิทธิ์ผ่านคำเชิญ การสร้างเด็กทดลองอยู่ในโหมดไม่เข้าสู่ระบบ",
      "ids": [
        "16",
        "22",
        "onboarding-name"
      ],
      "direct": false
    },
    {
      "id": "70",
      "page": "/teacher · src/components/teacher/GuardianLinkSection.tsx",
      "description": "ต้องไล่หาเด็กในรายชื่อ → ค้นด้วยชื่อ ชื่อเล่น หรือรหัสในห้องของครู",
      "ids": [
        "70"
      ],
      "direct": true
    },
    {
      "id": "71",
      "page": "/teacher · src/components/teacher/GuardianLinkSection.tsx",
      "description": "ต้องส่ง URL ให้ผู้ปกครอง → กรอกอีเมลแล้วส่งเข้ากล่องข้อความ ส่งก่อนได้แม้ผู้รับยังไม่ได้เปิดบัญชี",
      "ids": [
        "71",
        "17",
        "74"
      ],
      "direct": true
    },
    {
      "id": "72",
      "page": "/inbox · src/app/inbox/page.tsx, src/components/layout/GuardianWorkspace.tsx",
      "description": "ไม่มีซองจดหมายสำหรับเส้นทางหลัก → ถ่ายเมนูพร้อมจำนวนและรายการที่แสดงชื่อเด็ก โรงเรียน ห้อง และผู้ส่งเมื่อมีข้อมูล",
      "ids": [
        "72",
        "79",
        "27"
      ],
      "direct": true
    },
    {
      "id": "73",
      "page": "/inbox → /profile · src/app/inbox/page.tsx, supabase/migrations/20261109000300_guardian_inbox.sql",
      "description": "กดส่งคำขอแล้วรอตรวจ → ระบุความสัมพันธ์และตอบรับเพื่อเชื่อมทันที",
      "ids": [
        "18",
        "21",
        "22"
      ],
      "direct": false
    },
    {
      "id": "74",
      "page": "/teacher · src/components/teacher/GuardianLinkSection.tsx",
      "description": "ติดตามคำเชิญแยกจากหน้าเด็ก → ดูสถานะและยกเลิกรายการที่ยังรอตอบรับจากหน้าเด็กได้",
      "ids": [
        "74"
      ],
      "direct": true
    },
    {
      "id": "75",
      "page": "/school, /platform · src/components/school/SchoolGuardianTools.tsx, src/app/platform/page.tsx",
      "description": "ค้นและกรองได้จำกัด → ผู้ดูแลค้นคนในโรงเรียนตัวเอง แอดมินระบบค้นโรงเรียนด้วยชื่อ รหัส หรืออีเมลผู้ดูแล",
      "ids": [
        "75",
        "81"
      ],
      "direct": true
    },
    {
      "id": "76",
      "page": "ทดสอบจากบัญชีสมมุติ · /school → /teacher → /auth/activate → /inbox → /profile",
      "description": "ใช้ข้อมูลสมมุติถ่ายตั้งแต่เตรียมบัญชีถึงเปิดข้อมูลลูก และใช้สองบัญชีผู้ปกครองยืนยันว่าเด็กคนเดียวมีผู้ดูแลร่วมได้",
      "ids": [
        "76",
        "65",
        "17",
        "66",
        "18",
        "21",
        "24",
        "25",
        "26"
      ],
      "direct": true
    },
    {
      "id": "77",
      "page": "/school, /teacher · src/app/api/parent-activation/route.ts, src/components/teacher/GuardianLinkSection.tsx, supabase/migrations/20261109000400_guardian_workflow_fixes.sql",
      "description": "อีเมลครูถูกแจ้งว่าใช้บัญชีเดิมได้หรือรับคำเชิญที่เปิดไม่ได้ → ทั้งเตรียมบัญชีและส่งคำเชิญแจ้งว่าอีเมลใช้บทบาทอื่น ถ่ายข้อความแจ้งเตือนจากบัญชีทดสอบ",
      "ids": [
        "77",
        "65",
        "17"
      ],
      "direct": true
    },
    {
      "id": "78",
      "page": "/dashboard · src/components/layout/GuardianWorkspace.tsx, src/components/layout/AppShell.tsx, src/lib/storage/supabase/SupabaseChildAccessRepository.ts",
      "description": "ระหว่างโหลดขึ้นว่าไม่พบเด็กทั้งที่เชื่อมอยู่ → แยกกำลังโหลด ไม่มีเด็ก และโหลดผิดพลาดพร้อมลองอีกครั้ง ถ่ายสถานะที่เหมาะกับแต่ละกรณี",
      "ids": [
        "78",
        "children-error",
        "68",
        "27"
      ],
      "direct": true
    },
    {
      "id": "79",
      "page": "/inbox · src/app/inbox/page.tsx",
      "description": "ประวัติอาจบังคำเชิญที่รอตอบ → คำเชิญที่ต้องดำเนินการขึ้นก่อนและประวัติอยู่ด้านล่าง ถ่ายสองกลุ่มในภาพเดียว",
      "ids": [
        "79",
        "18",
        "21"
      ],
      "direct": true
    },
    {
      "id": "80",
      "page": "/inbox · src/app/inbox/page.tsx, src/components/layout/GuardianWorkspace.tsx",
      "description": "กดตรวจล่าสุดแล้วกดซ้ำได้และไม่รู้ว่ากำลังโหลด → แสดง กำลังตรวจคำเชิญ… และเก็บข้อมูลเดิมเมื่ออัปเดตพลาด",
      "ids": [
        "80",
        "79"
      ],
      "direct": true
    },
    {
      "id": "81",
      "page": "/school · src/app/school/page.tsx, src/components/school/SchoolGuardianTools.tsx, supabase/migrations/20261109000400_guardian_workflow_fixes.sql",
      "description": "ผลค้นหาครูไปต่อไม่ได้ นักเรียนมีแค่รายงาน → รายการที่ผูกห้องมี เปิดห้องเรียน และรายการที่ผูกเด็กยังเปิดรายงานได้",
      "ids": [
        "81",
        "48"
      ],
      "direct": true
    },
    {
      "id": "82",
      "page": "/school · src/components/school/ClassroomManagementPanel.tsx, src/components/layout/useOverlayFocus.ts",
      "description": "กล่องจัดการห้องเปิดแล้วโฟกัสอยู่ด้านหลัง → โฟกัสอยู่ในกล่อง Tab วนในกล่อง และ Esc ปิดแล้วคืนโฟกัส",
      "ids": [
        "82",
        "15"
      ],
      "direct": true
    },
    {
      "id": "83",
      "page": "/platform · src/app/platform/page.tsx",
      "description": "เปิดฟอร์มแล้ว Tab กลับไปที่รายการ → โฟกัสที่ชื่อโรงเรียนใหม่ กดยกเลิกแล้วกลับปุ่ม เพิ่มโรงเรียน",
      "ids": [
        "83",
        "06"
      ],
      "direct": true
    },
    {
      "id": "84",
      "page": "/training · src/features/learning-studio/host-theme.css",
      "description": "แบบฝึกท่าปากบนมือถือมีปุ่มอัดเสียงใต้ขอบจอ → ย้ายส่วนคำสั่งและไมค์ขึ้นก่อนภาพสาธิตบนจอแคบ ใช้ภาพมือถือ 390 × 800 ประกอบ",
      "ids": [
        "84",
        "35"
      ],
      "direct": true
    }
  ],
  "routes": [
    {
      "route": "/",
      "id": "01"
    },
    {
      "route": "/auth/activate",
      "id": "66"
    },
    {
      "route": "/auth/signin",
      "id": "02"
    },
    {
      "route": "/auth/signup",
      "id": "03"
    },
    {
      "route": "/dashboard",
      "id": "27"
    },
    {
      "route": "/demo",
      "id": "43"
    },
    {
      "route": "/inbox",
      "id": "79"
    },
    {
      "route": "/invite/[token]",
      "id": "invite-invalid"
    },
    {
      "route": "/invite/accept",
      "id": "legacy-invite"
    },
    {
      "route": "/invite/school-admin",
      "id": "11"
    },
    {
      "route": "/invite/school-teacher",
      "id": "14"
    },
    {
      "route": "/learning",
      "id": "redirect-learning"
    },
    {
      "route": "/library",
      "id": "40"
    },
    {
      "route": "/onboarding",
      "id": "04"
    },
    {
      "route": "/platform",
      "id": "05"
    },
    {
      "route": "/profile",
      "id": "22"
    },
    {
      "route": "/progress",
      "id": "46"
    },
    {
      "route": "/report",
      "id": "47"
    },
    {
      "route": "/rewards",
      "id": "41"
    },
    {
      "route": "/school",
      "id": "school-overview"
    },
    {
      "route": "/settings",
      "id": "50"
    },
    {
      "route": "/sign-in",
      "id": "alias-in"
    },
    {
      "route": "/sign-up",
      "id": "alias-up"
    },
    {
      "route": "/teacher",
      "id": "16"
    },
    {
      "route": "/training",
      "id": "28"
    },
    {
      "route": "/training/[stage]",
      "id": "legacy-stage"
    },
    {
      "route": "/training/phonics/[unitId]/[lessonId]",
      "id": "legacy-phonics"
    }
  ],
  "font": "Kanit น้ำหนัก 400, 500, 600, 700 · สำรอง Noto Sans Thai และ sans-serif · ห้องฝึกใช้ธีมจากระบบหลัก",
  "environment": "ภาพนี้ถ่ายจาก Next.js ที่เชื่อม Supabase Auth, PostgreSQL และ Storage ผ่าน Docker ในเครื่อง ใช้ชื่อ อีเมล และข้อมูลฝึกสมมุติ ภาพสถานะช้าหรือผิดพลาดที่ระบุไว้ใช้การควบคุมคำตอบในเบราว์เซอร์ทดสอบ"
};
