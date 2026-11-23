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
            <stop offset="0" stopColor="#6EC6FF" />
            <stop offset=".65" stopColor="#BFE6FF" />
            <stop offset="1" stopColor="#FFE3F1" />
          </linearGradient>
          <radialGradient id="kw-sky-sun" cx=".5" cy=".5" r=".5">
            <stop offset="0" stopColor="#FFF6C9" />
            <stop offset=".55" stopColor="#FFE27A" />
            <stop offset="1" stopColor="#FFE27A" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="400" height="240" fill="url(#kw-sky)" />
        <circle cx="58" cy="44" r="42" fill="url(#kw-sky-sun)" />
        <circle
          cx="58"
          cy="44"
          r="18"
          fill="#FFE27A"
          stroke="#F5B83D"
          strokeWidth="3"
        />
        <g
          fill="none"
          stroke="#5A7FB8"
          strokeWidth="2.2"
          strokeLinecap="round"
          opacity=".55"
        >
          <path d="M150 36 q6 -6 12 0 q6 -6 12 0" />
          <path d="M186 52 q5 -5 10 0 q5 -5 10 0" />
        </g>
        <g fill="#FFFFFF" opacity=".7">
          <path d="M228 46 q4 -16 20 -12 q8 -14 24 -4 q16 -2 16 12 q8 6 -2 12 h-54 q-10 -4 -4 -8z" />
          <path d="M318 30 q3 -10 14 -8 q6 -10 17 -3 q11 -1 11 8 q6 4 -1 8 h-38 q-7 -3 -3 -5z" />
        </g>
        {/* A sea of clouds along the bottom */}
        <path
          d={`M0 240 V214 ${Array.from({ length: 11 }, (_, i) => `q${i % 2 ? 12 : 16} ${i % 2 ? -20 : -24} 36 ${i % 3 ? -2 : 2}`).join(" ")} V240 Z`}
          fill="#FFFFFF"
          opacity=".9"
        />
        <path
          d={`M0 240 V228 ${Array.from({ length: 10 }, () => "q20 -10 40 0").join(" ")} V240 Z`}
          fill="#EAF4FF"
        />
        {/* Start: a big cloud to stand on */}
        <path
          d={`M${sx - 44} 170 q-10 -14 6 -22 q2 -20 26 -16 q12 -18 34 -6 q22 -6 26 14 q14 4 8 20 q-2 10 -14 10 h-74 q-14 0 -12 0z`}
          fill="#FFFFFF"
          stroke="#B8D3EE"
          strokeWidth="3"
        />
        {/* Goal: rainbow resting on two clouds */}
        <g fill="none" strokeWidth="8" strokeLinecap="round">
          {[
            "#FF6B6B",
            "#FFA94D",
            "#FFE27A",
            "#6FD08C",
            "#5DADFF",
            "#A98BFF",
          ].map((c, i) => (
            <path
              key={c}
              d={`M${gx - 46 + i * 7} 176 A${46 - i * 7} ${58 - i * 7} 0 0 1 ${gx + 46 - i * 7} 176`}
              stroke={c}
            />
          ))}
        </g>
        <path
          d={`M${gx - 70} 184 q4 -14 20 -10 q8 -14 24 -2 q14 -2 12 12 z M${gx + 18} 184 q4 -14 20 -10 q8 -14 24 -2 q14 -2 12 12 z`}
          fill="#FFFFFF"
          stroke="#B8D3EE"
          strokeWidth="2.5"
        />
      </>
    );
  if (theme === "forest")
    return (
      <>
        <defs>
          <linearGradient id="kw-forest-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8ED8FF" />
            <stop offset="1" stopColor="#DFF6FF" />
          </linearGradient>
        </defs>
        <rect width="400" height="240" fill="url(#kw-forest-sky)" />
        <circle
          cx="342"
          cy="40"
          r="20"
          fill="#FFE27A"
          stroke="#F5B83D"
          strokeWidth="3"
        />
        <g fill="#FFFFFF" opacity=".85">
          <path d="M70 40 q3 -12 16 -9 q6 -11 19 -3 q12 -1 12 9 q6 5 -1 9 h-42 q-8 -3 -4 -6z" />
          <path d="M210 26 q3 -9 12 -7 q5 -8 14 -2 q9 -1 9 7 q5 3 -1 7 h-31 q-6 -2 -3 -5z" />
        </g>
        {/* Far hills, then two rows of trees */}
        <path
          d="M0 112 Q60 70 130 98 Q200 66 270 96 Q340 70 400 92 V240 H0 Z"
          fill="#A6DCA0"
        />
        {[
          [26, 92, 30, "#5FB86A"],
          [96, 84, 24, "#4FA35D"],
          [176, 90, 28, "#5FB86A"],
          [250, 82, 22, "#4FA35D"],
          [312, 88, 30, "#5FB86A"],
          [384, 86, 24, "#4FA35D"],
        ].map(([x, y, r, c]) => (
          <g key={x}>
            <rect
              x={(x as number) - 4}
              y={y as number}
              width="8"
              height="34"
              rx="3"
              fill="#8A5A2B"
            />
            <circle
              cx={x as number}
              cy={y as number}
              r={r as number}
              fill={c as string}
              stroke="#3E8A4B"
              strokeWidth="2.5"
            />
            <circle
              cx={(x as number) - (r as number) / 3}
              cy={(y as number) - (r as number) / 3}
              r={(r as number) / 3.2}
              fill="#FFFFFF"
              opacity=".22"
            />
          </g>
        ))}
        {[
          [60, 96],
          [212, 92],
          [350, 100],
        ].map(([x, y]) => (
          <g key={x}>
            <rect x={x - 3} y={y + 12} width="6" height="16" fill="#8A5A2B" />
            <path
              d={`M${x} ${y - 30} L${x + 20} ${y + 16} H${x - 20} Z`}
              fill="#3F9A55"
              stroke="#2E7440"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
          </g>
        ))}
        <path d="M0 128 Q100 112 200 126 T400 120 V240 H0 Z" fill="#86C96F" />
        <path d="M0 160 Q120 146 220 162 T400 156 V240 H0 Z" fill="#74BA5E" />
        {/* Path from start to the chest */}
        <path
          d={`M${sx - 40} 214 Q${(sx + gx) / 2} 158 ${gx + 40} 196`}
          fill="none"
          stroke="#E9CF95"
          strokeWidth="28"
          strokeLinecap="round"
        />
        <path
          d={`M${sx - 40} 214 Q${(sx + gx) / 2} 158 ${gx + 40} 196`}
          fill="none"
          stroke="#D9B979"
          strokeWidth="2"
          strokeDasharray="4 10"
          strokeLinecap="round"
        />
        {/* Flowers and bushes */}
        {[
          [30, 196, "#FF8FB1"],
          [120, 222, "#FFE27A"],
          [250, 226, "#FF8FB1"],
          [370, 220, "#C9A2FF"],
        ].map(([x, y, c]) => (
          <g key={x as number}>
            <circle
              cx={x as number}
              cy={y as number}
              r="5"
              fill={c as string}
            />
            <circle cx={x as number} cy={y as number} r="2" fill="#FFF6C9" />
          </g>
        ))}
        {/* Goal: treasure chest with sparkles */}
        <g transform={`translate(${gx - 24} 150)`}>
          <ellipse cx="24" cy="44" rx="30" ry="6" fill="#000" opacity=".15" />
          <rect
            x="0"
            y="16"
            width="48"
            height="28"
            rx="4"
            fill="#C27A3A"
            stroke="#7E4A1E"
            strokeWidth="3"
          />
          <path
            d="M0 20 Q24 -6 48 20 Z"
            fill="#D98E46"
            stroke="#7E4A1E"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path d="M0 20 H48" stroke="#E8B04A" strokeWidth="4" />
          <rect
            x="20"
            y="20"
            width="8"
            height="11"
            rx="2"
            fill="#FFD25E"
            stroke="#C98B1C"
            strokeWidth="2"
          />
          <g fill="#FFE27A">
            <path d="M6 2 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" />
            <path d="M42 -2 l1.5 4 4 1.5 -4 1.5 -1.5 4 -1.5 -4 -4 -1.5 4 -1.5z" />
          </g>
        </g>
      </>
    );
  if (theme === "night")
    return (
      <>
        <defs>
          <linearGradient id="kw-night" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#141850" />
            <stop offset=".7" stopColor="#3A2C7E" />
            <stop offset="1" stopColor="#5A3A92" />
          </linearGradient>
          <radialGradient id="kw-moon-glow" cx=".5" cy=".5" r=".5">
            <stop offset="0" stopColor="#FFF1B8" stopOpacity=".55" />
            <stop offset="1" stopColor="#FFF1B8" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="400" height="240" fill="url(#kw-night)" />
        <g fill="#FFF6D8">
          {[
            [30, 30, 1.6],
            [90, 70, 2.4],
            [150, 22, 1.4],
            [210, 60, 1.8],
            [262, 18, 2.6],
            [320, 74, 1.4],
            [382, 30, 2],
            [60, 206, 1.6],
            [130, 226, 2],
            [244, 212, 1.4],
            [300, 230, 2.2],
            [372, 196, 1.6],
            [24, 120, 1.4],
            [176, 112, 1.2],
            [118, 150, 1.6],
          ].map(([x, y, r]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={r} />
          ))}
          <path d="M98 34 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2z" />
          <path d="M286 52 l1.6 5 5 1.6 -5 1.6 -1.6 5 -1.6 -5 -5 -1.6 5 -1.6z" />
        </g>
        {/* Shooting star */}
        <path
          d="M232 30 L190 44"
          stroke="#FFF6D8"
          strokeWidth="2"
          strokeLinecap="round"
          opacity=".7"
        />
        <circle cx="232" cy="30" r="3" fill="#FFF6D8" />
        {/* A far planet */}
        <circle
          cx="160"
          cy="62"
          r="13"
          fill="#FF9DB0"
          stroke="#C9637A"
          strokeWidth="2"
        />
        <path
          d="M150 58 q10 4 20 0"
          stroke="#C9637A"
          strokeWidth="2"
          fill="none"
          opacity=".6"
        />
        {/* Start: a little purple planet top */}
        <path
          d={`M${sx - 42} 196 Q${sx} 156 ${sx + 42} 196 Z`}
          fill="#7B6CF6"
          stroke="#B9AEFF"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <circle cx={sx - 14} cy="184" r="4" fill="#5E4FD8" />
        <circle cx={sx + 12} cy="178" r="3" fill="#5E4FD8" />
        {/* Goal: glowing smiling moon */}
        <circle cx={gx} cy="118" r="60" fill="url(#kw-moon-glow)" />
        <g transform={`translate(${gx} 118)`}>
          <circle r="30" fill="#FFE9A8" stroke="#F2C95C" strokeWidth="3" />
          <circle cx="-12" cy="-13" r="5" fill="#F5D57A" />
          <circle cx="14" cy="-14" r="3.5" fill="#F5D57A" />
          <circle cx="17" cy="13" r="4" fill="#F5D57A" />
          <circle cx="-8" cy="-2" r="2.4" fill="#3A2C7E" />
          <circle cx="8" cy="-2" r="2.4" fill="#3A2C7E" />
          <path
            d="M-7 8 q7 7 14 0"
            stroke="#3A2C7E"
            strokeWidth="2.4"
            fill="none"
            strokeLinecap="round"
          />
          <circle cx="-16" cy="7" r="3.5" fill="#FFB3A7" opacity=".7" />
          <circle cx="16" cy="5" r="3.5" fill="#FFB3A7" opacity=".7" />
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
      <svg viewBox="0 0 100 76" aria-hidden="true">
        <path
          d="M14 66 q-14 -2 -10 -18 q4 -14 20 -11 q2 -20 24 -20 q14 -14 32 -2 q20 -2 20 18 q14 6 6 22 q-4 11 -16 11 z"
          fill="#FFFFFF"
          stroke="#A9C8EA"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M18 64 q40 6 72 0"
          stroke="#DCEBFA"
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    );
  if (theme === "forest")
    return (
      <svg viewBox="0 0 100 76" aria-hidden="true">
        <path
          d="M38 44 h24 v22 q0 8 -8 8 h-8 q-8 0 -8 -8 z"
          fill="#FFF1DA"
          stroke="#C9A77A"
          strokeWidth="3"
        />
        <path
          d="M4 48 Q4 4 50 4 Q96 4 96 48 Q50 56 4 48 Z"
          fill="#E8574A"
          stroke="#A9382E"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M16 20 Q30 8 46 8"
          stroke="#FFFFFF"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          opacity=".5"
        />
        <g fill="#FFFFFF">
          <circle cx="13" cy="38" r="4" />
          <circle cx="87" cy="38" r="4" />
          <circle cx="76" cy="15" r="3.5" />
        </g>
      </svg>
    );
  if (theme === "night")
    return (
      <svg viewBox="0 0 100 76" aria-hidden="true">
        <ellipse
          cx="50"
          cy="46"
          rx="48"
          ry="9"
          fill="none"
          stroke="#FFD25E"
          strokeWidth="4"
        />
        <circle
          cx="50"
          cy="38"
          r="32"
          fill="#8FD3FF"
          stroke="#4E8FC4"
          strokeWidth="3"
        />
        <path
          d="M24 26 Q50 16 76 26"
          stroke="#BDE6FF"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          opacity=".7"
        />
        <path
          d="M18 46 A32 32 0 0 0 82 46"
          fill="none"
          stroke="#4E8FC4"
          strokeWidth="0"
        />
        <path
          d="M2 46 Q50 60 98 46"
          fill="none"
          stroke="#FFD25E"
          strokeWidth="4"
          strokeLinecap="round"
        />
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
              style={{
                left: `${stoneX(i)}%`,
                top: `${stoneY(i)}%`,
                width: stepWidth,
              }}
            >
              <StepShape theme={theme} />
              <b>{p}</b>
            </span>
          );
        })}
        <span
          className="kw-river-crab"
          style={{
            left: `${crabX}%`,
            top: `${crabY}%`,
            width: `min(${(gap * 1.1).toFixed(1)}%, 104px)`,
          }}
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
