import { useEffect, useEffectEvent, useState } from "react";
import { BookOpen, Play, Star, X } from "lucide-react";
import { Art } from "../Art";
import type { Stage } from "../types";
import { GAME_INFO, gameFor } from "./games";
import { KidShell, Mascot } from "./KidShell";
import { Burst } from "./games/Scenes";
import { sfx, unlockSfx } from "./sfx";
import { STICKERS, STICKER_PAGES, stickerCatalog, stickerSource, type StickerBook, type StickerPage } from "./stickers";

/** One sticker: a die-cut picture when owned, a faint shape when not yet. */
export function Sticker({
  kind,
  owned,
  fresh = false,
  onSelect,
}: {
  kind: string;
  owned: boolean;
  fresh?: boolean;
  onSelect?: () => void;
}) {
  const name = STICKERS[kind]?.name ?? "";
  const body = (
    <>
      <span className="kw-stk-pic">
        <Art kind={kind} label="" />
      </span>
      {fresh && <em className="kw-stk-new">ใหม่!</em>}
      <small>{owned ? name : "?"}</small>
    </>
  );
  const className = `kw-stk${owned ? "" : " locked"}${fresh ? " fresh" : ""}`;
  return onSelect ? (
    <button type="button" className={className} onClick={onSelect} aria-label={owned ? `สติกเกอร์ ${name}` : "สติกเกอร์ที่ยังไม่ได้"}>
      {body}
    </button>
  ) : (
    <span className={className} aria-label={owned ? `สติกเกอร์ ${name}` : undefined}>
      {body}
    </span>
  );
}

/** How many stickers the child had last time the book was opened (per child, on this device). */
const seenKey = (childId: string) => `speech-adventure:stickers-seen:${childId}`;
export function readSeenStickers(childId: string) {
  try {
    return Number(localStorage.getItem(seenKey(childId)) ?? 0) || 0;
  } catch {
    return 0;
  }
}
function writeSeenStickers(childId: string, count: number) {
  try {
    localStorage.setItem(seenKey(childId), String(count));
  } catch {
    // Storage blocked: the "new" dot just stays.
  }
}

/**
 * The child's sticker book: one page per group (animals, food, things, people and places). Owned stickers
 * are full colour, the rest are faint shapes; tapping one shows it big, and a missing one says which game
 * gives it with a button to go and play.
 */
export function KidStickerBook({
  childId,
  stages,
  book,
  latestRoundId,
  onPlay,
  onMap,
}: {
  childId: string;
  /** Stages of the current plan: which stickers can be collected now, and where. */
  stages: Stage[];
  book: StickerBook;
  /** Stickers first earned in this round are marked "ใหม่!". */
  latestRoundId?: string;
  onPlay: (stage: Stage) => void;
  onMap: () => void;
}) {
  const catalog = [...new Set([...stickerCatalog(stages), ...book.owned.keys()])].filter((k) => STICKERS[k]);
  const fresh = new Set(latestRoundId ? (book.newIn.get(latestRoundId) ?? []) : []);
  const pages = STICKER_PAGES.map((page) => ({
    ...page,
    kinds: catalog.filter((k) => STICKERS[k].page === page.id),
  })).filter((p) => p.kinds.length);
  const firstPage =
    pages.find((p) => p.kinds.some((k) => fresh.has(k)))?.id ?? pages.find((p) => p.kinds.some((k) => book.owned.has(k)))?.id ?? pages[0]?.id;
  const [pageId, setPageId] = useState<StickerPage | undefined>(firstPage);
  const [zoom, setZoom] = useState<string | null>(null);
  const page = pages.find((p) => p.id === pageId) ?? pages[0];
  const ownedCount = catalog.filter((k) => book.owned.has(k)).length;

  // Opening the book clears the "new" dot on the map.
  const markSeen = useEffectEvent(() => writeSeenStickers(childId, book.owned.size));
  useEffect(() => markSeen(), []);

  const zoomed = zoom && STICKERS[zoom];
  const source = zoom && !book.owned.has(zoom) ? stickerSource(stages, zoom) : undefined;
  const missing = page ? page.kinds.filter((k) => !book.owned.has(k)).length : 0;

  return (
    <KidShell
      label="สมุดสติกเกอร์"
      onPause={onMap}
      back="map"
      right={
        <span className="kw-count" aria-label={`สติกเกอร์ ${ownedCount} จาก ${catalog.length} ดวง`}>
          <BookOpen />
          {ownedCount}/{catalog.length}
        </span>
      }
    >
      <div className="kw-stage kw-book">
        <div className="kw-title">สมุดสติกเกอร์ของหนู</div>
        <div className="kw-book-tabs" role="tablist" aria-label="หมวดสติกเกอร์">
          {pages.map((p) => {
            const got = p.kinds.filter((k) => book.owned.has(k)).length;
            return (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={p.id === page?.id}
                className={`${p.id === page?.id ? "on" : ""}${got === p.kinds.length ? " full" : ""}`}
                onClick={() => {
                  unlockSfx();
                  sfx("pop");
                  setPageId(p.id);
                }}
              >
                <Art kind={p.icon} label="" />
                <span>{p.name}</span>
                <b>
                  {got}/{p.kinds.length}
                </b>
              </button>
            );
          })}
        </div>
        {page && (
          <div className={`kw-book-page${missing === 0 ? " full" : ""}`} role="tabpanel" aria-label={page.name}>
            {page.kinds.map((kind) => (
              <Sticker
                key={kind}
                kind={kind}
                owned={book.owned.has(kind)}
                fresh={fresh.has(kind)}
                onSelect={() => {
                  unlockSfx();
                  sfx(book.owned.has(kind) ? "twinkle" : "pop");
                  setZoom(kind);
                }}
              />
            ))}
          </div>
        )}
        <Mascot
          text={
            !page
              ? "เล่นเกมแล้วจะได้สติกเกอร์มาใส่สมุดนะ"
              : missing === 0
                ? `หน้า${page.name}ครบแล้ว! เก่งมาก`
                : `เก็บอีก ${missing} ดวง หน้า${page.name}ก็ครบแล้ว!`
          }
        />
      </div>
      {zoomed && (
        <div className="kw-sheet-back kw-zoom-back" onClick={() => setZoom(null)}>
          <div className="kw-zoom" role="dialog" aria-modal="true" aria-label={book.owned.has(zoom) ? zoomed.name : "สติกเกอร์ที่ยังไม่ได้"} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="kw-ibtn kw-zoom-x" onClick={() => setZoom(null)} aria-label="ปิด">
              <X />
            </button>
            <div className="kw-zoom-stk">
              <Sticker kind={zoom} owned={book.owned.has(zoom)} />
              {book.owned.has(zoom) && <Burst count={12} />}
            </div>
            {book.owned.has(zoom) ? (
              <>
                <div className="kw-title">{zoomed.name}</div>
                <div className="kw-sub">
                  <Star className="kw-inline-star" /> หนูเก็บได้แล้ว
                </div>
              </>
            ) : (
              <>
                <div className="kw-title">ยังไม่ได้สติกเกอร์นี้</div>
                {source ? (
                  <>
                    <div className="kw-sub">ไปเล่น {GAME_INFO[source.items[0] ? gameFor(source.items[0]) : "card"].name} แล้วจะได้ดวงนี้นะ</div>
                    <button
                      type="button"
                      className="kw-btn gold"
                      onClick={() => {
                        setZoom(null);
                        onPlay(source);
                      }}
                    >
                      <Play />
                      ไปเล่นเลย
                    </button>
                  </>
                ) : (
                  <div className="kw-sub">สติกเกอร์นี้อยู่ในชุดฝึกอื่น ขอผู้ใหญ่ช่วยเปลี่ยนชุดฝึกนะ</div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </KidShell>
  );
}

/** Round end: the stickers this round gave, flying into the book. */
export function RoundStickers({ kinds, fresh, onOpen }: { kinds: string[]; fresh: string[]; onOpen: () => void }) {
  const cheer = useEffectEvent(() => {
    if (fresh.length) setTimeout(() => sfx("twinkle"), 500);
  });
  useEffect(() => cheer(), []);
  const shown = (fresh.length ? fresh : kinds).slice(0, 3);
  return (
    <div className="kw-earn">
      <div className="kw-earn-row">
        {shown.map((kind, i) => (
          <span key={kind} className="kw-earn-item" style={{ animationDelay: `${0.25 + i * 0.18}s` }}>
            <Sticker kind={kind} owned fresh={fresh.includes(kind)} />
          </span>
        ))}
      </div>
      <button type="button" className="kw-btn kw-earn-book" onClick={onOpen}>
        <BookOpen />
        {fresh.length ? `ได้สติกเกอร์ใหม่ ${fresh.length} ดวง · เปิดสมุด` : "เก็บไว้ในสมุดแล้ว · เปิดสมุด"}
      </button>
    </div>
  );
}
