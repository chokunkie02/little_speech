import { BarChart3, GraduationCap, Home, KeyRound, ShieldCheck, Smartphone, Users } from "lucide-react";
import { AuthAside } from "./AuthScreen";

// Desktop brand panels for the signed-out pages. Copy stays short: it is context, not instructions.

export function SignInAside() {
  return (
    <AuthAside
      title="ฝึกพูดต่อจากที่ค้างไว้"
      description="ผลฝึก รางวัล และรายงานของลูกอยู่ในบัญชีเดียว เปิดได้ทั้งคอมและมือถือ"
      points={[
        { icon: <Home size={18} />, title: "ผู้ปกครอง", text: "ฝึกที่บ้านวันละไม่กี่นาที แล้วดูความก้าวหน้า" },
        { icon: <GraduationCap size={18} />, title: "ครู", text: "ดูผลฝึกของนักเรียนทั้งห้องและพิมพ์รายงาน" },
        { icon: <Smartphone size={18} />, title: "ใช้ได้ทุกเครื่อง", text: "เริ่มบนคอม ฝึกต่อบนมือถือได้ทันที" },
      ]}
    />
  );
}

export function SignUpAside() {
  return (
    <AuthAside
      title="สมัครครั้งเดียว ใช้ได้ทุกบทบาท"
      description="ใช้ชื่อจริงเพื่อให้ครูและโรงเรียนรู้ว่าเป็นใคร สมัครเสร็จใช้งานได้ทันที ไม่ต้องรออีเมลยืนยัน"
      points={[
        { icon: <Home size={18} />, title: "ผู้ปกครอง", text: "เพิ่มข้อมูลลูก แล้วเริ่มฝึกได้เลย" },
        { icon: <KeyRound size={18} />, title: "ได้รหัสจากโรงเรียน", text: "สมัครแล้วใส่รหัสหรือสแกน QR เพื่อเชื่อมกับห้องเรียน" },
        { icon: <ShieldCheck size={18} />, title: "ข้อมูลเป็นส่วนตัว", text: "เบอร์โทรเห็นเฉพาะคนที่อนุมัติคำขอของคุณ" },
      ]}
    />
  );
}

export function JoinAside() {
  return (
    <AuthAside
      title="เข้าร่วมด้วยรหัสหรือ QR"
      description="รหัส 8 ตัวอยู่บนใบเชิญจากครูหรือโรงเรียน"
      steps
      points={[
        { icon: null, title: "กรอกรหัสหรือสแกน QR", text: "ระบบแสดงชื่อโรงเรียนและห้องให้ตรวจก่อน" },
        { icon: null, title: "เข้าสู่ระบบหรือสมัครบัญชี", text: "ระบบจำรหัสไว้ให้ ไม่ต้องกรอกใหม่" },
        { icon: null, title: "ยืนยันและรอการอนุมัติ", text: "ครูหรือผู้ดูแลอนุมัติแล้วแจ้งในกล่องข้อความ" },
      ]}
    />
  );
}

export function RegisterSchoolAside({ steps }: { steps: string[] }) {
  return (
    <AuthAside
      title="ลงทะเบียนโรงเรียน"
      description="ใช้เวลาประมาณ 3 นาที ทีมงานตรวจภายใน 1–2 วันทำการ"
      steps
      points={steps.map((title) => ({ icon: null, title }))}
      footnote={
        <span className="flex items-center gap-2">
          <Users size={16} aria-hidden="true" />
          อนุมัติแล้วเพิ่มครูด้วยรหัสโรงเรียน ไม่ต้องพิมพ์อีเมลทีละคน
        </span>
      }
    />
  );
}

export function PasswordAside() {
  return (
    <AuthAside
      title="ตั้งรหัสผ่านใหม่"
      steps
      points={[
        { icon: null, title: "กรอกอีเมลที่ใช้สมัคร" },
        { icon: null, title: "กดลิงก์ในอีเมล", text: "ลิงก์ใช้ได้ครั้งเดียว" },
        { icon: null, title: "ตั้งรหัสผ่านใหม่ แล้วเข้าสู่ระบบ" },
      ]}
      footnote={
        <span className="flex items-center gap-2">
          <BarChart3 size={16} aria-hidden="true" />
          ผลการฝึกทั้งหมดยังอยู่ครบ
        </span>
      }
    />
  );
}
