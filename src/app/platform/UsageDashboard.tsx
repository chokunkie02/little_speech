import { useState } from "react";
import { Activity, AudioLines, CheckCircle2, Repeat2, Users } from "lucide-react";
import { activityLabels, count, demoEngagement, demoPeriods, demoSchools, demoTotals, demoUsage, openingTimeLabels, rate, totalRounds, type DemoPeriod } from "./usageDemoData";

const panel = "min-w-0 rounded-2xl border border-border bg-surface p-3.5 sm:p-4";
const control = "w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text sm:w-auto";

function Bar({ percent }: { percent: number }) {
  return <div aria-hidden="true" className="h-2 rounded-full bg-primary/10">
    <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
  </div>;
}

function dayLabel(period: DemoPeriod, index: number) {
  const { startDay, month } = demoPeriods[period];
  const day = startDay + index;
  return day > 31 ? `${day - 31} พ.ย.` : `${day} ${month}`;
}

export default function UsageDashboard() {
  const [period, setPeriod] = useState<DemoPeriod>("current");
  const [school, setSchool] = useState("all");
  const selectedIndex = demoSchools.findIndex(({ id }) => id === school);
  const rows = demoUsage[period];
  const inScope = (dataset: typeof rows) => selectedIndex < 0 ? dataset : [dataset[selectedIndex]];
  const engagement = demoEngagement[period].filter((_, index) => selectedIndex < 0 || selectedIndex === index);
  const openingTimes = openingTimeLabels.map((label, index) => ({
    label,
    opens: engagement.reduce((sum, row) => sum + row.opens[index], 0),
  }));
  const openCount = openingTimes.reduce((sum, time) => sum + time.opens, 0);
  const activeAccounts = engagement.reduce((sum, row) => sum + row.users, 0);
  const activeMinutes = engagement.reduce((sum, row) => sum + row.minutes, 0);
  const peakTime = openingTimes.reduce((peak, time) => time.opens > peak.opens ? time : peak);
  const data = demoTotals(inScope(rows));
  const previous = demoTotals(inScope(demoUsage.previous));
  const rounds = totalRounds(data.dailyStarts);
  const finishedRounds = totalRounds(data.dailyFinishes);
  const completion = rate(data.finished, data.started);
  const priorRounds = totalRounds(previous.dailyStarts);
  const roundDelta = Math.round((rounds - priorRounds) / priorRounds * 100);
  const maxDaily = Math.ceil(Math.max(...data.dailyStarts) / 10) * 10;
  const scopeLabel = demoSchools[selectedIndex]?.name ?? "ทุกโรงเรียนตัวอย่าง";
  const metrics = [
    { label: "เปิดหน้าฝึก", value: count(data.opened), detail: "นับบัญชีละ 1 ครั้งในช่วงที่เลือก", icon: Users },
    { label: "เริ่มฝึก", value: count(rounds), detail: `รอบ จาก ${count(data.started)} บัญชี`, icon: AudioLines },
    { label: "ฝึกจบ", value: count(finishedRounds), detail: `รอบ จาก ${count(data.finished)} บัญชี`, icon: CheckCircle2 },
    { label: "อัตราบัญชีที่ฝึกจบ", value: `${completion}%`, detail: "เทียบกับบัญชีที่เริ่มฝึก", icon: Activity },
  ];
  const journey = [
    { label: "เปิดหน้าฝึก", users: data.opened },
    { label: "เริ่มแบบฝึก", users: data.started },
    { label: "ฝึกจบอย่างน้อย 1 รอบ", users: data.finished },
  ];
  const rankedActivities = activityLabels.map((label, index) => ({ label, rounds: data.activities[index] }))
    .sort((first, second) => second.rounds - first.rounds);

  return (
    <section aria-labelledby="usage-heading" className="space-y-4">
      <div className={panel}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="usage-heading" className="text-xl font-bold">พฤติกรรมการใช้งาน</h2>
            <p className="mt-1 text-sm text-text-muted">ดูการเริ่มฝึก การฝึกจบ และการกลับมาฝึกของบัญชีผู้ปกครอง</p>
          </div>
          <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">ข้อมูลจำลอง</span>
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-border pt-3">
          <div className="flex w-full flex-col gap-1 text-xs font-semibold sm:w-auto">
            <label htmlFor="usage-period">ช่วงเวลา</label>
            <select id="usage-period" className={control} value={period} onChange={(event) => setPeriod(event.target.value as DemoPeriod)}>
              {Object.entries(demoPeriods).map(([value, { label }]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div className="flex w-full flex-col gap-1 text-xs font-semibold sm:w-auto">
            <label htmlFor="usage-school">โรงเรียน</label>
            <select id="usage-school" className={control} value={school} onChange={(event) => setSchool(event.target.value)}>
              <option value="all">ทุกโรงเรียนตัวอย่าง</option>
              {demoSchools.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
            </select>
          </div>
        </div>
        <p role="status" className="mt-3 text-xs text-text-muted">{scopeLabel} · {demoPeriods[period].label} · เวลาไทย</p>
      </div>

      <section className={panel} aria-labelledby="engagement-heading">
        <h3 id="engagement-heading" className="font-bold">การเปิดเว็บและเวลาใช้งาน</h3>
        <p className="mt-1 text-xs text-text-muted">ตัวอย่างการนับบัญชีที่เปิดเว็บและช่วงเวลาที่กลับมาใช้งาน ตามเวลาไทย</p>
        <dl className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
          {[
            ["บัญชีที่เปิดเว็บ", count(activeAccounts) + " บัญชี"],
            ["จำนวนครั้งที่เปิด", count(openCount) + " ครั้ง"],
            ["เวลาใช้งานรวม", (activeMinutes / 60).toLocaleString("th-TH", { maximumFractionDigits: 1 }) + " ชม."],
            ["ช่วงที่เปิดมากที่สุด", peakTime.label + " น."],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-primary/8 px-3 py-2">
              <dt className="text-xs text-text-muted">{label}</dt>
              <dd className="mt-1 font-bold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {openingTimes.map(({ label, opens }) => (
            <li key={label} className="space-y-1 rounded-lg border border-border px-2.5 py-2">
              <p className="flex justify-between gap-2 text-xs"><span>{label}</span><strong>{count(opens)} ครั้ง</strong></p>
              <Bar percent={rate(opens, openCount)} />
            </li>
          ))}
        </ul>
      </section>

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map(({ label, value, detail, icon: Icon }) => (
          <div key={label} className={panel}>
            <dt className="flex items-center gap-2 text-sm font-semibold text-text-muted">
              <Icon size={17} className="shrink-0 text-primary" aria-hidden="true" />{label}
            </dt>
            <dd className="mt-1.5 text-2xl font-bold tabular-nums sm:text-3xl">{value}</dd>
            <dd className="mt-1 text-xs text-text-muted">{detail}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className={panel} aria-labelledby="daily-heading">
          <h3 id="daily-heading" className="font-bold">แนวโน้มการฝึกรายวัน</h3>
          <p className="mt-1 text-xs text-text-muted">
            {period === "current" ? `รอบที่เริ่มฝึก ${roundDelta >= 0 ? "+" : ""}${roundDelta}% จากสัปดาห์ก่อน (${count(priorRounds)} รอบ)` : "ช่วงเปรียบเทียบ 7 วันก่อนหน้า"}
          </p>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
            <span><span aria-hidden="true" className="mr-1.5 inline-block size-2.5 rounded-sm bg-primary" />เริ่มฝึก</span>
            <span><span aria-hidden="true" className="mr-1.5 inline-block size-2.5 rounded-sm bg-primary/35" />ฝึกจบ</span>
          </div>
          <ul className="mt-3 grid grid-cols-7 gap-1 sm:gap-2">
            {data.dailyStarts.map((started, index) => {
              const finished = data.dailyFinishes[index];
              const label = dayLabel(period, index);
              return <li key={label} className="min-w-0 text-center">
                <div className="flex h-28 items-end justify-center gap-0.5 border-b border-border sm:h-36 sm:gap-1">
                  <div aria-hidden="true" className="w-1/3 max-w-5 rounded-t bg-primary" style={{ height: `${started / maxDaily * 100}%` }} />
                  <div aria-hidden="true" className="w-1/3 max-w-5 rounded-t bg-primary/35" style={{ height: `${finished / maxDaily * 100}%` }} />
                </div>
                <div className="mt-1.5 text-[10px] text-text-muted sm:text-xs">{label}</div>
                <div className="mt-1 text-[10px] font-semibold tabular-nums sm:text-xs">
                  <span className="sr-only">เริ่ม </span>{started}<span aria-hidden="true"> / </span><span className="sr-only"> รอบ ฝึกจบ </span>{finished}<span className="sr-only"> รอบ</span>
                </div>
              </li>;
            })}
          </ul>
        </section>

        <section className={panel} aria-labelledby="journey-heading">
          <h3 id="journey-heading" className="font-bold">จุดที่ผู้ใช้ไปต่อหรือหยุด</h3>
          <p className="mt-1 text-xs text-text-muted">นับบัญชีที่ผ่านตามลำดับภายในช่วงที่เลือก</p>
          <ol className="mt-4 space-y-3">
            {journey.map(({ label, users }, index) => {
              const percent = rate(users, data.opened);
              const prior = journey[index - 1]?.users;
              return <li key={label}>
                <div className="mb-1 flex flex-wrap justify-between gap-x-2 text-sm">
                  <span>{label}</span><span className="tabular-nums text-text-muted">{count(users)} บัญชี · {percent}%</span>
                </div>
                <Bar percent={percent} />
                {prior !== undefined && <p className="mt-1 text-xs text-text-muted">
                  หยุดก่อนถึงขั้นนี้ {count(prior - users)} บัญชี ({rate(prior - users, prior)}% ของขั้นก่อน)
                </p>}
              </li>;
            })}
          </ol>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={panel} aria-labelledby="return-heading">
          <h3 id="return-heading" className="flex items-center gap-2 font-bold"><Repeat2 size={18} className="text-primary" aria-hidden="true" />กลับมาฝึกซ้ำ</h3>
          <p className="mt-1 text-xs text-text-muted">
            กลุ่มตัวอย่าง {count(data.firstTime)} บัญชีที่เริ่มฝึกครั้งแรกก่อนช่วงรายงานและติดตามครบ 7 วัน
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-2 sm:gap-3">
            {[{ day: 1, users: data.day1 }, { day: 7, users: data.day7 }].map(({ day, users }) => (
              <div key={day} className="rounded-xl bg-primary/8 p-3">
                <dt className="text-xs font-medium">กลับมาในวันที่ {day}</dt>
                <dd className="mt-1 text-2xl font-bold text-primary">{rate(users, data.firstTime)}%</dd>
                <dd className="text-xs text-text-muted">{count(users)} จาก {count(data.firstTime)} บัญชี</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-text-muted">นับเมื่อเริ่มฝึกอีกครั้งตรงวันที่ระบุหลังวันแรก</p>
        </section>

        <section className={panel} aria-labelledby="activity-heading">
          <h3 id="activity-heading" className="font-bold">แบบฝึกที่ถูกเริ่มมากที่สุด</h3>
          <p className="mt-1 text-xs text-text-muted">จัดอันดับตามจำนวนรอบที่เริ่ม แยกตามระดับแบบฝึก</p>
          <ol className="mt-3 space-y-2.5">
            {rankedActivities.map(({ label, rounds: activityRounds }, index) => (
              <li key={label}>
                <div className="mb-1 flex flex-wrap justify-between gap-x-2 text-sm">
                  <span>{index + 1}. {label}</span>
                  <span className="tabular-nums text-text-muted">{count(activityRounds)} รอบ · {rate(activityRounds, rounds)}%</span>
                </div>
                <Bar percent={rate(activityRounds, rounds)} />
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section className={panel} aria-labelledby="school-usage-heading">
        <h3 id="school-usage-heading" className="font-bold">เปรียบเทียบการใช้งานรายโรงเรียน</h3>
        <p className="mt-1 text-xs text-text-muted">เลือกชื่อโรงเรียนเพื่อกรองกราฟและตัวเลขด้านบน ตารางแสดงทุกโรงเรียนในช่วงเดียวกัน</p>
        <p className="mt-2 text-xs text-text-muted lg:hidden">เลื่อนตารางแนวนอนเพื่อดูทุกคอลัมน์</p>
        <div className="mt-3 overflow-x-auto rounded-lg focus-visible:ring-2 focus-visible:ring-primary" role="region" aria-label="ตารางเปรียบเทียบโรงเรียน" tabIndex={0}>
          <table className="w-full min-w-[38rem] text-right text-sm tabular-nums">
            <thead className="border-b border-border text-xs text-text-muted">
              <tr>{["โรงเรียน", "บัญชีที่เริ่ม", "รอบที่เริ่ม", "รอบที่จบ", "บัญชีที่ฝึกจบ", "กลับมาวันที่ 7"].map((label, index) =>
                <th key={label} scope="col" className={`px-2 py-3 font-semibold ${index === 0 ? "sticky left-0 z-10 bg-surface text-left" : ""}`}>{label}</th>
              )}</tr>
            </thead>
            <tbody>
              {demoSchools.map(({ id, name }, index) => {
                const row = rows[index];
                return <tr key={id} className={`border-b border-border last:border-0 ${school === id ? "bg-primary/8" : ""}`}>
                  <th scope="row" className="sticky left-0 z-10 bg-surface px-2 py-3 text-left font-semibold">
                    <button type="button" aria-pressed={school === id} className="text-left text-primary hover:underline"
                      onClick={() => setSchool(school === id ? "all" : id)}>{name}</button>
                  </th>
                  <td className="px-2 py-3">{count(row.started)}</td>
                  <td className="px-2 py-3">{count(totalRounds(row.dailyStarts))}</td>
                  <td className="px-2 py-3">{count(totalRounds(row.dailyFinishes))}</td>
                  <td className="px-2 py-3">{rate(row.finished, row.started)}%</td>
                  <td className="px-2 py-3">{rate(row.day7, row.firstTime)}%</td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </section>

      <details className={panel}>
        <summary className="cursor-pointer font-semibold">วิธีนับตัวเลขและแหล่งอ้างอิง</summary>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-text-muted">
          <li>จำนวนบัญชีนับผู้ปกครองแต่ละบัญชีครั้งเดียว จำนวนรอบนับทุกครั้งที่เริ่มหรือฝึกจบ ชุดจำลองกำหนดให้แต่ละบัญชีอยู่ในโรงเรียนเดียว</li>
          <li>เส้นทางฝึกนับบัญชีที่ทำครบตามลำดับในช่วงที่เลือก อัตราฝึกจบใช้บัญชีที่เริ่มฝึกเป็นฐาน ส่วนกราฟรายวันจัดตามวันที่เกิดเหตุการณ์แต่ละประเภท</li>
          <li>การกลับมาฝึกนับเฉพาะกลุ่มที่มีเวลาสังเกตครบ และใช้วันที่ 1 กับวันที่ 7 ตามปฏิทินไทย</li>
          <li>เวลาใช้งานในชุดตัวอย่างหมายถึงช่วงที่หน้าเว็บแสดงอยู่และผู้ใช้ยังมีการโต้ตอบ ตัวเลขและชื่อโรงเรียนในแท็บนี้เป็นข้อมูลสมมติ</li>
        </ul>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-primary">
          <a href="https://support.google.com/analytics/answer/9327974" target="_blank" rel="noreferrer" className="underline">Google Analytics · เส้นทางผู้ใช้</a>
          <a href="https://www.amplitude.com/docs/analytics/charts/retention-analysis/retention-analysis-calculation" target="_blank" rel="noreferrer" className="underline">Amplitude · การกลับมาใช้งาน</a>
          <a href="https://docs.moodle.org/403/en/course/report/outline/index" target="_blank" rel="noreferrer" className="underline">Moodle · รายงานกิจกรรม</a>
        </div>
      </details>
    </section>
  );
}
