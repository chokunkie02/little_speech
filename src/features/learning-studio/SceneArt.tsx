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
  if (kind === "box")
    content = (
      <>
        <path d="M40 61L118 26L201 59V148L122 173L40 145Z" fill="#D1AC7C" />
        <path d="M40 61L122 94L201 59L118 26Z" fill="#F0D8B4" />
        <path d="M122 94V173" stroke="#B79365" strokeWidth="3" />
        <path d="M88 40L168 72L168 110L146 119V81L67 50Z" fill="#DABB8B" />
        <rect x="54" y="104" width="42" height="27" rx="3" fill="#F8EBD7" />
      </>
    );
  else if (kind === "horse")
    content = (
      <>
        <ellipse cx="111" cy="102" rx="61" ry="35" fill="#BB987C" />
        <path
          d="M65 115L60 160M96 127L99 162M139 126L140 160M161 110L171 153"
          stroke="#BB987C"
          strokeWidth="15"
          strokeLinecap="round"
        />
        <path d="M167 98L157 50L179 32L203 55L201 84L174 108" fill="#BB987C" />
        <path d="M158 54L151 23L170 41M177 35L184 16L190 40" fill="#BB987C" />
        <path
          d="M155 47Q133 61 143 92"
          stroke="#795E54"
          strokeWidth="12"
          fill="none"
        />
        <path
          d="M52 86Q20 70 30 119"
          stroke="#795E54"
          strokeWidth="11"
          fill="none"
          strokeLinecap="round"
        />
        <ellipse cx="193" cy="83" rx="22" ry="14" fill="#D9BA9D" />
        <circle cx="186" cy="56" r="4" fill="#354252" />
        <circle cx="202" cy="80" r="2.5" fill="#8D7060" />
        <path
          d="M52 164h16m24 2h15m25-2h16m15-8h16"
          stroke="#795E54"
          strokeWidth="6"
          strokeLinecap="round"
        />
      </>
    );
  else if (kind === "shrimp")
    content = (
      <>
        <path
          d="M169 57Q80 17 66 90Q54 142 125 148Q165 147 174 119Q134 137 112 110Q92 80 128 75L171 76"
          fill="#F0AC9D"
          stroke="#DD8D80"
          strokeWidth="3"
        />
        <path
          d="M67 85L99 88M67 107L102 103M79 129L113 118M104 145L124 128"
          stroke="#DD8D80"
          strokeWidth="3"
        />
        <path
          d="M172 56Q206 18 225 43M173 66Q216 42 230 65"
          stroke="#DD8D80"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        <circle cx="163" cy="57" r="4" fill="#374456" />
        <path
          d="M111 110L93 145M127 120L119 156M140 124L145 154"
          stroke="#E69B8D"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path d="M171 119L191 112L187 135L171 141L157 137Z" fill="#E7978C" />
      </>
    );
  else if (kind.endsWith("-box")) {
    const subject = kind.split("-")[0];
    content = (
      <>
        <path d="M26 60L64 39H182L219 64V169H26Z" fill="#CEAC83" />
        <path d="M26 64L63 86H182L219 64" fill="#EAD1AD" />
        {draw(subject, 42, 22, 156, 127)}
        <path d="M26 113L64 136H182L219 113V171H26Z" fill="#E8C99F" />
        <path d="M64 136V171M182 136V171" stroke="#C6A373" strokeWidth="2" />
      </>
    );
  } else if (kind === "crab-beach")
    content = (
      <>
        <path d="M0 0H240V117H0" fill="#DFF4F5" />
        <circle cx="200" cy="30" r="16" fill="#FFD17E" />
        <path d="M0 108Q75 86 140 110T240 104V180H0Z" fill="#F4D8A1" />
        <path d="M0 155Q65 132 130 150T240 143V180H0Z" fill="#91D6DF" />
        {draw("crab", 18, 32, 150, 130)}
        <path d="M177 122q8-10 16 0q-8 8-16 0" fill="#F8F1E5" />
        <path d="M156 148l7 3m-1-17 5 1" stroke="#D1AC72" strokeWidth="2" />
      </>
    );
  else if (kind === "chicken-rice")
    content = (
      <>
        <rect y="132" width="240" height="48" fill="#E5EED7" />
        {draw("chicken", 30, 40, 165, 130, 40)}
        {draw("rice", 100, 90, 100, 85)}
        <path
          d="M135 130l6 5m4-9 3 4"
          stroke="#CDBE96"
          strokeWidth="2"
          strokeDasharray="3 3"
        />
      </>
    );
  else if (kind === "cat-fish")
    content = (
      <>
        <rect y="134" width="240" height="46" fill="#F4E7D9" />
        {draw("cat", 35, 45, 160, 130, 18)}
        <ellipse cx="160" cy="155" rx="52" ry="13" fill="#CBC9E6" />
        {draw("fish", 112, 112, 96, 60)}
        <path
          d="M132 108l15 9"
          stroke="#BD9987"
          strokeWidth="2"
          strokeDasharray="3 3"
        />
      </>
    );
  else if (kind === "crow-tree")
    content = (
      <>
        <rect width="240" height="180" fill="#EAF4EA" />
        <path
          d="M140 87V178M139 126L63 84M141 105L198 61"
          stroke="#B69777"
          strokeWidth="13"
          strokeLinecap="round"
        />
        <circle cx="154" cy="49" r="42" fill="#A5CBA7" />
        <circle cx="203" cy="65" r="33" fill="#B9D8B2" />
        {draw("crow", 15, 15, 123, 104)}
      </>
    );
  else if (kind === "horse-garden")
    content = (
      <>
        <path d="M0 0H240V180H0" fill="#E9F5F3" />
        <path d="M0 129Q95 101 240 124V180H0" fill="#BFD9A9" />
        <path d="M189 73V141" stroke="#BCA27F" strokeWidth="9" />
        <circle cx="190" cy="55" r="32" fill="#9AC89E" />
        {draw("horse", 13, 42, 159, 134)}
        {[18, 42, 192, 218].map((x, i) => (
          <g key={x}>
            <path d={`M${x} 164v-17`} stroke="#85AE7A" strokeWidth="2" />
            <circle
              cx={x}
              cy="146"
              r="5"
              fill={i % 2 ? "#F3ADB9" : "#F7CE78"}
            />
          </g>
        ))}
      </>
    );
  else if (kind === "pen")
    content = (
      <>
        <g transform="rotate(32 120 90)">
          <path d="M101 37Q120 19 139 37V131H101Z" fill="#A397E4" />
          <path d="M101 126L120 163L139 126" fill="#E6CCA7" />
          <path d="M113 151L120 166L127 151" fill="#4E5473" />
          <path d="M101 43H139M101 71H139" stroke="#E1DBF8" strokeWidth="7" />
          <path
            d="M143 39V83"
            stroke="#8373BF"
            strokeWidth="6"
            strokeLinecap="round"
          />
        </g>
      </>
    );
  else if (kind === "backpack")
    content = (
      <>
        <path
          d="M96 40V25Q120 9 144 25V40"
          fill="none"
          stroke="#AD8A78"
          strokeWidth="8"
        />
        <rect x="65" y="37" width="110" height="128" rx="27" fill="#A398DF" />
        <rect x="82" y="93" width="76" height="56" rx="12" fill="#C4BAF1" />
        <path
          d="M90 112H150M84 66Q120 48 155 66"
          stroke="#F0EAFB"
          strokeWidth="4"
        />
        <path
          d="M67 65Q43 92 55 147M174 65Q196 91 186 147"
          stroke="#8274B8"
          strokeWidth="8"
          fill="none"
        />
        <circle cx="144" cy="116" r="4" fill="#F6D08F" />
      </>
    );
  else if (kind === "clock")
    content = (
      <>
        <path
          d="M69 148L60 169M171 148L180 169"
          stroke="#A392BB"
          strokeWidth="8"
        />
        <path
          d="M66 42Q46 15 76 17Q92 13 99 37M141 37Q152 7 176 21Q196 28 173 47"
          fill="#C2B4E0"
        />
        <circle cx="120" cy="94" r="65" fill="#B9AFE2" />
        <circle cx="120" cy="94" r="52" fill="#FFF8E8" />
        {[0, 1, 2, 3].map((i) => (
          <path
            key={i}
            d="M120 49V56"
            stroke="#9A87B6"
            strokeWidth="3"
            transform={`rotate(${i * 90} 120 94)`}
          />
        ))}
        <path
          d="M120 62V94L146 108"
          stroke="#76658F"
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
        />
        <circle cx="120" cy="94" r="5" fill="#76658F" />
      </>
    );
  else if (kind === "umbrella")
    content = (
      <>
        <path
          d="M29 92Q120-38 211 92Q190 77 166 92Q142 77 120 92Q98 77 74 92Q51 77 29 92"
          fill="#A8C2E4"
        />
        <path
          d="M120 27Q80 48 74 92M120 27Q159 48 166 92"
          stroke="#DBE6F3"
          strokeWidth="3"
          fill="none"
        />
        <path
          d="M120 21V148Q120 171 143 161Q153 156 151 146"
          stroke="#9885B4"
          strokeWidth="7"
          fill="none"
          strokeLinecap="round"
        />
        {[30, 65, 190, 218].map((x, i) => (
          <path
            key={x}
            d={`M${x} ${i % 2 ? 26 : 115}l-4 10`}
            stroke="#A8D8E6"
            strokeWidth="3"
          />
        ))}
      </>
    );
  else if (kind === "school")
    content = (
      <>
        <rect y="155" width="240" height="25" fill="#D1DFC1" />
        <rect x="39" y="74" width="162" height="84" rx="3" fill="#F6DEAD" />
        <path d="M24 76L120 17L216 76Z" fill="#BEA9DA" />
        <rect x="100" y="111" width="40" height="47" fill="#A4BCD4" />
        {[55, 157].map((x) => (
          <g key={x}>
            <rect x={x} y="92" width="28" height="31" fill="#F6FBFC" />
            <path
              d={`M${x + 14} 92v31M${x} 107h28`}
              stroke="#ACC3D2"
              strokeWidth="2"
            />
          </g>
        ))}
        <circle cx="120" cy="60" r="14" fill="#FFF8E8" />
        <path d="M120 50v11h7" stroke="#8A7F9B" strokeWidth="2" fill="none" />
        <path
          d="M220 42V154M220 42h18v21h-18"
          stroke="#A6A0B1"
          strokeWidth="3"
          fill="#D3BFED"
        />
      </>
    );
  else if (kind === "market")
    content = (
      <>
        <path d="M35 54H205V159H35" fill="#E8CEAC" />
        <path d="M24 57L45 24H195L216 57V79H24Z" fill="#D9B0D4" />
        {[24, 72, 120, 168].map((x) => (
          <path key={x} d={`M${x} 57h24v22h-24Z`} fill="#F7E8E9" />
        ))}
        <rect x="27" y="123" width="186" height="34" rx="4" fill="#C3A2C9" />
        {draw("banana", 33, 84, 63, 49)}
        {draw("coconut", 90, 78, 57, 56)}
        {draw("mangosteen", 145, 86, 62, 46)}
      </>
    );
  else if (kind === "banana")
    content = (
      <>
        <path
          d="M53 55Q45 135 158 130Q194 121 203 75Q156 111 91 68Z"
          fill="#F4CC65"
          stroke="#E3B546"
          strokeWidth="3"
        />
        <path
          d="M49 71Q52 153 169 141Q197 134 211 99Q167 128 88 84"
          fill="#F9D982"
          stroke="#E3B546"
          strokeWidth="3"
        />
        <path d="M50 54L59 38L70 40L67 60" fill="#92AA72" />
      </>
    );
  else if (kind === "coconut")
    content = (
      <>
        <circle cx="99" cy="101" r="57" fill="#A8C786" />
        <path
          d="M61 70Q104 35 139 74M64 114Q105 145 140 115"
          stroke="#8DB477"
          strokeWidth="3"
          fill="none"
        />
        <ellipse cx="161" cy="113" rx="47" ry="48" fill="#AC8B6B" />
        <ellipse cx="161" cy="110" rx="39" ry="40" fill="#FFF8E4" />
        <ellipse cx="161" cy="110" rx="28" ry="29" fill="#C9E7E5" />
      </>
    );
  else if (kind === "mangosteen")
    content = (
      <>
        <circle cx="91" cy="110" r="48" fill="#80618F" />
        <path
          d="M60 63Q78 42 94 65Q107 42 127 61L104 77L76 76Z"
          fill="#80AA70"
        />
        <path
          d="M93 65V47"
          stroke="#6B925C"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <ellipse cx="165" cy="121" rx="45" ry="37" fill="#7F608B" />
        {[-2, -1, 0, 1, 2].map((i) => (
          <ellipse
            key={i}
            cx={165 + i * 11}
            cy={121 + Math.abs(i) * 3}
            rx="10"
            ry={24 - Math.abs(i) * 4}
            fill="#FFF8EB"
            stroke="#EADFE9"
          />
        ))}
      </>
    );
  else if (kind === "mouth-word")
    content = (
      <>
        <circle cx="120" cy="90" r="75" fill="#F9DECA" />
        <path
          d="M84 70h12m48 0h12"
          stroke="#866B62"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path d="M76 113Q120 86 164 113Q120 156 76 113" fill="#D4818F" />
        <path d="M88 115H152Q120 140 88 115" fill="#7C4A5D" />
        <path d="M91 113H149" stroke="#FFF5E7" strokeWidth="7" />
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
