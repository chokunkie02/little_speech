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

/** Backdrops for the stepping game, so it is not always the same river. */
export type StepTheme = "river" | "sky" | "forest" | "night";
export const STEP_THEMES: StepTheme[] = ["river", "sky", "forest", "night"];
/** Same item, same scene; neighbouring items usually differ. */
export const stepThemeFor = (id: string) =>
  STEP_THEMES[
    [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) %
      STEP_THEMES.length
  ];

const STEP_WORDS: Record<StepTheme, { thing: string; goal: string }> = {
  river: { thing: "ก้อนหิน", goal: "ข้ามลำธาร" },
  sky: { thing: "ก้อนเมฆ", goal: "ไปถึงสายรุ้ง" },
  forest: { thing: "ดอกเห็ด", goal: "ไปถึงหีบสมบัติ" },
  night: { thing: "ดาวเคราะห์", goal: "ไปถึงดวงจันทร์" },
};
export const stepWords = (theme: StepTheme) => STEP_WORDS[theme];

/** Background for a theme. `sx` and `gx` are the start and goal x in the 400 × 240 drawing. */
function Backdrop({
  theme,
  sx,
  gx,
}: {
  theme: StepTheme;
  sx: number;
  gx: number;
}) {
  if (theme === "sky")
    return (
      <>
        <defs>
          <linearGradient id="kw-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8FD3FF" />
            <stop offset="1" stopColor="#FFD9EC" />
          </linearGradient>
        </defs>
        <rect width="400" height="240" fill="url(#kw-sky)" />
        <circle
          cx="52"
          cy="40"
          r="22"
          fill="#FFE27A"
          stroke="#F2B23A"
          strokeWidth="3"
        />
        <g fill="#FFFFFF" opacity=".55">
          <ellipse cx="170" cy="40" rx="30" ry="10" />
          <ellipse cx="300" cy="28" rx="24" ry="8" />
          <ellipse cx="250" cy="215" rx="34" ry="9" />
        </g>
        <path
          d={`M${sx - 46} 168 q8 -26 30 -18 q10 -22 34 -8 q24 -4 24 22 q14 8 0 22 h-82 q-18 -6 -6 -18z`}
          fill="#FFFFFF"
          stroke="#C9DDF2"
          strokeWidth="3"
        />
        <g fill="none" strokeWidth="9" strokeLinecap="round">
          {[
            "#FF6B6B",
            "#FFB443",
            "#FFE27A",
            "#6FD08C",
            "#6FB7FF",
            "#A98BFF",
          ].map((c, i) => (
            <path
              key={c}
              d={`M${gx - 50 + i * 7} 190 A${50 - i * 7} ${62 - i * 7} 0 0 1 ${gx + 50 - i * 7} 190`}
              stroke={c}
            />
          ))}
        </g>
        <path
          d={`M${gx - 62} 200 q6 -16 22 -10 q12 -14 28 0 q12 -4 14 10z M${gx + 18} 200 q6 -16 22 -10 q12 -14 28 0 q12 -4 14 10z`}
          fill="#FFFFFF"
        />
      </>
    );
  if (theme === "forest")
    return (
      <>
        <rect width="400" height="240" fill="#BFE9FF" />
        <circle cx="350" cy="36" r="18" fill="#FFE27A" />
        {[30, 110, 200, 290, 370].map((x, i) => (
          <g key={x}>
            <rect
              x={x - 5}
              y={70 + (i % 2) * 8}
              width="10"
              height="50"
              fill="#9C6B3F"
            />
            <circle
              cx={x}
              cy={62 + (i % 2) * 8}
              r={26 + (i % 3) * 4}
              fill={i % 2 ? "#5FB86A" : "#4FA35D"}
            />
          </g>
        ))}
        <path d="M0 116 Q100 104 200 118 T400 112 V240 H0 Z" fill="#8CCB7A" />
        <path
          d={`M${sx - 30} 190 Q200 150 ${gx + 30} 176`}
          fill="none"
          stroke="#E7C98F"
          strokeWidth="26"
          strokeLinecap="round"
          opacity=".75"
        />
        <g transform={`translate(${gx - 26} 118)`}>
          <rect
            x="0"
            y="22"
            width="52"
            height="34"
            rx="5"
            fill="#C27A3A"
            stroke="#7E4A1E"
            strokeWidth="3"
          />
          <path
            d="M0 26 Q26 -4 52 26 Z"
            fill="#D98E46"
            stroke="#7E4A1E"
            strokeWidth="3"
          />
          <rect
            x="22"
            y="26"
            width="8"
            height="12"
            rx="2"
            fill="#FFD25E"
            stroke="#C98B1C"
            strokeWidth="2"
          />
          <g fill="#FFE27A">
            <circle cx="10" cy="12" r="3" />
            <circle cx="40" cy="8" r="2.5" />
            <circle cx="26" cy="2" r="3" />
          </g>
        </g>
      </>
    );
  if (theme === "night")
    return (
      <>
        <defs>
          <linearGradient id="kw-night" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1B1F5E" />
            <stop offset="1" stopColor="#4A2D85" />
          </linearGradient>
        </defs>
        <rect width="400" height="240" fill="url(#kw-night)" />
        <g fill="#FFF6D8">
          {[
            [30, 30],
            [90, 70],
            [150, 22],
            [210, 60],
            [260, 18],
            [320, 70],
            [380, 30],
            [60, 200],
            [130, 225],
            [240, 210],
            [300, 230],
            [370, 190],
          ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={x % 3 ? 1.6 : 2.6} />
          ))}
        </g>
        <ellipse
          cx={sx}
          cy="176"
          rx="38"
          ry="12"
          fill="#7B6CF6"
          stroke="#B9AEFF"
          strokeWidth="3"
        />
        <g transform={`translate(${gx} 128)`}>
          <circle r="34" fill="#FFE9A8" />
          <circle cx="15" cy="-10" r="30" fill="#2A2470" />
          <circle cx="-16" cy="8" r="4" fill="#F5D57A" />
          <circle cx="-8" cy="-14" r="3" fill="#F5D57A" />
        </g>
      </>
    );
  // River: banks at the start and the goal, water between, a flag on the far bank.
  return (
    <>
      <defs>
        <linearGradient id="kw-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7FD3F2" />
          <stop offset="1" stopColor="#3C9BD6" />
        </linearGradient>
      </defs>
      <rect width="400" height="240" fill="url(#kw-water)" />
      <g
        className="kw-waves"
        stroke="#D8F3FF"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        opacity=".7"
      >
        <path d={`M${sx + 40} 60 q10 -6 20 0 t20 0`} />
        <path d="M190 34 q10 -6 20 0 t20 0" />
        <path d={`M${sx + 60} 214 q10 -6 20 0 t20 0`} />
        <path d={`M${gx - 90} 200 q10 -6 20 0 t20 0`} />
      </g>
      <path
        d={`M0 0 H${sx + 18} Q${sx + 2} 60 ${sx + 26} 120 Q${sx + 4} 180 ${sx + 20} 240 H0 Z`}
        fill="#F3D79A"
      />
      <path
        d={`M0 0 H${sx + 6} Q${sx - 10} 60 ${sx + 12} 120 Q${sx - 8} 180 ${sx + 6} 240 H0 Z`}
        fill="#8CCB7A"
      />
      <path
        d={`M400 0 H${gx - 18} Q${gx - 2} 60 ${gx - 26} 120 Q${gx - 4} 180 ${gx - 20} 240 H400 Z`}
        fill="#F3D79A"
      />
      <path
        d={`M400 0 H${gx - 6} Q${gx + 10} 60 ${gx - 12} 120 Q${gx + 8} 180 ${gx - 6} 240 H400 Z`}
        fill="#8CCB7A"
      />
      <path
        d={`M${gx + 14} 46 V118`}
        stroke="#8A5A2B"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        className="kw-flag"
        d={`M${gx + 16} 48 L${gx + 40} 58 L${gx + 16} 68 Z`}
        fill="#FF6B6B"
        stroke="#C94545"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </>
  );
}

/** One step's picture (the stone itself is drawn by CSS). */
function StepShape({ theme }: { theme: StepTheme }) {
  if (theme === "sky")
    return (
      <svg viewBox="0 0 100 64" aria-hidden="true">
        <path
          d="M14 50 q-12 -2 -8 -16 q4 -12 18 -9 q4 -16 22 -15 q14 -10 28 2 q16 -2 18 14 q12 4 6 18 q-4 8 -14 8 h-62 z"
          fill="#FFFFFF"
          stroke="#B8D3EE"
          strokeWidth="3"
        />
      </svg>
    );
  if (theme === "forest")
    return (
      <svg viewBox="0 0 100 64" aria-hidden="true">
        <rect
          x="38"
          y="34"
          width="24"
          height="28"
          rx="8"
          fill="#FFF1DA"
          stroke="#C9A77A"
          strokeWidth="3"
        />
        <path
          d="M6 40 Q8 2 50 2 Q92 2 94 40 Z"
          fill="#E8574A"
          stroke="#A9382E"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <g fill="#FFFFFF">
          <circle cx="14" cy="32" r="4" />
          <circle cx="86" cy="32" r="4" />
          <circle cx="30" cy="10" r="3" />
          <circle cx="70" cy="10" r="3" />
        </g>
      </svg>
    );
  if (theme === "night")
    return (
      <svg viewBox="0 0 100 64" aria-hidden="true">
        <circle
          cx="50"
          cy="32"
          r="26"
          fill="#8FD3FF"
          stroke="#4E8FC4"
          strokeWidth="3"
        />
        <ellipse
          cx="50"
          cy="48"
          rx="46"
          ry="8"
          fill="none"
          stroke="#FFD25E"
          strokeWidth="4"
        />
        <path d="M30 48 A26 26 0 0 0 70 48" fill="#8FD3FF" />
      </svg>
    );
  return null;
}

/**
 * The stepping game: one step per syllable between a start and a goal. พี่ปู starts on the left,
 * jumps one step for every burst of voice (`hops`), and once every step is crossed (`finished`)
 * leaps to the goal for a party. Steps keep an even, short gap whatever their number.
 */
export function StonesScene({
  parts,
  hops,
  finished,
  quiet,
  blend = false,
  theme = "river",
}: {
  parts: string[];
  hops: number;
  finished: boolean;
  quiet: boolean;
  /** Sounds that join into a syllable (ป + า → ปา) rather than separate syllables (ปา ปี ปู). */
  blend?: boolean;
  theme?: StepTheme;
}) {
  const n = parts.length;
  // Even gaps (start → steps → goal), short when there are few steps, all within 12–88%.
  const gap = Math.min(20, 76 / (n + 1));
  const startX = 50 - (gap * (n + 1)) / 2;
  const goalX = 100 - startX;
  const stoneX = (i: number) => startX + gap * (i + 1);
  const stoneY = (i: number) => (i % 2 ? 58 : 66);
  const spot = finished ? n + 1 : Math.min(hops, n);
  const crabX = spot === 0 ? startX : spot > n ? goalX : stoneX(spot - 1);
  // Standing on top of the step, so the syllable under พี่ปู stays readable.
  const crabY = spot === 0 || spot > n ? 60 : stoneY(spot - 1) - 9;
  // Steps never wider than the gap between them (four or five syllables would overlap).
  const stepWidth = `min(${(gap * 0.9).toFixed(1)}%, ${theme === "river" ? 96 : 124}px)`;
  const words = STEP_WORDS[theme];

  const land = useEffectEvent((s: number) => {
    if (quiet || s === 0) return;
    sfx("hop");
    setTimeout(
      () => sfx(s > n ? "fanfare" : theme === "river" ? "splash" : "pop"),
      s > n ? 380 : 330,
    );
  });
  useEffect(() => land(spot), [spot]);

  return (
    <div className="kw-scene">
      <div
        className={`kw-river kw-theme-${theme}${finished ? " won" : ""}`}
        role="img"
        aria-label={`พี่ปูกระโดดบน${words.thing} ${Math.min(hops, n)} จาก ${n}`}
      >
        <svg
          className="kw-river-bg"
          viewBox="0 0 400 240"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <Backdrop theme={theme} sx={startX * 4} gx={goalX * 4} />
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
              className={`kw-stone kw-step-${theme} ${state}`}
              style={{ left: `${stoneX(i)}%`, top: `${stoneY(i)}%`, width: stepWidth }}
            >
              <StepShape theme={theme} />
              <b>{p}</b>
            </span>
          );
        })}
        <span
          className="kw-river-crab"
          style={{ left: `${crabX}%`, top: `${crabY}%`, width: `min(${(gap * 1.1).toFixed(1)}%, 104px)` }}
        >
          <span key={spot} className={spot ? "kw-jump" : ""}>
            <Art kind="crab" label="" />
          </span>
        </span>
        {finished && (
          <span className="kw-river-party" style={{ left: `${goalX}%` }}>
            <Burst count={18} />
          </span>
        )}
      </div>
      <Line
        parts={parts}
        done={finished ? n : Math.min(hops, n)}
        joiner={(i) => (!blend ? " " : i === n - 1 ? " → " : " + ")}
      />
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
      <Line
        parts={parts}
        done={finished ? parts.length : coupled}
        joiner={() => ""}
      />
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
