import { useEffect, useState } from "react";
import { Clock, MousePointerClick, RefreshCw, Timer, Users } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Database } from "@/types/supabase";
import UsageDashboard from "./UsageDashboard";

type Usage = Database["public"]["Functions"]["get_platform_web_usage"]["Returns"];
const count = new Intl.NumberFormat("th-TH");
const dayFormat = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", timeZone: "Asia/Bangkok" });
const panel = "rounded-card border border-border bg-surface p-4 shadow-card sm:p-5";
const hourLabel = (hour: number) => String(hour).padStart(2, "0") + ":00";

type Bar = { key: string; value: number; label: string; tip: string; highlight?: boolean };

/**
 * Column chart for one series. Value labels only on the highest and the last bar; every bar has a
 * hover/focus tooltip and the whole chart has a screen-reader list.
 */
function Columns({ bars, caption, everyLabel }: { bars: Bar[]; caption: string; everyLabel: number }) {
  const max = Math.max(1, ...bars.map((bar) => bar.value));
  const top = bars.reduce((best, bar, index) => (bar.value > bars[best].value ? index : best), 0);
  return (
    <figure className="mt-4">
      <div aria-hidden="true" className="pt-5"><div className="relative h-44">
        <div className="absolute inset-x-0 top-0 border-t border-dashed border-border" />
        <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-border" />
        <div className="absolute inset-x-0 bottom-0 border-t border-border" />
        <span className="absolute -left-0.5 -top-2 bg-surface pr-1 text-[0.6875rem] tabular-nums text-text-muted">{count.format(max)}</span>
        <ol className="relative flex h-full items-end gap-[3px] sm:gap-1">
          {bars.map((bar, index) => {
            const showValue = bar.value > 0 && (index === top || index === bars.length - 1);
            return (
              <li key={bar.key} tabIndex={0} className="group relative flex h-full min-w-0 flex-1 flex-col justify-end outline-none">
                <span className={bar.highlight
                  ? "relative block rounded-t-[4px] bg-[linear-gradient(180deg,#FFD58A,#F2B23A)] transition-opacity group-hover:opacity-85"
                  : "relative block rounded-t-[4px] bg-[linear-gradient(180deg,#8D80FF,#5548D4)] transition-opacity group-hover:opacity-85"}
                  style={{ height: bar.value ? `${Math.max(3, (bar.value / max) * 100)}%` : "2px", opacity: bar.value ? undefined : 0.25 }}>
                  {showValue && <span className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 font-display text-[0.6875rem] font-medium tabular-nums text-text">{count.format(bar.value)}</span>}
                </span>
                <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-control bg-text px-2.5 py-1.5 text-xs text-bg shadow-card group-hover:block group-focus-visible:block">
                  {bar.tip}
                </span>
              </li>
            );
          })}
        </ol>
      </div></div>
      <div aria-hidden="true" className="mt-1.5 flex gap-[3px] sm:gap-1">
        {bars.map((bar, index) => (
          <span key={bar.key} className="min-w-0 flex-1 overflow-visible whitespace-nowrap text-center text-[0.6875rem] text-text-muted">
            {index % everyLabel === 0 ? bar.label : ""}
          </span>
        ))}
      </div>
      <figcaption className="sr-only">{caption}</figcaption>
      <ul className="sr-only">{bars.map((bar) => <li key={bar.key}>{bar.tip}</li>)}</ul>
    </figure>
  );
}

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
  const data = current?.data ?? (!current ? result?.data : undefined);
  const topHourCount = Math.max(0, ...(data?.hours ?? []));
  const peakHours = data?.hours.flatMap((opens, hour) => opens === topHourCount ? [hour] : []) ?? [];

  return (
    <section className="space-y-4" aria-labelledby="web-usage-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="web-usage-heading" className="font-display text-xl font-medium text-text">พฤติกรรมการใช้งานจริง</h2>
          <p className="mt-0.5 text-sm text-text-muted">ทุกโรงเรียนและบัญชีที่เข้าสู่ระบบ · เวลาไทย</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="ช่วงเวลา" className="inline-flex rounded-full border border-border bg-surface p-1 shadow-card">
            {[7, 30].map((option) => (
              <button key={option} type="button" aria-pressed={days === option} onClick={() => setDays(option)}
                className={days === option
                  ? "btn-primary rounded-full px-3.5 py-1.5 font-display text-sm font-medium text-primary-foreground"
                  : "rounded-full px-3.5 py-1.5 font-display text-sm font-medium text-text-muted hover:text-text"}>
                {option} วันล่าสุด
              </button>
            ))}
          </div>
          <button type="button" className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-2 font-display text-sm font-medium text-primary-text shadow-card hover:bg-primary-soft"
            onClick={() => setRevision((value) => value + 1)}><RefreshCw size={14} aria-hidden="true" />โหลดใหม่</button>
        </div>
      </div>

      {!current && <p role="status" className="text-sm text-text-muted">{data ? "กำลังอัปเดตข้อมูล · กราฟยังแสดงช่วงก่อนหน้า" : "กำลังโหลดข้อมูลการใช้งาน…"}</p>}
      {current && !data && <p role="alert" className={panel}>โหลดข้อมูลการใช้งานไม่ได้ ลองโหลดใหม่หรือตรวจสอบว่าฐานข้อมูลอัปเดตแล้ว</p>}
      {data && (
        <>
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: "บัญชีที่ใช้งาน", value: count.format(data.activeAccounts), unit: "บัญชี", icon: <Users size={17} /> },
              { label: "จำนวนครั้งที่เปิด", value: count.format(data.opens), unit: "ครั้ง", icon: <MousePointerClick size={17} /> },
              data.activeSeconds < 60
                ? { label: "เวลาใช้งานรวม", value: count.format(data.activeSeconds), unit: "วินาที", icon: <Timer size={17} /> }
                : { label: "เวลาใช้งานรวม", value: `${count.format(Math.floor(data.activeSeconds / 3600))}:${String(Math.floor(data.activeSeconds / 60) % 60).padStart(2, "0")}`, unit: "ชม.:นาที", icon: <Timer size={17} /> },
              { label: "ช่วงที่เปิดมากที่สุด", value: topHourCount === 0 ? "—" : hourLabel(peakHours[0]) + "–" + hourLabel((peakHours[0] + 1) % 24), unit: peakHours.length > 1 ? `และอีก ${peakHours.length - 1} ช่วง` : "", icon: <Clock size={17} /> },
            ].map((item) => (
              <div key={item.label} className="rounded-card border border-border bg-surface px-4 py-3.5 shadow-card">
                <dt className="flex items-center gap-2 text-caption text-text-muted">
                  <span aria-hidden="true" className="grid size-7 place-items-center rounded-[0.6rem] bg-primary-soft text-primary-text">{item.icon}</span>{item.label}
                </dt>
                <dd className="mt-2 font-display text-[1.75rem] font-semibold leading-none tabular-nums text-text">
                  {item.value} <span className="text-sm font-normal text-text-muted">{item.unit}</span>
                </dd>
              </div>
            ))}
          </dl>

          {data.opens === 0 ? <p className={panel}>ยังไม่มีการเปิดเว็บใหม่ในช่วงที่เลือก</p> : (
            <div className="grid gap-4 lg:grid-cols-2">
              <section className={panel}>
                <h3 className="font-display text-base font-medium text-text">จำนวนครั้งที่เปิดรายวัน</h3>
                <p className="text-caption text-text-muted">ชี้ที่แท่งเพื่อดูตัวเลขของวันนั้น</p>
                <Columns caption="จำนวนครั้งที่เปิดรายวัน" everyLabel={data.days.length > 10 ? 5 : 1}
                  bars={data.days.map(({ date, opens }) => {
                    const label = dayFormat.format(new Date(date + "T00:00:00+07:00"));
                    return { key: date, value: opens, label, tip: `${label} · ${count.format(opens)} ครั้ง` };
                  })} />
              </section>
              <section className={panel}>
                <h3 className="font-display text-base font-medium text-text">ช่วงเวลาที่เปิดเว็บ</h3>
                <p className="flex items-center gap-1.5 text-caption text-text-muted">
                  <span aria-hidden="true" className="size-2.5 rounded-sm bg-[#F2B23A]" />ช่วงที่เปิดมากที่สุด · 24 ชั่วโมง เวลาไทย
                </p>
                <Columns caption="จำนวนครั้งที่เปิดตามช่วงเวลา" everyLabel={6}
                  bars={data.hours.map((opens, hour) => ({
                    key: String(hour), value: opens, label: String(hour).padStart(2, "0"),
                    tip: `${hourLabel(hour)}–${hourLabel((hour + 1) % 24)} · ${count.format(opens)} ครั้ง`,
                    highlight: opens > 0 && opens === topHourCount,
                  }))} />
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
      <div className="inline-flex flex-wrap gap-1 rounded-full border border-border bg-surface p-1 shadow-card" aria-label="แหล่งข้อมูลการใช้งาน" role="group">
        {["ข้อมูลจริง", "ตัวอย่างรายงานการฝึก"].map((label, index) => {
          const selected = showDemo === Boolean(index);
          return <button key={label} type="button" aria-pressed={selected}
            className={"rounded-full px-3.5 py-1.5 font-display text-sm font-medium " + (selected ? "bg-primary-soft text-primary-text" : "text-text-muted hover:text-text")}
            onClick={() => setShowDemo(Boolean(index))}>{label}</button>;
        })}
      </div>
      <div hidden={!showDemo}><UsageDashboard /></div>
      <div hidden={showDemo}><LiveUsage /></div>
    </div>
  );
}
