import type { ReactNode } from "react";
import { FileWarning } from "lucide-react";
import { PublicFooter, PublicHeader } from "./PublicChrome";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg">
      <PublicHeader />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 sm:py-12">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-text">{title}</h1>
          <p className="text-sm text-text-muted">ปรับปรุงล่าสุด {updated}</p>
        </header>
        <p className="flex gap-3 rounded-card border border-warning/40 bg-warning-soft p-4 text-sm text-warning-text">
          <FileWarning size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
          ฉบับร่างสำหรับต้นแบบเพื่อการศึกษา ต้องให้ผู้รับผิดชอบด้านข้อมูลส่วนบุคคลตรวจทานก่อนเปิดใช้งานจริง
        </p>
        <article className="space-y-6 text-text [&_h2]:text-section-title [&_h2]:text-text [&_li]:ml-5 [&_li]:list-disc [&_p]:leading-relaxed [&_p]:text-text-muted [&_section]:space-y-2 [&_ul]:space-y-1 [&_ul]:text-text-muted">
          {children}
        </article>
      </main>
      <PublicFooter />
    </div>
  );
}
