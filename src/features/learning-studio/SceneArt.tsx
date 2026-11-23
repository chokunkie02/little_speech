import type { ReactNode } from "react";
export const SCENE_KINDS = [
  "crab-beach",
  "crab-box",
  "crow-box",
  "horse-box",
  "chicken-rice",
  "crow-tree",
  "cat-fish",
  "horse-garden",
  "pen",
  "backpack",
  "clock",
  "umbrella",
  "school",
  "market",
  "banana",
  "coconut",
  "mangosteen",
  "sound-pattern",
  "mouth-word",
  "horse",
  "shrimp",
  "box",
];

/** Same outline style as Art.tsx: darker shade of the fill, round joins. */
const line = (color: string, width = 3.5) => ({
  stroke: color,
  strokeWidth: width,
  strokeLinejoin: "round" as const,
  strokeLinecap: "round" as const,
});
const INK = "#2B2D42";
const eye = (x: number, y: number, r = 5.5) => (
  <>
    <circle cx={x} cy={y} r={r} fill={INK} />
    <circle cx={x + r * 0.35} cy={y - r * 0.38} r={r * 0.4} fill="#fff" />
  </>
);
const cheek = (x: number, y: number, rx = 6) => (
  <ellipse cx={x} cy={y} rx={rx} ry={rx * 0.6} fill="#FF7E9A" opacity=".5" />
);
const shine = (x: number, y: number, rx: number, ry: number, rotate = -25) => (
  <ellipse
    cx={x}
    cy={y}
    rx={rx}
    ry={ry}
    fill="#fff"
    opacity=".55"
    transform={`rotate(${rotate} ${x} ${y})`}
  />
);
const shadow = (cx = 120, cy = 166, rx = 72) => (
  <ellipse cx={cx} cy={cy} rx={rx} ry="7" fill="#1B1840" opacity=".1" />
);
/** Full-card background with rounded corners. */
const backdrop = (sky: string) => (
  <rect width="240" height="180" rx="16" fill={sky} />
);
const ground = (d: string, fill: string, edge?: string) => (
  <path d={d} fill={fill} {...(edge ? line(edge, 3) : {})} />
);
const cloud = (x: number, y: number, s = 1) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} fill="#fff">
    <ellipse cx="0" cy="0" rx="22" ry="9" />
    <ellipse cx="12" cy="-6" rx="13" ry="10" />
    <ellipse cx="-8" cy="-4" rx="10" ry="8" />
  </g>
);
const sun = (x: number, y: number, r = 14) => (
  <g>
    {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
      <path
        key={a}
        d={`M${x} ${y - r - 4}V${y - r - 10}`}
        transform={`rotate(${a} ${x} ${y})`}
        {...line("#FFC21A", 3)}
      />
    ))}
    <circle cx={x} cy={y} r={r} fill="#FFD23F" {...line("#F2A60C", 3)} />
  </g>
);
const flower = (x: number, y: number, c: string, s = 1) => (
  <g key={`${x}-${y}`} transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M0 0V18" {...line("#3F8A35", 3)} />
    {[0, 72, 144, 216, 288].map((a) => (
      <ellipse
        key={a}
        cx="0"
        cy="-6"
        rx="4"
        ry="6"
        fill={c}
        transform={`rotate(${a})`}
      />
    ))}
    <circle r="3.5" fill="#FFE066" />
  </g>
);

function horse() {
  const coat = "#C98B55";
  const far = "#B07440";
  const edge = "#7E4A26";
  const mane = "#8A5530";
  const maneEdge = "#5A3318";
  const leg = (x: number, fill: string) => (
    <g key={x}>
      <rect x={x} y="104" width="15" height="54" rx="7" fill={fill} {...line(edge)} />
      <rect x={x - 1} y="150" width="17" height="11" rx="3" fill="#4A3A35" {...line("#2E2420", 3)} />
    </g>
  );
  return (
    <>
      {shadow(118, 166, 70)}
      <path
        d="M60 90Q30 86 26 118Q24 138 36 150Q36 128 46 116Q44 136 54 146Q56 120 66 102Z"
        fill={mane}
        {...line(maneEdge)}
      />
      {leg(76, far)}
      {leg(142, far)}
      {leg(58, coat)}
      {leg(124, coat)}
      <ellipse cx="106" cy="98" rx="56" ry="30" fill={coat} {...line(edge)} />
      <path d="M62 108Q104 132 154 110Q140 126 106 128Q74 126 62 108Z" fill={far} />
      <path
        d="M132 96Q136 60 156 38L182 52Q166 76 164 104Z"
        fill={coat}
        {...line(edge)}
      />
      <path d="M156 34L154 12L170 28Z" fill={coat} {...line(edge)} />
      <path d="M166 30L170 8L180 30Z" fill={coat} {...line(edge)} />
      <path d="M159 30L158 19L165 27Z" fill="#F2A7A0" />
      <path
        d="M168 26Q146 22 138 46Q130 66 128 94L140 96Q142 72 152 56Q160 44 174 40Z"
        fill={mane}
        {...line(maneEdge)}
      />
      <ellipse
        cx="182"
        cy="58"
        rx="31"
        ry="18"
        transform="rotate(38 182 58)"
        fill={coat}
        {...line(edge)}
      />
      <ellipse
        cx="200"
        cy="74"
        rx="16"
        ry="13"
        transform="rotate(38 200 74)"
        fill="#EBC197"
        {...line(edge)}
      />
      <path d="M166 34Q178 38 176 50Q168 44 166 34Z" fill={mane} {...line(maneEdge, 2.5)} />
      <ellipse cx="206" cy="72" rx="2.5" ry="3.5" fill={edge} />
      <path d="M192 84Q198 88 204 84" fill="none" {...line(INK, 2.5)} />
      {shine(84, 80, 16, 5, -10)}
      {eye(178, 54, 5.5)}
      {cheek(186, 70)}
    </>
  );
}

function shrimp() {
  const fill = "#FF8A5B";
  const edge = "#C9502A";
  const C = [110, 96];
  const R = 42;
  const at = (deg: number, r: number) => {
    const a = (deg * Math.PI) / 180;
    return `${(C[0] + r * Math.cos(a)).toFixed(1)} ${(C[1] + r * Math.sin(a)).toFixed(1)}`;
  };
  // Body: a tapered ring from the head (0°) round over the top to the tail.
  const steps = Array.from({ length: 25 }, (_, i) => {
    const t = i / 24;
    return { deg: -t * 235, w: 32 - 18 * t };
  });
  const body =
    "M" +
    steps.map((s) => at(s.deg, R + s.w / 2)).join("L") +
    "L" +
    [...steps].reverse().map((s) => at(s.deg, R - s.w / 2)).join("L") +
    "Z";
  const widthAt = (deg: number) => 32 - (18 * -deg) / 235;
  return (
    <>
      {shadow(120, 166, 64)}
      <path d="M186 84Q200 26 150 16Q112 10 88 30" fill="none" {...line(edge, 3)} />
      <path d="M180 82Q190 38 158 30Q136 26 118 38" fill="none" {...line(edge, 3)} />
      <g transform="translate(86 128) rotate(32)">
        {[-34, 0, 34].map((r) => (
          <ellipse
            key={r}
            cx="14"
            cy="0"
            rx="15"
            ry="7"
            fill="#FF9F78"
            transform={`rotate(${r})`}
            {...line(edge, 3)}
          />
        ))}
      </g>
      <path d={body} fill={fill} {...line(edge)} />
      <path
        d={`M${at(-40, R + 8)}A${R + 8} ${R + 8} 0 0 0 ${at(-150, R + 6)}`}
        fill="none"
        {...line("#FFC3A0", 4)}
      />
      {[-30, -62, -94, -126, -158, -190, -215].map((d) => (
        <path
          key={d}
          d={`M${at(d, R - widthAt(d) / 2)}L${at(d, R + widthAt(d) / 2)}`}
          {...line(edge, 2.5)}
        />
      ))}
      {[146, 158, 170].map((x) => (
        <path key={x} d={`M${x} 112L${x - 4} 132`} {...line("#E8693A", 4)} />
      ))}
      <path d="M184 88L212 83L186 97Z" fill={fill} {...line(edge, 3)} />
      <ellipse
        cx="162"
        cy="96"
        rx="30"
        ry="22"
        transform="rotate(-8 162 96)"
        fill={fill}
        {...line(edge)}
      />
      {shine(152, 84, 10, 4, -10)}
      {eye(172, 90, 6)}
      <path d="M176 106Q182 110 188 105" fill="none" {...line(INK, 2.5)} />
      {cheek(162, 106, 5)}
    </>
  );
}

function pen() {
  return (
    <>
      {shadow(120, 166, 60)}
      <path
        d="M30 150Q48 132 62 148T96 146T128 150"
        fill="none"
        {...line("#3D6FE0", 4)}
      />
      <g transform="rotate(40 130 90)">
        <path d="M118 140L130 166L142 140Z" fill="#D6DCE6" {...line("#7D8799")} />
        <path d="M126 158L130 168L134 158Z" fill="#2F55C8" />
        <rect x="116" y="104" width="28" height="38" rx="4" fill="#2F55C8" {...line("#1E3A8F")} />
        {[112, 120, 128].map((y) => (
          <path key={y} d={`M118 ${y}H142`} {...line("#5C82F0", 2.5)} />
        ))}
        <rect x="114" y="24" width="32" height="84" rx="8" fill="#4F86F7" {...line("#1E3A8F")} />
        <rect x="114" y="18" width="32" height="38" rx="9" fill="#2F55C8" {...line("#1E3A8F")} />
        <path d="M148 24V64Q148 70 152 66" fill="none" {...line("#B9C2D3", 5)} />
        <path d="M148 24V64Q148 70 152 66" fill="none" {...line("#E6EAF2", 2)} />
        <rect x="120" y="62" width="5" height="40" rx="2.5" fill="#fff" opacity=".5" />
      </g>
    </>
  );
}

function backpack() {
  const body = "#4C8DF6";
  const edge = "#2557B8";
  return (
    <>
      {shadow(120, 168, 64)}
      <path d="M100 38V24Q120 8 140 24V38" fill="none" {...line(edge, 12)} />
      <path d="M100 38V24Q120 8 140 24V38" fill="none" {...line("#7AAAF8", 6)} />
      <rect x="44" y="76" width="26" height="62" rx="10" fill="#3A78E0" {...line(edge)} />
      <rect x="170" y="76" width="26" height="62" rx="10" fill="#3A78E0" {...line(edge)} />
      <rect x="60" y="34" width="120" height="132" rx="32" fill={body} {...line(edge)} />
      <path d="M66 64Q120 30 174 64" fill="none" {...line("#FFD23F", 4)} />
      <path d="M66 64Q120 30 174 64" fill="none" stroke="#C99A06" strokeWidth="1.5" strokeDasharray="3 4" />
      <path d="M128 48l2 14" {...line("#C99A06", 4)} />
      <rect x="78" y="94" width="84" height="58" rx="16" fill="#FFD23F" {...line("#C99A06")} />
      <path d="M78 112H162" {...line("#C99A06", 3)} />
      <rect x="112" y="106" width="16" height="10" rx="3" fill="#fff" {...line("#C99A06", 2.5)} />
      <path d="M140 112v12" {...line("#8A6A06", 4)} />
      {shine(80, 52, 12, 5, -30)}
      <circle cx="96" cy="134" r="6" fill="#FF5A5F" />
      <path d="M140 132l4 8 8 1-6 6 2 8-8-4-8 4 2-8-6-6 8-1Z" fill="#fff" opacity=".85" />
    </>
  );
}

function clock() {
  const body = "#FF5A5F";
  const edge = "#B23A48";
  return (
    <>
      {shadow(120, 168, 60)}
      <path d="M78 140L62 164M162 140L178 164" {...line(edge, 9)} />
      <path d="M78 34Q70 14 92 16" fill="none" {...line("#9AA3B5", 6)} />
      <path d="M62 52Q58 22 92 22Z" fill="#FFD23F" {...line("#C99A06")} />
      <path d="M178 52Q182 22 148 22Z" fill="#FFD23F" {...line("#C99A06")} />
      <path d="M120 26V16M108 14H132" {...line("#9AA3B5", 5)} />
      <circle cx="120" cy="94" r="64" fill={body} {...line(edge)} />
      <circle cx="120" cy="94" r="50" fill="#FFFDF5" {...line(edge, 3)} />
      {Array.from({ length: 12 }, (_, i) => (
        <path
          key={i}
          d={i % 3 ? "M120 48V52" : "M120 47V54"}
          transform={`rotate(${i * 30} 120 94)`}
          {...line("#8A8FA3", i % 3 ? 2.5 : 3.5)}
        />
      ))}
      {[
        ["12", 120, 70],
        ["3", 148, 100],
        ["6", 120, 128],
        ["9", 92, 100],
      ].map(([t, x, y]) => (
        <text
          key={t}
          x={x}
          y={y}
          fontFamily="Arial, Helvetica, sans-serif"
          fontWeight="700"
          fontSize="15"
          textAnchor="middle"
          fill={INK}
        >
          {t}
        </text>
      ))}
      <path d="M120 94L148 78M120 94L102 84" fill="none" {...line(INK, 5)} />
      <circle cx="120" cy="94" r="5" fill={body} />
      {shine(84, 52, 12, 5, -40)}
    </>
  );
}

function umbrella() {
  const xs = [28, 74, 120, 166, 212];
  const panel = (i: number) => {
    const a = xs[i];
    const b = xs[i + 1];
    return `M120 26Q${a} 30 ${a} 92Q${(a + b) / 2} 76 ${b} 92Q${b} 30 120 26Z`;
  };
  return (
    <>
      {shadow(120, 168, 56)}
      {[
        [34, 120],
        [52, 146],
        [200, 124],
        [186, 150],
      ].map(([x, y]) => (
        <path
          key={x}
          d={`M${x} ${y}q6 9 0 12q-6-3 0-12Z`}
          fill="#7CC4F5"
          {...line("#3D8FD1", 2)}
        />
      ))}
      <path
        d="M120 90V150Q120 166 134 164Q146 162 144 150"
        fill="none"
        {...line("#5B3A20", 10)}
      />
      <path
        d="M120 90V150Q120 166 134 164Q146 162 144 150"
        fill="none"
        {...line("#A0663A", 5)}
      />
      {[0, 1, 2, 3].map((i) => (
        <path
          key={i}
          d={panel(i)}
          fill={i % 2 ? "#FFD23F" : "#FF5A5F"}
          {...line(i % 2 ? "#C99A06" : "#B23A48")}
        />
      ))}
      <path d="M120 26V14" {...line("#5B3A20", 5)} />
      {shine(80, 50, 14, 5, -40)}
    </>
  );
}

function school() {
  const wall = "#FFE8B8";
  const edge = "#B8874A";
  const win = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width="22" height="20" rx="2" fill="#BFE6FF" {...line("#6A8FB0", 2.5)} />
      <path d={`M${x + 11} ${y}V${y + 20}`} {...line("#6A8FB0", 2)} />
    </g>
  );
  return (
    <>
      {backdrop("#CDEFFF")}
      {cloud(60, 28)}
      {ground("M0 150H240V164Q240 180 224 180H16Q0 180 0 164Z", "#7FCB5B")}
      <rect x="22" y="66" width="164" height="90" fill={wall} {...line(edge)} />
      <path d="M22 106H186" {...line(edge, 3)} />
      <path d="M10 70L48 34H160L198 70Z" fill="#E8553D" {...line("#A3311F")} />
      <path d="M48 34L104 10L160 34Z" fill="#F07A3D" {...line("#A3311F")} />
      <path d="M104 10V2M100 4L104 0L108 4" fill="none" {...line("#C99A06", 3)} />
      {[34, 64, 93, 122, 152].map((x) => win(x, 78))}
      {[34, 64, 122, 152].map((x) => win(x, 120))}
      <path d="M90 156V118Q104 106 118 118V156Z" fill="#4C8DF6" {...line("#2557B8")} />
      <path d="M104 112V156" {...line("#2557B8", 2.5)} />
      <rect x="86" y="20" width="36" height="12" rx="3" fill="#fff" {...line("#A3311F", 2.5)} />
      <path d="M94 26H114" {...line("#8A8FA3", 3)} />
      <path d="M212 158V22" {...line("#6E7487", 4)} />
      <circle cx="212" cy="20" r="3.5" fill="#FFD23F" />
      <g>
        <rect x="214" y="26" width="24" height="17" fill="#fff" />
        <rect x="214" y="26" width="24" height="3" fill="#E03A3E" />
        <rect x="214" y="32" width="24" height="5.5" fill="#2D3A8C" />
        <rect x="214" y="40" width="24" height="3" fill="#E03A3E" />
        <rect x="214" y="26" width="24" height="17" fill="none" {...line("#8A8FA3", 1.5)} />
      </g>
      <circle cx="198" cy="150" r="9" fill="#5DBB4A" {...line("#2F7A2A", 2.5)} />
      <circle cx="10" cy="152" r="8" fill="#5DBB4A" {...line("#2F7A2A", 2.5)} />
    </>
  );
}

function banana() {
  const one = (r: number, k: number) => (
    <g key={r} transform={`rotate(${r} 60 56)`}>
      <path
        d="M56 56Q46 132 136 140Q184 142 206 104Q170 120 136 116Q80 108 70 56Z"
        fill={k ? "#FFE066" : "#FFD23F"}
        {...line("#C99A06")}
      />
      <path d="M62 70Q66 120 130 130Q100 116 80 90Z" fill="#F2B807" opacity=".6" />
      <path d="M200 106L210 100L208 110Z" fill="#6B4A1F" {...line("#4A3315", 2)} />
    </g>
  );
  return (
    <>
      {shadow(130, 160, 70)}
      {one(14, 0)}
      {one(0, 1)}
      {one(-14, 0)}
      <path d="M54 58L50 36Q60 30 68 36L70 58Z" fill="#8DB85A" {...line("#5A7F2E")} />
      {shine(112, 120, 18, 4, 15)}
    </>
  );
}

function coconut() {
  const shell = "#8B5A2B";
  const edge = "#5C3A1A";
  return (
    <>
      {shadow(122, 164, 84)}
      <circle cx="80" cy="100" r="54" fill={shell} {...line(edge)} />
      {[
        "M42 80Q56 70 64 92",
        "M50 120Q64 108 78 126",
        "M86 68Q100 60 110 76",
        "M96 112Q110 104 118 122",
        "M60 140Q74 134 84 146",
      ].map((d) => (
        <path key={d} d={d} fill="none" {...line("#B07A45", 3)} />
      ))}
      {[
        [74, 58],
        [88, 58],
        [81, 68],
      ].map(([x, y]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r="4" fill="#3E2611" />
      ))}
      {shine(54, 74, 12, 5, -40)}
      <ellipse cx="168" cy="112" rx="52" ry="48" fill={shell} {...line(edge)} />
      <ellipse cx="168" cy="112" rx="43" ry="39" fill="#FFFFFF" {...line("#E6DCC8", 2)} />
      <ellipse cx="168" cy="112" rx="30" ry="27" fill="#F4F9F2" />
      <path d="M150 98Q160 90 172 92" fill="none" {...line("#fff", 4)} />
    </>
  );
}

function mangosteen() {
  const rind = "#7A3A82";
  const edge = "#4E1F55";
  return (
    <>
      {shadow(120, 166, 86)}
      <circle cx="78" cy="106" r="52" fill={rind} {...line(edge)} />
      <path d="M38 128Q60 160 100 152Q70 150 50 120Z" fill="#62286A" />
      {shine(56, 86, 14, 6, -40)}
      {[-60, -20, 20, 60].map((r) => (
        <ellipse
          key={r}
          cx="78"
          cy="44"
          rx="9"
          ry="17"
          transform={`rotate(${r} 78 60)`}
          fill="#6FAE4C"
          {...line("#3F7A2A", 3)}
        />
      ))}
      <path d="M78 54V36" {...line("#5A7F2E", 6)} />
      <circle cx="168" cy="114" r="48" fill={rind} {...line(edge)} />
      <circle cx="168" cy="114" r="39" fill="#B33A6B" />
      <circle cx="168" cy="114" r="30" fill="#FFF8EE" />
      {[0, 60, 120, 180, 240, 300].map((r) => (
        <path
          key={r}
          d="M168 114L168 86"
          transform={`rotate(${r} 168 114)`}
          {...line("#E6D8CC", 2.5)}
        />
      ))}
      <circle cx="168" cy="114" r="5" fill="#F0E4D6" />
      {shine(152, 98, 8, 3, -40)}
    </>
  );
}

function box() {
  const left = "#D9A86C";
  const right = "#C48F52";
  const flap = "#E8C08A";
  const edge = "#8A5F33";
  return (
    <>
      {shadow(120, 166, 84)}
      <path d="M52 76L122 56L104 30L32 50Z" fill={flap} {...line(edge)} />
      <path d="M122 56L192 74L214 46L140 28Z" fill={flap} {...line(edge)} />
      <path d="M52 76L120 96L192 74L122 56Z" fill="#7A522B" {...line(edge)} />
      <path d="M52 76L120 96V162L52 142Z" fill={left} {...line(edge)} />
      <path d="M120 96L192 74V140L120 162Z" fill={right} {...line(edge)} />
      <path d="M52 76L120 96L106 120L36 98Z" fill={flap} {...line(edge)} />
      <path d="M120 96L192 74L204 98L134 120Z" fill="#D9A86C" {...line(edge)} />
      <path d="M156 110V150" {...line("#E8D2A8", 8)} />
      <path d="M64 126L100 136V150L64 140Z" fill="#FFF3DE" {...line(edge, 2)} />
      <path d="M72 134L92 140" {...line("#B8874A", 2)} />
    </>
  );
}

export function SceneArt({
  kind,
  art,
}: {
  kind: string;
  art: (kind: string) => ReactNode;
}) {
  const draw = (
    name: string,
    x: number,
    y: number,
    w: number,
    h: number,
    rotate = 0,
  ) => (
    <g transform={`rotate(${rotate} ${x + w / 2} ${y + h / 2})`}>
      <svg x={x} y={y} width={w} height={h} viewBox="0 0 240 180">
        {art(name)}
      </svg>
    </g>
  );
  let content: ReactNode;
  if (kind === "box") content = box();
  else if (kind === "horse") content = horse();
  else if (kind === "shrimp") content = shrimp();
  else if (kind.endsWith("-box")) {
    const subject = kind.split("-")[0];
    const edge = "#8A5F33";
    content = (
      <>
        {backdrop("#FFF1DC")}
        {ground("M0 146H240V164Q240 180 224 180H16Q0 180 0 164Z", "#F2D7B0")}
        <path d="M40 112L58 92H182L200 112Z" fill="#7A522B" {...line(edge)} />
        {draw(subject, 30, 4, 180, 135)}
        <path d="M40 112L14 132L22 92L58 92Z" fill="#E8C08A" {...line(edge)} />
        <path d="M200 112L226 132L218 92L182 92Z" fill="#E8C08A" {...line(edge)} />
        <rect x="40" y="110" width="160" height="62" rx="4" fill="#D9A86C" {...line(edge)} />
        <path d="M40 110H200V122H40Z" fill="#C48F52" />
        <path d="M120 110V172" {...line("#E8D2A8", 10)} />
        <rect x="58" y="134" width="34" height="22" rx="3" fill="#FFF3DE" {...line(edge, 2)} />
      </>
    );
  } else if (kind === "crab-beach")
    content = (
      <>
        {backdrop("#BDE8F5")}
        {sun(204, 30)}
        {cloud(54, 26)}
        {cloud(140, 18, 0.7)}
        <path d="M0 62H240V100H0Z" fill="#4FC3E0" />
        <path d="M14 76q8-5 16 0M70 70q8-5 16 0M150 80q8-5 16 0M196 68q8-5 16 0" fill="none" {...line("#fff", 2.5)} />
        {ground(
          "M0 92Q60 80 120 92T240 88V164Q240 180 224 180H16Q0 180 0 164Z",
          "#F7DCA0",
        )}
        {[
          [30, 150],
          [60, 168],
          [200, 160],
          [222, 138],
          [100, 172],
        ].map(([x, y]) => (
          <circle key={`${x}${y}`} cx={x} cy={y} r="2" fill="#D9B46A" />
        ))}
        <path
          d="M208 154l4-10 4 10 10 1-8 6 3 10-9-6-9 6 3-10-8-6Z"
          fill="#FF8A5B"
          {...line("#C9502A", 2.5)}
        />
        <path
          d="M18 140q10-14 20 0q-10 8-20 0Z"
          fill="#FFE3EC"
          {...line("#D98AA0", 2.5)}
        />
        {draw("crab", 20, 22, 200, 150)}
      </>
    );
  else if (kind === "chicken-rice")
    content = (
      <>
        {backdrop("#D9F2FF")}
        {sun(208, 28, 12)}
        {cloud(40, 26)}
        <path d="M0 96H240" {...line("#C99A6A", 4)} />
        {[16, 56, 96, 136, 176, 216].map((x) => (
          <path key={x} d={`M${x} 86V120`} {...line("#C99A6A", 5)} />
        ))}
        {ground(
          "M0 112Q80 100 160 112T240 108V164Q240 180 224 180H16Q0 180 0 164Z",
          "#9ED86F",
        )}
        {draw("chicken", 0, 18, 160, 135)}
        {draw("rice", 132, 82, 104, 84)}
      </>
    );
  else if (kind === "cat-fish")
    content = (
      <>
        {backdrop("#FFE9D6")}
        <rect x="164" y="18" width="52" height="40" rx="4" fill="#CDEFFF" {...line("#C9A27A", 3)} />
        <path d="M190 18V58M164 38H216" {...line("#C9A27A", 3)} />
        {ground("M0 128H240V164Q240 180 224 180H16Q0 180 0 164Z", "#E6B98A")}
        <path d="M0 128H240" {...line("#C9925A", 3)} />
        {draw("cat", -4, 8, 170, 140)}
        <ellipse cx="172" cy="154" rx="56" ry="14" fill="#fff" {...line("#9FB4D8", 3)} />
        <ellipse cx="172" cy="152" rx="40" ry="8" fill="#E8F1FB" />
        {draw("fish", 122, 100, 100, 75)}
      </>
    );
  else if (kind === "crow-tree")
    content = (
      <>
        {backdrop("#D2EEFF")}
        {sun(36, 30, 12)}
        {cloud(120, 22, 0.8)}
        {ground(
          "M0 150Q80 140 160 150T240 146V164Q240 180 224 180H16Q0 180 0 164Z",
          "#8FD16A",
        )}
        <path
          d="M178 180V96L192 60L200 62L190 96L200 180Z"
          fill="#A0663A"
          {...line("#6B3F1F")}
        />
        <path d="M184 120Q120 118 20 128L22 140Q120 132 186 134Z" fill="#A0663A" {...line("#6B3F1F")} />
        {[
          [196, 40, 30],
          [222, 70, 24],
          [166, 60, 22],
          [214, 22, 18],
        ].map(([x, y, r]) => (
          <circle key={`o${x}`} cx={x} cy={y} r={r} fill="#2F7A2A" stroke="#2F7A2A" strokeWidth="7" />
        ))}
        {[
          [196, 40, 30],
          [222, 70, 24],
          [166, 60, 22],
          [214, 22, 18],
        ].map(([x, y, r]) => (
          <circle key={x} cx={x} cy={y} r={r} fill="#5DBB4A" />
        ))}
        <path d="M40 130q-6-12 8-14q2 10-8 14Z" fill="#5DBB4A" {...line("#2F7A2A", 2.5)} />
        {draw("crow", 26, 4, 160, 132)}
      </>
    );
  else if (kind === "horse-garden")
    content = (
      <>
        {backdrop("#CDEFFF")}
        {sun(210, 28, 12)}
        {cloud(70, 24)}
        <path d="M0 110Q60 80 130 104T240 92V140H0Z" fill="#B5E28F" />
        {[12, 52, 92, 132, 172, 212].map((x) => (
          <path key={x} d={`M${x} 96V136`} {...line("#B8874A", 6)} />
        ))}
        <path d="M0 106H240M0 122H240" {...line("#D9A86C", 5)} />
        {ground(
          "M0 128Q80 118 160 130T240 124V164Q240 180 224 180H16Q0 180 0 164Z",
          "#7FCB5B",
        )}
        {draw("horse", 10, 10, 190, 158)}
        {flower(14, 150, "#FF5A5F")}
        {flower(204, 152, "#FFD23F")}
        {flower(226, 140, "#FF8FC8", 0.8)}
        {flower(30, 166, "#A77BF3", 0.8)}
      </>
    );
  else if (kind === "pen") content = pen();
  else if (kind === "backpack") content = backpack();
  else if (kind === "clock") content = clock();
  else if (kind === "umbrella") content = umbrella();
  else if (kind === "school") content = school();
  else if (kind === "market")
    content = (
      <>
        {backdrop("#FFF1DC")}
        {ground("M0 150H240V164Q240 180 224 180H16Q0 180 0 164Z", "#E6C9A1")}
        <path d="M30 60V150M210 60V150" {...line("#8A5F33", 7)} />
        <rect x="40" y="60" width="160" height="56" fill="#FFF8EE" />
        <path d="M20 22H220L230 58H10Z" fill="#FF5A5F" {...line("#B23A48")} />
        {[0, 2, 4, 6].map((i) => (
          <path
            key={i}
            d={`M${20 + i * 25} 22H${45 + i * 25}L${42 + i * 27.5 - i * 0.5} 58H${10 + i * 27.5}Z`}
            fill="#fff"
          />
        ))}
        <path d="M20 22H220L230 58H10Z" fill="none" {...line("#B23A48")} />
        <path
          d={Array.from({ length: 8 }, (_, i) => `${i ? "" : "M10 58"}q13.75 16 27.5 0`).join("")}
          fill="#FF5A5F"
          {...line("#B23A48")}
        />
        {draw("banana", 26, 52, 84, 63)}
        {draw("mangosteen", 102, 54, 80, 60)}
        <rect x="18" y="112" width="204" height="40" rx="5" fill="#D9A86C" {...line("#8A5F33")} />
        <path d="M18 126H222" {...line("#B8874A", 3)} />
        {draw("coconut", 50, 92, 80, 60)}
        {[172, 190, 208, 181, 199, 190].map((x, i) => (
          <circle key={`${x}${i}`} cx={x} cy={[106, 106, 106, 92, 92, 78][i]} r="9" fill="#FF9F1C" {...line("#C46F0A", 2.5)} />
        ))}
      </>
    );
  else if (kind === "banana") content = banana();
  else if (kind === "coconut") content = coconut();
  else if (kind === "mangosteen") content = mangosteen();
  else if (kind === "mouth-word")
    content = (
      <>
        <circle cx="120" cy="90" r="75" fill="#F9DECA" {...line("#D9A385")} />
        <path
          d="M86 66q8-8 16 0m36 0q8-8 16 0"
          fill="none"
          {...line("#866B62", 4)}
        />
        {cheek(78, 98, 10)}
        {cheek(162, 98, 10)}
        <path d="M86 108Q120 92 154 108Q148 150 120 150Q92 150 86 108Z" fill="#C2414F" {...line("#9E2F3B")} />
        <path d="M96 140Q120 124 144 140Q134 150 120 150Q106 150 96 140Z" fill="#FF8FA3" />
        <path d="M92 108Q120 100 148 108V114Q120 108 92 114Z" fill="#fff" />
        <path d="M200 70q10 20 0 40M214 60q16 30 0 60" fill="none" {...line("#9FB4D8", 4)} />
      </>
    );
  else
    content = (
      <>
        <circle cx="65" cy="91" r="29" fill="#D8CAF4" />
        <circle cx="120" cy="91" r="29" fill="#BBDDD7" />
        <circle cx="175" cy="91" r="29" fill="#F5D7A9" />
        <path
          d="M54 91h22m33-7v14m12-26v38m12-25v12m32-6h22"
          stroke="#807297"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </>
    );
  return (
    <svg
      viewBox="0 0 240 180"
      className="art scene-art"
      role="img"
      aria-label={kind}
    >
      {content}
    </svg>
  );
}
