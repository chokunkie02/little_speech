# Speech Adventure — แอปฝึกพูดสำหรับเด็ก

เว็บแอปพลิเคชันช่วยฝึกออกเสียงภาษาสำหรับเด็ก สร้างด้วย [Next.js](https://nextjs.org) พร้อมระบบบันทึกความก้าวหน้า รางวัล และรายงานผลสำหรับนักบำบัดและผู้ปกครอง

---

## ฟีเจอร์หลัก

- **ฝึกออกเสียง** — บันทึกเสียงเด็กและประเมินผลด้วย AI แบบเรียลไทม์
- **แผนที่การฝึก** — แบ่งเป็นด่านและระดับตามหลักสูตรเสียงพูด
- **ติดตามความก้าวหน้า** — กราฟและสถิติแสดงพัฒนาการของเด็กแต่ละคน
- **ระบบรางวัล** — ป้ายรางวัล (badge) เพื่อสร้างแรงจูงใจ
- **คลังหลักสูตร** — ไลบรารีเสียงพูดพร้อมใช้งาน
- **บันทึกการสังเกต** — เพิ่ม note ระหว่าง session สำหรับนักบำบัด
- **รายงานผล** — สรุปและพิมพ์รายงานรายเซสชัน
- **นำเข้า/ส่งออกข้อมูล** — สำรองและกู้คืนข้อมูลในเครื่อง
- **โหมดสาธิต** — ทดลองใช้งานด้วยข้อมูลตัวอย่าง
- **โหมดนำเสนอ** — แสดงผลแบบเต็มจอสำหรับสาธิต

---

## เทคโนโลยีที่ใช้

| เทคโนโลยี | เวอร์ชัน |
|---|---|
| Next.js | 16.2.6 |
| React | 19.2.4 |
| TypeScript | ^5 |
| Tailwind CSS | ^4 |

---

## การติดตั้งและรันโปรเจกต์

### ข้อกำหนดเบื้องต้น

- Node.js 18 ขึ้นไป
- npm, yarn, pnpm หรือ bun

### ติดตั้ง dependencies

```bash
npm install
```

### รันเซิร์ฟเวอร์สำหรับพัฒนา

```bash
npm run dev
```

เปิดเบราว์เซอร์ที่ [http://localhost:3000](http://localhost:3000)

### Build สำหรับ production

```bash
npm run build
npm run start
```

---

## โครงสร้างโปรเจกต์

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx            # หน้าแรก (landing)
│   ├── onboarding/         # หน้าสร้างโปรไฟล์เด็ก
│   ├── training/           # หน้าฝึกออกเสียง
│   ├── progress/           # หน้าติดตามความก้าวหน้า
│   ├── rewards/            # หน้ารางวัล
│   ├── library/            # คลังหลักสูตรเสียงพูด
│   ├── report/             # หน้ารายงานผล
│   ├── demo/               # โหมดสาธิต
│   └── api/speech/         # API ประเมินเสียงพูด
├── components/             # React components
│   ├── speech-adventure/   # คอมโพเนนต์หลักของแอป
│   ├── layout/             # AppShell, Sidebar, NavBar
│   ├── observations/       # บันทึกการสังเกต
│   ├── report/             # คอมโพเนนต์รายงาน
│   └── ui/                 # UI ทั่วไป (ThemeToggle ฯลฯ)
├── hooks/                  # Custom React hooks
├── lib/                    # Business logic และ utilities
│   ├── speech-evaluation/  # ตรรกะการประเมินเสียง
│   ├── rewards/            # คำนวณรางวัล
│   ├── observations/       # จัดเก็บบันทึก
│   └── local-data/         # นำเข้า/ส่งออกข้อมูล
├── types/                  # TypeScript type definitions
└── data/                   # ข้อมูลตัวอย่าง
```

---

## คำสั่ง npm ที่ใช้บ่อย

```bash
npm run dev      # รัน development server
npm run build    # Build สำหรับ production
npm run start    # รัน production server
npm run lint     # ตรวจสอบ code style
```

---

## ข้อมูลสำหรับนักพัฒนา

- ห้องฝึกเก็บแผนและรายละเอียดรอบใน **localStorage** ส่วนบัญชี สิทธิ์เด็ก ผลสรุปรอบ และผลประเมินกลางรองรับ Supabase ตามค่าของ storage provider
- การประเมินเสียงพูดใช้ทั้ง mock evaluator และ AI API จริง (`src/app/api/speech/evaluate/`)
- รองรับ dark/light mode ผ่าน `ThemeProvider`
- รองรับทั้ง desktop sidebar และ mobile bottom navigation

---

## ศูนย์ประเมินการเรียนรู้ · POC

เปิด `/platform/assessment` ด้วยบัญชีแอดมินระบบเพื่อปรับเกณฑ์รายขั้น ทดลองคะแนนตัวอย่าง บันทึกร่าง และเผยแพร่เป็นเวอร์ชัน ห้องฝึก `/training` ใช้เกณฑ์กลางตรวจข้อเลือกตอบและเชื่อม Azure Speech สำหรับโจทย์พูดตาม ผลถูกเก็บพร้อมเวอร์ชันและผลยืนยันของผู้ใหญ่

ติดตั้ง migrations `20261116000100` และ `20261116000200` ใน Supabase ผ่าน Docker ของเครื่อง แล้วตั้ง `SUPABASE_SERVICE_ROLE_KEY` เฉพาะเซิร์ฟเวอร์ ค่าเริ่มต้นปิด AI ไว้ เมื่อมี Azure resource ให้ตั้ง `AZURE_SPEECH_KEY` กับ `AZURE_SPEECH_REGION` หรือ `AZURE_SPEECH_ENDPOINT` ตาม `.env.example` เปิดเซิร์ฟเวอร์ใหม่และเผยแพร่เกณฑ์ที่เปิด AI

- อ่าน [รายละเอียดระบบ แผนก่อนนำเสนอ และวิธีตั้งค่า](docs/assessment-handoff.md)
- อ่าน [Handoff สำหรับทีมและ AI](HANDOFF.md)
- รัน `npm run assessment:test` เพื่อตรวจตรรกะเกณฑ์ รูปแบบเสียง การอ่านผลบริการ และความเข้ากันได้กับประวัติเดิม

## ลิขสิทธิ์

โปรเจกต์นี้เป็น private repository สงวนสิทธิ์ทั้งหมด
