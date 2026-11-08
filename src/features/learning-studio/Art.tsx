import { SceneArt, SCENE_KINDS } from "./SceneArt";
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
  const eyes = (
    <>
      <ellipse cx="98" cy="81" rx="4" ry="6" fill="#26334B" />
      <ellipse cx="139" cy="81" rx="4" ry="6" fill="#26334B" />
      <path
        d="M108 97Q119 109 131 97"
        fill="none"
        stroke="#26334B"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </>
  );
  if (kind === "crab" || kind === "beach" || kind === "box")
    return (
      <svg {...svgProps}>
        <ellipse
          cx="122"
          cy="159"
          rx="85"
          ry="9"
          fill="#E8D9D8"
          opacity=".45"
        />
        {kind === "beach" && (
          <>
            <path d="M0 132Q54 108 123 134T240 127V180H0" fill="#F5D9A2" />
            <path d="M0 145Q55 132 115 150T240 147V180H0" fill="#91DCE5" />
            <circle cx="200" cy="25" r="16" fill="#FFCF6E" />
          </>
        )}
        {kind === "box" && (
          <path d="M42 111L78 94H170L205 112V174H42Z" fill="#D8B58D" />
        )}
        <g className={animate ? "crab-bob" : ""}>
          <path
            d="M70 113L43 124M72 126L48 144M164 113L194 124M162 126L188 144"
            stroke="#EC806C"
            strokeWidth="9"
            strokeLinecap="round"
          />
          <path
            d="M78 98L53 77M163 98L187 77"
            stroke="#EC806C"
            strokeWidth="11"
            strokeLinecap="round"
          />
          <path d="M47 83Q15 54 41 35L47 57L61 37Q79 63 53 83" fill="#F6967C" />
          <path
            d="M188 83Q161 60 179 37L189 57L199 35Q225 58 194 83"
            fill="#F6967C"
          />
          <path
            d="M93 79V61M144 79V61"
            stroke="#EF8C75"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <circle cx="93" cy="60" r="11" fill="#FEA48C" />
          <circle cx="144" cy="60" r="11" fill="#FEA48C" />
          <ellipse cx="119" cy="110" rx="57" ry="39" fill="#F6967C" />
          <ellipse cx="98" cy="103" rx="4" ry="6" fill="#26334B" />
          <ellipse cx="140" cy="103" rx="4" ry="6" fill="#26334B" />
          <path
            d="M109 119Q120 130 132 119"
            fill="none"
            stroke="#26334B"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <ellipse cx="86" cy="116" rx="8" ry="4" fill="#ED766F" opacity=".6" />
          <ellipse
            cx="151"
            cy="116"
            rx="8"
            ry="4"
            fill="#ED766F"
            opacity=".6"
          />
        </g>
        {kind === "box" && <path d="M42 135H205V174H42" fill="#E6C9A1" />}
      </svg>
    );
  if (kind === "snake")
    return (
      <svg {...svgProps}>
        <ellipse cx="121" cy="161" rx="75" ry="8" fill="#E2ECE0" />
        <path
          d="M57 146Q148 177 161 136T111 110T129 56"
          fill="none"
          stroke="#8ABD8D"
          strokeWidth="30"
          strokeLinecap="round"
        />
        <ellipse cx="134" cy="51" rx="30" ry="25" fill="#9CCB97" />
        <circle cx="146" cy="45" r="4" fill="#26334B" />
        <path
          d="M158 57L178 62L186 57M178 62L185 68"
          stroke="#DD7793"
          strokeWidth="3"
          fill="none"
        />
      </svg>
    );
  if (kind === "eye")
    return (
      <svg {...svgProps}>
        <path
          d="M25 92Q120 1 215 92Q120 183 25 92"
          fill="white"
          stroke="#64748B"
          strokeWidth="5"
        />
        <circle cx="120" cy="92" r="37" fill="#8CA9CE" />
        <circle cx="120" cy="92" r="20" fill="#334155" />
        <circle cx="131" cy="79" r="8" fill="white" />
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
  if (["chicken", "crow", "horse", "cat", "shrimp", "fish"].includes(kind)) {
    const color =
      kind === "crow"
        ? "#526179"
        : kind === "chicken"
          ? "#FFCD72"
          : kind === "horse"
            ? "#BA9D85"
            : kind === "cat"
              ? "#E9AF82"
              : kind === "shrimp"
                ? "#F5AFA0"
                : "#80C7D4";
    return (
      <svg {...svgProps}>
        <ellipse
          cx="120"
          cy="158"
          rx="70"
          ry="8"
          fill="#DCDDE8"
          opacity=".45"
        />
        {kind === "horse" && (
          <path d="M75 66L86 22L107 60M134 60L152 20L157 76" fill={color} />
        )}{" "}
        {kind === "cat" && (
          <path d="M65 77L64 24L110 57M130 57L177 24L177 78" fill={color} />
        )}
        <ellipse cx="120" cy="105" rx="61" ry="47" fill={color} />
        {kind === "chicken" && (
          <>
            <path
              d="M110 59Q94 24 115 31Q133 5 138 36Q161 18 155 57"
              fill="#EF8E81"
            />
            <path d="M156 88L185 104L156 116" fill="#EF9E4B" />
            <path
              d="M99 148V164M143 148V164"
              stroke="#D69A50"
              strokeWidth="6"
              strokeLinecap="round"
            />
          </>
        )}
        {kind === "crow" && <path d="M165 92L200 107L165 116" fill="#E8BA69" />}
        {kind === "fish" && <path d="M64 104L23 70V140Z" fill={color} />}
        <ellipse cx="108" cy="100" rx="4" ry="6" fill="#26334B" />
        <ellipse cx="142" cy="100" rx="4" ry="6" fill="#26334B" />
        <path
          d="M115 118Q126 128 136 118"
          stroke="#26334B"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        {kind === "cat" && (
          <path
            d="M88 112L55 106M88 122L55 130M153 112L187 106M153 122L187 130"
            stroke="#BA856B"
            strokeWidth="2"
          />
        )}
      </svg>
    );
  }
  if (kind === "cup")
    return (
      <svg {...svgProps}>
        <path d="M65 44H158L146 153H79Z" fill="#A7D6F0" />
        <path
          d="M158 61Q210 53 196 105Q185 124 151 116"
          fill="none"
          stroke="#A7D6F0"
          strokeWidth="14"
        />
        <path d="M77 74H146L139 143H85Z" fill="#77BAE3" />
        {eyes}
      </svg>
    );
  if (kind === "ball")
    return (
      <svg {...svgProps}>
        <circle cx="120" cy="91" r="64" fill="#ACA1EE" />
        <path
          d="M71 48Q122 105 172 137M56 91H184M112 28Q75 98 128 153"
          stroke="#DDD7FC"
          strokeWidth="9"
          fill="none"
        />
      </svg>
    );
  if (kind === "hand")
    return (
      <svg {...svgProps}>
        <path
          d="M85 157L60 102Q56 86 68 88L85 104V51Q85 37 97 45V88V28Q97 16 110 28V87V36Q110 22 123 36V91V50Q123 36 136 49V99L146 77Q155 65 163 78L147 139Q139 167 115 166Z"
          fill="#EFBDA2"
        />
      </svg>
    );
  if (kind === "aunt")
    return (
      <svg {...svgProps}>
        <circle cx="120" cy="80" r="45" fill="#EBC3A7" />
        <path
          d="M73 82Q56 14 120 16Q187 16 167 87L155 50Q99 67 83 47Z"
          fill="#6D5961"
        />
        {eyes}
        <path d="M59 180Q65 118 120 130Q175 118 182 180" fill="#ACA1EE" />
      </svg>
    );
  if (["rice", "garden", "tree"].includes(kind))
    return (
      <svg {...svgProps}>
        <path d="M0 148Q64 120 130 143T240 139V180H0Z" fill="#C5DCC2" />
        {kind === "rice" ? (
          <>
            <path d="M45 117Q115 187 195 117" fill="#B6CBE5" />
            <ellipse cx="120" cy="116" rx="75" ry="16" fill="#F9F5E9" />
            <path
              d="M71 111L81 105M98 115L106 105M126 112L138 106M154 114L165 107"
              stroke="#E3DBC5"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </>
        ) : (
          <>
            <path d="M117 98V158" stroke="#B89876" strokeWidth="16" />
            <circle cx="120" cy="70" r="49" fill="#A1C8A1" />
            <circle cx="84" cy="90" r="34" fill="#B3D3A7" />
            <circle cx="154" cy="87" r="37" fill="#94BE9C" />
          </>
        )}
      </svg>
    );
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
