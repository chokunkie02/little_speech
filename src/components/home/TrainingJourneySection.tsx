const stages = [
  { title: "เตรียมท่าปาก", detail: "ดูภาพตัวอย่างและลองทำตามทีละขั้น" },
  { title: "ฝึกพยางค์", detail: "ฟังเสียงแล้วลองพูดเป็นพยางค์สั้น ๆ" },
  { title: "ฝึกคำ", detail: "นำเสียงที่ฝึกมาใช้ในคำที่คุ้นเคย" },
  { title: "ฝึกประโยค", detail: "ลองพูดเป็นประโยคในสถานการณ์ใกล้ตัว" },
];

export default function TrainingJourneySection() {
  return (
    <section className="mt-14 sm:mt-18" aria-labelledby="training-journey">
      <h2 id="training-journey" className="text-xl font-bold text-text sm:text-2xl">เส้นทางฝึกพูด</h2>
      <p className="mt-1 text-sm text-text-muted">เลือกช่วงฝึกที่เหมาะกับเด็กได้จากแผนฝึก</p>
      <ol className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {stages.map(({ title, detail }, index) => (
          <li key={title} className="flex gap-3 rounded-xl border border-border bg-surface p-3.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-sm font-bold text-primary">{index + 1}</span>
            <div><h3 className="text-sm font-semibold text-text">{title}</h3><p className="mt-1 text-xs text-text-muted">{detail}</p></div>
          </li>
        ))}
      </ol>
    </section>
  );
}
