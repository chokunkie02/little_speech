import Link from "next/link";
import AssessmentAdmin from "@/components/assessment/AssessmentAdmin";

export const metadata = { title: "ศูนย์ประเมินการเรียนรู้ | Speech Adventure" };
export default function AssessmentAdminPage() {
  return (
    <main className="min-h-screen bg-bg text-text">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <strong className="text-primary">
            Speech Adventure · แอดมินระบบ
          </strong>
          <Link href="/platform" className="text-sm text-primary underline">
            กลับภาพรวมระบบ
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <AssessmentAdmin />
      </div>
    </main>
  );
}
