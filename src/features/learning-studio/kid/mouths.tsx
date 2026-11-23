import type { ReactNode } from "react";

/**
 * Mouth pictures for the magic mirror (approved "mixed" option): พี่ปู's mirror shows the real photo
 * cropped tight on the mouth, the step strip and the child's mirror use the cartoon set.
 * To switch the whole game to one style, change MODEL_STYLE.
 */
export const MODEL_STYLE: "photo" | "cartoon" = "photo";

/** Same six poses, same order, as the photo atlas used by MouthCoach. */
export type Pose = "relax" | "closed" | "open" | "teeth" | "round" | "smile";
const ATLAS = "/learning-studio/images/mouth-atlas-v3.png";
const ATLAS_CELL: Record<Pose, [number, number]> = {
  relax: [0, 0],
  closed: [1, 0],
  open: [2, 0],
  teeth: [0, 1],
  round: [1, 1],
  smile: [2, 1],
};
// Crop inside each 512 px cell (x 145, y 114, 222 × 296), expressed as CSS percentages so the
// element can be any size: size = 1536/222 and 1024/296; position = offset / (image - box).
const BG_SIZE = "691.9% 345.9%";
const bgPosition = (pose: Pose) => {
  const [col, row] = ATLAS_CELL[pose];
  return `${(((col * 512 + 145) / 1314) * 100).toFixed(2)}% ${(((row * 512 + 114) / 728) * 100).toFixed(2)}%`;
};

const POSE_LABEL: Record<Pose, string> = {
  relax: "ปากอยู่ท่าสบาย",
  closed: "ริมฝีปากปิดสนิท",
  open: "อ้าปากกว้าง",
  teeth: "ยิ้มกว้างเห็นฟัน",
  round: "ห่อริมฝีปาก",
  smile: "ผ่อนปาก",
};

/** The three beats for one sample, matching MouthCoach: start, vowel, rest. */
export function mouthSteps(sound: string, sample: string): { pose: Pose; label: string }[] {
  const syllable = sample.split(/\s/)[0];
  const vowel: Pose = syllable.includes("ู")
    ? "round"
    : syllable.includes("ี") || syllable.includes("ิ")
      ? "teeth"
      : "open";
  return [
    { pose: sound === "ก" ? "relax" : "closed", label: sound === "ก" ? "เตรียม" : "ปิดปาก" },
    { pose: vowel, label: vowel === "round" ? "ห่อ \"อู\"" : vowel === "teeth" ? "ยิ้ม \"อี\"" : "อ้า \"อา\"" },
    { pose: "smile", label: "ผ่อน" },
  ];
}

export function MouthPhoto({ pose }: { pose: Pose }) {
  return (
    <div
      className="kw-photo"
      role="img"
      aria-label={POSE_LABEL[pose]}
      style={{ backgroundImage: `url("${ATLAS}")`, backgroundSize: BG_SIZE, backgroundPosition: bgPosition(pose) }}
    />
  );
}

const LIP = "#E0566E";
const LINE = "#A8324A";
const INSIDE = "#5A1328";
const TONGUE = "#F07C8C";
const Highlight = ({ y, peak }: { y: number; peak: number }) => (
  <path d={`M82 ${y} Q100 ${peak} 118 ${y}`} stroke="#fff" strokeOpacity=".5" strokeWidth="4" fill="none" strokeLinecap="round" />
);
const CARTOON: Record<Pose, ReactNode> = {
  closed: (
    <>
      <path d="M48 116 C64 100 84 98 100 106 C116 98 136 100 152 116 C126 120 74 120 48 116Z" fill={LIP} />
      <path d="M48 116 C74 120 126 120 152 116 C140 140 118 148 100 148 C82 148 60 140 48 116Z" fill={LIP} />
      <path d="M50 116 C76 121 124 121 150 116" stroke={LINE} strokeWidth="5" fill="none" strokeLinecap="round" />
      <Highlight y={134} peak={140} />
      <path d="M38 108 l-10 -5 M38 124 l-10 5 M162 108 l10 -5 M162 124 l10 5" stroke="#D08A72" strokeWidth="3.5" strokeLinecap="round" />
    </>
  ),
  open: (
    <>
      <path d="M58 94 C76 82 124 82 142 94 C158 122 140 172 100 178 C60 172 42 122 58 94Z" fill={LIP} />
      <path d="M68 101 C84 93 116 93 132 101 C143 124 130 162 100 166 C70 162 57 124 68 101Z" fill={INSIDE} />
      <path d="M70 101 C84 94 116 94 130 101 L128 114 C112 109 88 109 72 114Z" fill="#fff" />
      <path d="M76 154 C86 138 114 138 124 154 C114 164 86 164 76 154Z" fill={TONGUE} />
    </>
  ),
  relax: (
    <>
      <path d="M56 112 C74 99 126 99 144 112 C134 138 116 146 100 146 C84 146 66 138 56 112Z" fill={LIP} />
      <path d="M70 114 C84 108 116 108 130 114 C120 127 110 131 100 131 C90 131 80 127 70 114Z" fill={INSIDE} />
      <path d="M74 114 C86 109 114 109 126 114 L124 120 C110 116 90 116 76 120Z" fill="#fff" />
      <Highlight y={138} peak={142} />
    </>
  ),
  teeth: (
    <>
      <path d="M32 106 C60 96 140 96 168 106 C152 138 124 146 100 146 C76 146 48 138 32 106Z" fill={LIP} />
      <path d="M45 109 C70 102 130 102 155 109 C139 129 120 135 100 135 C80 135 61 129 45 109Z" fill={INSIDE} />
      <path d="M50 109 C72 103 128 103 150 109 L146 119 C124 115 76 115 54 119Z" fill="#fff" />
      <path d="M62 125 C80 131 120 131 138 125 L134 133 C118 136 82 136 66 133Z" fill="#fff" />
    </>
  ),
  round: (
    <>
      <path d="M100 92 C128 92 140 106 140 122 C140 142 124 152 100 152 C76 152 60 142 60 122 C60 106 72 92 100 92Z" fill={LIP} />
      <ellipse cx="100" cy="122" rx="13" ry="16" fill={INSIDE} />
      <path d="M100 84 v-9 M130 96 l7 -6 M70 96 l-7 -6 M146 124 h9 M54 124 h-9" stroke="#D08A72" strokeWidth="3.5" strokeLinecap="round" />
      <Highlight y={140} peak={144} />
    </>
  ),
  smile: null,
};
CARTOON.smile = CARTOON.relax;

/** `fill` crops the square drawing to cover a taller frame (the oval mirror) instead of letterboxing. */
export function MouthCartoon({ pose, title, fill = false }: { pose: Pose; title?: string; fill?: boolean }) {
  return (
    <svg viewBox="0 0 200 200" role="img" aria-label={title ?? POSE_LABEL[pose]} preserveAspectRatio={fill ? "xMidYMid slice" : undefined}>
      <rect width="200" height="200" fill="#FFE1CF" />
      <ellipse cx="100" cy="230" rx="150" ry="70" fill="#FBD2BC" />
      <path d="M84 30 Q100 58 116 30" fill="none" stroke="#E2A98C" strokeWidth="5" strokeLinecap="round" />
      <circle cx="92" cy="50" r="3" fill="#D8957A" />
      <circle cx="108" cy="50" r="3" fill="#D8957A" />
      <ellipse cx="34" cy="92" rx="22" ry="13" fill="#F7A59A" opacity=".55" />
      <ellipse cx="166" cy="92" rx="22" ry="13" fill="#F7A59A" opacity=".55" />
      {CARTOON[pose]}
      <path d="M70 186 Q100 198 130 186" stroke="#E8B49A" strokeWidth="4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/** พี่ปู's model mouth in the chosen style. */
export function ModelMouth({ pose }: { pose: Pose }) {
  return MODEL_STYLE === "photo" ? <MouthPhoto pose={pose} /> : <MouthCartoon pose={pose} />;
}
