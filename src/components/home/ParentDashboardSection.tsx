/** ParentDashboardSection — Showcase the parent/teacher progress tracking features */

/** Mock mini chart bars */
function MiniBarChart() {
  const bars = [40, 65, 55, 80, 72, 88, 92];
  const days = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];

  return (
    <div>
      <div className="flex items-end gap-1.5 h-16">
        {bars.map((h, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-t-sm bg-primary/20 relative overflow-hidden"
              style={{ height: `${(h / 100) * 56}px` }}
            >
              <div
                className="absolute bottom-0 inset-x-0 bg-primary rounded-t-sm"
                style={{ height: "100%" }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 mt-1">
        {days.map((d, i) => (
          <div key={i} className="flex-1 text-center text-[10px] text-text-muted">{d}</div>
        ))}
      </div>
    </div>
  );
}

/** Mini streak/stat widget */
function StatChip({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className={`rounded-xl border px-4 py-3 text-center ${color}`}>
      <p className="text-lg font-bold text-text">{value}</p>
      <p className="text-xs text-text-muted mt-0.5">{label}</p>
    </div>
  );
}

/** Mini recent recordings row */
function RecordingRow({ word, score, time }: { word: string; score: number; time: string }) {
  const scoreColor = score >= 80 ? "text-success" : score >= 60 ? "text-level-sound-prod" : "text-error";
  return (
    <div className="flex items-center gap-3 py-2 border-b border-border last:border-0">
      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary" aria-hidden="true">
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text truncate">{word}</p>
        <p className="text-xs text-text-muted">{time}</p>
      </div>
      <span className={`text-sm font-bold ${scoreColor}`}>{score}</span>
    </div>
  );
}

/** Full mock dashboard panel */
function MockDashboard() {
  return (
    <div className="bg-surface border border-border rounded-2xl shadow-xl overflow-hidden w-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border bg-bg/50 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-text">Dashboard ผู้ปกครอง</p>
          <p className="text-xs text-text-muted">น้องแพร · เสียง ก · สัปดาห์ที่ผ่านมา</p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-success" />
          <span className="text-xs text-success font-medium">Active</span>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <StatChip value="7" label="วันติดต่อกัน" color="bg-level-sound-prod/8 border-level-sound-prod/20" />
          <StatChip value="38" label="ครั้งที่ฝึก" color="bg-primary/8 border-primary/20" />
          <StatChip value="85%" label="คะแนนเฉลี่ย" color="bg-success/8 border-success/20" />
        </div>

        {/* Chart */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-text">คะแนนรายวัน (สัปดาห์นี้)</p>
            <span className="text-xs text-success font-medium">↑ +12%</span>
          </div>
          <MiniBarChart />
        </div>

        {/* Recent recordings */}
        <div>
          <p className="text-xs font-semibold text-text mb-2">การบันทึกล่าสุด</p>
          <RecordingRow word="กา · อีกา" score={92} time="วันนี้ 14:30" />
          <RecordingRow word="กาน้ำ" score={78} time="วันนี้ 14:28" />
          <RecordingRow word="กล้วย" score={65} time="เมื่อวาน 10:15" />
        </div>
      </div>
    </div>
  );
}

const dashboardFeatures = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="18" x2="18" y1="20" y2="10" />
        <line x1="12" x2="12" y1="20" y2="4" />
        <line x1="6" x2="6" y1="20" y2="14" />
      </svg>
    ),
    title: "กราฟพัฒนาการรายวัน/รายสัปดาห์",
    desc: "เห็นแนวโน้มการปรับปรุงของเด็กอย่างชัดเจน",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" x2="12" y1="19" y2="22" />
      </svg>
    ),
    title: "ฟังเสียงย้อนหลังได้",
    desc: "ประวัติการบันทึกเสียงทุกครั้ง เปรียบเทียบความก้าวหน้า",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" x2="8" y1="13" y2="13" />
        <line x1="16" x2="8" y1="17" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    title: "รายงานส่งออกได้",
    desc: "สรุปผลการฝึกแบบ Printable ส่งให้นักบำบัดการพูดได้ทันที",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
      </svg>
    ),
    title: "ระบบ Streak และ Badges",
    desc: "แรงจูงใจจากการสะสมเหรียญรางวัลและ Streak วันต่อเนื่อง",
  },
];

export default function ParentDashboardSection() {
  return (
    <section className="mt-24 relative" aria-labelledby="parent-dashboard-heading">
      {/* Background depth blob */}
      <div className="absolute top-1/4 -left-12 w-56 h-56 rounded-full bg-success/5 blur-[56px] pointer-events-none" aria-hidden="true" />
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-success/8 border border-success/20 rounded-full px-4 py-1.5 mb-4 text-sm font-medium text-success">
          สำหรับผู้ปกครองและครู
        </div>
        <h2 id="parent-dashboard-heading" className="text-2xl md:text-3xl font-bold text-text mb-3">
          ติดตามพัฒนาการอย่างใกล้ชิด
        </h2>
        <p className="text-text-muted max-w-md mx-auto leading-relaxed">
          Dashboard ที่ออกแบบมาให้ผู้ปกครองและครูเข้าใจพัฒนาการของเด็กได้ทันที
          โดยไม่ต้องมีความรู้เฉพาะทาง
        </p>
      </div>

      {/* Two column: dashboard + features */}
      <div className="grid lg:grid-cols-2 gap-10 items-start">
        {/* Mock dashboard */}
        <div className="order-2 lg:order-1">
          <div className="dashboard-3d relative">
            {/* Glow under dashboard */}
            <div className="absolute inset-x-8 -bottom-4 h-12 bg-success/10 blur-2xl rounded-full -z-10" aria-hidden="true" />
            <MockDashboard />
          </div>
        </div>

        {/* Feature list */}
        <div className="order-1 lg:order-2 space-y-4">
          {dashboardFeatures.map((f) => (
            <div
              key={f.title}
              className="flex items-start gap-4 bg-surface border border-border rounded-xl p-4 feature-item-3d"
            >
              <div className="w-10 h-10 rounded-xl bg-success/8 border border-success/20 flex items-center justify-center text-success flex-shrink-0">
                {f.icon}
              </div>
              <div>
                <p className="font-semibold text-text text-sm mb-1">{f.title}</p>
                <p className="text-xs text-text-muted leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
