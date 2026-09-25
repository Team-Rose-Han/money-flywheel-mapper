// ============================================================
//  Money Flywheel Mapper — UI: gate, question flow, live map, results
// ============================================================
(function () {
  const C = window.MAPPER_CONFIG;
  const T = window.MAPPER_TREE;
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // A realistic example profile shown before anyone answers, and used to fill
  // gaps while the map previews mid-way through the questions.
  const SAMPLE = {
    work: "employee", employer_plan: "match", partner: "solo", filing: "single", income: "under",
    hdhp: "unsure", big_goal: "invest", dream: "", efund: "some", cc: "no", match_full: "yes",
  };

  let answers = {};
  let finished = false;
  try { const saved = JSON.parse(localStorage.getItem("msm_answers") || "null"); if (saved && typeof saved === "object") answers = saved; } catch (e) {}

  // ---------------------------------------------------------
  //  GATE
  // ---------------------------------------------------------
  function embeddedOnAllowedHost() {
    try {
      if (window.self === window.top) return false;
      const ref = document.referrer ? new URL(document.referrer).hostname : "";
      return C.allowedEmbedHosts.some((h) => ref === h || ref.endsWith("." + h));
    } catch (e) { return false; }
  }
  async function sha256Hex(str) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  function unlocked() {
    try { if (localStorage.getItem("msm_unlocked") === "1") return true; } catch (e) {}
    return embeddedOnAllowedHost();
  }
  function showApp() {
    $("#gate").hidden = true;
    $("#app").hidden = false;
    render();
  }
  function initGate() {
    if (unlocked()) return showApp();
    const gate = $("#gate");
    gate.hidden = false;
    const form = $("#gateform");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const code = $("#code").value.trim().toUpperCase();
      const err = $("#gateerr");
      if (!code) return;
      if (!window.crypto || !crypto.subtle) { err.textContent = "This page needs to be opened over https to check the code."; return; }
      const hex = await sha256Hex(code);
      if (hex === C.accessCodeHash) {
        try { localStorage.setItem("msm_unlocked", "1"); } catch (e2) {}
        showApp();
      } else {
        err.textContent = "That code didn't match. It's in the Money Flywheel Mapper page inside the community.";
        $("#code").select();
      }
    });
  }

  // ---------------------------------------------------------
  //  QUESTION FLOW
  // ---------------------------------------------------------
  const relevant = () => T.QUESTIONS.filter((q) => !q.when || q.when(answers));
  const val = (x) => (typeof x === "function" ? x(answers) : x);

  function firstUnanswered() {
    return relevant().find((q) => answers[q.id] === undefined);
  }
  function save() { try { localStorage.setItem("msm_answers", JSON.stringify(answers)); } catch (e) {} }

  function setAnswer(id, v) {
    answers[id] = v;
    // Drop answers to questions that are no longer asked (branch changed).
    const keep = new Set(relevant().map((q) => q.id));
    Object.keys(answers).forEach((k) => { if (!keep.has(k)) delete answers[k]; });
    save();
    render();
  }

  function renderPanel() {
    const panel = $("#panel");
    const rel = relevant();
    const q = firstUnanswered();
    const answered = rel.filter((x) => answers[x.id] !== undefined).length;
    finished = !q;

    const chips = rel.filter((x) => answers[x.id] !== undefined).map((x) => {
      let label;
      if (x.type === "text") label = answers[x.id] ? answers[x.id] : "No dream yet";
      else { const o = val(x.options).find((o) => o.v === answers[x.id]); label = o ? o.t : answers[x.id]; }
      return `<button class="chip" data-edit="${x.id}" title="Change this answer"><b>${esc(x.section)}</b> · ${esc(label)}</button>`;
    }).join("");

    if (!q) {
      const r = T.buildResult(answers);
      panel.innerHTML = `
        <div class="progress"><div class="bar"><i style="width:100%"></i></div><span class="count">ALL ${rel.length} QUESTIONS ANSWERED</span></div>
        <div class="done-head">
          <span class="eyebrow">Your account combo</span>
          <h2>${esc(r.combo)}</h2>
          <p class="lede">Your map is below. Solid boxes are accounts to open now. The coral box is your one goal right now: every Financial Goal dollar goes there until it is maxed for the year or fully done. Dashed boxes wait for their step.</p>
        </div>
        <div class="chips">${chips}</div>
        <div class="nav"><span class="footnote">Tap any answer above to change it. The map updates instantly.</span><button class="btn ghost" id="restart">Start over</button></div>`;
      $("#restart").addEventListener("click", () => { answers = {}; save(); render(); });
    } else {
      const idx = rel.indexOf(q);
      const total = Math.max(rel.length, idx + 1);
      let body;
      if (q.type === "text") {
        body = `<form class="textrow" id="textform"><input id="q_${q.id}" type="text" maxlength="40" placeholder="${esc(val(q.placeholder) || "")}" value="${esc(answers[q.id] || "")}" autocomplete="off">
          <button class="btn" type="submit">Continue</button><button class="btn ghost" type="button" id="skip">Skip</button></form>`;
      } else {
        body = `<div class="options">${val(q.options).map((o) => `<button class="opt" data-v="${esc(o.v)}" aria-pressed="${answers[q.id] === o.v}"><span class="t">${esc(o.t)}</span>${o.s ? `<span class="s">${esc(o.s)}</span>` : ""}</button>`).join("")}</div>`;
      }
      panel.innerHTML = `
        <div class="progress"><div class="bar"><i style="width:${Math.round((answered / total) * 100)}%"></i></div><span class="count">QUESTION ${idx + 1} OF ABOUT ${total}</span></div>
        <div class="question">
          <span class="eyebrow">${esc(q.section)}</span>
          <h2>${esc(val(q.q))}</h2>
          ${q.help ? `<p class="help">${esc(val(q.help))}</p>` : ""}
          ${body}
        </div>
        ${chips ? `<div class="chips">${chips}</div>` : ""}
        <div class="nav"><button class="btn ghost" id="back" ${idx === 0 ? "disabled" : ""}>Back</button><span class="footnote">${idx === 0 ? "About 9 questions. Two minutes." : ""}</span></div>`;
      panel.querySelectorAll(".opt").forEach((b) => b.addEventListener("click", () => setAnswer(q.id, b.dataset.v)));
      const tf = $("#textform");
      if (tf) {
        tf.addEventListener("submit", (e) => { e.preventDefault(); setAnswer(q.id, $("#q_" + q.id).value.trim()); });
        $("#skip").addEventListener("click", () => setAnswer(q.id, ""));
        setTimeout(() => $("#q_" + q.id).focus(), 0);
      }
      $("#back").addEventListener("click", () => {
        const prev = rel[idx - 1];
        if (prev) { delete answers[prev.id]; save(); render(); }
      });
    }
    panel.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => {
      const id = b.dataset.edit;
      // Re-ask this question and everything after it.
      const order = relevant().map((x) => x.id);
      const from = order.indexOf(id);
      order.slice(from).forEach((k) => delete answers[k]);
      save(); render();
      $("#panel").scrollIntoView({ behavior: "smooth", block: "start" });
    }));
  }

  // ---------------------------------------------------------
  //  MAP
  // ---------------------------------------------------------
  function node(acc, cls, extra = "") {
    const badges = [];
    if (acc.step) badges.push(`<span class="stepno">STEP ${acc.step}</span>`);
    if (acc.state === "goal") badges.push(`<span class="badge">#1 goal now</span>`);
    if (acc.state === "active" && acc.step && acc.step < currentStepNo) badges.push(`<span class="check" title="Done or maxed for this year">✓</span>`);
    return `<div class="node cell ${cls} ${acc.state || ""}" data-id="${acc.id}" ${extra}>${badges.join("")}<span class="name">${esc(acc.name)}</span><span class="type">${esc(acc.type)}</span></div>`;
  }
  let currentStepNo = 0;

  function renderMap(r, isExample) {
    currentStepNo = r.step;
    const map = $("#map");
    const byId = (id) => r.flow.find((f) => f.id === id);
    const buckets = r.flow.filter((f) => ["bills", "spending", "spending2", "upcoming"].includes(f.id));
    const nb = buckets.length;
    const biz = r.isSelf;
    const cols = [];
    if (biz) cols.push("minmax(120px,1fr)", "minmax(120px,1fr)", "48px");
    for (let i = 0; i < nb; i++) cols.push("minmax(130px,1fr)");
    cols.push("minmax(200px,240px)");
    const b0 = biz ? 4 : 1; // first bucket column
    const bEnd = b0 + nb;    // exclusive
    const stackCol = bEnd;

    const gc = (a, b) => `style="grid-column:${a} / ${b}"`;
    let html = "";
    if (biz) {
      html += `<div class="cell cell-center" style="grid-column:1 / 3;grid-row:1"><div class="node pill" data-id="revenue"><span class="name">Revenue</span><span class="type">Client payments</span></div></div>`;
      html += node(byId("bizhub"), "hub", `style="grid-column:1 / 3;grid-row:2"`);
      html += node(byId("taxes"), "small", `style="grid-column:1;grid-row:3"`);
      html += node(byId("expenses"), "small", `style="grid-column:2;grid-row:3"`);
      html += `<div class="cell spacer" style="grid-column:3;grid-row:1"></div>`;
    }
    const incomes = [];
    if (r.isEmp) incomes.push({ id: "paycheck", name: r.shared ? "Your paycheck" : "Paycheck", type: "Employer" });
    if (r.shared) incomes.push({ id: "paycheck2", name: "Partner's income", type: r.hybrid ? "Their share to the Hub" : "Paycheck or business" });
    if (incomes.length) {
      html += `<div class="cell incomes" style="grid-column:${b0} / ${bEnd};grid-row:1">${incomes.map((i) => `<div class="node pill" data-id="${i.id}"><span class="name">${esc(i.name)}</span><span class="type">${esc(i.type)}</span></div>`).join("")}</div>`;
    }
    html += `<div class="cell cell-center" style="grid-column:${b0} / ${bEnd};grid-row:2">${node(byId("hub"), "hub").replace('class="node cell', 'class="node')}</div>`;
    buckets.forEach((b, i) => { html += node(b, "bucket", `style="grid-column:${b0 + i};grid-row:3"`); });
    html += `<div class="cell stack" style="grid-column:${stackCol};grid-row:3">${r.stack.map((s) => node(s, "stackitem").replace('class="node cell', 'class="node')).join("")}</div>`;
    html += `<svg class="links" aria-hidden="true"></svg>`;

    map.style.gridTemplateColumns = cols.join(" ");
    map.innerHTML = html;

    $("#mapcombo").textContent = r.combo;
    const tag = $("#maptag");
    tag.textContent = isExample ? "Example map" : finished ? "Your money system" : "Preview, updates as you answer";
    tag.className = "tag" + (finished && !isExample ? "" : " preview");
    $("#mapsub").textContent = isExample
      ? "This is what a finished map looks like. Answer the questions above to build yours."
      : r.shared ? "One Household Hub, shared Bills and Upcoming, and separate Spending money for each of you." : "Every payday flows through the Hub and lands exactly where it should.";

    requestAnimationFrame(drawLinks);
  }

  function drawLinks() {
    const map = $("#map");
    const svg = $("svg.links", map);
    if (!svg) return;
    if (window.innerWidth <= 720) { svg.innerHTML = ""; return; }
    const mr = map.getBoundingClientRect();
    const rect = (id) => { const el = map.querySelector(`[data-id="${id}"]`); if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.left - mr.left, y: b.top - mr.top, w: b.width, h: b.height, cx: b.left - mr.left + b.width / 2, bottom: b.bottom - mr.top, right: b.right - mr.left }; };
    let out = "";
    const bus = (srcIds, dstIds) => {
      const S = srcIds.map(rect).filter(Boolean), D = dstIds.map(rect).filter(Boolean);
      if (!S.length || !D.length) return;
      const y = (Math.max(...S.map((s) => s.bottom)) + Math.min(...D.map((d) => d.y))) / 2;
      const xs = [...S, ...D].map((r) => r.cx);
      const x1 = Math.min(...xs), x2 = Math.max(...xs);
      if (x2 - x1 > 1) out += `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}"/>`;
      S.forEach((s) => { out += `<line x1="${s.cx}" y1="${s.bottom}" x2="${s.cx}" y2="${y}"/><circle cx="${s.cx}" cy="${y}" r="4"/>`; });
      D.forEach((d) => { out += `<line x1="${d.cx}" y1="${y}" x2="${d.cx}" y2="${d.y}"/>`; });
    };
    bus(["revenue"], ["bizhub"]);
    bus(["bizhub"], ["taxes", "expenses"]);
    bus(["paycheck", "paycheck2"], ["hub"]);
    const stackFirst = map.querySelector(".stack .node");
    bus(["hub"], ["bills", "spending", "spending2", "upcoming", stackFirst ? stackFirst.dataset.id : "none"]);
    // Pay yourself: Biz Hub → Hub, horizontal with an arrowhead and label.
    const bh = rect("bizhub"), hb = rect("hub");
    if (bh && hb) {
      const y = bh.y + bh.h / 2, x1 = bh.right, x2 = hb.x - 2;
      out += `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}"/><path d="M${x2 - 9},${y - 6} L${x2},${y} L${x2 - 9},${y + 6}"/>`;
      out += `<text x="${(x1 + x2) / 2}" y="${y - 10}" text-anchor="middle">PAY YOURSELF</text>`;
    }
    svg.innerHTML = out;
  }

  // ---------------------------------------------------------
  //  RESULTS
  // ---------------------------------------------------------
  function renderResults(r) {
    const res = $("#results");
    if (!finished) { res.hidden = true; return; }
    res.hidden = false;
    const linkCell = (acc) => {
      const l = acc.link;
      if (acc.id === "employer") return `<span class="nt">Through your employer's benefits portal</span>`;
      if (l && l.url) return `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label || "Open here")}</a>`;
      return `<span class="nt">Rose's pick coming soon</span>`;
    };
    const stLabel = { goal: "Fund now", active: "Open now", later: "Later" };
    const rows = [...r.flow, ...r.stack].map((acc) => `<tr>
      <td><div class="nm">${esc(acc.name)}</div><div class="nt">${esc(acc.note || "")}</div></td>
      <td>${esc(acc.type)}</td>
      <td>${acc.step ? "Step " + acc.step : "Cash flow"}</td>
      <td><span class="status ${acc.state}">${stLabel[acc.state]}</span></td>
      <td>${linkCell(acc)}</td></tr>`).join("");
    $("#goalcard").innerHTML = `
      <div class="stepline"><span class="num">WATERFALL STEP ${r.step} OF 10</span><span class="eyebrow">Your one goal right now</span></div>
      <h3>${esc(r.stepTitle)}</h3>
      <div class="grid2">
        <div><span class="lbl">Why this, why now</span><p>${esc(r.stepWhy)}</p></div>
        <div><span class="lbl">What to do this week</span><p>${esc(r.stepAction)}</p></div>
        <div><span class="lbl">Where your Financial Goal money goes</span><p class="target">${esc(r.goalTarget)}</p></div>
      </div>
      <p class="footnote">One goal at a time. When this step is maxed for the year or fully done, come back, update your answer, and the next step lights up.</p>`;
    $("#rows").innerHTML = rows;
  }

  // ---------------------------------------------------------
  //  EXPORT + COPY
  // ---------------------------------------------------------
  async function exportPng() {
    if (!window.html2canvas) return;
    const card = $("#mapcard");
    const bg = getComputedStyle(document.body).getPropertyValue("--bg").trim() || "#ede9e4";
    const canvas = await html2canvas(card, { backgroundColor: bg, scale: 2, useCORS: true });
    const url = canvas.toDataURL("image/png");
    $("#shot").src = url;
    $("#dl").href = url;
    $("#overlay").hidden = false;
  }
  function checklistText(r) {
    const lines = [`${C.brand} · ${r.combo}`, `Step ${r.step} of 10: ${r.stepTitle}`, ""];
    [...r.flow, ...r.stack].forEach((a) => lines.push(`${a.state === "goal" ? "★" : a.state === "later" ? "○" : "●"} ${a.name} — ${a.type}${a.step ? ` (step ${a.step})` : ""}`));
    lines.push("", "● open now   ★ fund now   ○ later");
    return lines.join("\n");
  }
  async function copyChecklist() {
    const r = T.buildResult(answers);
    const txt = checklistText(r);
    const btn = $("#copy");
    try { await navigator.clipboard.writeText(txt); btn.textContent = "Copied"; }
    catch (e) {
      const ta = document.createElement("textarea"); ta.value = txt; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); btn.textContent = "Copied"; } catch (e2) { btn.textContent = "Select and copy"; }
      document.body.removeChild(ta);
    }
    setTimeout(() => (btn.textContent = "Copy checklist"), 1800);
  }

  // ---------------------------------------------------------
  //  RENDER
  // ---------------------------------------------------------
  function render() {
    renderPanel();
    const isExample = Object.keys(answers).length === 0;
    const r = T.buildResult(finished ? answers : { ...SAMPLE, ...answers });
    renderMap(r, isExample);
    renderResults(r);
    postHeight();
  }
  function postHeight() {
    try { if (window.parent !== window) window.parent.postMessage({ mapperHeight: document.documentElement.scrollHeight }, "*"); } catch (e) {}
  }

  document.addEventListener("DOMContentLoaded", () => {
    $("#png").addEventListener("click", exportPng);
    $("#copy").addEventListener("click", copyChecklist);
    $("#close").addEventListener("click", () => ($("#overlay").hidden = true));
    $("#overlay").addEventListener("click", (e) => { if (e.target === e.currentTarget) $("#overlay").hidden = true; });
    new ResizeObserver(() => { drawLinks(); postHeight(); }).observe($("#map"));
    window.addEventListener("resize", drawLinks);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawLinks);
    initGate();
  });
})();
