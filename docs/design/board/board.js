"use strict";
const data = window.BOARD_DATA;
const byId = id => document.getElementById(id);
const make = (tag, text, cls) => {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (cls) node.className = cls;
  return node;
};
const frameLink = (id, text) => {
  const link = make("a", text || ("ภาพ " + id), "flow-link");
  link.href = "#frame-" + id;
  return link;
};
const frames = new Map(data.frames.map(frame => [frame.id, frame]));
const viewer = byId("viewer");
let visibleFrames = [];
let activeIndex = 0;
let returnFocus;
function updateViewer(index) {
  const frame = visibleFrames[index];
  if (!frame) return;
  activeIndex = index;
  byId("viewer-title").textContent = frame.title + " · " + frame.size;
  const image = byId("full-image");
  image.src = "board/screens/" + frame.id + ".jpg";
  image.alt = frame.title;
  byId("prev").disabled = index === 0;
  byId("next").disabled = index === visibleFrames.length - 1;
  viewer.scrollTop = 0;
}
function renderFrames() {
  const query = byId("query").value.trim().toLowerCase();
  const filter = byId("group-filter").value;
  const container = byId("chapters");
  container.replaceChildren();
  visibleFrames = data.frames.filter(frame => (!filter || frame.group === filter)
    && [frame.id, frame.title, frame.route, frame.note, ...frame.checks].join(" ").toLowerCase().includes(query));
  for (const group of data.groups) {
    const selected = visibleFrames.filter(frame => frame.group === group.id);
    if (!selected.length) continue;
    const section = make("section", "", "chapter");
    section.id = "chapter-" + group.id;
    const header = make("header");
    header.append(make("h3", group.title), make("p", group.description));
    section.append(header);
    const grid = make("div", "", "frames");
    for (const frame of selected) {
      const card = make("article", "", "frame");
      card.id = "frame-" + frame.id;
      const bar = make("div", "", "frame-bar");
      bar.append(make("b", frame.id.toUpperCase()), make("code", frame.route));
      const preview = make("button", "", "frame-image");
      preview.type = "button";
      preview.setAttribute("aria-label", "ขยาย " + frame.title);
      const image = make("img");
      image.src = "board/screens/" + frame.id + ".jpg";
      image.alt = frame.title;
      image.loading = "lazy";
      preview.append(image);
      preview.addEventListener("click", () => {
        returnFocus = preview;
        updateViewer(visibleFrames.indexOf(frame));
        viewer.showModal();
        byId("close").focus();
      });
      const copy = make("div", "", "frame-copy");
      copy.append(make("h4", frame.title), make("p", frame.note || ("ภาพจริง · " + frame.size)));
      if (frame.checks.length) copy.append(make("span", "Handoff " + frame.checks.join(", "), "pill"));
      card.append(bar, preview, copy);
      grid.append(card);
    }
    section.append(grid);
    container.append(section);
  }
  byId("result-count").textContent = visibleFrames.length + " จาก " + data.frames.length + " ภาพ";
  if (!visibleFrames.length) container.append(make("p", "ไม่พบหน้าจอที่ตรงกับตัวกรอง", "empty"));
}
function showTarget() {
  const id = location.hash.slice(1);
  if (!id.startsWith("frame-") && !id.startsWith("chapter-")) return;
  if (!byId(id)) {
    byId("query").value = "";
    byId("group-filter").value = "";
    renderFrames();
  }
  byId(id)?.scrollIntoView({ block: "start" });
}
for (const group of data.groups) {
  const option = make("option", group.title);
  option.value = group.id;
  byId("group-filter").append(option);
  const anchor = make("a", group.title);
  anchor.href = "#chapter-" + group.id;
  byId("chapter-nav").append(anchor);
}
for (const [title, palette] of Object.entries(data.palettes)) {
  const panel = make("div", "", "panel");
  panel.append(make("h3", title));
  const swatches = make("div", "", "swatches");
  for (const { name, hex } of palette) {
    const swatch = make("div", "", "swatch");
    const color = make("i");
    color.style.backgroundColor = hex;
    color.setAttribute("aria-hidden", "true");
    const caption = make("div");
    caption.append(make("b", name), make("br"), make("code", hex));
    swatch.append(color, caption);
    swatches.append(swatch);
  }
  panel.append(swatches);
  byId("palettes").append(panel);
}
for (const flow of data.flows) {
  const panel = make("div", "", "panel");
  panel.append(make("h3", flow.title));
  if (flow.note) panel.append(make("p", flow.note));
  const grid = make("div", "", "flow-grid");
  grid.tabIndex = 0;
  grid.setAttribute("aria-label", flow.title);
  flow.steps.forEach((step, index) => {
    const item = make("article", "", "flow-card");
    item.append(make("span", String(index + 1).padStart(2, "0"), "pill"), make("h3", step.title), make("p", step.text));
    const links = make("div", "", "chips");
    for (const id of step.ids) if (frames.has(id)) links.append(frameLink(id));
    item.append(links);
    grid.append(item);
  });
  panel.append(grid);
  byId("flow-list").append(panel);
}
for (const { route, id } of data.routes) {
  const item = make("li");
  item.append(frameLink(id, route));
  byId("route-list").append(item);
}
byId("route-label").textContent = "ตรวจเส้นทางทั้งหมดในโค้ด · " + data.routes.length + " เส้นทาง";
for (const check of data.coverage) {
  const row = make("tr");
  const description = make("td");
  description.append(make("b", check.page), make("br"), make("span", check.description));
  const evidence = make("td");
  evidence.append(make("b", check.direct ? "ภาพตรง" : check.ids.length ? "ภาพอ้างอิง" : "หมายเหตุ"), make("br"));
  const links = make("div", "", "chips");
  for (const id of check.ids) links.append(frameLink(id));
  evidence.append(links);
  row.append(make("td", check.id), description, evidence);
  byId("coverage-rows").append(row);
}
for (const tag of [data.frames.length + " ภาพจากเว็บจริง", "4 บทบาท", "Handoff 01–84", "ต้นทาง " + data.commit.slice(0, 7)])
  byId("hero-tags").append(make("span", tag, "pill"));
byId("font-description").textContent = data.font;
byId("rail-source").textContent = "little_speech · " + data.commit.slice(0, 7);
byId("environment").textContent = data.environment;
byId("source-link").href += "/tree/" + data.commit;
byId("query").addEventListener("input", renderFrames);
byId("group-filter").addEventListener("change", renderFrames);
byId("prev").addEventListener("click", () => updateViewer(activeIndex - 1));
byId("next").addEventListener("click", () => updateViewer(activeIndex + 1));
byId("close").addEventListener("click", () => viewer.close());
viewer.addEventListener("click", event => { if (event.target === viewer) viewer.close(); });
viewer.addEventListener("keydown", event => {
  if (event.key === "ArrowLeft") updateViewer(activeIndex - 1);
  if (event.key === "ArrowRight") updateViewer(activeIndex + 1);
});
viewer.addEventListener("close", () => returnFocus?.focus());
window.addEventListener("hashchange", showTarget);
renderFrames();
showTarget();
