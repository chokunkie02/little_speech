import type { Item, Stage, Track } from "./types";
import {
  LEVEL_CONTENT,
  normalizeLevel,
  type LearningLevelId,
} from "./learning-levels";
export const TRACKS: Record<
  Track,
  { label: string; description: string; icon: string }
> = {
  speech: {
    label: "ฝึกออกเสียง",
    description: "ฟัง เลียนแบบ แล้วนำเสียงไปใช้ในคำและประโยค",
    icon: "speech",
  },
  communication: {
    label: "พูดเพื่อสื่อสาร",
    description: "เข้าใจภาพ บอกความต้องการ และเล่าเรื่อง",
    icon: "chat",
  },
  phonics: {
    label: "เสียงกับตัวอักษร",
    description: "เชื่อมเสียงกับตัวอักษร ผสมพยางค์ และลองอ่าน",
    icon: "book",
  },
};
export const SOUNDS = {
  ป: {
    name: "ปอ ปลา",
    hero: "crab",
    words: [
      ["ปู", "crab"],
      ["ปาก", "mouth-word"],
      ["ป้า", "aunt"],
    ],
    syllables: ["ปา", "ปี", "ปู"],
    contrast: ["ปู", "crab", "งู", "snake"],
    phrases: [
      ["ปูตัวเล็ก", "crab"],
      ["ปูเดินบนทราย", "crab-beach"],
      ["ปูอยู่ในกล่อง", "crab-box"],
    ],
    tip: "ดูริมฝีปากที่ปิดแล้วเปิดขณะพูดตามผู้ใหญ่ ลองเสียงสั้น ๆ ตามตัวอย่าง",
  },
  ก: {
    name: "กอ ไก่",
    hero: "chicken",
    words: [
      ["กา", "crow"],
      ["ไก่", "chicken"],
      ["กุ้ง", "shrimp"],
    ],
    syllables: ["กา", "กี", "กู"],
    contrast: ["กา", "crow", "ตา", "eye"],
    phrases: [
      ["ไก่ตัวโต", "chicken"],
      ["ไก่กินข้าว", "chicken-rice"],
      ["กาอยู่บนต้นไม้", "crow-tree"],
    ],
    tip: "ฟังคำตัวอย่างแล้วพูดตามช้า ๆ หากยังยากให้ผู้ใหญ่สาธิต หลีกเลี่ยงการบังคับลิ้นด้วยอุปกรณ์",
  },
  ม: {
    name: "มอ ม้า",
    hero: "horse",
    words: [
      ["ม้า", "horse"],
      ["มือ", "hand"],
      ["แมว", "cat"],
    ],
    syllables: ["มา", "มี", "มู"],
    contrast: ["มือ", "hand", "คือ", "question"],
    phrases: [
      ["แมวตัวเล็ก", "cat"],
      ["แมวกินปลา", "cat-fish"],
      ["ม้าอยู่ในสวน", "horse-garden"],
    ],
    tip: "สังเกตริมฝีปากของผู้ใหญ่ขณะพูด “มา” แล้วค่อยลองพูดตามอย่างสบาย ๆ",
  },
} as const;
const COLOR = [
  "#00A993",
  "#EA7CAB",
  "#E6AD36",
  "#EF9868",
  "#8170E7",
  "#4CAF82",
];
function make(
  id: string,
  kind: Item["kind"],
  title: string,
  prompt: string,
  art: string,
  instruction: string,
  extra: Partial<Item> = {},
): Item {
  return {
    id,
    stageId: id.split(":")[0],
    kind,
    title,
    prompt,
    art,
    instruction,
    sample: prompt,
    hint: "ฟังตัวอย่างได้ หรือขอให้ผู้ใหญ่ช่วยสาธิต",
    ...extra,
  };
}
function baseStages(track: Track, sound: string): Stage[] {
  const key = (sound in SOUNDS ? sound : "ป") as keyof typeof SOUNDS;
  const s = SOUNDS[key];
  if (track === "communication")
    return [
      {
        id: "understand",
        label: "เข้าใจคำจากภาพ",
        short: "ฟังและเลือก",
        description: "ฟังคำสั่งและเลือกภาพที่มีความหมายตรงกัน",
        color: COLOR[0],
        icon: "ear",
        items: [
          make(
            "understand:1",
            "choice",
            "ของที่อยากได้",
            "แก้วน้ำ",
            "cup",
            "ฟังให้จบ แล้วเลือกภาพที่พี่พูดถึงนะ",
            {
              choices: [
                { id: "cup", label: "แก้วน้ำ", art: "cup" },
                { id: "ball", label: "ลูกบอล", art: "ball" },
              ],
              answer: "cup",
            },
          ),
          make(
            "understand:2",
            "choice",
            "ภาพไหนตรงกับเสียง",
            "ลูกบอล",
            "ball",
            "ฟังให้จบ แล้วเลือกภาพที่พี่พูดถึงนะ",
            {
              choices: [
                { id: "ball", label: "ลูกบอล", art: "ball" },
                { id: "fish", label: "ปลา", art: "fish" },
              ],
              answer: "ball",
            },
          ),
          make(
            "understand:3",
            "choice",
            "เลือกสัตว์ให้เพื่อน",
            "แมว",
            "cat",
            "ฟังให้จบ แล้วเลือกภาพที่พี่พูดถึงนะ",
            {
              choices: [
                { id: "cat", label: "แมว", art: "cat" },
                { id: "crab", label: "ปู", art: "crab" },
              ],
              answer: "cat",
            },
          ),
        ],
      },
      {
        id: "request",
        label: "บอกความต้องการ",
        short: "ขอและตอบ",
        description: "ลองพูดเพื่อขอสิ่งของและขอความช่วยเหลือ",
        color: COLOR[3],
        icon: "chat",
        items: [
          make(
            "request:1",
            "speech",
            "ขอน้ำกับผู้ใหญ่",
            "หนูขอน้ำ",
            "cup",
            "ดูภาพ ลองบอกว่าหนูต้องการอะไร",
            {
              hint: "ยอมรับคำตอบที่สื่อความหมายได้ ไม่จำเป็นต้องเหมือนประโยคตัวอย่าง",
            },
          ),
          make(
            "request:2",
            "speech",
            "อยากเล่นด้วยกัน",
            "ขอเล่นบอลด้วย",
            "ball",
            "ลองชวนเพื่อนเล่นบอล",
          ),
          make(
            "request:3",
            "observation",
            "ขอความช่วยเหลือ",
            "ช่วยเปิดกล่องให้หน่อย",
            "box",
            "เล่นเปิดกล่องกับผู้ใหญ่ แล้วลองขอให้ช่วย",
            {
              hint: "ผู้ใหญ่รอให้เด็กสื่อสารด้วยวิธีที่พร้อม ไม่ต้องบังคับให้ท่องตาม",
            },
          ),
        ],
      },
      {
        id: "story",
        label: "เล่าเรื่องและสนทนา",
        short: "เล่าให้ฟัง",
        description: "ดูภาพ ตอบคำถาม และผลัดกันเล่า",
        color: COLOR[4],
        icon: "sparkle",
        items: [
          make(
            "story:1",
            "speech",
            "เล่าว่าเห็นอะไร",
            "ปูเดินบนทราย",
            "crab-beach",
            "ดูภาพแล้วเล่าให้ฟังว่าเกิดอะไรขึ้น",
            { subLabel: "คำตอบมีได้หลายแบบ ตัวอย่างไม่ใช่เฉลยตายตัว" },
          ),
          make(
            "story:2",
            "speech",
            "คิดเรื่องต่ออีกนิด",
            "ไก่กำลังกินข้าว",
            "chicken-rice",
            "ไก่กำลังทำอะไร แล้วจะทำอะไรต่อ",
          ),
          make(
            "story:3",
            "observation",
            "ผลัดกันเล่า",
            "วันนี้หนูเล่นอะไร",
            "garden",
            "ชวนผู้ใหญ่คุยเรื่องที่เล่นวันนี้ แล้วฟังคำตอบของกันและกัน",
          ),
        ],
      },
    ];
  if (track === "phonics")
    return [
      {
        id: "letter",
        label: "เสียงกับตัวอักษร",
        short: "ฟังและจับคู่",
        description: "ฟังชื่อเสียงแล้วเลือกตัวอักษร เป็นทักษะเตรียมอ่าน",
        color: COLOR[0],
        icon: "ear",
        items: (["ป", "ก", "ม"] as const).map((letter, i) =>
          make(
            `letter:${i}`,
            "choice",
            "ฟังแล้วเลือกตัวอักษร",
            letter,
            "letter",
            "ฟังเสียง แล้วแตะตัวอักษรที่ได้ยิน",
            {
              sample: letter === "ป" ? "ปอ" : letter === "ก" ? "กอ" : "มอ",
              choices: ["ป", "ก", "ม"].map((v) => ({
                id: v,
                label: v,
                art: "letter",
              })),
              answer: letter,
            },
          ),
        ),
      },
      {
        id: "blend",
        label: "ผสมพยางค์และคำ",
        short: "เชื่อมเสียง",
        description: "ฟังส่วนประกอบแล้วลองพูดพยางค์ที่ผสมได้",
        color: COLOR[2],
        icon: "puzzle",
        items: s.syllables.map((w, i) =>
          make(
            `blend:${i}`,
            "speech",
            "ลองผสมเสียง",
            w,
            "sound-pattern",
            "ฟังตัวอย่าง แล้วลองพูดพยางค์ที่ผสมได้",
            {
              segments: [key, ["า", "ี", "ู"][i]],
              hint: "แสดงส่วนประกอบเพื่อเตรียมอ่าน ผู้ใหญ่ช่วยอธิบายได้",
            },
          ),
        ),
      },
      {
        id: "read",
        label: "อ่านคำและประโยค",
        short: "ลองอ่าน",
        description: "ลองอ่านคำที่เห็น พร้อมฟังตัวอย่างเมื่อพร้อม",
        color: COLOR[4],
        icon: "book",
        items: [
          make(
            "read:1",
            "speech",
            "อ่านคำคุ้นเคย",
            s.words[0][0],
            s.words[0][1],
            "ลองอ่านคำนี้ หรือฟังตัวอย่างแล้วพูดตาม",
          ),
          make(
            "read:2",
            "speech",
            "ลองอ่านวลี",
            s.phrases[0][0],
            s.phrases[0][1],
            "ค่อย ๆ อ่านข้อความสั้น ๆ",
          ),
          make(
            "read:3",
            "speech",
            "อ่านประโยค",
            s.phrases[1][0],
            s.phrases[1][1],
            "ลองอ่านประโยคนี้ให้ผู้ใหญ่ฟัง",
          ),
        ],
      },
    ];
  const [a, aa, b, bb] = s.contrast;
  const choices = (i: number) =>
    i % 2
      ? [
          { id: "b", label: b, art: bb },
          { id: "a", label: a, art: aa },
        ]
      : [
          { id: "a", label: a, art: aa },
          { id: "b", label: b, art: bb },
        ];
  const listenItems =
    key === "ม"
      ? [
          make(
            "listen:0",
            "choice",
            "ฟังแล้วเลือกภาพ",
            "มือ",
            "hand",
            "ฟังแล้วแตะภาพที่ได้ยิน",
            {
              choices: [
                { id: "a", label: "มือ", art: "hand" },
                { id: "b", label: "ม้า", art: "horse" },
              ],
              answer: "a",
            },
          ),
          make(
            "listen:1",
            "choice",
            "ภาพไหนตรงกับเสียง",
            "ม้า",
            "horse",
            "ฟังแล้วแตะภาพที่ได้ยิน",
            {
              choices: [
                { id: "b", label: "ม้า", art: "horse" },
                { id: "a", label: "มือ", art: "hand" },
              ],
              answer: "b",
            },
          ),
          make(
            "listen:2",
            "choice",
            "เลือกให้เพื่อนอีกครั้ง",
            "มือ",
            "hand",
            "ลองฟังอีกครั้งแล้วเลือกภาพ",
            {
              choices: [
                { id: "b", label: "ม้า", art: "horse" },
                { id: "a", label: "มือ", art: "hand" },
              ],
              answer: "a",
            },
          ),
        ]
      : [0, 1, 2].map((i) =>
          make(
            `listen:${i}`,
            "choice",
            "นักสืบเสียง",
            i === 1 ? b : a,
            i === 1 ? bb : aa,
            "ฟังแล้วแตะภาพที่ได้ยิน",
            {
              choices: choices(i),
              answer: i === 1 ? "b" : "a",
              hint: "รูปแต่ละรูปหมายถึงอะไร ให้ผู้ใหญ่ช่วยตรวจความเข้าใจก่อน",
            },
          ),
        );
  return [
    {
      id: "listen",
      label: "ฟังแยกเสียง",
      short: "นักสืบเสียง",
      description: "ฟังคำแล้วเลือกภาพ ยังไม่ต้องอัดเสียง",
      color: COLOR[0],
      icon: "ear",
      items: listenItems,
    },
    {
      id: "imitate",
      label: "ดูปากและพูดตาม",
      short: "กระจกพูดตาม",
      description: "ดูภาพสาธิต ฟัง แล้วลองพูดตาม",
      color: COLOR[1],
      icon: "mouth",
      items: s.syllables.map((w, i) =>
        make(
          `imitate:${i}`,
          "speech",
          "ดูแล้วลองพูดตาม",
          w,
          "mouth",
          "มาดูปากทีละจังหวะ แล้วค่อยลองพูดไปด้วยกันนะ",
          {
            hint: s.tip,
            subLabel: "ภาพปากหลายจังหวะสำหรับดูช่วงสระ กดขยายเพื่อดูชัดขึ้นได้",
          },
        ),
      ),
    },
    {
      id: "syllables",
      label: "ฝึกพยางค์",
      short: "ต่อเสียงสั้น ๆ",
      description: "ลองเสียงเป้าหมายกับสระต่างกันทีละพยางค์",
      color: COLOR[2],
      icon: "music",
      items: s.syllables.map((w, i) =>
        make(
          `syllables:${i}`,
          "speech",
          "พูดพยางค์สั้น ๆ",
          w,
          "sound-pattern",
          "ฟังพยางค์แล้วลองพูดตาม",
          { segments: [key, ["า", "ี", "ู"][i]] },
        ),
      ),
    },
    {
      id: "words",
      label: "ฝึกคำ",
      short: "สะสมคำคุ้นเคย",
      description: "ดูภาพแล้วเรียกชื่อเอง หรือขอฟังตัวอย่าง",
      color: COLOR[3],
      icon: "book",
      items: s.words.map(([w, art], i) =>
        make(
          `words:${i}`,
          "speech",
          "ภาพนี้คืออะไร",
          w,
          art,
          "ดูภาพแล้วลองบอกชื่อให้เพื่อนฟัง",
          {
            hint: "ถ้ายังไม่รู้จักภาพ ให้ผู้ใหญ่บอกความหมายก่อน ยังไม่ใช้สรุปปัญหาการออกเสียง",
          },
        ),
      ),
    },
    {
      id: "sentences",
      label: "วลีและประโยค",
      short: "ต่อคำเป็นเรื่อง",
      description: "เพิ่มจากวลีไปประโยค แล้วลองพูดเองจากภาพ",
      color: COLOR[4],
      icon: "chat",
      items: s.phrases.map(([w, art], i) =>
        make(
          `sentences:${i}`,
          "speech",
          i === 0
            ? "ลองพูดวลีสั้น ๆ"
            : i === 1
              ? "ลองพูดเป็นประโยค"
              : "พูดเองจากภาพ",
          w,
          art,
          i === 2
            ? "ดูภาพแล้วลองบอกว่าเกิดอะไรขึ้น"
            : "ฟังตัวอย่างแล้วลองพูดข้อความที่ยาวขึ้น",
          {
            hidePrompt: i === 2,
            subLabel: i === 2 ? "คำตอบอาจต่างจากตัวอย่างได้" : undefined,
          },
        ),
      ),
    },
    {
      id: "transfer",
      label: "ลองใช้จริง",
      short: "เล่าให้คนข้าง ๆ ฟัง",
      description: "ใช้เสียงที่ฝึกในเกมและบทสนทนากับผู้ใหญ่",
      color: COLOR[5],
      icon: "flag",
      items: [
        make(
          "transfer:0",
          "observation",
          "เล่นซ่อนภาพ",
          `${s.words[0][0]}อยู่ในกล่อง`,
          key === "ป" ? "crab-box" : key === "ก" ? "crow-box" : "horse-box",
          "ซ่อนรูปสัตว์ แล้วบอกให้ผู้ใหญ่หาตามคำใบ้",
          { hint: "สังเกตการสื่อสารระหว่างเล่น ไม่ต้องพูดประโยคตรงตัวอย่าง" },
        ),
        make(
          "transfer:1",
          "observation",
          "เล่าจากภาพใหม่",
          s.phrases[1][0],
          s.phrases[1][1],
          "ชวนคุยว่าเห็นอะไรในภาพ และกำลังทำอะไร",
        ),
        make(
          "transfer:2",
          "observation",
          "คุยกันนอกจอ",
          "วันนี้หนูชอบอะไร",
          "garden",
          "พักจากหน้าจอ แล้วชวนคุยเรื่องที่เด็กสนใจ",
          { hint: "ผู้ใหญ่บันทึกสิ่งที่สังเกตได้ สามารถเลือกยังประเมินไม่ได้" },
        ),
      ],
    },
  ];
}
export const FLOW = [
  {
    id: "home",
    title: "บ้านการเรียน",
    description: "เห็นแผนปัจจุบัน กดเริ่มหรือกลับมาฝึกต่อ",
    action: "เริ่มภารกิจ → ตัวเลือกไมค์ → แบบฝึก",
  },
  {
    id: "plan",
    title: "จัดชุดฝึก",
    description: "เลือกเป้าหมาย เสียง ช่วงวัย และจุดเริ่ม",
    action: "บันทึกแผน → เส้นทางการฝึก",
  },
  {
    id: "path",
    title: "เส้นทางของฉัน",
    description: "ดูแต่ละช่วง เลือกเริ่มตรงไหนก็ได้",
    action: "เลือกช่วง → เริ่มชุดฝึก",
  },
  {
    id: "library",
    title: "คลังกิจกรรม",
    description: "กรองกิจกรรม ดูภาพ เสียง และคำแนะนำ",
    action: "เลือกข้อ → ทดลองข้อนั้น",
  },
  {
    id: "practice",
    title: "หน้าฝึก",
    description: "ฟัง เลือกภาพ พูดตาม หรือทำกิจกรรมกับผู้ใหญ่",
    action: "ตอบ → ผลตอบกลับ → บันทึกและไปต่อ",
  },
  {
    id: "summary",
    title: "สรุปรอบฝึก",
    description: "แยกการเข้าร่วม การฟัง และการพูดที่รอตรวจ",
    action: "ฝึกช่วงถัดไป / ดูผล / ให้ผู้ใหญ่ช่วยตรวจ",
  },
  {
    id: "progress",
    title: "ผลการฝึก",
    description: "ดูประวัติ รายละเอียด และตรวจผลรายข้อ",
    action: "ตรวจผล → บันทึก / พิมพ์ / ส่งออก JSON",
  },
  {
    id: "guide",
    title: "คู่มือการทดลอง",
    description: "ข้อจำกัดต้นแบบและแนวทางรวมกับระบบหลัก",
    action: "อ่านคู่มือ / ดาวน์โหลดไฟล์ส่งต่อ",
  },
] as const;

/** Content band is independent from track and skill stage; old sessions default to starter. */
export function getStages(
  track: Track,
  sound: string,
  level?: LearningLevelId,
): Stage[] {
  const band = normalizeLevel(level);
  const key = (sound in SOUNDS ? sound : "ป") as keyof typeof SOUNDS;
  const base = baseStages(track, sound);
  if (band === "starter") return base;
  const c = LEVEL_CONTENT[band][key];
  const levels = ["starter", "explorer", "builder", "storyteller"];
  const rank = levels.indexOf(band);
  const requests = [
    [
      "หนูขอน้ำหน่อยได้ไหม",
      "ขอเล่นบอลกับเพื่อนได้ไหม",
      "ช่วยเปิดกล่องให้หน่อยได้ไหม",
    ],
    [
      "ขอน้ำดื่มหน่อย เพราะหนูกระหายน้ำ",
      "ขอเล่นบอลด้วย แล้วเราผลัดกันเล่นนะ",
      "ช่วยเปิดกล่องนี้ให้หน่อย แล้วหนูจะเก็บของ",
    ],
    [
      "ขอน้ำดื่มหน่อยได้ไหม หลังจากเล่นบอลแล้วฉันรู้สึกกระหายน้ำ",
      "เรามาวางแผนเล่นบอลด้วยกัน แล้วตกลงกันว่าจะผลัดกันอย่างไร",
      "ช่วยแนะนำวิธีเปิดกล่องนี้ได้ไหม ฉันจะลองทำเองตามขั้นตอน",
    ],
  ][rank - 1];
  return base.map((stage) => ({
    ...stage,
    items: stage.items.map((it, i) => {
      let change: Partial<Item> = {};
      if (stage.id === "listen") {
        const words = c.words;
        const target = i === 1 ? words[1] : words[i === 2 ? 2 : 0];
        const other = words[(i + 1) % 3];
        const answer = "target";
        change = {
          prompt: target[0],
          sample: target[0],
          art: target[1],
          instruction: "ตั้งใจฟังสักนิด แล้วเลือกภาพที่ตรงกับเสียงนะ",
          choices: [
            { id: "target", label: target[0], art: target[1] },
            { id: "other", label: other[0], art: other[1] },
          ],
          answer,
        };
        if (i % 2) change.choices = change.choices!.slice().reverse();
      } else if (["syllables", "blend"].includes(stage.id))
        change = {
          prompt: c.syllables[i],
          sample: c.syllables[i],
          segments: undefined,
          art: "sound-pattern",
          instruction: "ฟังทีละชุด แล้วลองพูดตามลำดับเสียงนะ ไม่ต้องรีบ",
          subLabel: "เว้นจังหวะระหว่างพยางค์ และพักได้เมื่ออยากพัก",
        };
      else if (stage.id === "words")
        change = {
          prompt: c.words[i][0],
          sample: c.words[i][0],
          art: c.words[i][1],
          instruction: "ดูภาพให้ดี แล้วลองบอกชื่อด้วยตัวเองนะ",
          hint: "รับคำที่เรียกภาพเดียวกันได้ ไม่ต้องมีคำขยายเหมือนตัวอย่างทุกคำ",
        };
      else if (stage.id === "sentences")
        change = {
          prompt: c.phrases[i][0],
          sample: c.phrases[i][0],
          art: c.phrases[i][1],
          instruction:
            i === 2
              ? "ลองเล่าภาพด้วยคำของเราเอง ให้คนฟังนึกภาพตามได้นะ"
              : "ลองฟัง แล้วพูดข้อความที่ยาวขึ้นทีละช่วงนะ",
          subLabel:
            i === 2
              ? "คำตอบมีได้หลายแบบ ตัวอย่างใช้ช่วยเมื่ออยากฟังเท่านั้น"
              : undefined,
        };
      else if (stage.id === "transfer")
        change = {
          title: [
            "ให้คำใบ้จากภาพ",
            "เล่ารายละเอียดให้ฟัง",
            "ต่อเรื่องด้วยคำของเรา",
          ][i],
          prompt: c.phrases[i][0],
          sample: c.phrases[i][0],
          art: c.phrases[i][1],
          instruction:
            rank === 1
              ? "เล่าภาพให้ผู้ใหญ่ฟัง แล้วผลัดกันถามตอบนะ"
              : rank === 2
                ? "ลองเพิ่มรายละเอียดจากภาพ ให้ผู้ใหญ่รู้ว่าใครทำอะไร ที่ไหนนะ"
                : "เล่าให้คนที่ยังไม่เห็นภาพเข้าใจ แล้วชวนกันถามเหตุผลหรือแต่งเรื่องต่อโดยบอกว่าเป็นสิ่งที่เราคิดนะ",
        };
      else if (stage.id === "understand")
        change = {
          title: "ฟังแล้วเลือกเหตุการณ์",
          prompt: c.phrases[i][0],
          sample: c.phrases[i][0],
          art: c.phrases[i][1],
          instruction: "ฟังข้อความให้จบ แล้วเลือกภาพเหตุการณ์ที่ตรงกันนะ",
          choices: [
            {
              id: "target",
              label: "ภาพเหตุการณ์ที่หนึ่ง",
              art: c.phrases[i][1],
            },
            {
              id: "other",
              label: "ภาพเหตุการณ์ที่สอง",
              art: c.phrases[(i + 1) % 3][1],
            },
          ],
          answer: "target",
        };
      else if (stage.id === "request")
        change = {
          prompt: requests[i],
          sample: requests[i],
          instruction:
            rank === 1
              ? "ลองขอสิ่งที่อยากได้ หรือขอความช่วยเหลืออย่างสุภาพนะ"
              : "ลองบอกความต้องการ พร้อมเหตุผลหรือขั้นตอนที่อยากให้ช่วยนะ",
        };
      else if (stage.id === "story")
        change = {
          prompt: c.phrases[i][0],
          sample: c.phrases[i][0],
          art: c.phrases[i][1],
          instruction:
            rank === 1
              ? "เล่าสิ่งที่เห็น แล้วผลัดกันคุยกับผู้ใหญ่สักหน่อยนะ"
              : rank === 2
                ? "เล่าภาพโดยเพิ่มรายละเอียด แล้วลองถามผู้ใหญ่กลับบ้างนะ"
                : "เริ่มจากสิ่งที่เห็น แล้วแต่งเรื่องต่อพร้อมบอกว่าเราคิดอย่างไร หรือมีเหตุผลอะไรนะ",
        };
      else if (stage.id === "read") {
        const pair = i === 0 ? c.words[0] : c.phrases[i - 1];
        change = {
          prompt: pair[0],
          sample: pair[0],
          art: pair[1],
          instruction: "ลองอ่านข้อความทีละช่วง จะฟังตัวอย่างก่อนก็ได้นะ",
        };
      } else if (stage.id === "letter" && rank >= 2) {
        const word = c.words[i][0];
        const contrast = c.words[(i + 1) % 3][0];
        change = {
          title: "ฟังคำแล้วเลือกข้อความ",
          prompt: word,
          sample: word,
          art: c.words[i][1],
          instruction: "ฟังคำให้จบ แล้วเลือกข้อความที่ตรงกับเสียงนะ",
          choices: [
            { id: "target", label: word, art: "letter" },
            { id: "other", label: contrast, art: "letter" },
          ],
          answer: "target",
        };
      }
      return { ...it, ...change, id: it.id + ":" + band };
    }),
  }));
}
