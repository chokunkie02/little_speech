import "./print.css";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Award, BookOpen, Layers, Printer } from "lucide-react";
import { Button } from "@/components/ui";
import { Art } from "../Art";
import { STICKERS, STICKER_PAGES, type StickerBook } from "../kid/stickers";
import { homeWordCards, markSound } from "../printables";
import type { Stage } from "../types";

export type PrintKind = "stickers" | "cards" | "certificate";

const PER_STICKER_SHEET = 20;
/** A4 width in CSS pixels (96 per inch): the preview scales the real sheet down to its box. */
const A4_PX = (210 / 25.4) * 96;

const thaiDate = () => new Date().toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });

function StickerSheet({ name, kinds, page, pages }: { name: string; kinds: string[]; page: number; pages: number }) {
  return (
    <div className="sa-sheet">
      <div className="sa-sheet-head">
        <b>สติกเกอร์ของ{name || "หนู"}</b>
        <small>Speech Adventure · ตัดตามเส้นประ{pages > 1 ? ` · แผ่นที่ ${page} จาก ${pages}` : ""}</small>
      </div>
      <div className="sa-stickers">
        {kinds.map((kind) => (
          <span key={kind}>
            <Art kind={kind} label={STICKERS[kind]?.name ?? ""} />
          </span>
        ))}
      </div>
      <div className="sa-sheet-foot">พิมพ์ลงกระดาษสติกเกอร์ A4 แล้วตัดเป็นวง ให้น้องติดในสมุดหรือบนบัตรคำ</div>
    </div>
  );
}

function CardSheet({ sound, stages }: { sound: string; stages: Stage[] }) {
  const cards = homeWordCards(stages, sound);
  return (
    <div className="sa-sheet">
      <div className="sa-sheet-head">
        <b>บัตรคำฝึกเสียง {sound}</b>
        <small>ตัดเป็นใบ · ให้น้องพูดคำละ 3 ครั้ง ชมทุกครั้งที่ลอง</small>
      </div>
      <div className="sa-cards">
        {cards.map((card) => (
          <div key={card.word}>
            <span className="sa-pic">
              <Art kind={card.art} label="" />
            </span>
            <span className="sa-word">
              {markSound(card.word, sound).map((part, i) => (
                <span key={i} className={part.hit ? "sa-hit" : undefined}>
                  {part.text}
                </span>
              ))}
            </span>
          </div>
        ))}
      </div>
      <div className="sa-sheet-foot">เกมที่บ้าน: วางบัตรคว่ำ เปิดทีละใบ พูดชื่อภาพให้ชัด ได้เก็บบัตรใบนั้น · ไม่ต้องเก่งทันที แค่ได้ลองก็ดีแล้ว</div>
    </div>
  );
}

function CertificateSheet({ name, sound, stagesDone, stagesTotal, stars, stickers }: { name: string; sound: string; stagesDone: number; stagesTotal: number; stars: number; stickers: number }) {
  return (
    <div className="sa-sheet sa-cert">
      <div className="sa-cert-in">
        <span className="sa-cert-crab">
          <Art kind="crab" label="พี่ปู" />
        </span>
        <div className="sa-cert-title">ใบประกาศ</div>
        <div className="sa-cert-sub">นักผจญภัยเสียง {sound}</div>
        <div className="sa-cert-name">{name}</div>
        <div className="sa-cert-facts">
          <span>
            <b>
              {stagesDone}/{stagesTotal}
            </b>
            ด่านที่เล่น
          </span>
          <span>
            <b>{stars}</b>ดาว
          </span>
          <span>
            <b>{stickers}</b>สติกเกอร์
          </span>
        </div>
        <div className="sa-cert-date">{thaiDate()}</div>
        <div className="sa-cert-sign">
          <span>ผู้ปกครอง</span>
          <span>ครู</span>
        </div>
      </div>
    </div>
  );
}

const OPTIONS: { kind: PrintKind; title: string; body: string; icon: ReactNode }[] = [
  { kind: "stickers", title: "แผ่นสติกเกอร์", body: "สติกเกอร์ที่น้องเก็บได้ พิมพ์ลงกระดาษสติกเกอร์ A4", icon: <BookOpen size={20} /> },
  { kind: "cards", title: "บัตรคำฝึกที่บ้าน", body: "คำที่มีเสียงที่ฝึก 8 ใบ พร้อมเกมสั้น ๆ", icon: <Layers size={20} /> },
  { kind: "certificate", title: "ใบประกาศ", body: "นักผจญภัยเสียงที่ฝึก ใส่ชื่อเล่นได้", icon: <Award size={20} /> },
];

/**
 * Print at home (adult page): choose a sheet, see it as it will print, then print or save as PDF with the
 * browser's own dialog. Everything is drawn in the browser; nothing is sent anywhere.
 */
export function PrintCenter({
  childName,
  sound,
  stages,
  book,
  stagesDone,
  stars,
  initial = "stickers",
}: {
  childName: string;
  sound: string;
  stages: Stage[];
  book: StickerBook;
  stagesDone: number;
  stars: number;
  initial?: PrintKind;
}) {
  const [kind, setKind] = useState<PrintKind>(initial);
  const [name, setName] = useState(childName);
  const [scale, setScale] = useState(0.45);
  const preview = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = preview.current;
    if (!box || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / A4_PX));
    observer.observe(box);
    return () => observer.disconnect();
  }, []);
  // Leaving the page while the dialog is open must not leave the site hidden.
  useEffect(() => () => document.body.classList.remove("sa-printing"), []);

  const pageOrder = STICKER_PAGES.map((p) => p.id);
  const owned = [...book.owned.keys()]
    .filter((k) => STICKERS[k])
    .sort((a, b) => pageOrder.indexOf(STICKERS[a].page) - pageOrder.indexOf(STICKERS[b].page));
  const stickerPages = Array.from({ length: Math.ceil(owned.length / PER_STICKER_SHEET) }, (_, i) => owned.slice(i * PER_STICKER_SHEET, (i + 1) * PER_STICKER_SHEET));
  const cardCount = homeWordCards(stages, sound).length;

  const sheets =
    kind === "stickers"
      ? stickerPages.map((kinds, i) => <StickerSheet key={i} name={name} kinds={kinds} page={i + 1} pages={stickerPages.length} />)
      : kind === "cards"
        ? cardCount
          ? [<CardSheet key="cards" sound={sound} stages={stages} />]
          : []
        : [<CertificateSheet key="cert" name={name} sound={sound} stagesDone={stagesDone} stagesTotal={stages.length} stars={stars} stickers={owned.length} />];
  const empty =
    kind === "stickers" && !owned.length
      ? "ยังไม่มีสติกเกอร์ ให้น้องเล่นเกมก่อน แล้วสติกเกอร์จะมาอยู่ที่นี่"
      : kind === "cards" && !cardCount
        ? "ชุดฝึกนี้ยังไม่มีคำที่เหมาะกับบัตรคำ"
        : "";

  const print = () => {
    const done = () => {
      document.body.classList.remove("sa-printing");
      window.removeEventListener("afterprint", done);
    };
    window.addEventListener("afterprint", done);
    document.body.classList.add("sa-printing");
    window.print();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex flex-col gap-3">
        {OPTIONS.map((option) => (
          <button
            key={option.kind}
            type="button"
            onClick={() => setKind(option.kind)}
            aria-pressed={kind === option.kind}
            className="panel sa-print-option flex items-center gap-4 text-left"
          >
            <span className="grid h-11 w-11 flex-none place-items-center rounded-xl bg-primary-soft text-primary-text">{option.icon}</span>
            <span className="flex flex-col">
              <b className="text-base">{option.title}</b>
              <small className="text-muted">
                {option.kind === "stickers" ? `${option.body} · ตอนนี้มี ${owned.length} ดวง` : option.kind === "cards" ? option.body.replace("เสียงที่ฝึก", `เสียง ${sound}`) : option.body}
              </small>
            </span>
          </button>
        ))}
        {kind !== "cards" && (
          <label className="panel flex flex-col gap-1">
            <span className="text-sm text-muted">{kind === "certificate" ? "ชื่อบนใบประกาศ" : "ชื่อบนแผ่นสติกเกอร์"}</span>
            <input
              className="rounded-lg border border-border bg-surface px-3 py-2 text-base"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เว้นว่างไว้เขียนเองได้"
              maxLength={40}
            />
          </label>
        )}
        <p className="text-sm text-muted">ใช้หน้าต่างพิมพ์ของเครื่อง: เลือกเครื่องพิมพ์ หรือ “บันทึกเป็น PDF” · กระดาษ A4 · ไม่ส่งข้อมูลออกนอกเครื่อง</p>
      </div>
      <div className="flex flex-col items-center gap-3">
        <div ref={preview} className="sa-print-preview" style={{ ["--sa-scale" as string]: scale }} aria-label="ตัวอย่างก่อนพิมพ์">
          {sheets[0] ?? <div className="grid h-full place-items-center p-6 text-center text-sm text-[#6b6790]">{empty}</div>}
        </div>
        {sheets.length > 1 && <small className="text-muted">ตัวอย่างแผ่นแรก · พิมพ์ทั้งหมด {sheets.length} แผ่น</small>}
        <Button onClick={print} disabled={!sheets.length} icon={<Printer size={18} />}>
          พิมพ์ / บันทึก PDF
        </Button>
      </div>
      {typeof document !== "undefined" && createPortal(<div className="sa-print-root">{sheets}</div>, document.body)}
    </div>
  );
}
