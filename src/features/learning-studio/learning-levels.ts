/** Product content bands, not developmental norms or a diagnostic scale. */
export type LearningLevelId =
  "starter" | "explorer" | "builder" | "storyteller";
export type TargetSound = "ป" | "ก" | "ม";
export interface LearningLevel {
  id: LearningLevelId;
  label: string;
  ageGuide: string;
  description: string;
  focus: string;
  example: string;
}
export const LEVELS: readonly LearningLevel[] = [
  {
    id: "starter",
    label: "1 · เริ่มคุ้นเสียง",
    ageGuide: "อนุบาลเริ่มต้น · ประมาณ 3–4 ปี",
    description: "คำใกล้ตัว ภาพชัด ข้อความสั้น และมีผู้ใหญ่ช่วยได้",
    focus: "ฟังคำเดี่ยว ลองเสียงกับสระ และพูดข้อความสั้น",
    example: "ปู → ปูตัวเล็ก → ปูอยู่ในกล่อง",
  },
  {
    id: "explorer",
    label: "2 · ต่อคำให้คล่อง",
    ageGuide: "อนุบาลต่อยอด · ประมาณ 4–6 ปี",
    description: "สลับสระ ต่อพยางค์ และเพิ่มคำสองถึงสามพยางค์",
    focus: "คำหลายพยางค์และประโยคบอกว่าใครทำอะไร",
    example: "กระเป๋า → กระเป๋านักเรียน → ไก่กำลังกินข้าว",
  },
  {
    id: "builder",
    label: "3 · เล่าให้เห็นภาพ",
    ageGuide: "ประถมต้น · ป.1–3",
    description: "คำประสม ข้อความยาวขึ้น และเล่าความสัมพันธ์จากภาพ",
    focus: "พูดต่อเนื่องและขยายรายละเอียดให้ผู้ฟังเข้าใจ",
    example: "ปูตัวเล็กกำลังเดินอยู่บนทรายริมทะเล",
  },
  {
    id: "storyteller",
    label: "4 · เล่าเรื่องและอธิบาย",
    ageGuide: "ประถมปลาย · ป.4–6",
    description: "เพิ่มความยาวและการเชื่อมประโยค พร้อมชวนอธิบายด้วยคำของตนเอง",
    focus: "เล่าอย่างมีลำดับ เปรียบเทียบ และให้เหตุผลเมื่อมีข้อมูลรองรับ",
    example:
      "บอกสิ่งที่เห็นก่อน แล้วเล่าต่อด้วยคำเชื่อม เช่น จากนั้น หรือ ส่วน",
  },
];
export const LEARNING_LEVELS = LEVELS;
export function normalizeLevel(value: unknown): LearningLevelId {
  return LEVELS.some((level) => level.id === value)
    ? (value as LearningLevelId)
    : "starter";
}
export function getLevel(value: unknown): LearningLevel {
  return LEVELS.find((level) => level.id === normalizeLevel(value))!;
}
type WordPicture = readonly [word: string, art: string];
type PhrasePicture = readonly [text: string, scene: string];
export interface LeveledSoundContent {
  syllables: readonly [string, string, string];
  words: readonly [WordPicture, WordPicture, WordPicture];
  phrases: readonly [PhrasePicture, PhrasePicture, PhrasePicture];
}
/**
 * Starter content remains in curriculum.ts. Patterns keep the target consonant
 * while varying vowels; longer words/sentences are examples, not mastery tests.
 * Reusing a scene across bands is intentional: language demand changes while
 * the picture remains familiar. Do not score every alternative wording as wrong.
 */
export const LEVEL_CONTENT: Record<
  Exclude<LearningLevelId, "starter">,
  Record<TargetSound, LeveledSoundContent>
> = {
  explorer: {
    ป: {
      syllables: ["ปา ปู", "ปี ปา", "ปู ปี"],
      words: [
        ["ปากกา", "pen"],
        ["กระเป๋า", "backpack"],
        ["ปูทะเล", "crab-beach"],
      ],
      phrases: [
        ["ปูตัวเล็กเดินบนทราย", "crab-beach"],
        ["ปูอยู่ในกล่องใบใหญ่", "crab-box"],
        ["ไก่กำลังกินข้าวเปล่า", "chicken-rice"],
      ],
    },
    ก: {
      syllables: ["กา กู", "กี กา", "กู กี"],
      words: [
        ["กล้วย", "banana"],
        ["กระเป๋า", "backpack"],
        ["นาฬิกา", "clock"],
      ],
      phrases: [
        ["กาเกาะอยู่บนต้นไม้", "crow-tree"],
        ["ไก่กำลังกินข้าว", "chicken-rice"],
        ["ปูอยู่ในกล่องใบใหญ่", "crab-box"],
      ],
    },
    ม: {
      syllables: ["มา มู", "มี มา", "มู มี"],
      words: [
        ["มะพร้าว", "coconut"],
        ["มังคุด", "mangosteen"],
        ["แมวเหมียว", "cat"],
      ],
      phrases: [
        ["แมวกำลังกินปลา", "cat-fish"],
        ["ม้ายืนอยู่ในสวน", "horse-garden"],
        ["มีปูตัวเล็กอยู่บนทราย", "crab-beach"],
      ],
    },
  },
  builder: {
    ป: {
      syllables: ["ปา ปี ปู", "ปู ปา ปี", "ปี ปู ปา"],
      words: [
        ["กระเป๋านักเรียน", "backpack"],
        ["นาฬิกาปลุก", "clock"],
        ["โรงเรียนประถม", "school"],
      ],
      phrases: [
        ["ปูตัวเล็กกำลังเดินอยู่บนทรายริมทะเล", "crab-beach"],
        ["ในกล่องใบใหญ่มีปูตัวเล็กอยู่ข้างใน", "crab-box"],
        ["ไก่กำลังก้มลงกินข้าวเปล่าในชาม", "chicken-rice"],
      ],
    },
    ก: {
      syllables: ["กา กี กู", "กู กา กี", "กี กู กา"],
      words: [
        ["กล้วยหอม", "banana"],
        ["กระเป๋านักเรียน", "backpack"],
        ["นาฬิกาปลุก", "clock"],
      ],
      phrases: [
        ["นกกากำลังเกาะอยู่บนกิ่งไม้", "crow-tree"],
        ["ไก่ตัวหนึ่งกำลังก้มลงกินข้าวในชาม", "chicken-rice"],
        ["ในกล่องใบใหญ่มีปูอยู่ข้างใน", "crab-box"],
      ],
    },
    ม: {
      syllables: ["มา มี มู", "มู มา มี", "มี มู มา"],
      words: [
        ["มะพร้าวอ่อน", "coconut"],
        ["มังคุด", "mangosteen"],
        ["ร่มกันฝน", "umbrella"],
      ],
      phrases: [
        ["แมวตัวเล็กกำลังก้มลงกินปลา", "cat-fish"],
        ["ม้าตัวหนึ่งกำลังยืนอยู่ในสวน", "horse-garden"],
        ["มองเห็นปูตัวเล็กเดินอยู่ริมทะเล", "crab-beach"],
      ],
    },
  },
  storyteller: {
    ป: {
      syllables: ["ปา ปี ปู ปา", "ปี ปู ปา ปี", "ปู ปา ปี ปู"],
      words: [
        ["โรงเรียนประถม", "school"],
        ["นาฬิกาปลุก", "clock"],
        ["กระเป๋านักเรียน", "backpack"],
      ],
      phrases: [
        ["ฉันมองเห็นปูตัวเล็กอยู่บนทราย และมีทะเลอยู่ในภาพด้วย", "crab-beach"],
        ["เมื่อมองเข้าไปในกล่อง ฉันพบว่ามีปูตัวเล็กอยู่ข้างใน", "crab-box"],
        [
          "ไก่กำลังก้มลงกินข้าวเปล่าในชาม ส่วนชามวางอยู่ตรงหน้าไก่",
          "chicken-rice",
        ],
      ],
    },
    ก: {
      syllables: ["กา กี กู กา", "กี กู กา กี", "กู กา กี กู"],
      words: [
        ["กระเป๋านักเรียน", "backpack"],
        ["นาฬิกาปลุก", "clock"],
        ["กล้วยหอม", "banana"],
      ],
      phrases: [
        ["เมื่อมองขึ้นไปบนต้นไม้ ฉันเห็นนกกาเกาะอยู่บนกิ่งไม้", "crow-tree"],
        [
          "ไก่ตัวหนึ่งกำลังกินข้าวในชาม และฉันมองเห็นชามอยู่ตรงหน้าไก่",
          "chicken-rice",
        ],
        ["ฉันสังเกตเห็นกล่องใบหนึ่ง และมีปูตัวเล็กอยู่ข้างในกล่อง", "crab-box"],
      ],
    },
    ม: {
      syllables: ["มา มี มู มา", "มี มู มา มี", "มู มา มี มู"],
      words: [
        ["มะพร้าวน้ำหอม", "coconut"],
        ["ตลาดผลไม้", "market"],
        ["โรงเรียนประถม", "school"],
      ],
      phrases: [
        ["แมวตัวเล็กกำลังกินปลา และมีปลาอยู่บนจานตรงหน้าแมว", "cat-fish"],
        [
          "ม้าตัวหนึ่งยืนอยู่ในสวน และมีต้นไม้กับดอกไม้อยู่ใกล้ ๆ",
          "horse-garden",
        ],
        ["เมื่อมองไปที่ชายทะเล ฉันเห็นปูตัวเล็กอยู่บนพื้นทราย", "crab-beach"],
      ],
    },
  },
};
