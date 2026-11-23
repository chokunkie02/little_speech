// Builds docs/design/wireframes/family-pages.html: sticker book, print-at-home sheets, the new guide and
// simpler adult pages. Reuses the approved kid-practice wireframe's fonts, tokens, icons, frames and the
// phone/computer switch, so both documents look and work the same.
//
//   ART=v2 node scripts/design/export-art.mjs      (once: the redrawn pictures, art/v2/)
//   node scripts/design/build-family-wireframe.mjs
import { readFile, writeFile } from "node:fs/promises";

const DIR = "docs/design/wireframes";
const base = await readFile(`${DIR}/kid-practice.html`, "utf8");
const cut = (from, to, start = 0) => {
  const i = base.indexOf(from, start);
  const j = base.indexOf(to, i);
  if (i < 0 || j < 0) throw new Error(`kid-practice.html changed: ${from}`);
  return base.slice(i, j + to.length);
};
const fonts = cut('<link rel="preconnect"', 'rel="stylesheet">');
const style = cut("<style>", "</style>");
const icons = cut('<svg width="0" height="0"', "</svg>\n");
const script = cut("<script>", "</script>", base.lastIndexOf("<script>"));

const art = (kind) => `art/v2/${kind}.svg`;
const pu = (cls = "pu") => `<img class="${cls}" src="${art("crab")}" alt="พี่ปู">`;
const icon = (id, cls = "") => `<svg${cls ? ` class="${cls}"` : ""}><use href="#${id}"/></svg>`;
const chrome = (url) => `<div class="chrome"><i></i><i></i><i></i><span class="url">${url}</span></div>`;
const phone = (inner, label) => `<div><div class="phone">${inner}</div><p class="frame-label">${label}</p></div>`;
const desk = (url, inner, label) => `<div><div class="desk">${chrome(url)}${inner}</div><p class="frame-label">${label}</p></div>`;
const before = (name, pcLabel = "ฝึกและเรียน") =>
  `<div><p class="col-title now">ปัจจุบัน</p><div class="desk before pc-only">${chrome(`Speech Adventure · ${pcLabel}`)}<div class="shot"><img src="before/pc/adult/${name}.jpg" alt=""></div></div><div class="phone before phone-only"><img src="before/adult/${name}.jpg" alt=""></div></div>`;
const none = (text) =>
  `<div><p class="col-title now">ปัจจุบัน</p><div class="desk empty pc-only">${text}</div><div class="phone phone-only empty-phone">${text}</div></div>`;
const compare = (left, phones, desks, notes) =>
  `<div class="compare">${left}<div><p class="col-title new">แบบใหม่</p><div class="desks pc-only">${desks}</div><div class="phones phone-only">${phones}</div></div><div class="notes">${notes}</div></div>`;
const numbers = (items) => `<div class="numbers">${items.map(([v, l]) => `<div><b>${v}</b>${l}</div>`).join("")}</div>`;
const ul = (items) => `<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
const T = { cut: (t) => `<span class="t-cut">${t}</span>`, add: (t) => `<span class="t-add">${t}</span>`, move: (t) => `<span class="t-move">${t}</span>` };
const kidTop = (left, right) => `<div class="top">${left}<span></span>${right}</div>`;
const home = `<span class="ibtn">${icon("i-home")}</span>`;
const back = `<span class="ibtn">${icon("i-map")}</span>`;

/* ── Sticker book data: the studio's own pictures, by page ── */
const PAGES = [
  { id: "animals", name: "สัตว์", icon: "chicken", items: [["crab", "ปู", 1], ["chicken", "ไก่", 1], ["crow", "กา", 1], ["horse", "ม้า", 0], ["cat", "แมว", 1], ["fish", "ปลา", 1], ["shrimp", "กุ้ง", 0], ["snake", "งู", 0], ["crab-beach", "ปูที่ทะเล", 2]] },
  { id: "food", name: "ของกิน", icon: "banana", items: [["banana", "กล้วย", 1], ["coconut", "มะพร้าว", 1], ["mangosteen", "มังคุด", 0], ["rice", "ข้าว", 2], ["cup", "แก้วน้ำ", 0], ["chicken-rice", "ไก่กินข้าว", 0]] },
  { id: "things", name: "ของใช้", icon: "backpack", items: [["backpack", "กระเป๋า", 1], ["clock", "นาฬิกา", 1], ["pen", "ปากกา", 0], ["umbrella", "ร่ม", 0], ["ball", "ลูกบอล", 1], ["box", "กล่อง", 0]] },
  { id: "places", name: "สถานที่", icon: "school", items: [["school", "โรงเรียน", 1], ["market", "ตลาด", 0], ["garden", "สวน", 0], ["tree", "ต้นไม้", 1]] },
];
// 0 = not yet, 1 = collected, 2 = new this round
const sticker = (kind, name, state) =>
  `<div class="stk${state === 0 ? " locked" : ""}${state === 2 ? " fresh" : ""}"><span class="stk-pic"><img src="${art(kind)}" alt=""></span>${state === 2 ? '<em>ใหม่!</em>' : ""}<small>${state === 0 ? "?" : name}</small></div>`;
const tabs = (active) =>
  `<div class="sb-tabs">${PAGES.map((p) => {
    const got = p.items.filter((i) => i[2]).length;
    return `<span class="${p.id === active ? "on" : ""}"><img src="${art(p.icon)}" alt="">${p.name}<b>${got}/${p.items.length}</b></span>`;
  }).join("")}</div>`;
const page = (id) => PAGES.find((p) => p.id === id);
const grid = (id, n = 99) => `<div class="sb-grid">${page(id).items.slice(0, n).map(([k, name, s]) => sticker(k, name, s)).join("")}</div>`;
const total = PAGES.flatMap((p) => p.items);
const got = total.filter((i) => i[2]).length;

/* ── Sections ── */
const S = [];

S.push(`<div class="part" id="part1"><span>ส่วนที่ 1</span><h2>ของสะสมของเด็ก</h2><p>สมุดสติกเกอร์ และช่วงได้สติกเกอร์ใหม่ตอนจบด่าน</p></div>`);

// 1 STICKER BOOK
S.push(`<section class="block" id="book">
  <h2>1 · สมุดสติกเกอร์ของหนู</h2>
  <p class="lead">ทุกภาพที่ได้ฝึกในเกม (ส่งของ การ์ด รถไฟ …) กลายเป็นสติกเกอร์ 1 ดวง เก็บแยกหน้าตามหมวด · ช่องที่ยังไม่ได้เป็นเงา เด็กอยากเก็บให้ครบ · เปิดจากปุ่มสมุดบนแผนที่</p>
  ${compare(
    none("ไม่มี<br>ดาวรวมเป็นตัวเลขบนแผนที่อย่างเดียว"),
    phone(`<div class="kid">${kidTop(back, `<span class="count">${icon("i-star")}${got}/${total.length}</span>${home}`)}<div class="stage sb-stage"><div class="kid-title" style="font-size:24px">สมุดสติกเกอร์ของหนู</div>${tabs("animals")}${grid("animals")}<div class="mascot">${pu()}<div class="bubble"><span class="spk">${icon("i-vol")}แตะเพื่อฟัง</span>เก็บอีก 3 ดวง หน้านี้ครบเลย!</div></div></div></div>`, "เปิดหน้าแรกที่มีสติกเกอร์ใหม่ · แตะสติกเกอร์ พี่ปูพูดชื่อภาพให้ฟัง")
    + phone(`<div class="kid">${kidTop(back, home)}<div class="stage"><div class="stk-zoom">${sticker("horse", "ม้า", 0)}</div><div class="kid-title" style="font-size:24px">ยังไม่ได้สติกเกอร์นี้</div><div class="kid-sub">ไปเล่น <b>การ์ดสติกเกอร์</b> แล้วจะได้ดวงนี้นะ</div><span class="btn gold" style="flex:none;width:200px">${icon("i-play")}ไปเล่นเลย</span></div></div>`, "แตะช่องที่เป็นเงา: บอกว่าได้จากเกมไหน และพาไปเล่นได้เลย"),
    desk("Speech Adventure · สมุดสติกเกอร์", `<div class="kid">${kidTop(back, `<span class="count">${icon("i-star")}${got}/${total.length}</span>${home}`)}<div class="stage" style="padding:0 40px 18px"><div class="book"><div class="book-page">${tabs("animals").replace("sb-tabs", "sb-tabs pc-tabs")}<h3>สัตว์</h3>${grid("animals")}</div><div class="book-page"><h3>ของกิน</h3>${grid("food")}<div class="mascot" style="margin-top:auto">${pu()}<div class="bubble">ได้ข้าวสวยมาใหม่ด้วย!</div></div></div><div class="ribbons">${PAGES.map((p, i) => `<span class="${i < 2 ? "on" : ""}"><img src="${art(p.icon)}" alt=""></span>`).join("")}</div></div></div></div>`, "บนคอม: เปิดเป็นสมุด 2 หน้า ป้ายริบบิ้นด้านข้างพลิกไปหมวดอื่น"),
    `<p class="pc-note pc-only"><b>บนคอม:</b> สมุดกาง 2 หน้า · ลูกศรซ้าย/ขวาพลิกหน้า</p>
    ${numbers([[`${total.length}`, "สติกเกอร์ในชุดแรก (จากภาพในหลักสูตร)"], ["4", "หมวด"], ["0", "ตัวเลขคะแนน"]])}
    ${ul([
      `${T.add("เพิ่ม")} ปุ่มสมุด ${icon("i-book", "inl")} บนแผนที่ (ตำแหน่งเดียวกับไวร์เฟรมเดิม)`,
      "ได้สติกเกอร์จากการ<b>ลองเล่น</b> ไม่ต้องตอบถูก (เหมือนดาว: ให้รางวัลความพยายาม)",
      "ข้อที่ไม่มีภาพ (ตัวอักษร รูปปาก) ได้สติกเกอร์ดาวหรือพี่ปูท่าต่าง ๆ แทน",
      "ครบหน้า: หน้านั้นได้กรอบทอง และพี่ปูได้ของแต่งตัว 1 ชิ้น (หมวก แว่น) เห็นบนแผนที่",
      "เก็บในเครื่องและในบัญชีเด็ก ใช้ข้อมูลรอบที่มีอยู่แล้ว ไม่เก็บข้อมูลใหม่",
    ])}`,
  )}
</section>`);

// 2 NEW STICKER MOMENT
S.push(`<section class="block" id="earn">
  <h2>2 · ได้สติกเกอร์ใหม่ (จบด่าน)</h2>
  <p class="lead">หน้าฉลองจบด่านที่มีอยู่แล้ว เพิ่มช่วงที่สติกเกอร์ของด่านนี้ลอยลงสมุด · เด็กรู้ว่าเล่นแล้วได้อะไรกลับไป</p>
  ${compare(
    `<div><p class="col-title now">ปัจจุบัน</p><div class="desk before pc-only"><div class="kid">${kidTop(`<span class="ibtn">${icon("i-pause")}</span>`, home)}<div class="stage"><img class="pu big" src="${art("crab")}" alt=""><div class="kid-title">ภารกิจสำเร็จ!</div><div class="stars">${icon("i-star")}${icon("i-star")}${icon("i-star")}</div><div class="row" style="width:520px"><span class="btn">${icon("i-replay")}เล่นอีก</span><span class="btn gold">ด่านต่อไป${icon("i-next")}</span></div></div></div></div><div class="phone phone-only"><div class="kid">${kidTop(`<span class="ibtn">${icon("i-pause")}</span>`, home)}<div class="stage"><img class="pu big" src="${art("crab")}" alt=""><div class="kid-title">ภารกิจสำเร็จ!</div><div class="stars">${icon("i-star")}${icon("i-star")}${icon("i-star")}</div><div class="row"><span class="btn">${icon("i-replay")}เล่นอีก</span><span class="btn gold">ด่านต่อไป</span></div></div></div></div></div>`,
    phone(`<div class="kid">${kidTop(`<span class="ibtn">${icon("i-pause")}</span>`, home)}<div class="stage"><div class="kid-title">ภารกิจสำเร็จ!</div><div class="earn"><div class="earn-new">${sticker("banana", "กล้วย", 2)}${sticker("rice", "ข้าว", 2)}</div><span class="earn-arrow">${icon("i-next")}</span><span class="earn-book">${icon("i-book")}<b>+2</b></span></div><div class="kid-sub">ได้สติกเกอร์ใหม่ 2 ดวง!</div><div class="row"><span class="btn">${icon("i-book")}เปิดสมุด</span><span class="btn gold">ด่านต่อไป</span></div></div></div>`, "สติกเกอร์เด้งขึ้น แล้วบินเข้าสมุดมุมขวา (+2)"),
    desk("Speech Adventure · ฝึกและเรียน", `<div class="kid">${kidTop(`<span class="ibtn">${icon("i-pause")}</span>`, home)}<div class="split"><div class="col"><div class="earn big"><div class="earn-new">${sticker("banana", "กล้วย", 2)}${sticker("rice", "ข้าว", 2)}</div><span class="earn-arrow">${icon("i-next")}</span><span class="earn-book">${icon("i-book")}<b>+2</b></span></div></div><div class="col"><div class="kid-title">ภารกิจสำเร็จ!</div><div class="kid-sub">ได้สติกเกอร์ใหม่ 2 ดวง</div><div class="row"><span class="btn">${icon("i-book")}เปิดสมุด</span><span class="btn gold">ด่านต่อไป${icon("i-next")}</span></div></div></div></div>`, "บนคอม: ซ้ายสติกเกอร์ ขวาปุ่ม (แบบเดียวกับหน้าจบด่านตอนนี้)"),
    `${ul([
      `${T.add("เพิ่ม")} สติกเกอร์ของด่านนี้ และปุ่ม "เปิดสมุด"`,
      `${T.cut("ตัด")} ดาว 3 ดวงที่ได้เท่ากันทุกรอบ (สติกเกอร์บอกได้ชัดกว่าว่าได้อะไร) · ดาวสะสมยังอยู่บนแผนที่`,
      "ได้ซ้ำ (เคยมีแล้ว) ขึ้น \"เก็บไว้แล้ว\" ไม่หายไปไหน",
      "หน้าสรุปการผจญภัยบอกด้วยว่า \"รอบนี้ได้สติกเกอร์ 9 ดวง\"",
    ])}`,
  )}
</section>`);

S.push(`<div class="part" id="part2"><span>ส่วนที่ 2</span><h2>พิมพ์ให้น้องที่บ้าน</h2><p>ศูนย์พิมพ์สำหรับผู้ใหญ่ และตัวอย่างกระดาษ A4 ทั้ง 3 แบบ</p></div>`);

// 3 PRINT CENTER (adult page)
const sideNav = (active) =>
  `<aside class="site-nav"><div class="site-brand"><span class="logo">${icon("i-mic")}</span>Speech<small>Adventure</small></div>${["หน้าหลัก", "ฝึกและเรียน", "ผลการฝึก", "พิมพ์ให้น้อง", "ข้อมูลลูก", "ตั้งค่า"].map((n) => `<span class="${n === active ? "on" : ""}">${n}</span>`).join("")}</aside>`;
const printOptions = `<div class="print-opts">
  <label class="print-card on"><span class="pc-thumb">${a4Sticker(true)}</span><b>แผ่นสติกเกอร์</b><small>สติกเกอร์ที่น้องเก็บได้ ${got} ดวง · พิมพ์ลงกระดาษสติกเกอร์ A4</small></label>
  <label class="print-card"><span class="pc-thumb">${a4Cards(true)}</span><b>บัตรคำฝึกที่บ้าน</b><small>เสียง ก · 8 คำ พร้อมวิธีเล่นสั้น ๆ</small></label>
  <label class="print-card"><span class="pc-thumb">${a4Cert(true)}</span><b>ใบประกาศ</b><small>นักผจญภัยเสียง ก · ใส่ชื่อเล่นได้</small></label></div>`;
function a4Sticker(mini) {
  const items = total.filter((i) => i[2]).slice(0, mini ? 12 : 15);
  return `<div class="a4${mini ? " mini" : ""}"><div class="a4-head">สติกเกอร์ของน้องฟ้า<small>Speech Adventure · ตัดตามเส้นประ</small></div><div class="a4-stickers">${items.map(([k]) => `<span><img src="${art(k)}" alt=""></span>`).join("")}</div></div>`;
}
function a4Cards(mini) {
  const words = [["clock", "นา<u>ฬิ</u>กา", "นาฬิกา"], ["crow", "<u>ก</u>า", "กา"], ["chicken", "ไ<u>ก่</u>", "ไก่"], ["backpack", "<u>ก</u>ระเป๋า", "กระเป๋า"], ["banana", "<u>ก</u>ล้วย", "กล้วย"], ["cup", "แ<u>ก้</u>ว", "แก้ว"], ["shrimp", "<u>กุ้</u>ง", "กุ้ง"], ["ball", "ลู<u>ก</u>บอล", "ลูกบอล"]];
  return `<div class="a4${mini ? " mini" : ""}"><div class="a4-head">บัตรคำฝึกเสียง ก<small>ตัดเป็นใบ · ให้น้องพูดคำละ 3 ครั้ง ชมทุกครั้งที่ลอง</small></div><div class="a4-cards">${words.map(([k, w]) => `<span><img src="${art(k)}" alt=""><b>${w.replace(/<u>/g, '<i class="hl">').replace(/<\/u>/g, "</i>")}</b></span>`).join("")}</div><div class="a4-foot">เกมที่บ้าน: วางบัตรคว่ำ เปิดทีละใบ พูดชื่อภาพ ได้เก็บบัตร</div></div>`;
}
function a4Cert(mini) {
  return `<div class="a4 cert${mini ? " mini" : ""}"><div class="cert-in"><img class="cert-cup" src="${art("crab")}" alt=""><div class="cert-t">ใบประกาศ</div><div class="cert-s">นักผจญภัยเสียง ก</div><div class="cert-n">น้องฟ้า</div><div class="cert-p">ฝึกครบ 6 ด่าน · ได้ดาว 30 ดวง · สติกเกอร์ ${got} ดวง</div><div class="cert-d">23 พฤศจิกายน 2569</div><div class="cert-sign"><span>ผู้ปกครอง</span><span>ครู</span></div></div></div>`;
}
S.push(`<section class="block" id="print">
  <h2>3 · พิมพ์ให้น้อง (หน้าผู้ใหญ่)</h2>
  <p class="lead">ผู้ใหญ่เลือก 1 ใน 3 แบบ ดูตัวอย่าง แล้วกดพิมพ์ (หรือบันทึกเป็น PDF จากหน้าต่างพิมพ์ของเครื่อง) · ไม่ต้องลงโปรแกรม</p>
  ${compare(
    none("ไม่มี<br>พิมพ์ได้เฉพาะรายงานผลการฝึก"),
    phone(`<div class="adult-screen"><div class="hdr"><b>พิมพ์ให้น้อง</b><small>น้องฟ้า · เสียง ก</small></div><div class="list">${printOptions}<div class="print-set"><span>ชื่อบนใบประกาศ</span><b>น้องฟ้า ✎</b></div><span class="btn go wide">${icon("i-print")}พิมพ์ / บันทึก PDF</span></div></div>`, "เลือกแบบ (เลื่อนดูได้) · ตั้งค่าเฉพาะที่จำเป็น · ปุ่มพิมพ์ปุ่มเดียว"),
    desk("Speech Adventure · พิมพ์ให้น้อง", `<div class="site">${sideNav("พิมพ์ให้น้อง")}<main class="site-main"><div class="site-title">${icon("i-print")}<b>พิมพ์ให้น้องที่บ้าน</b><small>เลือกแบบ ดูตัวอย่าง แล้วพิมพ์ได้เลย</small></div><div class="print-layout"><div>${printOptions}<div class="print-set"><span>ชื่อบนใบประกาศ</span><b>น้องฟ้า ✎</b></div><div class="print-set"><span>กระดาษ</span><b>A4 · สติกเกอร์แบบเต็มแผ่น</b></div></div><div class="print-preview">${a4Sticker(false)}<span class="btn go wide">${icon("i-print")}พิมพ์ / บันทึก PDF</span></div></div></main></div>`, "บนคอม: เลือกซ้าย ตัวอย่างขนาดจริงด้านขวา"),
    `${ul([
      `${T.add("เพิ่ม")} เมนู "พิมพ์ให้น้อง" ในแถบผู้ใหญ่ (และปุ่มลัดจากสมุดสติกเกอร์ / หน้าสรุปการผจญภัย)`,
      "ใช้การพิมพ์ของเบราว์เซอร์ (กด Ctrl+P ได้ด้วย) จัดหน้า A4 ด้วย CSS ไม่ส่งข้อมูลออกนอกเครื่อง",
      "ชื่อบนใบประกาศใช้ชื่อเล่น แก้ได้ หรือเว้นว่างไว้เขียนเอง",
      "บัตรคำเลือกคำจากเสียงที่ฝึกและระดับของเด็ก ไฮไลต์ตัวที่ฝึกด้วยสี",
    ])}`,
  )}
</section>`);

// 4 A4 PREVIEWS
S.push(`<section class="block" id="sheets">
  <h2>4 · ตัวอย่างกระดาษ A4 ทั้ง 3 แบบ</h2>
  <p class="lead">หน้าตาตอนพิมพ์ออกมาจริง (พื้นขาว ประหยัดหมึก ภาพชุดเดียวกับในเกม)</p>
  <div class="sheets">
    <div>${a4Sticker(false)}<p class="frame-label"><b>แผ่นสติกเกอร์</b> · เส้นประให้ตัด · พิมพ์ลงกระดาษสติกเกอร์ A4 แบบเต็มแผ่นแล้วตัดเอง</p></div>
    <div>${a4Cards(false)}<p class="frame-label"><b>บัตรคำฝึกที่บ้าน</b> · 8 ใบต่อแผ่น · ตัวที่ฝึกเป็นสี · มีเกมสั้น ๆ ให้พ่อแม่เล่นต่อ</p></div>
    <div>${a4Cert(false)}<p class="frame-label"><b>ใบประกาศ</b> · พิมพ์เมื่อจบการผจญภัย · มีที่เซ็นของผู้ปกครองและครู</p></div>
  </div>
  <div class="grid2" style="margin-top:18px"><div class="box"><h3>ทำไมบัตรคำสำคัญที่สุด</h3><p style="margin:0;color:var(--muted)">พาการฝึกออกจากจอไปอยู่ในชีวิตประจำวัน ซึ่งเป็นขั้น "ลองใช้จริง" ของหลักสูตรอยู่แล้ว และพ่อแม่รู้ว่าควรพูดคำไหนกับลูก</p></div><div class="box"><h3>ทางเลือกเพิ่มทีหลัง</h3><p style="margin:0;color:var(--muted)">ภาพระบายสี (เส้นขอบของสติกเกอร์), ตารางสะสมดาวรายสัปดาห์ติดตู้เย็น</p></div></div>
</section>`);

S.push(`<div class="part" id="part3"><span>ส่วนที่ 3</span><h2>คู่มือที่ดูแล้วเข้าใจ</h2><p>พี่ปูสอนเล่นเป็นภาพเคลื่อนไหว และป้ายแนะนำครั้งแรก</p></div>`);

// 5 GUIDE
const playerFrames = `<div class="player"><div class="pf f1"><div class="mini-mic">${icon("i-mic")}</div><span class="finger">${icon("i-hand")}</span><b>1 · กดค้างที่ไมค์ แล้วพูด</b></div><div class="pf f2"><div class="mini-river"><span class="s1"></span><span class="s2"></span><span class="s3"></span><img src="${art("crab")}" alt=""></div><b>2 · ได้ยินเสียง 1 ครั้ง พี่ปูกระโดด 1 ก้าว</b></div><div class="pf f3"><div class="mini-faces"><span class="yes">${icon("i-smile")}ทำได้</span><span>${icon("i-replay")}ฝึกอีก</span></div><b>3 · ผู้ใหญ่แตะผล 1 ครั้ง</b></div><div class="pf f4"><div class="mini-book">${sticker("banana", "กล้วย", 2)}</div><b>4 · ได้สติกเกอร์ ดูผลได้ที่หน้าผลการฝึก</b></div><div class="player-bar"><span class="play">${icon("i-play")}</span><i><b></b></i><small>0:40</small></div></div>`;
const chapters = `<div class="chapters">${["เริ่มเล่น", "กดค้างพูด", "ผู้ใหญ่ให้ผล", "ดูผลและพิมพ์"].map((c, i) => `<span class="${i === 0 ? "on" : ""}">${i + 1} · ${c}</span>`).join("")}</div>`;
const faq = `<div class="faq">${[["i-mic-off", "ไมค์ไม่ทำงาน", "เปิดสิทธิ์ไมค์ หรือเล่นแบบแตะจอ"], ["i-users", "เล่นด้วยกัน / เล่นเอง", "ต่างกันยังไง เลือกแบบไหน"], ["i-chart", "ผลไปอยู่ไหน", "ใครเห็นบ้าง ครูเห็นไหม"], ["i-shield", "เสียงลูกถูกเก็บไหม", "ไม่เก็บถาวร ใช้ฟังในเครื่อง"]].map(([i, t, s]) => `<span>${icon(i)}<b>${t}</b><small>${s}</small></span>`).join("")}</div>`;
S.push(`<section class="block" id="guide">
  <h2>5 · คู่มือ: ดูพี่ปูสอนเล่น</h2>
  <p class="lead">แทนรายการข้อความ 5 ข้อ ด้วยภาพเคลื่อนไหวสั้น ๆ ที่ใช้หน้าจอเกมจริง (ในไวร์เฟรมนี้ขยับจริง) · แก้หน้าเกมเมื่อไร คู่มือก็ตรงตามเอง ไม่ต้องอัดคลิปใหม่</p>
  ${compare(
    before("guide", "คู่มือ"),
    phone(`<div class="adult-screen"><div class="hdr"><b>คู่มือ</b><small>ดูพี่ปูสอนเล่น 40 วินาที</small></div><div class="list">${playerFrames}${chapters}<span class="btn gold wide">${icon("i-play")}ลองเล่น 1 ข้อ (ไม่บันทึกผล)</span>${faq}</div></div>`, "ภาพเคลื่อนไหวด้านบน (เปิดเสียงพี่ปูได้) · ลองเล่นจริง 1 ข้อ · คำถามที่เจอบ่อย"),
    desk("Speech Adventure · คู่มือ", `<div class="site">${sideNav("ฝึกและเรียน")}<main class="site-main"><div class="site-title">${icon("i-help")}<b>คู่มือ</b><small>ดูพี่ปูสอนเล่น แล้วลองเล่นเองได้เลย</small></div><div class="guide-layout"><div>${playerFrames}${chapters}</div><div><span class="btn gold wide">${icon("i-play")}ลองเล่น 1 ข้อ (ไม่บันทึกผล)</span>${faq}<div class="docs">${icon("i-book", "inl")} เอกสารแนวคิดและแหล่งที่มา (สำหรับครูและผู้เชี่ยวชาญ) ›</div></div></div></main></div>`, "บนคอม: วิดีโอซ้าย ลองเล่นและคำถามขวา"),
    `${numbers([["5 ข้อความ → 4 ฉาก", "วิธีเล่น"], ["0", "ไฟล์วิดีโอที่ต้องอัด"]])}
    ${ul([
      `${T.cut("ตัด")} รายการข้อความวิธีใช้ 5 ข้อ`,
      `${T.add("เพิ่ม")} ภาพเคลื่อนไหว 4 ฉาก + เสียงพี่ปู, ปุ่ม "ลองเล่น 1 ข้อ", คำถาม 4 ข้อ`,
      `${T.move("ย้าย")} เอกสารแนวคิด / ไฟล์ดาวน์โหลด ไปล่างสุด (สำหรับครูและผู้เชี่ยวชาญ) · ล้างข้อมูลในเครื่อง ไปหน้าตั้งค่า`,
      "ทำจากหน้าจอจริงในโหมดสาธิต จึงไม่ต้องตัดต่อวิดีโอ ถ้าอยากได้คลิปจริงไว้แชร์ อัดจากตัวนี้ได้",
    ])}`,
  )}
</section>`);

// 6 FIRST-RUN TIPS
S.push(`<section class="block" id="tips">
  <h2>6 · ป้ายแนะนำครั้งแรก</h2>
  <p class="lead">เปิดแผนที่ครั้งแรกในเครื่องนี้: มืดลงเล็กน้อย ไฟส่อง 3 จุดทีละจุด แตะที่ไหนก็ได้เพื่อไปจุดถัดไป · ไม่ขึ้นอีกหลังจากนั้น (เปิดใหม่ได้จากคู่มือ)</p>
  <div class="phones" style="gap:22px">
    ${[["gold", "1 / 3 · ปุ่มทอง = เริ่มเล่นด่านต่อไป"], ["adult", "2 / 3 · ผู้ใหญ่ดูวิธีเล่น ตั้งค่า และผลได้ตรงนี้"], ["home", "3 / 3 · บ้าน = กลับหน้าหลัก สมุด = ดูสติกเกอร์"]].map(([spot, text]) =>
      phone(`<div class="kid">${kidTop(`<span class="chip-sound">ก <small>เสียงที่ฝึก</small></span>`, `<span class="ibtn${spot === "home" ? " spot" : ""}">${icon("i-book")}</span><span class="ibtn${spot === "home" ? " spot" : ""}">${icon("i-home")}</span>`)}<div class="stage"><div class="mascot">${pu()}<div class="bubble">วันนี้ไปกระโดดหินกัน!</div></div><div class="map-mini">${[0, 1, 2, 3, 4, 5].map((i) => `<span style="left:${i % 2 ? 70 : 28}%;top:${88 - i * 16}%">${i < 2 ? icon("i-star") : ""}</span>`).join("")}</div><span class="btn gold${spot === "gold" ? " spot" : ""}" style="flex:none;width:180px">${icon("i-play")}ไปต่อ</span></div><span class="adult${spot === "adult" ? " spot" : ""}">${icon("i-user")}ผู้ใหญ่</span><div class="coach"><p>${text}</p><small>แตะเพื่อไปต่อ</small></div></div>`, text),
    ).join("")}
  </div>
</section>`);

S.push(`<div class="part" id="part4"><span>ส่วนที่ 4</span><h2>หน้าผู้ใหญ่ที่เรียบขึ้น</h2><p>รวมหน้าที่ซ้ำ ให้ตัวเลขตรงกัน และพาไปสิ่งที่ต้องทำต่อ</p></div>`);

// 7 TABS
const tabRow = (items, on) => `<div class="tabrow">${items.map(([i, t]) => `<span class="${t === on ? "on" : ""}">${icon(i)}${t}</span>`).join("")}</div>`;
S.push(`<section class="block" id="tabs">
  <h2>7 · เมนูห้องฝึก: 6 แท็บ → 4</h2>
  <p class="lead">ตอนนี้มีหน้าที่ทำเรื่องเดียวกันหลายที่ (เส้นทางกับแผนที่, ผลการฝึกในห้องฝึกกับความก้าวหน้าในเมนูซ้าย, เลือกระดับ 2 ที่) ผู้ใหญ่เลยไม่แน่ใจว่าควรดูตรงไหน</p>
  <div class="box"><p class="col-title now">ปัจจุบัน</p>${tabRow([["i-home", "แผนวันนี้"], ["i-map", "เส้นทางของฉัน"], ["i-book", "คลังกิจกรรม"], ["i-chart", "ผลการฝึก"], ["i-sliders", "จัดชุดฝึก"], ["i-help", "คู่มือ"]], "แผนวันนี้")}
  <p class="col-title new" style="margin-top:16px">แบบใหม่</p>${tabRow([["i-home", "แผนวันนี้"], ["i-chart", "ผลการฝึก"], ["i-print", "สติกเกอร์และพิมพ์"], ["i-sliders", "จัดชุดฝึก"]], "แผนวันนี้")}<span class="help-dot">${icon("i-help")} คู่มือ (ปุ่ม ? มุมขวา)</span></div>
  <div class="grid2" style="margin-top:16px">
    <div class="box"><h3>ย้ายไปไหน</h3>${ul([`<b>เส้นทางของฉัน</b> ${T.move("→")} แผนที่ของเด็ก (เด็กเห็นเหมือนเดิม) + รายการด่านในจัดชุดฝึก (ผู้ใหญ่)`, `<b>คลังกิจกรรม</b> ${T.move("→")} ขั้น "เลือกข้อเอง" ในจัดชุดฝึก`, `<b>ผลการฝึก</b> + เมนูซ้าย <b>ความก้าวหน้า</b> ${T.move("→")} หน้าเดียว (ข้อ 9)`, `<b>คู่มือ</b> ${T.move("→")} ปุ่ม ? ทุกหน้า`])}</div>
    <div class="box"><h3>ตัวเลขต้องตรงกันทุกที่</h3>${ul(["เสียงที่ฝึกและดาวในเมนูซ้ายอ่านจากห้องฝึกแล้ว (แก้แล้ววันนี้)", "ข้อความ \"ส่งเข้าระบบไม่สำเร็จ\" ที่ขึ้นค้าง แก้แล้ว: เป็นผลที่โรงเรียนให้ครูยืนยัน ตอนนี้บอกตรง ๆ แทน", "ชื่อเล่นและอายุใช้จากข้อมูลลูกที่เดียว ไม่ถามซ้ำในจัดชุดฝึก"])}</div>
  </div>
</section>`);

// 8 TODAY
S.push(`<section class="block" id="today">
  <h2>8 · แผนวันนี้</h2>
  <p class="lead">หน้าแรกของผู้ใหญ่ในห้องฝึก: ปุ่มเดียวพาเด็กเข้าโลกของพี่ปู และบอก 2 เรื่องที่ผู้ใหญ่ควรทำต่อ · การเลือกระดับย้ายไปจัดชุดฝึก</p>
  ${compare(
    before("home"),
    phone(`<div class="adult-screen"><div class="hdr today"><small>น้องฟ้า · เสียง ก · ระดับ 2 คำให้คล่อง</small><b style="font-size:22px">พร้อมผจญภัยวันนี้</b><span class="btn gold wide" style="margin-top:12px">${icon("i-play")}เข้าโลกของพี่ปู</span><span class="today-strip"><span>${icon("i-star")}ดาว 30</span><span>${icon("i-book")}สติกเกอร์ ${got}/${total.length}</span><span>${icon("i-flag")}ด่านต่อไป: กระโดดหิน</span></span></div><div class="list"><div class="todo">${icon("i-ear")}<span><b>รอผู้ใหญ่ฟัง 12 ข้อ</b><small>ให้ผลตอนนี้ ใช้ราว 2 นาที</small></span><em>›</em></div><div class="todo">${icon("i-print")}<span><b>สติกเกอร์ใหม่ 3 ดวง</b><small>พิมพ์ให้น้องติดสมุดจริง</small></span><em>›</em></div><div class="week"><b>สัปดาห์นี้</b><span>${["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"].map((d, i) => `<i class="${[0, 2, 3, 6].includes(i) ? "on" : ""}">${d}</i>`).join("")}</span><small>เล่นแล้ว 4 วัน · เป้าหมาย 5 วัน</small></div></div></div>`, "ปุ่มทองปุ่มเดียว · 2 เรื่องที่ควรทำต่อ · สัปดาห์นี้"),
    desk("Speech Adventure · ฝึกและเรียน", `<div class="site">${sideNav("ฝึกและเรียน")}<main class="site-main">${tabRow([["i-home", "แผนวันนี้"], ["i-chart", "ผลการฝึก"], ["i-print", "สติกเกอร์และพิมพ์"], ["i-sliders", "จัดชุดฝึก"]], "แผนวันนี้")}<div class="today-hero"><div><small>น้องฟ้า · เสียง ก · ระดับ 2 คำให้คล่อง</small><b>พร้อมผจญภัยวันนี้</b><span class="btn gold" style="flex:none;width:280px">${icon("i-play")}เข้าโลกของพี่ปู</span><span class="today-strip"><span>${icon("i-star")}ดาว 30</span><span>${icon("i-book")}สติกเกอร์ ${got}/${total.length}</span><span>${icon("i-flag")}ด่านต่อไป: กระโดดหิน</span></span></div><div class="today-map"><img src="${art("crab-beach")}" alt=""></div></div><div class="today-row"><div class="todo">${icon("i-ear")}<span><b>รอผู้ใหญ่ฟัง 12 ข้อ</b><small>ให้ผลตอนนี้ ใช้ราว 2 นาที</small></span><em>›</em></div><div class="todo">${icon("i-print")}<span><b>สติกเกอร์ใหม่ 3 ดวง</b><small>พิมพ์ให้น้องติดสมุดจริง</small></span><em>›</em></div><div class="week"><b>สัปดาห์นี้</b><span>${["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"].map((d, i) => `<i class="${[0, 2, 3, 6].includes(i) ? "on" : ""}">${d}</i>`).join("")}</span><small>เล่นแล้ว 4 วัน</small></div></div></main></div>`, "บนคอม: แถบเดียวบนสุด ใต้ลงมาเป็นการ์ดสิ่งที่ต้องทำ"),
    `${numbers([["2.6 → 1", "ความสูงบนมือถือ (จอ)"], ["4 การ์ดระดับ → 0", "ย้ายไปจัดชุดฝึก"]])}
    ${ul([
      `${T.cut("ตัด")} การ์ดเลือกระดับ 4 ใบ, สถิติ 3 ช่องที่ซ้ำกับผลการฝึก, รายการด่าน 3 ด่านแรก (ซ้ำแผนที่)`,
      `${T.add("เพิ่ม")} "รอผู้ใหญ่ฟัง" และ "สติกเกอร์ใหม่" เป็นการ์ดที่กดไปทำต่อได้ทันที, แถบสัปดาห์นี้`,
      "ปุ่มทองพาเข้าแผนที่ของเด็ก (เหมือนปุ่ม \"ฝึกต่อ\" ในเมนูซ้าย)",
    ])}`,
  )}
</section>`);

// 9 RESULTS
const reviewList = `<div class="review"><div class="review-head"><b>รอผู้ใหญ่ฟัง 12 ข้อ</b><small>ฟังเสียงที่น้องพูด แล้วแตะผล</small></div>${[["clock", "นาฬิกา", "กระจกวิเศษ · วันนี้"], ["crow", "กา", "การ์ดสติกเกอร์ · วันนี้"], ["chicken", "ไก่กินข้าว", "รถไฟคำ · เมื่อวาน"]].map(([k, w, s]) => `<div class="rv"><img src="${art(k)}" alt=""><span><b>${w}</b><small>${s}</small></span><span class="rv-play">${icon("i-play")}</span><span class="rv-faces"><i class="yes">${icon("i-smile")}</i><i>${icon("i-replay")}</i><i>${icon("i-skip")}</i></span></div>`).join("")}</div>`;
S.push(`<section class="block" id="results">
  <h2>9 · ผลการฝึก (รวมกับความก้าวหน้า)</h2>
  <p class="lead">หน้าเดียวสำหรับดูผล · บนสุดคือสิ่งที่ผู้ใหญ่ทำได้ทันที: ข้อที่ยังรอฟัง แตะผลได้ในหน้านี้ ไม่ต้องเปิดทีละรอบ</p>
  ${compare(
    before("progress"),
    phone(`<div class="adult-screen"><div class="hdr"><b>ผลการฝึก</b><small>น้องฟ้า · 7 วันที่ผ่านมา</small></div><div class="list">${reviewList}<div class="kpi-row"><span><b>43</b>รอบ</span><span><b>39/42</b>ฟังเลือกถูก</span><span><b>47</b>ผู้ใหญ่ฟังแล้ว</span></div></div></div>`, "ข้อรอฟังอยู่บนสุด: ฟังเสียง → แตะหน้ายิ้ม / ฝึกอีก / ข้าม"),
    desk("Speech Adventure · ผลการฝึก", `<div class="site">${sideNav("ผลการฝึก")}<main class="site-main"><div class="site-title">${icon("i-chart")}<b>ผลการฝึก</b><small>น้องฟ้า · 7 วันที่ผ่านมา · <u>พิมพ์รายงาน</u></small></div><div class="results-layout">${reviewList}<div><div class="kpi-row"><span><b>43</b>รอบ</span><span><b>39/42</b>ฟังเลือกถูก</span><span><b>47</b>ผู้ใหญ่ฟังแล้ว</span></div><div class="bars">${[0, 6, 0, 0, 4, 4, 29].map((v, i) => `<span><i style="height:${Math.max(6, v * 3)}px"></i><small>${["อ", "พ", "พฤ", "ศ", "ส", "อา", "จ"][i]}</small></span>`).join("")}</div></div></div></main></div>`, "บนคอม: ซ้ายรายการรอฟัง ขวาภาพรวม"),
    `${numbers([["2 หน้า → 1", "ผลการฝึก + ความก้าวหน้า"], ["39 → 12", "ข้อค้าง (ตัวอย่างหลังผู้ใหญ่ให้ผลข้างเด็ก)"]])}
    ${ul([
      `${T.add("เพิ่ม")} รายการ "รอผู้ใหญ่ฟัง" แตะผลได้ในบรรทัดเดียว`,
      `${T.move("ย้าย")} สำรองข้อมูล / ส่งออก JSON ไปตั้งค่า · พิมพ์ไปหน้ารายงาน`,
      "<b>ต้องตัดสินใจ:</b> ปุ่มฟังเสียงต้องเก็บเสียงไว้ในเครื่องชั่วคราว (เช่น 7 วัน แล้วลบเอง) · ถ้าไม่เก็บ แถวนี้ให้ผลจากความจำได้อย่างเดียว",
      "ข้อของนักเรียนที่โรงเรียนให้ครูยืนยัน: แสดงเป็น \"ครูจะฟัง\" ไม่ให้แตะ",
    ])}`,
  )}
</section>`);

// 10 SETUP
const step = (n, title, body) => `<div class="adult-screen"><div class="hdr"><small>จัดชุดฝึก · ${n} / 3</small><b>${title}</b></div><div class="list">${body}</div></div>`;
const goals = `<div class="choice on"><img src="${art("mouth-word")}" alt=""><span><b>ฝึกออกเสียงให้ชัด</b><small>ฟัง เลียนแบบ แล้วใช้ในคำและประโยค</small></span></div><div class="choice"><img src="${art("aunt")}" alt=""><span><b>พูดเพื่อสื่อสาร</b><small>เข้าใจ ขอสิ่งที่ต้องการ เล่าเรื่อง</small></span></div><div class="choice"><img src="${art("school")}" alt=""><span><b>เสียงกับตัวอักษร</b><small>สำหรับเด็กอนุบาล</small></span></div>`;
const sounds = `<div class="sound-grid">${["ป", "ก", "ม"].map((s, i) => `<span class="${i === 1 ? "on" : ""}">${s}</span>`).join("")}${["ค", "ต", "ช"].map((s) => `<span class="soon">${s}<small>เร็ว ๆ นี้</small></span>`).join("")}</div><p class="hint">เลือกเสียงที่น้องยังพูดไม่ชัด ครูหรือนักแก้ไขการพูดแนะนำได้</p>`;
const levels = `${[["1", "เริ่มคุ้นเสียง", "3–4 ปี"], ["2", "คำให้คล่อง", "4–6 ปี"], ["3", "เล่าให้เห็นภาพ", "ป.1–3"], ["4", "เล่าเรื่องและอธิบาย", "ป.4–6"]].map(([n, t, a], i) => `<div class="choice${i === 1 ? " on" : ""}"><span class="lv">${n}</span><span><b>${t}</b><small>${a}${i === 1 ? " · แนะนำตามอายุ" : ""}</small></span></div>`).join("")}<p class="hint">ไม่ใช่เกณฑ์พัฒนาการ ปรับได้ตลอด</p>`;
S.push(`<section class="block" id="setup">
  <h2>10 · จัดชุดฝึก: 3 คำถาม ทีละหน้า</h2>
  <p class="lead">ตอนนี้เป็นฟอร์มยาวหน้าเดียว (เป้าหมาย ข้อมูลเด็กซ้ำ เสียง ระดับ จุดเริ่ม เลือกรายข้อ) · แบบใหม่ถาม 3 เรื่องที่จำเป็น ที่เหลือเป็น "ตั้งค่าเพิ่มเติม"</p>
  ${compare(
    before("plan", "จัดชุดฝึก"),
    phone(step(1, "ฝึกเรื่องอะไร", goals + `<span class="btn go wide">ถัดไป ${icon("i-next")}</span>`), "1 · เป้าหมาย")
      + phone(step(2, "เสียงไหน", sounds + `<span class="btn go wide">ถัดไป ${icon("i-next")}</span>`), "2 · เสียง (เฉพาะที่มีเกมรองรับ)")
      + phone(step(3, "ระดับไหน", levels + `<span class="btn gold wide">เสร็จ เริ่มเล่นได้เลย</span><span class="more">ตั้งค่าเพิ่มเติม: จุดเริ่ม · เลือกข้อเอง ›</span>`), "3 · ระดับ แล้วเริ่มเล่น"),
    desk("Speech Adventure · จัดชุดฝึก", `<div class="site">${sideNav("ฝึกและเรียน")}<main class="site-main">${tabRow([["i-home", "แผนวันนี้"], ["i-chart", "ผลการฝึก"], ["i-print", "สติกเกอร์และพิมพ์"], ["i-sliders", "จัดชุดฝึก"]], "จัดชุดฝึก")}<div class="setup-3"><div><p class="col-title">1 · ฝึกเรื่องอะไร</p>${goals}</div><div><p class="col-title">2 · เสียงไหน</p>${sounds}</div><div><p class="col-title">3 · ระดับไหน</p>${levels}</div></div><div class="setup-foot"><span class="more">ตั้งค่าเพิ่มเติม: จุดเริ่ม · เลือกข้อเองจากคลังกิจกรรม ›</span><span class="btn gold" style="flex:none;width:260px">บันทึกแล้วเริ่มเล่น</span></div></main></div>`, "บนคอม: 3 คำถามเรียงในหน้าเดียว"),
    `${numbers([["3", "คำถามที่ต้องตอบ"], ["6 → 3", "เสียงที่ให้เลือก (เฉพาะที่ฝึกได้จริง)"]])}
    ${ul([
      `${T.cut("ตัด")} ชื่อเล่นและช่วงอายุในฟอร์มนี้ (ใช้ข้อมูลลูกแทน), กล่อง "มีผู้ใหญ่ช่วย" (ใช้โหมดเล่นด้วยกัน/เล่นเองแทน)`,
      `${T.move("ย้าย")} จุดเริ่มและเลือกรายข้อ (คลังกิจกรรมเดิม) ไป "ตั้งค่าเพิ่มเติม"`,
      "เสียงที่ยังไม่มีเกมแสดงเป็น \"เร็ว ๆ นี้\" แก้ปัญหาเลือก ค ต ช ตอนสมัครแล้วกลายเป็น ป",
    ])}`,
  )}
</section>`);

// 11 PLAN
S.push(`<section class="block" id="plan">
  <h2>11 · แผนทำจริง</h2>
  <p class="lead">ทำทีละชิ้น แต่ละชิ้นใช้ได้ทันทีเมื่อเสร็จ ไม่ต้องรอครบ</p>
  <div class="phase-grid">
    <div class="box"><h3>ก · สมุดสติกเกอร์ (ข้อ 1–2)</h3>${ul(["สติกเกอร์จากข้อที่เล่น ใช้ข้อมูลรอบเดิม", "ปุ่มสมุดบนแผนที่ + ช่วงได้สติกเกอร์ใหม่", "ครบหน้าได้ของแต่งตัวพี่ปู"])}</div>
    <div class="box"><h3>ข · พิมพ์ให้น้อง (ข้อ 3–4)</h3>${ul(["หน้า A4 3 แบบด้วย CSS สำหรับพิมพ์", "เมนูพิมพ์ในแถบผู้ใหญ่", "ทดสอบพิมพ์จริงบนกระดาษสติกเกอร์"])}</div>
    <div class="box"><h3>ค · คู่มือใหม่ (ข้อ 5–6)</h3>${ul(["โหมดสาธิตของหน้าเกม (ไม่บันทึกผล)", "ภาพเคลื่อนไหว 4 ฉาก + เสียงพี่ปู", "ป้ายแนะนำครั้งแรกบนแผนที่"])}</div>
    <div class="box"><h3>ง · หน้าผู้ใหญ่ (ข้อ 7–10)</h3>${ul(["แท็บ 6 → 4 และย้ายหน้า", "รวมผลการฝึกกับความก้าวหน้า + รายการรอฟัง", "จัดชุดฝึก 3 คำถาม"])}</div>
  </div>
  <div class="box" style="margin-top:16px"><h3>ขอให้ช่วยตัดสินใจ</h3><ol>
    <li>สติกเกอร์: ได้ทุกข้อที่ลองเล่น (เสนอ) หรือเฉพาะข้อที่ผู้ใหญ่ให้ "ทำได้"</li>
    <li>เก็บเสียงเด็กไว้ในเครื่องชั่วคราวให้ผู้ใหญ่ฟังย้อนหลังได้ไหม (เช่น 7 วัน) → <a href="#results">ข้อ 9</a></li>
    <li>กระดาษสติกเกอร์: แบบเต็มแผ่นตัดเอง (เสนอ) หรือแบบไดคัทวงกลมขนาดมาตรฐาน</li>
    <li>ชื่อแท็บ "สติกเกอร์และพิมพ์" หรือ "ของรางวัล"</li>
  </ol></div>
</section>`);

const css = `<style>
  /* ── Additions for this document (everything else comes from kid-practice.html) ── */
  .desk.empty{height:200px;zoom:.88}
  .empty-phone{display:grid;place-items:center;color:var(--muted);font-size:13px;text-align:center;padding:20px;background:var(--bg)}
  .inl{width:15px;height:15px;vertical-align:-2px;display:inline-block}
  .btn.wide{flex:none;width:100%}
  /* Sticker book */
  .sb-stage{justify-content:flex-start;gap:10px;padding-top:4px}
  .sb-tabs{display:flex;gap:6px;width:100%;overflow:hidden}
  .sb-tabs span{flex:1;display:flex;flex-direction:column;align-items:center;gap:1px;padding:5px 2px;border-radius:14px;background:rgb(255 255 255 / .06);border:1px solid rgb(255 255 255 / .1);font-size:12px;color:var(--muted)}
  .sb-tabs span img{width:30px;height:22px;object-fit:contain}
  .sb-tabs span b{font:600 10px var(--font-ui);color:var(--muted)}
  .sb-tabs span.on{background:var(--primary-soft);border-color:var(--primary);color:var(--text)}
  .sb-tabs.pc-tabs{margin-bottom:8px}
  .sb-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;width:100%}
  .stk{position:relative;display:flex;flex-direction:column;align-items:center;gap:2px}
  .stk-pic{width:100%;aspect-ratio:1;border-radius:22px;background:#FFFDF6;border:4px solid #fff;box-shadow:0 4px 0 rgb(0 0 0 / .25),0 0 0 1px rgb(0 0 0 / .08);display:grid;place-items:center;transform:rotate(-2deg)}
  .stk:nth-child(even) .stk-pic{transform:rotate(2deg)}
  .stk-pic img{width:86%;height:86%;object-fit:contain}
  .stk small{font-size:12px;color:var(--text)}
  .stk.locked .stk-pic{background:rgb(255 255 255 / .05);border:2px dashed rgb(255 255 255 / .18);box-shadow:none;transform:none}
  .stk.locked img{filter:brightness(0) invert(1) opacity(.16)}
  .stk.locked small{color:var(--muted)}
  .stk.fresh .stk-pic{box-shadow:0 4px 0 rgb(0 0 0 / .25),0 0 0 4px var(--gold-1),0 0 20px 4px rgb(255 213 138 / .55)}
  .stk em{position:absolute;top:-6px;right:-4px;font:normal 600 10px var(--font-ui);color:#2A1D05;background:var(--gold-1);border-radius:999px;padding:1px 7px;transform:rotate(8deg)}
  .stk-zoom{width:150px}
  .stk-zoom .stk small{display:none}
  .book{display:grid;grid-template-columns:1fr 1fr 34px;gap:0;width:100%;height:100%;border-radius:22px;background:#2B2466;box-shadow:0 18px 30px -16px #000;padding:14px}
  .book-page{background:linear-gradient(90deg,#1E1A4F,#25205C);border-radius:16px;padding:14px 16px;display:flex;flex-direction:column;gap:8px;overflow:hidden}
  .book-page:first-child{border-radius:16px 4px 4px 16px;box-shadow:inset -10px 0 16px -10px #000}
  .book-page:nth-child(2){border-radius:4px 16px 16px 4px;box-shadow:inset 10px 0 16px -10px #000}
  .book-page h3{margin:0;font:400 22px var(--font-kid)}
  .book .sb-grid{grid-template-columns:repeat(5,1fr);gap:10px}
  .book .stk small{font-size:11px}
  .ribbons{display:flex;flex-direction:column;gap:8px;padding-top:30px}
  .ribbons span{height:46px;border-radius:0 12px 12px 0;background:#3A3180;display:grid;place-items:center}
  .ribbons span.on{background:var(--gold-2)}
  .ribbons img{width:26px;height:22px;object-fit:contain}
  /* New sticker moment */
  .earn{display:flex;align-items:center;gap:10px}
  .earn-new{display:flex;gap:8px;width:150px}
  .earn-new .stk{flex:1}
  .earn.big .earn-new{width:320px}
  .earn-arrow svg{width:26px;height:26px;color:var(--gold-1)}
  .earn-book{position:relative;width:58px;height:58px;border-radius:16px;background:var(--primary);display:grid;place-items:center;color:#fff;box-shadow:0 5px 0 #3A2EA8}
  .earn-book svg{width:28px;height:28px}
  .earn-book b{position:absolute;top:-8px;right:-10px;font:600 12px var(--font-ui);background:var(--gold-1);color:#2A1D05;border-radius:999px;padding:1px 7px}
  .stars{display:flex;gap:6px}.stars svg{width:36px;height:36px;fill:var(--gold-1)}
  /* Adult site mock (computer) */
  .site{position:absolute;inset:34px 0 0;display:grid;grid-template-columns:190px 1fr;font-family:var(--font-ui);background:var(--bg)}
  .site-nav{background:#120F33;border-right:1px solid var(--line);padding:14px 10px;display:flex;flex-direction:column;gap:4px;font-size:14px;color:var(--muted)}
  .site-nav span{padding:9px 12px;border-radius:12px}
  .site-nav span.on{background:var(--surface-2);color:var(--text);font-weight:600}
  .site-brand{display:flex;align-items:center;gap:8px;font:600 15px var(--font-display);color:var(--text);margin:0 0 12px;line-height:1}
  .site-brand small{display:block;font-size:11px;color:var(--muted)}
  .site-brand .logo{width:32px;height:32px;border-radius:10px;background:var(--primary);display:grid;place-items:center;color:#fff}
  .site-brand .logo svg{width:17px;height:17px}
  .site-main{padding:18px 26px;overflow:hidden;display:flex;flex-direction:column;gap:14px}
  .site-title{display:grid;grid-template-columns:auto 1fr;column-gap:10px;align-items:center}
  .site-title svg{width:34px;height:34px;padding:7px;border-radius:12px;background:var(--primary-soft);color:var(--primary-text);grid-row:span 2}
  .site-title b{font:600 22px var(--font-display)}
  .site-title small{color:var(--muted);font-size:13px}
  /* Print */
  .print-opts{display:flex;flex-direction:column;gap:8px}
  .print-card{display:grid;grid-template-columns:62px 1fr;column-gap:10px;align-items:center;padding:8px;border-radius:14px;background:var(--surface);border:1px solid var(--line)}
  .print-card.on{border-color:var(--primary);box-shadow:0 0 0 3px rgb(85 72 212 / .3)}
  .print-card .pc-thumb{grid-row:span 2;display:block}
  .print-card b{font-size:14px}
  .print-card small{color:var(--muted);font-size:11px;line-height:1.35}
  .print-set{display:flex;justify-content:space-between;font-size:12px;padding:8px 10px;border-radius:12px;background:var(--surface-2);margin-top:6px}
  .print-set span{color:var(--muted)}
  .print-layout{display:grid;grid-template-columns:1fr 300px;gap:22px;align-items:start}
  .print-preview{display:flex;flex-direction:column;gap:10px;align-items:center}
  .sheets{display:flex;gap:26px;flex-wrap:wrap}
  .sheets>div{width:300px}
  .a4{width:100%;aspect-ratio:210/297;background:#fff;color:#1E1A4A;border-radius:4px;box-shadow:0 18px 30px -14px #000;padding:7%;display:flex;flex-direction:column;gap:4%;font-family:var(--font-ui);overflow:hidden}
  .a4.mini{width:62px;padding:5%;gap:4%;border-radius:2px;font-size:3px}
  .a4.mini .a4-head small,.a4.mini .a4-foot,.a4.mini .cert-p,.a4.mini .cert-d,.a4.mini .cert-sign{display:none}
  .a4-head{font:600 15px var(--font-display);text-align:center;line-height:1.2}
  .a4.mini .a4-head{font-size:4px}
  .a4-head small{display:block;font:400 9px var(--font-ui);color:#6B6790}
  .a4-stickers{display:grid;grid-template-columns:repeat(4,1fr);gap:4%}
  .a4-stickers span{aspect-ratio:1;border-radius:50%;border:1.5px dashed #B8B3D9;display:grid;place-items:center}
  .a4-stickers img{width:78%;height:78%;object-fit:contain}
  .a4-cards{display:grid;grid-template-columns:1fr 1fr;gap:3%}
  .a4-cards span{border:1.5px dashed #B8B3D9;border-radius:8px;display:flex;flex-direction:column;align-items:center;padding:2% 2%}
  .a4-cards img{width:54%;aspect-ratio:4/3;object-fit:contain}
  .a4-cards b{font:700 14px/1.2 var(--font-letter);color:#1E1A4A}
  .a4.mini .a4-cards b{font-size:4px}
  .a4-cards .hl{font-style:normal;color:#E8574A}
  .a4-foot{font-size:9px;color:#6B6790;text-align:center;margin-top:auto}
  .a4.cert{padding:5%}
  .cert-in{flex:1;border:3px double #C98B1C;border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3%;text-align:center;background:radial-gradient(circle at 50% 30%,#FFF6D8,#fff 70%)}
  .a4.mini .cert-in{border-width:1px}
  .cert-cup{width:38%}
  .cert-t{font:600 22px var(--font-display);color:#C98B1C}
  .cert-s{font:400 15px var(--font-kid)}
  .cert-n{font:700 24px var(--font-letter);border-bottom:1.5px solid #C9C5E8;padding:0 16px}
  .a4.mini .cert-t,.a4.mini .cert-s,.a4.mini .cert-n{font-size:4px}
  .cert-p,.cert-d{font-size:10px;color:#6B6790}
  .cert-sign{display:flex;gap:30px;font-size:9px;color:#6B6790;margin-top:6%}
  .cert-sign span{border-top:1px solid #C9C5E8;padding-top:3px;width:70px}
  /* Guide */
  .player{position:relative;width:100%;aspect-ratio:16/10;border-radius:16px;background:linear-gradient(180deg,#1A1452,#0E0C22);overflow:hidden;border:1px solid var(--line)}
  .pf{position:absolute;inset:0 0 34px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;opacity:0;animation:wf-scene 12s infinite;font-family:var(--font-kid);font-size:15px}
  .pf b{font-weight:400}
  .pf.f2{animation-delay:3s}.pf.f3{animation-delay:6s}.pf.f4{animation-delay:9s}
  @keyframes wf-scene{0%,2%{opacity:0;transform:translateY(8px)}6%,22%{opacity:1;transform:none}25%,100%{opacity:0}}
  .mini-mic{width:70px;height:70px;border-radius:50%;background:linear-gradient(180deg,var(--gold-1),var(--gold-2));display:grid;place-items:center;color:#2A1D05;box-shadow:0 0 0 10px rgb(255 213 138 / .2);animation:wf-pulse 1s infinite}
  .mini-mic svg{width:32px;height:32px}
  .finger{position:absolute;top:44%;left:56%;color:#fff}.finger svg{width:30px;height:30px}
  @keyframes wf-pulse{50%{box-shadow:0 0 0 18px rgb(255 213 138 / .12)}}
  .mini-river{position:relative;width:70%;height:70px;border-radius:14px;background:linear-gradient(180deg,#7FD3F2,#3C9BD6)}
  .mini-river span{position:absolute;bottom:14px;width:40px;height:16px;border-radius:50%;background:#E1E4F2;box-shadow:0 4px 0 #6E7891}
  .mini-river .s1{left:14%}.mini-river .s2{left:42%}.mini-river .s3{left:70%}
  .mini-river img{position:absolute;bottom:24px;width:44px;left:12%;animation:wf-hop 3s infinite}
  @keyframes wf-hop{0%,20%{left:12%;bottom:24px}30%{bottom:52px}40%,55%{left:40%;bottom:24px}65%{bottom:52px}75%,100%{left:68%;bottom:24px}}
  .mini-faces{display:flex;gap:8px;font:13px var(--font-ui)}
  .mini-faces span{display:flex;align-items:center;gap:5px;padding:9px 14px;border-radius:12px;background:var(--surface-2);border:1px solid var(--line)}
  .mini-faces .yes{color:var(--success-text);border-color:rgb(76 175 130 / .6);background:rgb(76 175 130 / .16);animation:wf-tap 3s infinite}
  .mini-faces svg{width:16px;height:16px}
  @keyframes wf-tap{40%{transform:scale(1)}50%{transform:scale(.9)}60%{transform:scale(1.04)}}
  .mini-book{width:90px}
  .player-bar{position:absolute;left:0;right:0;bottom:0;height:34px;display:flex;align-items:center;gap:10px;padding:0 12px;background:rgb(0 0 0 / .35);font:11px var(--font-ui);color:var(--muted)}
  .player-bar .play svg{width:16px;height:16px;color:#fff}
  .player-bar i{flex:1;height:5px;border-radius:999px;background:rgb(255 255 255 / .15);overflow:hidden}
  .player-bar i b{display:block;height:100%;width:0;background:var(--gold-1);animation:wf-progress 12s linear infinite}
  @keyframes wf-progress{to{width:100%}}
  .chapters{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
  .chapters span{font:12px var(--font-ui);padding:5px 10px;border-radius:999px;background:var(--surface);border:1px solid var(--line);color:var(--muted)}
  .chapters span.on{border-color:var(--primary);color:var(--text)}
  .faq{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
  .faq span{display:grid;grid-template-columns:auto 1fr;column-gap:8px;padding:10px;border-radius:14px;background:var(--surface);border:1px solid var(--line);font-size:12px}
  .faq svg{width:20px;height:20px;color:var(--primary-text);grid-row:span 2}
  .faq small{color:var(--muted);font-size:11px;line-height:1.35}
  .guide-layout{display:grid;grid-template-columns:1.25fr 1fr;gap:22px;align-items:start}
  .docs{margin-top:12px;font-size:12px;color:var(--muted)}
  /* First-run tips */
  .map-mini{position:relative;width:100%;flex:1;min-height:200px}
  .map-mini span{position:absolute;width:46px;height:46px;margin:-23px;border-radius:50%;background:var(--surface);border:3px solid var(--line);display:grid;place-items:center}
  .map-mini span svg{width:18px;height:18px;fill:var(--gold-1)}
  .coach{position:absolute;inset:0;z-index:7;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:6px;padding:30px;pointer-events:none}
  .coach p{margin:0;background:#fff;color:#1E1A4A;border-radius:16px;padding:10px 14px;font:15px var(--font-kid);text-align:center;box-shadow:0 10px 20px -10px #000}
  .coach small{font:11px var(--font-ui);color:#fff}
  /* The highlighted control darkens everything around it with one huge shadow. */
  .kid:has(.spot) .stage,.kid:has(.spot) .top{z-index:auto}
  .spot{z-index:6;box-shadow:0 0 0 4px var(--gold-1),0 0 24px 6px rgb(255 213 138 / .6),0 0 0 9999px rgb(8 6 24 / .62)!important}
  .spot:not(.adult){position:relative}
  /* Adult pages */
  .tabrow{display:flex;gap:4px;border-bottom:1px solid var(--line);flex-wrap:wrap}
  .tabrow span{display:flex;align-items:center;gap:6px;padding:9px 12px;font:14px var(--font-ui);color:var(--muted);border-bottom:2px solid transparent}
  .tabrow span.on{color:var(--text);border-color:var(--primary)}
  .tabrow svg{width:16px;height:16px}
  .help-dot{display:inline-flex;align-items:center;gap:6px;margin-top:10px;font-size:13px;color:var(--muted)}
  .help-dot svg{width:16px;height:16px}
  .hdr.today{display:flex;flex-direction:column;gap:2px}
  .today-strip{display:flex;flex-wrap:wrap;gap:6px 12px;margin-top:12px;font-size:12px;color:#E4E0FF}
  .today-strip span{display:inline-flex;align-items:center;gap:4px}
  .today-strip svg{width:14px;height:14px;fill:var(--gold-1);color:var(--gold-1)}
  .todo{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;padding:12px;border-radius:14px;background:var(--surface);border:1px solid var(--line)}
  .todo>svg{width:34px;height:34px;padding:7px;border-radius:11px;background:var(--primary-soft);color:var(--primary-text)}
  .todo b{display:block;font-size:14px}.todo small{color:var(--muted);font-size:12px}
  .todo em{font-style:normal;color:var(--muted);font-size:18px}
  .week{padding:12px;border-radius:14px;background:var(--surface);border:1px solid var(--line);display:flex;flex-direction:column;gap:6px;font-size:13px}
  .week span{display:flex;gap:5px}
  .week i{flex:1;text-align:center;font-style:normal;font-size:11px;padding:6px 0;border-radius:9px;background:var(--surface-2);color:var(--muted)}
  .week i.on{background:var(--gold-1);color:#2A1D05;font-weight:600}
  .week small{color:var(--muted);font-size:11px}
  .today-hero{display:grid;grid-template-columns:1fr 260px;gap:18px;padding:22px 24px;border-radius:20px;background:var(--hero)}
  .today-hero>div:first-child{display:flex;flex-direction:column;gap:6px}
  .today-hero b{font:600 28px var(--font-display)}
  .today-hero small{color:#E4E0FF}
  .today-map img{width:100%;border-radius:16px;background:#fff}
  .today-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
  .review{display:flex;flex-direction:column;gap:8px}
  .review-head b{display:block;font-size:15px}.review-head small{color:var(--muted);font-size:12px}
  .rv{display:grid;grid-template-columns:44px 1fr auto auto;gap:8px;align-items:center;padding:8px 10px;border-radius:14px;background:var(--surface);border:1px solid var(--line)}
  .rv img{width:44px;height:34px;object-fit:contain;background:#fff;border-radius:8px}
  .rv b{display:block;font:700 15px var(--font-letter)}.rv small{color:var(--muted);font-size:11px}
  .rv-play svg{width:28px;height:28px;padding:6px;border-radius:50%;background:var(--primary);color:#fff}
  .rv-faces{display:flex;gap:4px}
  .rv-faces i{display:grid;place-items:center;width:30px;height:30px;border-radius:9px;background:var(--surface-2);border:1px solid var(--line)}
  .rv-faces i.yes{color:var(--success-text);border-color:rgb(76 175 130 / .6)}
  .rv-faces svg{width:15px;height:15px}
  .phone .rv{grid-template-columns:34px 1fr auto auto;gap:6px;padding:6px 8px}
  .phone .rv img{width:34px;height:28px}
  .phone .rv-play svg{width:24px;height:24px;padding:5px}
  .phone .rv-faces i{width:24px;height:24px}
  .kpi-row{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
  .kpi-row span{padding:10px;border-radius:14px;background:var(--surface);border:1px solid var(--line);font-size:11px;color:var(--muted)}
  .kpi-row b{display:block;font:600 20px var(--font-display);color:var(--text)}
  .results-layout{display:grid;grid-template-columns:1.2fr 1fr;gap:20px;align-items:start}
  .bars{display:flex;align-items:flex-end;gap:12px;height:120px;margin-top:14px;padding:12px;border-radius:14px;background:var(--surface);border:1px solid var(--line)}
  .bars span{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px}
  .bars i{width:100%;border-radius:6px;background:#B9AEFF}
  .bars small{font-size:10px;color:var(--muted)}
  .choice{display:grid;grid-template-columns:52px 1fr;gap:10px;align-items:center;padding:10px;border-radius:14px;background:var(--surface);border:1px solid var(--line);margin-bottom:8px}
  .choice.on{border-color:var(--primary);box-shadow:0 0 0 3px rgb(85 72 212 / .3)}
  .choice img{width:52px;height:40px;object-fit:contain;background:#fff;border-radius:10px}
  .choice b{display:block;font-size:14px}.choice small{color:var(--muted);font-size:11px}
  .choice .lv{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;font:600 18px var(--font-display);background:var(--surface-2)}
  .choice.on .lv{background:var(--primary);color:#fff}
  .sound-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
  .sound-grid span{aspect-ratio:1;border-radius:16px;display:grid;place-items:center;align-content:center;font:700 38px var(--font-letter);background:var(--surface);border:1px solid var(--line)}
  .sound-grid span.on{background:var(--primary);border-color:var(--primary)}
  .sound-grid span.soon{opacity:.45;font-size:26px}
  .sound-grid small{display:block;font:10px var(--font-ui);color:var(--muted)}
  .hint{margin:8px 0;font-size:11px;color:var(--muted)}
  .more{display:block;margin-top:8px;font-size:12px;color:var(--primary-text);text-align:center}
  .setup-3{display:grid;grid-template-columns:1fr .8fr 1fr;gap:18px}
  .setup-3 .sound-grid span{font-size:30px}
  .setup-foot{display:flex;justify-content:space-between;align-items:center;margin-top:auto}
  .phase-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
  @media (max-width:1100px){.phase-grid{grid-template-columns:1fr 1fr}}
  @media (prefers-reduced-motion:reduce){.pf{animation:none;opacity:0}.pf.f2{opacity:1}.mini-river img,.mini-mic,.mini-faces .yes,.player-bar i b{animation:none}}
</style>`;

const extraIcons = `<svg width="0" height="0" style="position:absolute"><defs>
  <symbol id="i-home" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></symbol>
  <symbol id="i-map" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/><path d="M15 5.764v15"/><path d="M9 3.236v15"/></symbol>
  <symbol id="i-print" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"/><rect x="6" y="14" width="12" height="8" rx="1"/></symbol>
  <symbol id="i-help" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></symbol>
  <symbol id="i-chart" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></symbol>
  <symbol id="i-sliders" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/></symbol>
  <symbol id="i-shield" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></symbol>
  <symbol id="i-flag" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></symbol>
  <symbol id="i-ear" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8.5a6.5 6.5 0 1 1 13 0c0 6-6 6-6 10a3.5 3.5 0 1 1-7 0"/><path d="M15 8.5a2.5 2.5 0 0 0-5 0v1a2 2 0 1 1 0 4"/></symbol>
  ${base.includes('id="i-play"') ? "" : '<symbol id="i-play" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3"/></symbol>'}
</defs></svg>`;

const toc = `<nav class="toc" id="toc">
  <div class="toc-part"><b><small>ส่วนที่ 1</small>ของสะสมของเด็ก</b><a href="#book">1 สมุดสติกเกอร์</a><a href="#earn">2 ได้สติกเกอร์ใหม่</a></div>
  <div class="toc-part"><b><small>ส่วนที่ 2</small>พิมพ์ให้น้อง</b><a href="#print">3 ศูนย์พิมพ์</a><a href="#sheets">4 ตัวอย่าง A4</a></div>
  <div class="toc-part"><b><small>ส่วนที่ 3</small>คู่มือ</b><a href="#guide">5 พี่ปูสอนเล่น</a><a href="#tips">6 ป้ายแนะนำครั้งแรก</a></div>
  <div class="toc-part"><b><small>ส่วนที่ 4</small>หน้าผู้ใหญ่</b><a href="#tabs">7 เมนู 6 → 4</a><a href="#today">8 แผนวันนี้</a><a href="#results">9 ผลการฝึก</a><a href="#setup">10 จัดชุดฝึก</a></div>
  <div class="toc-part"><b><small>ส่วนที่ 5</small>แผนงาน</b><a href="#plan">11 แผนทำจริง</a></div>
</nav>`;
const floatbar = cut('<div class="floatbar">', "</div></div>");

const html = `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Speech Adventure · สมุดสติกเกอร์ พิมพ์ให้น้อง คู่มือ และหน้าผู้ใหญ่</title>
${fonts}
${style}
${css}
</head>
<body>
${icons}${extraIcons}
<header class="page">
  <span class="chip">ไวร์เฟรมเพื่อคุยกัน · ยังไม่แก้เว็บจริง · 23 พ.ย. 2569 · ต่อจากไวร์เฟรมหน้าฝึกเด็ก</span>
  <h1>สมุดสติกเกอร์ · พิมพ์ให้น้อง · คู่มือ · หน้าผู้ใหญ่</h1>
  <p>Speech Adventure · หน้าเกมของเด็กทำเสร็จแล้ว รอบนี้เสนอของสะสมให้เด็ก ของจับต้องได้ให้พ่อแม่ และหน้าผู้ใหญ่ที่เรียบขึ้น</p>
</header>
<section class="summary" id="summary">
  <h2>สรุปใน 1 นาที</h2>
  <p class="lead">ฝั่งเด็กเป็นเกมแล้ว แต่เล่นจบแล้วยังไม่มีอะไรให้เก็บ และฝั่งผู้ใหญ่มีหน้าที่ซ้ำกันจนไม่รู้จะดูตรงไหน · รอบนี้เพิ่มของสะสมที่พิมพ์ออกมาได้จริง และจัดหน้าผู้ใหญ่ให้เหลือเท่าที่ใช้</p>
  <div class="kpis">
    <div class="kpi"><b>${total.length}</b><span>สติกเกอร์ในชุดแรก จากภาพที่ใช้ในหลักสูตร</span></div>
    <div class="kpi"><b>3</b><span>แบบที่พิมพ์ได้: สติกเกอร์ บัตรคำฝึกที่บ้าน ใบประกาศ</span></div>
    <div class="kpi"><b>6 → 4</b><span>แท็บในห้องฝึก · คู่มือเป็นปุ่ม ? ทุกหน้า</span></div>
    <div class="kpi"><b>3 → 0</b><span>เรื่องที่มีหน้าซ้ำ (เส้นทาง, ผล, เลือกระดับ)</span></div>
  </div>
  <div class="sum-grid">
    <div class="sum-card"><h3>เปลี่ยนอะไร</h3><ol>
      <li><a href="#book">สมุดสติกเกอร์</a>: ทุกภาพที่ได้ฝึกเป็นสติกเกอร์ 1 ดวง เก็บแยกหมวด ได้ตอน<a href="#earn">จบด่าน</a></li>
      <li><a href="#print">พิมพ์ให้น้อง</a>: สติกเกอร์ บัตรคำฝึกเสียงที่บ้าน ใบประกาศ · <a href="#sheets">ดูตัวอย่าง A4</a></li>
      <li><a href="#guide">คู่มือ</a>เป็นภาพเคลื่อนไหวพี่ปูสอนเล่น + ลองเล่น 1 ข้อ + <a href="#tips">ป้ายแนะนำครั้งแรก</a></li>
      <li>หน้าผู้ใหญ่: <a href="#today">แผนวันนี้</a>บอกสิ่งที่ต้องทำต่อ, <a href="#results">ผลการฝึก</a>รวมเป็นหน้าเดียวและให้ผลข้อค้างได้ทันที, <a href="#setup">จัดชุดฝึก</a> 3 คำถาม</li>
    </ol></div>
    <div class="sum-card"><h3>ขอให้ช่วยตัดสินใจ</h3><ol>
      <li>สติกเกอร์ได้จากการลองเล่น (เสนอ) หรือเฉพาะข้อที่ "ทำได้"</li>
      <li>เก็บเสียงเด็กในเครื่องชั่วคราวให้ผู้ใหญ่ฟังย้อนหลังได้ไหม → <a href="#results">ข้อ 9</a></li>
      <li>กระดาษสติกเกอร์แบบเต็มแผ่นหรือไดคัท → <a href="#sheets">ข้อ 4</a></li>
      <li>ชื่อแท็บ "สติกเกอร์และพิมพ์" หรือ "ของรางวัล"</li>
    </ol></div>
  </div>
  <div class="howto"><span><b>วิธีอ่าน:</b> ซ้าย = หน้าจริงตอนนี้ · กลาง = แบบใหม่ · ขวา = สิ่งที่ <span class="t-cut">ตัด</span> / <span class="t-move">ย้าย</span> / <span class="t-add">เพิ่ม</span></span><span><b>สลับมือถือ/คอม</b> ที่ปุ่มมุมขวาล่าง</span><span>ภาพเป็นชุดที่วาดใหม่ล่าสุด (เดียวกับในเกม)</span></div>
</section>
${toc}
${floatbar}
${S.join("\n")}
${script}
</body>
</html>
`;
await writeFile(`${DIR}/family-pages.html`, html);
console.log(`family-pages.html ${(html.length / 1024).toFixed(0)} KB`);
