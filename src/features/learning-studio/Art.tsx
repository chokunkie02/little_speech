import type { ReactNode } from "react";
import { SceneArt, SCENE_KINDS } from "./SceneArt";

/** Shared look: darker outline of the fill colour with round joins. */
const line = (color: string, width = 3.5) => ({
  stroke: color,
  strokeWidth: width,
  strokeLinejoin: "round" as const,
  strokeLinecap: "round" as const,
});
const INK = "#2B2D42";

function Eye({ x, y, r = 5.5 }: { x: number; y: number; r?: number }) {
  return (
    <>
      <circle cx={x} cy={y} r={r} fill={INK} />
      <circle cx={x + r * 0.35} cy={y - r * 0.38} r={r * 0.4} fill="#fff" />
    </>
  );
}
function Cheek({ x, y, rx = 6 }: { x: number; y: number; rx?: number }) {
  return (
    <ellipse cx={x} cy={y} rx={rx} ry={rx * 0.6} fill="#FF7E9A" opacity=".5" />
  );
}
function Smile({ d, color = INK }: { d: string; color?: string }) {
  return <path d={d} fill="none" {...line(color, 3)} />;
}
function Shadow({ cx = 120, cy = 166, rx = 72 }) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry="7" fill="#1B1840" opacity=".1" />;
}
function Shine({
  x,
  y,
  rx,
  ry,
  rotate = -25,
}: {
  x: number;
  y: number;
  rx: number;
  ry: number;
  rotate?: number;
}) {
  return (
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
}
/** A thick outlined stroke (legs, arms, tails). */
function Tube({
  d,
  w,
  fill,
  edge,
}: {
  d: string;
  w: number;
  fill: string;
  edge: string;
}) {
  return (
    <>
      <path d={d} fill="none" {...line(edge, w + 7)} />
      <path d={d} fill="none" {...line(fill, w)} />
    </>
  );
}
/** Overlapping circles merged under one outline (tree tops, bushes). */
function Puff({
  circles,
  fill,
  edge,
}: {
  circles: [number, number, number][];
  fill: string;
  edge: string;
}) {
  return (
    <>
      {circles.map(([x, y, r]) => (
        <circle key={`o${x},${y}`} cx={x} cy={y} r={r} fill={edge} stroke={edge} strokeWidth="7" />
      ))}
      {circles.map(([x, y, r]) => (
        <circle key={`f${x},${y}`} cx={x} cy={y} r={r} fill={fill} />
      ))}
    </>
  );
}
/** Pac-man shaped crab pincer, open towards `dir` degrees. */
function clawPath(cx: number, cy: number, r: number, dir: number) {
  const p = (deg: number, k = 1) => {
    const a = (deg * Math.PI) / 180;
    return `${(cx + r * k * Math.cos(a)).toFixed(1)} ${(cy + r * k * Math.sin(a)).toFixed(1)}`;
  };
  return `M${p(dir + 28)}A${r} ${r} 0 1 1 ${p(dir - 28)}L${p(dir, 0.15)}Z`;
}

function Crab({ animate }: { animate: boolean }) {
  const shell = "#FF7A59";
  const edge = "#C8452A";
  return (
    <g className={animate ? "crab-bob" : ""}>
      {[
        "M76 120Q54 122 40 140",
        "M78 132Q60 144 54 160",
        "M90 142Q80 154 80 166",
        "M164 120Q186 122 200 140",
        "M162 132Q180 144 186 160",
        "M150 142Q160 154 160 166",
      ].map((d) => (
        <Tube key={d} d={d} w={7} fill={shell} edge={edge} />
      ))}
      <Tube d="M84 100Q60 92 52 70" w={11} fill={shell} edge={edge} />
      <Tube d="M156 100Q180 92 188 70" w={11} fill={shell} edge={edge} />
      <path d={clawPath(46, 50, 25, -105)} fill={shell} {...line(edge)} />
      <path d={clawPath(194, 50, 25, -75)} fill={shell} {...line(edge)} />
      <Shine x={36} y={52} rx={6} ry={3.5} rotate={-60} />
      <Shine x={184} y={52} rx={6} ry={3.5} rotate={-60} />
      <Tube d="M104 86V62" w={5} fill={shell} edge={edge} />
      <Tube d="M136 86V62" w={5} fill={shell} edge={edge} />
      <ellipse cx="120" cy="114" rx="58" ry="40" fill={shell} {...line(edge)} />
      <path
        d="M66 124Q120 164 174 124Q166 150 120 153Q74 150 66 124Z"
        fill="#E85F3E"
      />
      <Shine x={92} y={92} rx={16} ry={6} rotate={-18} />
      <circle cx="146" cy="92" r="3.5" fill="#FFB199" />
      <circle cx="156" cy="100" r="2.5" fill="#FFB199" />
      {[104, 136].map((x) => (
        <g key={x}>
          <circle cx={x} cy={54} r={13} fill="#fff" {...line(edge)} />
          <Eye x={x + 1.5} y={56} r={6.5} />
        </g>
      ))}
      <Smile d="M106 118Q120 134 134 118" />
      <Cheek x={88} y={122} rx={8} />
      <Cheek x={152} y={122} rx={8} />
    </g>
  );
}

function animal(kind: string): ReactNode {
  if (kind === "chicken") {
    const edge = "#B8681C";
    return (
      <>
        <Shadow cy={166} rx={60} />
        <path
          d="M70 104Q42 70 54 40Q70 66 80 74Q72 44 88 30Q96 62 104 74Z"
          fill="#D9852B"
          {...line(edge)}
        />
        {[102, 128].map((x) => (
          <path
            key={x}
            d={`M${x} 148V164M${x - 8} 166H${x + 9}M${x} 164L${x - 6} 170M${x} 164L${x + 6} 170`}
            fill="none"
            {...line("#E08A12", 4.5)}
          />
        ))}
        <path
          d="M60 108Q60 152 114 154Q168 154 176 112Q182 86 168 70L134 70Q110 70 96 80Q62 82 60 108Z"
          fill="#F6B44B"
          {...line(edge)}
        />
        <path
          d="M136 100Q170 104 172 120Q162 148 120 152Q150 136 136 100Z"
          fill="#FFD98A"
        />
        <circle cx="156" cy="66" r="28" fill="#F6B44B" {...line(edge)} />
        <path
          d="M140 42Q136 26 148 28Q152 14 162 24Q172 16 174 32Q182 34 176 44Z"
          fill="#E8413C"
          {...line("#A82420")}
        />
        <path
          d="M180 58L202 66L180 76Z"
          fill="#FFB020"
          {...line("#C67F06")}
        />
        <path
          d="M178 78Q186 80 184 92Q178 98 174 90Q172 82 178 78Z"
          fill="#E8413C"
          {...line("#A82420", 3)}
        />
        <path
          d="M82 104Q108 88 136 106Q128 134 98 132Q80 126 82 104Z"
          fill="#E0922F"
          {...line(edge)}
        />
        <path
          d="M92 116Q104 120 114 114M96 126Q108 128 120 122"
          fill="none"
          {...line(edge, 2.5)}
        />
        <Shine x={140} y={50} rx={8} ry={4} />
        <Eye x={162} y={60} />
        <Cheek x={168} y={76} />
      </>
    );
  }
  if (kind === "crow") {
    const body = "#3A4152";
    const edge = "#6E7A96";
    return (
      <>
        <Shadow cy={166} rx={58} />
        <path
          d="M78 116L28 136L40 142L26 152L46 152L40 162L90 132Z"
          fill="#2F3545"
          {...line(edge)}
        />
        {[106, 128].map((x) => (
          <path
            key={x}
            d={`M${x} 134L${x - 2} 162M${x - 2} 162L${x - 12} 166M${x - 2} 162L${x + 8} 166M${x - 2} 162L${x - 4} 168`}
            fill="none"
            {...line("#7C869E", 4)}
          />
        ))}
        <ellipse
          cx="114"
          cy="104"
          rx="52"
          ry="36"
          transform="rotate(-18 114 104)"
          fill={body}
          {...line(edge)}
        />
        <circle cx="154" cy="62" r="30" fill={body} {...line(edge)} />
        <path
          d="M176 52L216 66L178 78Z"
          fill="#56607A"
          {...line("#9AA5BE")}
        />
        <path d="M178 66H206" {...line("#9AA5BE", 2)} />
        <path
          d="M76 112Q96 76 140 88Q146 112 124 128Q100 140 84 132L94 126L80 124L90 118Z"
          fill="#2A303F"
          {...line(edge)}
        />
        <path
          d="M98 104Q114 98 132 102M96 116Q110 112 126 116"
          fill="none"
          {...line("#55607A", 2.5)}
        />
        <Shine x={140} y={44} rx={9} ry={4} />
        <Shine x={98} y={88} rx={10} ry={3.5} rotate={-30} />
        <circle cx="160" cy="58" r="9" fill="#fff" />
        <Eye x={162} y={59} r={5} />
        <Cheek x={164} y={78} rx={5} />
      </>
    );
  }
  if (kind === "cat") {
    const fur = "#F4A259";
    const edge = "#B8641E";
    return (
      <>
        <Shadow cy={166} rx={58} />
        <Tube
          d="M150 154Q196 160 194 122Q192 100 176 104"
          w={12}
          fill={fur}
          edge={edge}
        />
        <path
          d="M86 160Q76 116 102 98H138Q164 116 154 160Z"
          fill={fur}
          {...line(edge)}
        />
        <path d="M108 104Q120 112 132 104Q138 132 120 152Q102 132 108 104Z" fill="#FFF3E3" />
        <ellipse cx="104" cy="160" rx="13" ry="8" fill="#FFF3E3" {...line(edge)} />
        <ellipse cx="136" cy="160" rx="13" ry="8" fill="#FFF3E3" {...line(edge)} />
        <path d="M80 64L80 18L114 44Z" fill={fur} {...line(edge)} />
        <path d="M160 64L160 18L126 44Z" fill={fur} {...line(edge)} />
        <path d="M86 50L86 30L102 44Z" fill="#FFB3C1" />
        <path d="M154 50L154 30L138 44Z" fill="#FFB3C1" />
        <ellipse cx="120" cy="72" rx="46" ry="38" fill={fur} {...line(edge)} />
        <path d="M112 36V48M120 34V48M128 36V48" fill="none" {...line("#D9822B", 4)} />
        <ellipse cx="120" cy="90" rx="20" ry="13" fill="#FFF3E3" />
        <Shine x={92} y={52} rx={9} ry={4} />
        <Eye x={102} y={72} r={6.5} />
        <Eye x={138} y={72} r={6.5} />
        <path d="M114 82H126L120 89Z" fill="#FF8FA3" {...line("#D9667E", 2)} />
        <path d="M110 93Q115 99 120 93Q125 99 130 93" fill="none" {...line(INK, 2.5)} />
        <path
          d="M98 86L64 80M98 92L64 96M142 86L176 80M142 92L176 96"
          {...line("#8A5A3A", 2)}
        />
        <Cheek x={92} y={90} />
        <Cheek x={148} y={90} />
      </>
    );
  }
  if (kind === "fish") {
    const edge = "#1E78A8";
    const fin = "#FFC845";
    const finEdge = "#D4900F";
    return (
      <>
        <Shadow cy={160} rx={62} />
        <path d="M66 92L18 54Q32 92 18 130Z" fill={fin} {...line(finEdge)} />
        <path d="M86 58Q110 14 156 54Z" fill={fin} {...line(finEdge)} />
        <path d="M104 128Q114 152 136 128Z" fill={fin} {...line(finEdge)} />
        <path
          d="M200 94Q186 136 124 136Q72 136 56 92Q72 48 124 48Q186 48 200 94Z"
          fill="#46B1E1"
          {...line(edge)}
        />
        <path d="M66 104Q96 132 124 134Q176 134 194 108Q160 124 120 122Q84 120 66 104Z" fill="#A9E0F7" />
        <path d="M146 62Q132 92 146 122" fill="none" {...line(edge, 3)} />
        {[
          [96, 74],
          [116, 74],
          [106, 90],
          [126, 90],
          [96, 104],
          [116, 104],
        ].map(([x, y]) => (
          <path key={`${x}${y}`} d={`M${x} ${y}q6 7 12 0`} fill="none" {...line("#2C93C7", 2.5)} />
        ))}
        <path d="M118 102Q142 98 140 118Q128 116 118 102Z" fill={fin} {...line(finEdge, 2.5)} />
        <Shine x={110} y={58} rx={14} ry={4} rotate={-8} />
        <circle cx="168" cy="82" r="11" fill="#fff" {...line(edge, 2.5)} />
        <Eye x={170} y={83} r={6} />
        <Smile d="M186 100Q192 106 198 100" />
        <Cheek x={174} y={104} />
      </>
    );
  }
  return null;
}

function thing(kind: string): ReactNode {
  if (kind === "snake") {
    const skin = "#7BC86C";
    const edge = "#3F8A35";
    const dots = (cy: number, rx: number) =>
      [-0.6, -0.2, 0.2, 0.6].map((k) => (
        <ellipse
          key={k}
          cx={120 + k * rx}
          cy={cy + 4}
          rx="5"
          ry="3.5"
          fill="#FFE066"
        />
      ));
    return (
      <>
        <Shadow cy={164} rx={74} />
        <path d="M58 150Q30 156 34 140" fill="none" {...line(edge, 13)} />
        <path d="M58 150Q30 156 34 140" fill="none" {...line(skin, 7)} />
        <ellipse cx="120" cy="144" rx="66" ry="19" fill={skin} {...line(edge)} />
        {dots(144, 66)}
        <ellipse cx="120" cy="122" rx="52" ry="16" fill={skin} {...line(edge)} />
        {dots(122, 52)}
        <ellipse cx="120" cy="103" rx="38" ry="13" fill={skin} {...line(edge)} />
        <path
          d="M128 104Q150 98 150 78"
          fill="none"
          {...line(edge, 27)}
        />
        <path d="M128 104Q150 98 150 78" fill="none" {...line(skin, 20)} />
        <ellipse cx="148" cy="62" rx="31" ry="24" fill={skin} {...line(edge)} />
        <path
          d="M176 70L194 72M194 72L202 66M194 72L202 78"
          fill="none"
          {...line("#E8413C", 3)}
        />
        <Shine x={136} y={48} rx={10} ry={4} />
        <Eye x={146} y={58} r={6} />
        <Eye x={166} y={58} r={6} />
        <Smile d="M150 74Q160 80 170 74" />
        <Cheek x={140} y={72} />
        <Cheek x={175} y={70} rx={5} />
      </>
    );
  }
  if (kind === "eye")
    return (
      <>
        {[
          "M62 77L50 62",
          "M88 66L80 48",
          "M111 61L108 42",
          "M129 61L132 42",
          "M152 66L160 48",
          "M178 77L190 62",
        ].map((d) => (
          <path key={d} d={d} {...line("#4A5578", 5)} />
        ))}
        <path
          d="M30 100Q120 22 210 100Q120 170 30 100Z"
          fill="#fff"
          {...line("#4A5578", 5)}
        />
        <path d="M40 104Q120 150 200 104Q120 160 40 104Z" fill="#E3E8F5" />
        <circle cx="120" cy="98" r="38" fill="#6BA4E8" {...line("#2F6DB5", 3)} />
        <circle cx="120" cy="98" r="19" fill={INK} />
        <circle cx="132" cy="86" r="9" fill="#fff" />
        <circle cx="108" cy="110" r="4" fill="#fff" opacity=".8" />
      </>
    );
  if (kind === "cup") {
    const edge = "#2F6DB5";
    return (
      <>
        <Shadow cy={160} rx={60} />
        {[88, 112, 136].map((x) => (
          <path
            key={x}
            d={`M${x} 46Q${x - 8} 34 ${x} 24Q${x + 8} 14 ${x} 4`}
            fill="none"
            {...line("#B9C7DA", 4)}
          />
        ))}
        <path
          d="M158 78Q198 72 196 104Q194 134 154 132"
          fill="none"
          {...line(edge, 20)}
        />
        <path
          d="M158 78Q198 72 196 104Q194 134 154 132"
          fill="none"
          {...line("#5AA9F5", 12)}
        />
        <path
          d="M62 58H166V136Q166 156 146 156H82Q62 156 62 136Z"
          fill="#5AA9F5"
          {...line(edge)}
        />
        <path d="M140 64H160V136Q160 150 146 150H138Q152 140 140 64Z" fill="#3E8FE0" />
        <ellipse cx="114" cy="60" rx="52" ry="10" fill="#8B5A3C" {...line(edge)} />
        <ellipse cx="102" cy="58" rx="18" ry="3" fill="#B07A55" />
        <path
          d="M114 120Q96 106 102 96Q108 88 114 98Q120 88 126 96Q132 106 114 120Z"
          fill="#fff"
        />
        <Shine x={78} y={96} rx={4} ry={16} rotate={0} />
      </>
    );
  }
  if (kind === "ball") {
    const T = "120 30";
    const B = "120 154";
    const bands: [string, string][] = [
      [`M${T}A62 62 0 0 0 ${B}Q50 92 ${T}Z`, "#FF5A5F"],
      [`M${T}Q50 92 ${B}L${T}Z`, "#FFFFFF"],
      [`M${T}L${B}Q190 92 ${T}Z`, "#3D8BF2"],
      [`M${T}Q190 92 ${B}A62 62 0 0 0 ${T}Z`, "#FFD23F"],
    ];
    return (
      <>
        <Shadow cy={164} rx={56} />
        {bands.map(([d, c]) => (
          <path key={c} d={d} fill={c} />
        ))}
        <circle cx="120" cy="92" r="62" fill="none" {...line("#B23A48", 4)} />
        <path d={`M${T}Q50 92 ${B}M${T}L${B}M${T}Q190 92 ${B}`} fill="none" {...line("#B23A48", 2)} />
        <ellipse cx="120" cy="34" rx="10" ry="5" fill="#fff" {...line("#B23A48", 2.5)} />
        <Shine x={86} y={62} rx={14} ry={7} rotate={-40} />
      </>
    );
  }
  if (kind === "hand") {
    const skin = "#FFCBA4";
    const edge = "#C9805A";
    const fingers = [
      "M90 100L80 50",
      "M108 94L106 36",
      "M128 94L132 38",
      "M146 102L156 58",
      "M84 126L56 98",
    ];
    return (
      <>
        <path d="M34 60Q26 76 34 92M22 52Q10 76 22 100" fill="none" {...line("#9FB4D8", 4)} />
        <path d="M200 60Q208 76 200 92M212 52Q224 76 212 100" fill="none" {...line("#9FB4D8", 4)} />
        <path d="M94 146H148V176H94Z" fill="#7C6CF2" {...line("#4D3FC4")} />
        {fingers.map((d) => (
          <path key={`o${d}`} d={d} fill="none" {...line(edge, 25)} />
        ))}
        <ellipse cx="118" cy="118" rx="40" ry="38" fill={skin} {...line(edge)} />
        {fingers.map((d) => (
          <path key={d} d={d} fill="none" {...line(skin, 18)} />
        ))}
        <ellipse cx="118" cy="120" rx="37" ry="35" fill={skin} />
        <path d="M98 128Q118 142 140 126" fill="none" {...line("#E6A37E", 3)} />
        <Shine x={104} y={44} rx={3} ry={7} rotate={-5} />
        <Shine x={98} y={104} rx={10} ry={5} />
      </>
    );
  }
  if (kind === "aunt") {
    const skin = "#F3C5A0";
    const edge = "#B57C55";
    const hair = "#4A3530";
    return (
      <>
        <circle cx="120" cy="26" r="20" fill={hair} {...line("#7A5F56")} />
        <path
          d="M40 180Q40 128 120 126Q200 128 200 180Z"
          fill="#E2557A"
          {...line("#A8304F")}
        />
        {[70, 100, 140, 170].map((x) => (
          <circle key={x} cx={x} cy={160} r="5" fill="#FFD23F" />
        ))}
        <path d="M100 128L120 150L140 128" fill="#FFE3EC" {...line("#A8304F", 3)} />
        <path d="M108 112V130H132V112Z" fill={skin} />
        <ellipse cx="78" cy="82" rx="8" ry="11" fill={skin} {...line(edge)} />
        <ellipse cx="162" cy="82" rx="8" ry="11" fill={skin} {...line(edge)} />
        <circle cx="78" cy="98" r="4" fill="#FFD23F" {...line("#C99A06", 2)} />
        <circle cx="162" cy="98" r="4" fill="#FFD23F" {...line("#C99A06", 2)} />
        <ellipse cx="120" cy="82" rx="42" ry="44" fill={skin} {...line(edge)} />
        <path
          d="M76 84Q70 36 120 36Q170 36 164 84Q160 60 138 54Q116 66 84 62Q78 70 76 84Z"
          fill={hair}
          {...line("#7A5F56")}
        />
        <path d="M100 46Q114 40 130 44" fill="none" {...line("#8C6F66", 4)} />
        <circle cx="152" cy="46" r="9" fill="#fff" {...line("#E2A0B5", 2)} />
        <circle cx="152" cy="46" r="3.5" fill="#FFD23F" />
        <path d="M94 74Q102 70 110 74M130 74Q138 70 146 74" fill="none" {...line(hair, 3)} />
        <Eye x={102} y={86} r={5} />
        <Eye x={138} y={86} r={5} />
        <path d="M106 104Q120 118 134 104Q120 110 106 104Z" fill="#C2414F" {...line("#9E2F3B", 2.5)} />
        <Cheek x={92} y={100} rx={8} />
        <Cheek x={148} y={100} rx={8} />
      </>
    );
  }
  if (kind === "rice") {
    const edge = "#3A6EA5";
    return (
      <>
        <Shadow cy={160} rx={58} />
        {[100, 120, 140].map((x) => (
          <path
            key={x}
            d={`M${x} 46Q${x - 7} 36 ${x} 28Q${x + 7} 20 ${x} 12`}
            fill="none"
            {...line("#B9C7DA", 4)}
          />
        ))}
        <path
          d="M52 98Q50 54 120 52Q190 54 188 98Z"
          fill="#FFFDF5"
          {...line("#CFC4A6")}
        />
        {[
          [80, 80, 30],
          [98, 68, -20],
          [120, 62, 10],
          [142, 70, 40],
          [160, 84, -30],
          [108, 86, 60],
          [134, 88, -10],
          [92, 92, 0],
        ].map(([x, y, r]) => (
          <ellipse
            key={`${x}${y}`}
            cx={x}
            cy={y}
            rx="5"
            ry="2.5"
            fill="#F1EAD6"
            transform={`rotate(${r} ${x} ${y})`}
          />
        ))}
        <Shine x={98} y={64} rx={12} ry={4} rotate={-12} />
        <rect x="96" y="144" width="48" height="12" rx="4" fill="#E8F1FB" {...line(edge)} />
        <path
          d="M40 96H200Q196 148 120 148Q44 148 40 96Z"
          fill="#E8F1FB"
          {...line(edge)}
        />
        <path d="M48 112H192" fill="none" {...line("#4A90D9", 5)} />
        {[70, 100, 130, 160].map((x) => (
          <circle key={x} cx={x} cy={128} r="5" fill="#4A90D9" />
        ))}
        <Shine x={66} y={104} rx={10} ry={3} rotate={0} />
      </>
    );
  }
  if (kind === "tree")
    return (
      <>
        <Shadow cy={166} rx={66} />
        <path d="M70 166Q90 150 120 158Q150 150 170 166Z" fill="#8FD16A" {...line("#4F9A3A")} />
        <path
          d="M108 160L112 104L96 84L106 82L116 96L122 74L132 76L128 104L126 160Z"
          fill="#A0663A"
          {...line("#6B3F1F")}
        />
        <Puff
          circles={[
            [120, 52, 36],
            [80, 72, 30],
            [160, 72, 30],
            [100, 96, 26],
            [142, 96, 26],
            [92, 44, 22],
            [150, 42, 22],
          ]}
          fill="#5DBB4A"
          edge="#2F7A2A"
        />
        <path d="M70 84Q100 112 120 100Q146 116 172 86Q170 112 144 116Q120 124 98 116Q74 108 70 84Z" fill="#4AA33A" />
        <Shine x={98} y={38} rx={14} ry={6} />
        {[
          [96, 66],
          [140, 60],
          [120, 92],
          [162, 84],
          [76, 84],
        ].map(([x, y]) => (
          <circle key={`${x}${y}`} cx={x} cy={y} r="6" fill="#FF5A5F" {...line("#B8333A", 2)} />
        ))}
      </>
    );
  if (kind === "garden") {
    const flowers: [number, number, string][] = [
      [44, 104, "#FF5A5F"],
      [92, 92, "#FFD23F"],
      [146, 98, "#FF8FC8"],
      [196, 106, "#A77BF3"],
    ];
    return (
      <>
        <rect width="240" height="180" rx="16" fill="#CDEFFF" />
        <circle cx="206" cy="30" r="15" fill="#FFD23F" {...line("#F2A60C")} />
        <ellipse cx="54" cy="34" rx="22" ry="9" fill="#fff" />
        <ellipse cx="70" cy="28" rx="14" ry="9" fill="#fff" />
        <path d="M0 128Q60 108 120 122T240 116V164Q240 180 224 180H16Q0 180 0 164Z" fill="#7FCB5B" {...line("#4F9A3A")} />
        {flowers.map(([x, y, c]) => (
          <g key={x}>
            <path d={`M${x} ${y}V${y + 48}`} {...line("#3F8A35", 5)} />
            <path d={`M${x} ${y + 34}q-14 -2 -16 -14q12 0 16 14`} fill="#5DBB4A" {...line("#3F8A35", 2)} />
            {[0, 72, 144, 216, 288].map((a) => (
              <ellipse
                key={a}
                cx={x}
                cy={y - 11}
                rx="7"
                ry="11"
                fill={c}
                stroke="#00000033"
                strokeWidth="1.5"
                transform={`rotate(${a} ${x} ${y})`}
              />
            ))}
            <circle cx={x} cy={y} r="7" fill="#FFF3B0" {...line("#E0A10C", 2)} />
          </g>
        ))}
        <path d="M0 158Q60 146 120 156T240 152V164Q240 180 224 180H16Q0 180 0 164Z" fill="#5DBB4A" />
        {[20, 66, 118, 170, 222].map((x) => (
          <path key={x} d={`M${x - 6} 160l3 -10l3 8l3 -12l3 14`} fill="none" {...line("#3F8A35", 2.5)} />
        ))}
        <g transform="translate(120 46)">
          <path d="M0 0Q-18 -16 -20 -2Q-18 10 0 2Q18 10 20 -2Q18 -16 0 0Z" fill="#FFB347" {...line("#C46F0A", 2.5)} />
          <path d="M0 -6V8" {...line(INK, 3)} />
        </g>
      </>
    );
  }
  return null;
}

export function Art({
  kind = "crab",
  className = "",
  label,
  animate = false,
}: {
  kind?: string;
  className?: string;
  label?: string;
  animate?: boolean;
}) {
  if (SCENE_KINDS.includes(kind))
    return <SceneArt kind={kind} art={(k) => <Art kind={k} />} />;
  const svgProps = {
    viewBox: "0 0 240 180",
    className: `art ${className} ${animate ? "floating" : ""}`,
    role: "img",
    "aria-label": label ?? kind,
  } as const;
  if (kind === "crab" || kind === "beach" || kind === "box")
    return (
      <svg {...svgProps}>
        {kind === "beach" && (
          <>
            <rect width="240" height="180" rx="16" fill="#BDE8F5" />
            <circle cx="206" cy="28" r="15" fill="#FFD23F" />
            <path d="M0 120Q60 104 120 118T240 112V164Q240 180 224 180H16Q0 180 0 164Z" fill="#F7DCA0" />
          </>
        )}
        {kind === "box" && (
          <path d="M42 111L78 94H170L205 112V174H42Z" fill="#D9A86C" />
        )}
        <Shadow cy={166} rx={78} />
        <Crab animate={animate} />
        {kind === "box" && <path d="M42 135H205V174H42" fill="#E8C08A" />}
      </svg>
    );
  if (kind === "mouth")
    return (
      <svg {...svgProps}>
        <circle cx="120" cy="90" r="74" fill="#FCE0CB" />
        <path
          d="M87 55Q98 47 108 55M133 55Q144 47 155 55"
          fill="none"
          stroke="#805B4F"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M111 78Q120 92 129 78"
          fill="none"
          stroke="#D7A089"
          strokeWidth="3"
        />
        <g className={animate ? "mouth-moving" : ""}>
          <ellipse cx="120" cy="118" rx="31" ry="16" fill="#B35D72" />
          <ellipse cx="120" cy="118" rx="23" ry="9" fill="#663849" />
          <path d="M103 112H137" stroke="white" strokeWidth="6" />
        </g>
      </svg>
    );
  const drawing = animal(kind) ?? thing(kind);
  if (drawing) return <svg {...svgProps}>{drawing}</svg>;
  return (
    <svg {...svgProps}>
      <circle cx="120" cy="89" r="61" fill="#E5DFFA" />
      <path
        d="M108 65Q104 42 126 44Q152 44 144 65Q141 76 123 82V98"
        stroke="#9A8CCB"
        strokeWidth="9"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="123" cy="119" r="5" fill="#9A8CCB" />
    </svg>
  );
}
export function Landscape() {
  return (
    <svg className="landscape" viewBox="0 0 500 280" aria-hidden="true">
      <circle cx="405" cy="54" r="31" fill="#FFD18B" />
      <path d="M0 200Q120 90 267 186Q380 113 500 173V280H0" fill="#E9E5FA" />
      <path d="M0 239Q155 137 288 231Q415 177 500 214V280H0" fill="#DAD2F1" />
      <path
        d="M320 280Q272 240 323 215Q363 188 314 174"
        fill="none"
        stroke="#FAF8FF"
        strokeWidth="18"
        strokeLinecap="round"
      />
      <path
        d="M67 160V211M50 181H84"
        stroke="#B7CFB9"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <circle cx="67" cy="151" r="27" fill="#B7CFB9" />
      <path d="M399 187V222" stroke="#B7CFB9" strokeWidth="7" />
      <circle cx="399" cy="176" r="21" fill="#B7CFB9" />
      <g fill="white" opacity=".8">
        <ellipse cx="201" cy="56" rx="32" ry="10" />
        <ellipse cx="178" cy="60" rx="22" ry="7" />
      </g>
    </svg>
  );
}
