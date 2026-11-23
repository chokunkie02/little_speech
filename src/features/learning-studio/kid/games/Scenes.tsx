import {
  useEffect,
  useEffectEvent,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Art } from "../../Art";
import { sfx } from "../sfx";

const BURST_COLORS = [
  "#FFD58A",
  "#F2B23A",
  "#7DDBB0",
  "#C3BBFF",
  "#FF9DB0",
  "#8FD3FF",
];

/** Confetti and sparkles that fly out once from the middle of the parent (which must be positioned). */
export function Burst({
  count = 16,
  colors = BURST_COLORS,
  spread = 1,
}: {
  count?: number;
  colors?: string[];
  spread?: number;
}) {
  return (
    <span className="kw-burst" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <i
          key={i}
          className={i % 3 === 0 ? "star" : ""}
          style={
            {
              "--a": `${(360 / count) * i + (i % 2 ? 9 : -9)}deg`,
              "--d": `${(70 + ((i * 37) % 60)) * spread}px`,
              "--c": colors[i % colors.length],
              "--t": `${(i % 4) * 40}ms`,
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
}

/** Woven basket that sits in front of พี่ปู in the delivery game. */
export function Basket({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`kw-basket ${className}`}
      viewBox="0 0 160 90"
      aria-hidden="true"
    >
      <path
        d="M30 34 Q80 -16 130 34"
        fill="none"
        stroke="#B7793A"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M30 34 Q80 -16 130 34"
        fill="none"
        stroke="#E2A55E"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M8 34 H152 L136 84 Q134 88 128 88 H32 Q26 88 24 84 Z"
        fill="#D9954B"
        stroke="#9C5F25"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M16 52 H144 M20 68 H140" stroke="#B7793A" strokeWidth="3" />
      {[36, 56, 76, 96, 116].map((x) => (
        <path
          key={x}
          d={`M${x} 36 L${x + 4} 86`}
          stroke="#B7793A"
          strokeWidth="3"
        />
      ))}
      <rect
        x="4"
        y="28"
        width="152"
        height="12"
        rx="6"
        fill="#E8B06A"
        stroke="#9C5F25"
        strokeWidth="3"
      />
    </svg>
  );
}

/** The words of the scene in readable type: done ones glow, the next one is underlined. */
function Line({
  parts,
  done,
  joiner,
}: {
  parts: string[];
  done: number;
  joiner: (i: number) => string;
}) {
  return (
    <div className="kw-line" aria-hidden="true">
      {parts.map((p, i) => (
        <span
          key={`${p}-${i}`}
          className={i < done ? "on" : i === done ? "next" : ""}
        >
          {i > 0 && <small>{joiner(i)}</small>}
          {p}
        </span>
      ))}
    </div>
  );
}

/* ─────────────── Stepping stones ─────────────── */

/**
 * A stream with one stone per syllable. พี่ปู starts on the near bank, jumps one stone for every burst of
 * voice (`hops`), and once every stone is crossed (`finished`) leaps to the far bank for a party.
 */
export function StonesScene({
  parts,
  hops,
  finished,
  quiet,
  blend = false,
}: {
  parts: string[];
  hops: number;
  finished: boolean;
  quiet: boolean;
  /** Sounds that join into a syllable (ป + า → ปา) rather than separate syllables (ปา ปี ปู). */
  blend?: boolean;
}) {
  const n = parts.length;
  // Percent positions across the scene: near bank 9%, stones spread over 22–78%, far bank 91%.
  const stoneX = (i: number) => (n === 1 ? 50 : 22 + (56 * i) / (n - 1));
  const stoneY = (i: number) => (i % 2 ? 60 : 68);
  const spot = finished ? n + 1 : Math.min(hops, n);
  const crabX = spot === 0 ? 9 : spot > n ? 91 : stoneX(spot - 1);
  const crabY = spot === 0 || spot > n ? 58 : stoneY(spot - 1) - 4;

  const land = useEffectEvent((s: number) => {
    if (quiet || s === 0) return;
    sfx("hop");
    setTimeout(() => sfx(s > n ? "fanfare" : "splash"), s > n ? 380 : 330);
  });
  useEffect(() => land(spot), [spot]);

  return (
    <div className="kw-scene">
      <div
        className={`kw-river${finished ? " won" : ""}`}
        role="img"
        aria-label={`พี่ปูกระโดดข้ามหิน ${Math.min(hops, n)} จาก ${n} ก้อน`}
      >
        <svg
          className="kw-river-bg"
          viewBox="0 0 400 240"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="kw-water" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#7FD3F2" />
              <stop offset="1" stopColor="#3C9BD6" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="400" height="240" fill="url(#kw-water)" />
          <g
            className="kw-waves"
            stroke="#D8F3FF"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            opacity=".7"
          >
            <path d="M70 60 q10 -6 20 0 t20 0" />
            <path d="M210 40 q10 -6 20 0 t20 0" />
            <path d="M150 200 q10 -6 20 0 t20 0" />
            <path d="M260 210 q10 -6 20 0 t20 0" />
            <path d="M120 120 q10 -6 20 0 t20 0" />
          </g>
          <path d="M0 0 H62 Q46 60 70 120 Q48 180 64 240 H0 Z" fill="#F3D79A" />
          <path d="M0 0 H50 Q34 60 56 120 Q36 180 50 240 H0 Z" fill="#8CCB7A" />
          <path
            d="M400 0 H338 Q354 60 330 120 Q352 180 336 240 H400 Z"
            fill="#F3D79A"
          />
          <path
            d="M400 0 H350 Q366 60 344 120 Q364 180 350 240 H400 Z"
            fill="#8CCB7A"
          />
          <path
            d="M372 40 V112"
            stroke="#8A5A2B"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            className="kw-flag"
            d="M374 42 L398 52 L374 62 Z"
            fill="#FF6B6B"
            stroke="#C94545"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
        {parts.map((p, i) => {
          const state =
            i < hops
              ? i === hops - 1 && !finished
                ? "landed"
                : "passed"
              : i === hops
                ? "next"
                : "";
          return (
            <span
              key={`${p}-${i}`}
              className={`kw-stone ${state}`}
              style={{ left: `${stoneX(i)}%`, top: `${stoneY(i)}%` }}
            >
              <b>{p}</b>
            </span>
          );
        })}
        <span
          className="kw-river-crab"
          style={{ left: `${crabX}%`, top: `${crabY}%` }}
        >
          <span key={spot} className={spot ? "kw-jump" : ""}>
            <Art kind="crab" label="" />
          </span>
        </span>
        {finished && (
          <span className="kw-river-party">
            <Burst count={18} />
          </span>
        )}
      </div>
      <Line parts={parts} done={finished ? n : Math.min(hops, n)} joiner={(i) => (!blend ? " " : i === n - 1 ? " → " : " + ")} />
    </div>
  );
}

/* ─────────────── Word train ─────────────── */

const CAR_COLORS = [
  "#FF8A7A",
  "#FFC65C",
  "#7DDBB0",
  "#8FB8FF",
  "#C9A2FF",
  "#FF9DCB",
];

function Car({
  word,
  color,
  on,
}: {
  word: string;
  color: string;
  on: boolean;
}) {
  return (
    <span
      className={`kw-car${on ? " on" : ""}`}
      style={{ "--len": Math.max(3, [...word].length) } as CSSProperties}
    >
      <svg viewBox="0 0 120 84" aria-hidden="true">
        {on ? (
          <>
            <rect
              x="6"
              y="10"
              width="108"
              height="52"
              rx="10"
              fill={color}
              stroke="rgb(0 0 0 / .28)"
              strokeWidth="3"
            />
            <rect
              x="6"
              y="10"
              width="108"
              height="12"
              rx="6"
              fill="rgb(255 255 255 / .35)"
            />
            <circle
              cx="30"
              cy="70"
              r="11"
              fill="#3A3557"
              stroke="#1F1B38"
              strokeWidth="3"
            />
            <circle
              cx="90"
              cy="70"
              r="11"
              fill="#3A3557"
              stroke="#1F1B38"
              strokeWidth="3"
            />
            <circle cx="30" cy="70" r="4" fill="#C3BBFF" />
            <circle cx="90" cy="70" r="4" fill="#C3BBFF" />
            <rect x="114" y="44" width="8" height="6" rx="2" fill="#5D5878" />
          </>
        ) : (
          <rect
            x="8"
            y="12"
            width="104"
            height="50"
            rx="10"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray="8 7"
          />
        )}
      </svg>
      <b>{word}</b>
    </span>
  );
}

function Engine({ running }: { running: boolean }) {
  return (
    <span className="kw-engine">
      {running && (
        <span className="kw-smoke" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      )}
      <svg viewBox="0 0 150 100" aria-hidden="true">
        <rect
          x="70"
          y="2"
          width="16"
          height="22"
          rx="4"
          fill="#5D5878"
          stroke="#2C2845"
          strokeWidth="3"
        />
        <rect x="62" y="0" width="32" height="9" rx="4" fill="#3F3A5E" />
        <path
          d="M14 30 H92 Q126 30 136 50 L142 76 H14 Z"
          fill="#E8735A"
          stroke="#A9432F"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <rect
          x="8"
          y="14"
          width="52"
          height="62"
          rx="8"
          fill="#5548D4"
          stroke="#33289A"
          strokeWidth="3"
        />
        <rect
          x="4"
          y="8"
          width="60"
          height="10"
          rx="5"
          fill="#7B6CF6"
          stroke="#33289A"
          strokeWidth="3"
        />
        <rect
          x="16"
          y="24"
          width="36"
          height="28"
          rx="6"
          fill="#D8F3FF"
          stroke="#33289A"
          strokeWidth="3"
        />
        <circle
          cx="140"
          cy="58"
          r="6"
          fill="#FFE27A"
          stroke="#C98B1C"
          strokeWidth="2"
        />
        <path d="M142 76 L150 92 H128 Z" fill="#7B7795" />
        {[32, 76, 116].map((x) => (
          <g
            key={x}
            className="kw-wheel"
            style={{ transformOrigin: `${x}px 82px` }}
          >
            <circle
              cx={x}
              cy="82"
              r={x === 32 ? 15 : 12}
              fill="#3A3557"
              stroke="#1F1B38"
              strokeWidth="3"
            />
            <path
              d={`M${x - 8} 82 H${x + 8} M${x} 74 V90`}
              stroke="#C3BBFF"
              strokeWidth="3"
            />
          </g>
        ))}
      </svg>
      <span className="kw-driver">
        <Art kind="crab" label="" />
      </span>
    </span>
  );
}

/**
 * Word train: a dashed outline waits for each word; every burst of voice couples one car. When the train
 * is whole (`finished`) it whistles ปู้น ปู้น, runs off the screen and comes back to a party.
 */
export function TrainScene({
  parts,
  cars,
  finished,
  quiet,
}: {
  parts: string[];
  cars: number;
  finished: boolean;
  quiet: boolean;
}) {
  const coupled = Math.min(cars, parts.length);
  const added = useEffectEvent((count: number) => {
    if (!quiet && count > 0) sfx("pop");
  });
  useEffect(() => added(coupled), [coupled]);
  const depart = useEffectEvent(() => {
    if (quiet) return;
    sfx("whistle");
    sfx("chug");
    setTimeout(() => sfx("fanfare"), 3000);
  });
  useEffect(() => {
    if (finished) depart();
  }, [finished]);

  return (
    <div className="kw-scene">
      <Line parts={parts} done={finished ? parts.length : coupled} joiner={() => ""} />
      <div
        className={`kw-rail${finished ? " go" : ""}`}
        role="img"
        aria-label={`รถไฟคำ ต่อแล้ว ${coupled} จาก ${parts.length} ตู้`}
      >
        <div className="kw-train">
          {parts.map((word, i) => (
            <Car
              key={`${word}-${i}`}
              word={word}
              color={CAR_COLORS[i % CAR_COLORS.length]}
              on={i < coupled}
            />
          ))}
          <Engine running={finished} />
        </div>
        <div className="kw-track" aria-hidden="true" />
        {finished && (
          <>
            <span className="kw-toot" aria-hidden="true">
              ปู้น ปู้น!
            </span>
            <span className="kw-rail-party">
              <Burst count={18} />
            </span>
          </>
        )}
      </div>
    </div>
  );
}

/** Wraps a picture card so it can wiggle and sparkle when the child has named it. */
export function StickerCard({
  won,
  children,
}: {
  won: boolean;
  children: ReactNode;
}) {
  const cheer = useEffectEvent(() => sfx("twinkle"));
  useEffect(() => {
    if (won) cheer();
  }, [won]);
  return (
    <div className={`kw-card kw-sticker${won ? " won" : ""}`}>
      {children}
      {won && <Burst count={14} />}
    </div>
  );
}
