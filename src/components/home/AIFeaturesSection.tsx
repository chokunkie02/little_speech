/** AIFeaturesSection — Highlight AI-assisted features without overclaiming */

const aiFeatures = [
  {
    key: "recording",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" x2="12" y1="19" y2="22" />
      </svg>
    ),
    title: "บันทึกเสียงทุกครั้ง",
    desc: "เก็บประวัติการบันทึกเสียงของเด็กทุกครั้งที่ฝึก สามารถย้อนฟังเปรียบเทียบพัฒนาการได้",
    tag: "พร้อมใช้งาน",
    tagStyle: "text-success bg-success/10 border-success/20",
  },
  {
    key: "evaluation",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
        <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
        <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
      </svg>
    ),
    title: "AI ช่วยประเมินผล",
    desc: "ระบบประเมินให้คะแนนและ Feedback หลังการบันทึกเสียงแต่ละครั้ง เพื่อแนะนำทิศทางการพัฒนา",
    tag: "Mock Evaluation",
    tagStyle: "text-info bg-info/10 border-info/20",
  },
  {
    key: "analytics",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="18" x2="18" y1="20" y2="10" />
        <line x1="12" x2="12" y1="20" y2="4" />
        <line x1="6" x2="6" y1="20" y2="14" />
      </svg>
    ),
    title: "วิเคราะห์ความก้าวหน้า",
    desc: "Dashboard แสดงสถิติการฝึก คะแนนเฉลี่ย จำนวนครั้งที่ฝึก และแนวโน้มพัฒนาการของเด็ก",
    tag: "พร้อมใช้งาน",
    tagStyle: "text-success bg-success/10 border-success/20",
  },
  {
    key: "personalized",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
    title: "ปรับเนื้อหาให้เหมาะสม",
    desc: "เส้นทางการฝึกปรับตามเสียงเป้าหมายของเด็กแต่ละคน ไม่ใช่หลักสูตรแบบ One-size-fits-all",
    tag: "พร้อมใช้งาน",
    tagStyle: "text-success bg-success/10 border-success/20",
  },
];

/** Horizontal metric bar mock */
function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-text-muted">{label}</span>
        <span className="text-xs font-semibold text-text">{value}%</span>
      </div>
      <div className="h-2 bg-border rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

/** Mini evaluation result mock */
function MockEvalCard() {
  return (
    <div className="bg-surface border border-border rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-text">ผลการประเมิน AI</p>
          <p className="text-xs text-text-muted">เสียง ก · คำว่า &quot;กา&quot;</p>
        </div>
        <div className="w-12 h-12 rounded-full bg-success/10 border-2 border-success flex items-center justify-center">
          <span className="text-base font-bold text-success">88</span>
        </div>
      </div>

      {/* Metrics */}
      <div className="px-5 py-4 space-y-3">
        <ScoreBar label="ความชัดเจน" value={88} color="bg-success" />
        <ScoreBar label="ความถูกต้อง" value={75} color="bg-primary" />
        <ScoreBar label="ความสม่ำเสมอ" value={92} color="bg-level-sound-fam" />
      </div>

      {/* Feedback */}
      <div className="px-5 pb-4">
        <div className="bg-primary/5 border border-primary/15 rounded-xl px-3 py-2.5">
          <p className="text-xs text-primary font-medium mb-0.5">คำแนะนำ</p>
          <p className="text-xs text-text-muted leading-relaxed">
            เสียง ก ดีขึ้นมาก! ลองฝึกให้ปลายลิ้นแตะเพดานปากให้ชัดขึ้นอีกนิด
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AIFeaturesSection() {
  return (
    <section className="mt-24 relative" aria-labelledby="ai-features-heading">
      {/* Background depth blob */}
      <div className="absolute -top-12 right-0 w-64 h-64 rounded-full bg-primary/6 blur-[60px] pointer-events-none" aria-hidden="true" />
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-primary/8 border border-primary/15 rounded-full px-4 py-1.5 mb-4 text-sm font-medium text-primary">
          AI-Assisted Learning
        </div>
        <h2 id="ai-features-heading" className="text-2xl md:text-3xl font-bold text-text mb-3">
          เทคโนโลยีที่ช่วยให้การฝึกมีประสิทธิภาพ
        </h2>
        <p className="text-text-muted max-w-md mx-auto leading-relaxed">
          ผสานเทคโนโลยี AI เข้ากับหลักสูตรที่ได้รับแรงบันดาลใจจากการบำบัดการพูด
        </p>
      </div>

      {/* Two-column: features list + mock eval card */}
      <div className="grid lg:grid-cols-2 gap-10 items-center">
        {/* Feature list */}
        <div className="grid sm:grid-cols-2 gap-4">
          {aiFeatures.map((f) => (
            <div
              key={f.key}
              className="bg-surface border border-border rounded-2xl p-5 card-3d group"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/8 border border-primary/15 flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
                {f.icon}
              </div>
              <h3 className="font-semibold text-text mb-1.5 text-sm leading-snug">{f.title}</h3>
              <p className="text-xs text-text-muted leading-relaxed mb-3">{f.desc}</p>
              <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full border ${f.tagStyle}`}>
                {f.tag}
              </span>
            </div>
          ))}
        </div>

        {/* Mock evaluation card */}
        <div className="flex justify-center lg:justify-end">
          <div className="w-full max-w-sm">
            <div className="dashboard-3d relative">
              {/* Glow under card */}
              <div className="absolute inset-x-6 -bottom-3 h-10 bg-primary/15 blur-2xl rounded-full -z-10" aria-hidden="true" />
              <MockEvalCard />
            </div>
            {/* Prototype notice */}
            <p className="text-xs text-text-muted text-center mt-4 leading-relaxed">
              * ปัจจุบันใช้ Mock Evaluation · Real AI Speech Analysis อยู่ในแผนพัฒนา
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
