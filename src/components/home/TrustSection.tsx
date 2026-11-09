/** TrustSection — "Designed for Thai Children" trust & credibility signals */

const trustPoints = [
  {
    key: "thai",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" x2="22" y1="12" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
    title: "ออกแบบสำหรับเด็กไทยโดยเฉพาะ",
    desc: "เนื้อหา คำศัพท์ และระบบการฝึกทั้งหมดโฟกัสที่พยัญชนะภาษาไทย ไม่ใช่ระบบต่างประเทศที่นำมาปรับ",
  },
  {
    key: "structured",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    title: "หลักสูตรแบบก้าวหน้าอย่างเป็นระบบ",
    desc: "เลือกกิจกรรมให้เหมาะกับความพร้อม ตั้งแต่เตรียมท่าปากจนถึงฝึกพูดเป็นประโยค",
  },
  {
    key: "research",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
        <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
        <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
      </svg>
    ),
    title: "แนวทาง AI Engineering Research",
    desc: "พัฒนาในบริบทของงานวิจัย AI ด้านการประมวลผลเสียง (Speech Processing) เพื่อการศึกษาและบำบัดการพูด",
  },
  {
    key: "workflow",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: "Workflow ได้แรงบันดาลใจจากนักบำบัดการพูด",
    desc: "ขั้นตอนการฝึกออกแบบโดยเรียนรู้จากแนวปฏิบัติของนักบำบัดการพูด (SLP) เพื่อให้ได้ผลลัพธ์ที่ดีที่สุด",
  },
];

export default function TrustSection() {
  return (
    <section className="mt-24" aria-labelledby="trust-heading">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-level-oral/8 border border-level-oral/20 rounded-full px-4 py-1.5 mb-4 text-sm font-medium text-level-oral">
          ทำไมต้อง Speech Adventure
        </div>
        <h2 id="trust-heading" className="text-2xl md:text-3xl font-bold text-text mb-3">
          ออกแบบมาเพื่อเด็กไทย
          <br />
          <span className="text-primary">โดยเฉพาะ</span>
        </h2>
        <p className="text-text-muted max-w-md mx-auto leading-relaxed">
          ไม่ใช่แค่แอปฝึกพูดทั่วไป แต่คือแพลตฟอร์มที่เข้าใจบริบทของภาษาและเด็กไทยอย่างแท้จริง
        </p>
      </div>

      {/* Trust points: 2×2 grid */}
      <div className="grid sm:grid-cols-2 gap-6">
        {trustPoints.map((p) => (
          <div
            key={p.key}
            className="bg-surface border border-border rounded-2xl p-6 card-3d group"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/8 border border-primary/15 flex items-center justify-center text-primary flex-shrink-0 group-hover:scale-110 transition-transform">
                {p.icon}
              </div>
              <div>
                <h3 className="font-semibold text-text mb-2 leading-snug">{p.title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{p.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Disclaimer box */}
      <div className="mt-8 bg-info/5 border border-info/15 rounded-xl px-5 py-4">
        <p className="text-sm text-info leading-relaxed">
          <strong>หมายเหตุ:</strong> Speech Adventure เป็น Prototype ที่อยู่ระหว่างการพัฒนา
          สรุปผลข้อเลือกตอบและการฝึกพูดแสดงแยกกัน
          ปัจจุบันใช้ Mock Evaluation เพื่อสาธิต UX Flow และ Workflow การฝึก
        </p>
      </div>
    </section>
  );
}
