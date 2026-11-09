"use client";

interface Props {
  onPrint?: () => void;
  backHref?: string;
}

function PrinterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5M12 5l-7 7 7 7" />
    </svg>
  );
}

export default function PrintActions({ onPrint, backHref = "/progress" }: Props) {
  return (
    <div className="print:hidden sticky bottom-16 lg:bottom-0 z-20 bg-surface/95 backdrop-blur-md border-t border-border">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <a
          href={backHref}
          className="flex items-center gap-2 text-sm font-medium text-text-muted hover:text-text transition-colors px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/8"
        >
          <ArrowLeftIcon />
          <span className="hidden sm:inline">กลับ</span>
        </a>

        <p className="text-xs text-text-muted hidden sm:block">
          ใช้ Chrome หรือ Safari เพื่อผลลัพธ์ที่ดีที่สุด
        </p>

        <button
          type="button"
          onClick={onPrint}
          disabled={!onPrint}
          className="disabled:opacity-50 flex items-center gap-2 bg-primary text-white font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-primary/90 transition-all active:scale-[0.98] shadow-sm shadow-primary/20"
        >
          <PrinterIcon />
          พิมพ์ / บันทึก PDF
        </button>
      </div>
    </div>
  );
}
