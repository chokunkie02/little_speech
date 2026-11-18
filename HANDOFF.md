# ส่งต่องาน Speech Adventure

งานศูนย์ประเมินการเรียนรู้ของบรานช์ `sky` อธิบายไว้ใน [คู่มือระบบประเมินและแผนงาน](docs/assessment-handoff.md) ครอบคลุมวิธีเปิดใน Docker ตั้ง OpenAI หรือ Azure ขอบเขตเกณฑ์ สิทธิ์ API การทดสอบ และจุดที่ต้องดูตอนรวมกับงานของโชกุน

เปิดหน้าแอดมินที่ `/platform/assessment` ด้วยบัญชี platform admin แล้วตั้งร่าง ทดลองคะแนน และเผยแพร่ ห้องฝึกใช้ทางเข้าปกติ `/training` ผลประเมินปรากฏในความก้าวหน้าและรายงานตามเด็กที่เลือก

สมัคร Azure ไม่สำเร็จ ทีมจึงเปลี่ยนบริการตรวจเสียงเป็น OpenAI (ค่าเริ่มต้น `ASSESSMENT_SPEECH_PROVIDER=openai`) ตัวเชื่อมทำเสร็จแล้วและรอ API key จากพี่บาส ใส่คีย์ใน `ASSESSMENT_OPENAI_API_KEY` ของ `.env.local` แล้วรัน `npm run assessment:check-openai` ค่าเริ่มต้นปิด AI ไว้ ข้อเลือกตอบและผลของผู้ใหญ่ใช้กับฐานทดสอบในเครื่องได้ การประเมินเสียงจริงต้องตั้งค่าตามคู่มือและทดสอบก่อนนำเสนอ

เอกสารเว็บเดิมของโชกุนอยู่ใน [Board update handoff](docs/board-update-handoff.md) ส่วนภาพ UI ฐานเดิมอยู่ใน [Design Board](docs/design/README.md)
