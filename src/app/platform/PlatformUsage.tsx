import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Database } from "@/types/supabase";
import UsageDashboard from "./UsageDashboard";

type Usage = Database["public"]["Functions"]["get_platform_web_usage"]["Returns"];
const count = new Intl.NumberFormat("th-TH");
const dayFormat = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", timeZone: "Asia/Bangkok" });
const panel = "rounded-2xl border border-border bg-surface p-4";
const hourLabel = (hour: number) => String(hour).padStart(2, "0") + ":00";

function LiveUsage() {
  const [days, setDays] = useState(7);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ days: number; revision: number; data: Usage | null }>();

  useEffect(() => {
    let active = true;
    async function load() {
      let data: Usage | null = null;
      try {
        const response = await getSupabaseClient()?.rpc("get_platform_web_usage", { p_days: days });
        data = response?.data ?? null;
      } catch {
        // Show the same retry state for network and database errors.
      }
      if (active) setResult({ days, revision, data });
    }
    void load();
    return () => { active = false; };
  }, [days, revision]);

  const current = result?.days === days && result.revision === revision ? result : undefined;
  const data = current?.data;
  const topHourCount = Math.max(0, ...(data?.hours ?? []));
  const peakHours = data?.hours.flatMap((opens, hour) => opens === topHourCount ? [hour] : []) ?? [];
  const dailyMax = Math.max(1, ...(data?.days.map((day) => day.opens) ?? []));

  return (
    <section className="space-y-4" aria-labelledby="web-usage-heading">
      <div className={panel}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="web-usage-heading" className="text-xl font-bold">พฤติกรรมการใช้งานจริง</h2>
            <p className="mt-1 text-sm text-text-muted">ทุกโรงเรียนและบัญชีที่เข้าสู่ระบบ · เวลาไทย</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm font-semibold" htmlFor="live-usage-period">ช่วงเวลา</label>
            <select id="live-usage-period" value={days} onChange={(event) => setDays(Number(event.target.value))}
              className="rounded-xl border border-border bg-surface px-3 py-2 text-sm">
              <option value={7}>7 วันล่าสุด</option>
              <option value={30}>30 วันล่าสุด</option>
            </select>
            <button type="button" className="rounded-xl border border-border px-3 py-2 text-sm font-semibold text-primary"
              onClick={() => setRevision((value) => value + 1)}>โหลดใหม่</button>
          </div>
        </div>
      </div>

      {!current && <p role="status" className={panel}>กำลังโหลดข้อมูลการใช้งาน…</p>}
      {current && !data && <p role="alert" className={panel}>โหลดข้อมูลการใช้งานไม่ได้ ลองโหลดใหม่หรือตรวจสอบว่าฐานข้อมูลอัปเดตแล้ว</p>}
      {data && (
        <>
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ["บัญชีที่ใช้งาน", count.format(data.activeAccounts) + " บัญชี"],
              ["จำนวนครั้งที่เปิด", count.format(data.opens) + " ครั้ง"],
              ["เวลาใช้งานรวม", count.format(Math.floor(data.activeSeconds / 3600)) + " ชม. " +
                count.format(Math.floor(data.activeSeconds / 60) % 60) + " นาที"],
              ["ช่วงที่เปิดมากที่สุด", topHourCount === 0 ? "—" :
                peakHours.length === 1 ? hourLabel(peakHours[0]) + "–" + hourLabel((peakHours[0] + 1) % 24) :
                  peakHours.length + " ช่วงเท่ากัน"],
            ].map(([label, value]) => (
              <div key={label} className={panel}>
                <dt className="text-xs text-text-muted">{label}</dt>
                <dd className="mt-1 text-lg font-bold text-primary">{value}</dd>
              </div>
            ))}
          </dl>

          {data.opens === 0 ? <p className={panel}>ยังไม่มีการเปิดเว็บใหม่ในช่วงที่เลือก</p> : (
            <div className="grid gap-4 lg:grid-cols-2">
              <section className={panel}>
                <h3 className="font-bold">จำนวนครั้งที่เปิดรายวัน</h3>
                <ul className="mt-3 max-h-80 space-y-2 overflow-auto">
                  {data.days.map(({ date, opens }) => (
                    <li key={date} className="grid grid-cols-[4rem_1fr_4rem] items-center gap-2 text-sm">
                      <time dateTime={date}>{dayFormat.format(new Date(date + "T00:00:00+07:00"))}</time>
                      <div aria-hidden="true" className="h-2 rounded-full bg-primary/10">
                        <div className="h-full rounded-full bg-primary" style={{ width: opens / dailyMax * 100 + "%" }} />
                      </div>
                      <span className="text-right tabular-nums">{count.format(opens)} ครั้ง</span>
                    </li>
                  ))}
                </ul>
              </section>
              <section className={panel}>
                <h3 className="font-bold">ช่วงเวลาที่เปิดเว็บ</h3>
                <ul className="mt-3 max-h-80 space-y-2 overflow-auto">
                  {data.hours.map((opens, hour) => (
                    <li key={hour} className="grid grid-cols-[6rem_1fr_4rem] items-center gap-2 text-sm">
                      <span>{hourLabel(hour)}–{hourLabel((hour + 1) % 24)}</span>
                      <div aria-hidden="true" className="h-2 rounded-full bg-primary/10">
                        <div className="h-full rounded-full bg-primary" style={{ width: opens / topHourCount * 100 + "%" }} />
                      </div>
                      <span className="text-right tabular-nums">{count.format(opens)} ครั้ง</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          )}
          <p className="text-xs text-text-muted">
            นับตั้งแต่เปิดเก็บข้อมูล การเปิดเว็บนับต่อแท็บและเริ่มใหม่เมื่อกลับมาหลังหยุดใช้ 30 นาที
            เวลาใช้งานเป็นค่าประมาณจากช่วงละ 15 วินาทีที่หน้าเว็บอยู่ด้านหน้าและมีการโต้ตอบใน 1 นาทีที่ผ่านมา
            บัญชีที่เปิดหลายแท็บจะไม่นับเวลาในช่วงเดียวกันซ้ำ
          </p>
        </>
      )}
    </section>
  );
}

export default function PlatformUsage() {
  const [showDemo, setShowDemo] = useState(false);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" aria-label="แหล่งข้อมูลการใช้งาน" role="group">
        {["ข้อมูลจริง", "ตัวอย่างรายงานการฝึก"].map((label, index) => {
          const selected = showDemo === Boolean(index);
          return <button key={label} type="button" aria-pressed={selected}
            className={"rounded-xl border border-border px-3 py-2 text-sm font-semibold " + (selected ? "bg-primary text-white" : "text-primary")}
            onClick={() => setShowDemo(Boolean(index))}>{label}</button>;
        })}
      </div>
      {showDemo ? <UsageDashboard /> : <LiveUsage />}
    </div>
  );
}
