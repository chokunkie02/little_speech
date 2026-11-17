import Link from "next/link";
import { Mic } from "lucide-react";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { ButtonLink } from "@/components/ui";

function Brand({ small = false }: { small?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2 rounded-control">
      <span aria-hidden="true" className={`flex shrink-0 items-center justify-center rounded-control bg-primary text-primary-foreground ${small ? "h-6 w-6" : "h-8 w-8"}`}>
        <Mic size={small ? 12 : 16} strokeWidth={2.5} />
      </span>
      <span className={`font-bold text-text ${small ? "text-sm" : "text-sm sm:text-base"}`}>Speech Adventure</span>
    </Link>
  );
}

/** Header for public pages (landing, demo): no app shell, just brand, theme and sign-in. */
export function PublicHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/90 backdrop-blur-md">
      <nav aria-label="เมนูหลัก" className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:px-6">
        <Brand />
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <ButtonLink href="/auth/signin" variant="ghost" size="sm">เข้าสู่ระบบ</ButtonLink>
          <ButtonLink href="/auth/signup" size="sm" className="max-sm:hidden">สมัครใช้งาน</ButtonLink>
        </div>
      </nav>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-border bg-surface py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
        <div className="space-y-1 text-center sm:text-left">
          <Brand small />
          <p className="text-caption text-text-muted">ระบบฝึกพูดสำหรับเด็กไทย · ต้นแบบเพื่อการศึกษา 2569</p>
        </div>
        <nav aria-label="ลิงก์ท้ายหน้า" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm">
          <Link href="/demo" className="text-text-muted hover:text-text">ดูตัวอย่างระบบ</Link>
          <Link href="/join" className="text-text-muted hover:text-text">ใช้รหัสเข้าร่วม</Link>
          <Link href="/register-school" className="text-text-muted hover:text-text">สมัครสำหรับโรงเรียน</Link>
          <Link href="/privacy" className="text-text-muted hover:text-text">นโยบายความเป็นส่วนตัว</Link>
          <Link href="/terms" className="text-text-muted hover:text-text">ข้อตกลงการใช้งาน</Link>
        </nav>
      </div>
    </footer>
  );
}
