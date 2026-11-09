/** HowItWorksSection — 4-step flow: เลือก → ฝึก → AI ประเมิน → ติดตาม */

const steps = [
  {
    num: "01",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4l3 3" />
      </svg>
    ),
    title: "เลือกเสียงเป้าหมาย",
    desc: "เลือกพยัญชนะที่ต้องการฝึก เช่น ก, ข, ง ระบบจะสร้างเส้นทางการฝึกที่เหมาะสมกับเด็กแต่ละคน",
    accent: "text-level-pretest bg-level-pretest/10 border-level-pretest/20",
    connector: true,
  },
  {
    num: "02",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect width="16" height="20" x="4" y="2" rx="2" />
        <line x1="8" x2="16" y1="6" y2="6" />
        <line x1="8" x2="16" y1="10" y2="10" />
        <line x1="8" x2="12" y1="14" y2="14" />
      </svg>
    ),
    title: "ฝึกผ่านกิจกรรม",
    desc: "ผ่าน 7 ระดับตั้งแต่ Oral Motor จนถึง Sentence Practice พร้อมตัวอย่างเสียงและกิจกรรมที่หลากหลาย",
    accent: "text-level-sound-fam bg-level-sound-fam/10 border-level-sound-fam/20",
    connector: true,
  },
  {
    num: "03",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" x2="12" y1="19" y2="22" />
      </svg>
    ),
    title: "อัดเสียงและฟังทบทวน",
    desc: "เด็กลองพูดตามตัวอย่าง แล้วเปิดฟังเสียงที่อัดเพื่อทบทวนพร้อมผู้ใหญ่",
    accent: "text-primary bg-primary/10 border-primary/20",
    connector: true,
  },
  {
    num: "04",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="18" x2="18" y1="20" y2="10" />
        <line x1="12" x2="12" y1="20" y2="4" />
        <line x1="6" x2="6" y1="20" y2="14" />
      </svg>
    ),
    title: "ติดตามพัฒนาการ",
    desc: "ผู้ปกครองและครูดูรายงานความก้าวหน้า และสรุปกิจกรรมที่ทำในแต่ละรอบ",
    accent: "text-success bg-success/10 border-success/20",
    connector: false,
  },
];

export default function HowItWorksSection() {
  return (
    <section className="mt-14 sm:mt-18" aria-labelledby="how-it-works-heading">
      {/* Section header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-primary/8 border border-primary/15 rounded-full px-4 py-1.5 mb-4 text-sm font-medium text-primary">
          วิธีการทำงาน
        </div>
        <h2 id="how-it-works-heading" className="text-2xl md:text-3xl font-bold text-text mb-3">
          ง่าย เป็นระบบ และสนุก
        </h2>
        <p className="text-text-muted max-w-md mx-auto leading-relaxed">
          4 ขั้นตอนที่ออกแบบมาเพื่อให้เด็กและผู้ปกครองเริ่มต้นได้ทันที
        </p>
      </div>

      {/* Steps */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
        {/* Connector line (desktop only) */}
        <div className="hidden lg:block absolute top-10 left-[calc(12.5%+20px)] right-[calc(12.5%+20px)] h-px bg-gradient-to-r from-transparent via-border to-transparent" aria-hidden="true" />

        {steps.map((step) => (
          <div key={step.num} className="relative bg-surface border border-border rounded-2xl p-6 card-3d group">
            {/* Step number badge */}
            <div className="absolute -top-3 right-4 text-xs font-bold text-text-muted bg-bg border border-border rounded-full px-2 py-0.5">
              {step.num}
            </div>

            {/* Icon */}
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 border ${step.accent} group-hover:scale-110 transition-transform`}>
              {step.icon}
            </div>

            <h3 className="font-semibold text-text mb-2 leading-snug">{step.title}</h3>
            <p className="text-sm text-text-muted leading-relaxed">{step.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
