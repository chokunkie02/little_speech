import "./kid.css";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Ellipsis, Pause, UserRound, Volume2, X } from "lucide-react";
import { Art } from "../Art";

/** Kid-only fonts: Itim for พี่ปู and buttons, Sarabun (textbook shapes) for the words being taught. */
const KID_FONTS = "https://fonts.googleapis.com/css2?family=Itim&family=Sarabun:wght@600;700&display=swap";

export interface AdultAction {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
}

/**
 * Page scroll lock shared by every kid screen. Counted, so screens that overlap for a moment (map, start
 * screen, browser Back) always hand the page back exactly as it was.
 */
let scrollLocks = 0;
let scrollBefore = "";
function lockScroll() {
  const html = document.documentElement;
  if (scrollLocks++ === 0) {
    scrollBefore = html.style.overflow;
    html.style.overflow = "hidden";
  }
  return () => {
    if (--scrollLocks === 0) html.style.overflow = scrollBefore;
  };
}

const ShellContext = createContext<{ openMenu: () => void; showBar: (on: boolean) => void }>({
  openMenu: () => {},
  showBar: () => {},
});

/**
 * Full-window kid world drawn over the site (header, sidebar and bottom menu stay hidden behind it),
 * so a child cannot wander into other pages mid-practice. Adults reach everything else from the
 * dashed corner chip, or from the "more" button on a game's adult strip.
 */
export function KidShell({
  progress,
  onPause,
  right,
  adultActions = [],
  adultNote,
  label,
  children,
}: {
  progress?: { done: number; total: number };
  onPause?: () => void;
  right?: ReactNode;
  adultActions?: AdultAction[];
  adultNote?: ReactNode;
  label: string;
  children: ReactNode;
}) {
  const [menu, setMenu] = useState(false);
  const [bars, setBars] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const [context] = useState(() => ({
    openMenu: () => setMenu(true),
    showBar: (on: boolean) => setBars((n) => n + (on ? 1 : -1)),
  }));
  const sheet = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const unlock = lockScroll();
    // Focus the world itself, not its first button: that is pause, and Space would press it.
    root.current?.focus({ preventScroll: true });
    return unlock;
  }, []);
  useEffect(() => {
    if (!menu) return;
    const back = root.current;
    sheet.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(false);
      if (e.key !== "Tab" || !sheet.current) return;
      // Keep Tab inside the menu while it is open.
      const items = [...sheet.current.querySelectorAll<HTMLButtonElement>("button")];
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("keydown", key);
      back?.focus({ preventScroll: true });
    };
  }, [menu]);
  return (
    <ShellContext.Provider value={context}>
      <div className="kid-world" ref={root} role="region" aria-label={label} tabIndex={-1}>
        <link rel="stylesheet" href={KID_FONTS} precedence="default" />
        <div className="kw-top">
          {onPause ? (
            <button type="button" className="kw-ibtn" onClick={onPause} aria-label="พักไว้ก่อน">
              <Pause />
            </button>
          ) : (
            <span className="kw-spacer" />
          )}
          {progress ? (
            <span
              className="kw-dots"
              role="img"
              aria-label={`ข้อที่ ${Math.min(progress.done + 1, progress.total)} จาก ${progress.total}`}
            >
              {Array.from({ length: progress.total }, (_, i) => (
                <i key={i} className={i < progress.done ? "on" : ""} />
              ))}
            </span>
          ) : (
            <span />
          )}
          {right ?? <span className="kw-spacer" />}
        </div>
        {children}
        {bars === 0 && adultActions.length > 0 && (
          <button type="button" className="kw-adult-chip" onClick={() => setMenu(true)}>
            <UserRound />
            ผู้ใหญ่
          </button>
        )}
        {menu && (
          <div className="kw-sheet-back" onClick={() => setMenu(false)}>
            <div
              ref={sheet}
              className="kw-sheet"
              role="dialog"
              aria-modal="true"
              aria-label="เมนูผู้ใหญ่"
              onClick={(e) => e.stopPropagation()}
            >
              <h2>สำหรับผู้ใหญ่</h2>
              {adultNote}
              {adultActions.map((a) => (
                <button
                  key={a.label}
                  type="button"
                  onClick={() => {
                    setMenu(false);
                    a.onSelect();
                  }}
                >
                  {a.icon}
                  {a.label}
                </button>
              ))}
              <button type="button" onClick={() => setMenu(false)}>
                <X />
                ปิดเมนู
              </button>
            </div>
          </div>
        )}
      </div>
    </ShellContext.Provider>
  );
}

/** The dashed adult strip along the bottom. While it is shown, the corner chip moves into its "more" button. */
export function AdultBar({ head, children }: { head: ReactNode; children?: ReactNode }) {
  const shell = useContext(ShellContext);
  useEffect(() => {
    shell.showBar(true);
    return () => shell.showBar(false);
  }, [shell]);
  return (
    <div className="kw-adult-bar">
      <div className="kw-head">
        <UserRound />
        <span style={{ flex: 1 }}>{head}</span>
        <button type="button" className="kw-more" onClick={shell.openMenu} aria-label="เมนูผู้ใหญ่">
          <Ellipsis />
        </button>
      </div>
      {children}
    </div>
  );
}

/** พี่ปู with a speech bubble. Tapping the bubble replays the line when there is a voice clip. */
export function Mascot({
  text,
  onReplay,
  replayLabel = "แตะเพื่อฟังซ้ำ",
}: {
  text: ReactNode;
  onReplay?: () => void;
  replayLabel?: string;
}) {
  return (
    <div className="kw-mascot">
      <Art kind="crab" className="kw-pu" label="พี่ปู" />
      {onReplay ? (
        <button type="button" className="kw-bubble" onClick={onReplay}>
          <span className="kw-spk">
            <Volume2 />
            {replayLabel}
          </span>
          {text}
        </button>
      ) : (
        <div className="kw-bubble" role="status">
          {text}
        </div>
      )}
    </div>
  );
}
