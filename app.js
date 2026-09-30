// ============================================================
//  Money Flywheel Mapper — UI
//  One screen at a time:
//    1. questions        who you are, how you earn, who you share with
//    2. map              the personalized map, revealed once
//    3. intro + accounts one screen per box: which real account is it?
//    4. final            the map with a bank label under every box,
//                        the accounts to open, and the PNG download
// ============================================================
(function () {
  const C = window.MAPPER_CONFIG;
  const T = window.MAPPER_TREE;
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const STORE = "mfm_state_v3";
  let state = { answers: {}, assign: {}, mapSeen: false, bank: "", bizBank: "" };
  try { const saved = JSON.parse(localStorage.getItem(STORE) || "null"); if (saved && typeof saved === "object" && saved.answers) state = { ...state, ...saved }; } catch (e) {}
  function save() { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) {} }
  const answers = () => state.answers;

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
  function showApp() { $("#gate").hidden = true; $("#app").hidden = false; render(); }
  function initGate() {
    if (unlocked()) return showApp();
    $("#gate").hidden = false;
    $("#gateform").addEventListener("submit", async (e) => {
      e.preventDefault();
      const code = $("#code").value.trim().toUpperCase();
      const err = $("#gateerr");
      if (!code) return;
      if (!window.crypto || !crypto.subtle) { err.textContent = "This page needs to be opened over https to check the code."; return; }
      if ((await sha256Hex(code)) === C.accessCodeHash) {
        try { localStorage.setItem("msm_unlocked", "1"); } catch (e2) {}
        showApp();
      } else {
        err.textContent = "That code didn't match. It's in the Money Flywheel Mapper page inside the community.";
        $("#code").select();
      }
    });
  }

  // ---------------------------------------------------------
  //  WHICH SCREEN
  // ---------------------------------------------------------
  const relevant = () => T.QUESTIONS.filter((q) => !q.when || q.when(answers()));
  const val = (x) => (typeof x === "function" ? x(answers()) : x);
  const firstUnanswered = () => relevant().find((q) => answers()[q.id] === undefined);
  const result = () => T.buildResult(answers());

  function screen() {
    if (firstUnanswered()) return "questions";
    if (!state.mapSeen) return "map";
    if (!state.bank) return "bank";
    if (result().runsBusiness && !state.bizBank) return "bizbank";
    return "final";
  }

  function setAnswer(id, v) {
    state.answers[id] = v;
    const keep = new Set(relevant().flatMap((q) => (q.fields ? q.fields.map((f) => f.id) : [q.id])));
    Object.keys(state.answers).forEach((k) => { if (!keep.has(k)) delete state.answers[k]; });
    // Answers changed, so the map is new again and labels for boxes that vanished are dropped.
    state.mapSeen = false;
    const ids = new Set(result().accounts.map((a) => a.id));
    Object.keys(state.assign).forEach((k) => { if (!ids.has(k)) delete state.assign[k]; });
    save(); render();
  }
  function restart() { state = { answers: {}, assign: {}, mapSeen: false, bank: "", bizBank: "" }; save(); render(); }

  // ---------------------------------------------------------
  //  SCREEN 1: QUESTIONS
  // ---------------------------------------------------------
  function renderQuestions(panel) {
    const rel = relevant();
    const q = firstUnanswered();
    const idx = rel.indexOf(q);
    let body;
    if (q.type === "names") {
      body = `<form class="textrow" id="textform">${q.fields.map((f) => `<input id="q_${f.id}" type="text" maxlength="40" placeholder="${esc(f.placeholder)}" aria-label="${esc(f.label)}" value="${esc(answers()[f.id] || "")}" autocomplete="${f.id === "name" ? "given-name" : "family-name"}">`).join("")}
        <button class="btn" type="submit">Continue</button></form><p class="err" id="qerr" aria-live="polite"></p>`;
    } else if (q.type === "text") {
      body = `<form class="textrow" id="textform"><input id="q_${q.id}" type="text" maxlength="40" placeholder="${esc(val(q.placeholder) || "")}" value="${esc(answers()[q.id] || "")}" autocomplete="off">
        <button class="btn" type="submit">Continue</button>${q.required ? "" : `<button class="btn ghost" type="button" id="skip">Skip</button>`}</form>${q.required ? `<p class="err" id="qerr" aria-live="polite"></p>` : ""}`;
    } else {
      body = `<div class="options">${val(q.options).map((o) => `<button class="opt" data-v="${esc(o.v)}"><span class="t">${esc(o.t)}</span>${o.s ? `<span class="s">${esc(o.s)}</span>` : ""}</button>`).join("")}</div>`;
    }
    panel.innerHTML = `
      <div class="question">
        <h2>${esc(val(q.q))}</h2>
        ${body}
      </div>
      <div class="nav"><button class="btn ghost" id="back" ${idx === 0 ? "disabled" : ""}>Back</button></div>`;
    panel.querySelectorAll(".opt").forEach((b) => b.addEventListener("click", () => setAnswer(q.id, b.dataset.v)));
    const tf = $("#textform");
    if (tf && q.type === "names") {
      tf.addEventListener("submit", (e) => {
        e.preventDefault();
        const vals = q.fields.map((f) => $("#q_" + f.id).value.trim());
        const missing = q.fields.findIndex((f, i) => !vals[i]);
        if (missing >= 0) { $("#qerr").textContent = "Please enter your first and last name."; $("#q_" + q.fields[missing].id).focus(); return; }
        q.fields.forEach((f, i) => { if (f.id !== q.id) state.answers[f.id] = vals[i]; });
        setAnswer(q.id, vals[q.fields.findIndex((f) => f.id === q.id)]);
      });
      setTimeout(() => $("#q_" + q.fields[0].id).focus(), 0);
    } else if (tf) {
      tf.addEventListener("submit", (e) => {
        e.preventDefault();
        const v = $("#q_" + q.id).value.trim();
        if (q.required && !v) { $("#qerr").textContent = "Please enter a name."; $("#q_" + q.id).focus(); return; }
        setAnswer(q.id, v);
      });
      const skip = $("#skip");
      if (skip) skip.addEventListener("click", () => setAnswer(q.id, ""));
      setTimeout(() => $("#q_" + q.id).focus(), 0);
    }
    $("#back").addEventListener("click", () => { const prev = rel[idx - 1]; if (prev) { (prev.fields ? prev.fields.map((f) => f.id) : [prev.id]).forEach((k) => delete state.answers[k]); save(); render(); } });
  }

  // ---------------------------------------------------------
  //  SCREEN 3: THE ONE BANK (personal), then the business bank if needed
  // ---------------------------------------------------------
  function renderBank(panel, r, which) {
    const personal = which === "bank";
    const link = personal ? C.links.checking : C.links.bizChecking;
    const rule = personal ? C.bankRule : C.bizBankRule;
    const criteria = (personal ? C.bankCriteria : C.bizBankCriteria) || [];
    panel.innerHTML = `
      <div class="question">
        <h2>${personal ? "Which one financial institution will hold all of the personal bank accounts (joint and individual) for your Money Flywheel?" : "Which one financial institution will hold all of the business bank accounts for your Money Flywheel?"}</h2>
        ${rule ? `<p class="rule">${esc(rule)}</p>` : ""}
        ${criteria.length ? `<div class="criteria"><span class="crit-title">Look for:</span><ul>${criteria.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}
        ${C.repurposeNote ? `<p class="note">${esc(C.repurposeNote)}</p>` : ""}
        ${link && link.url ? `<p class="reclink"><a href="${esc(link.url)}" target="_blank" rel="noopener">${esc(link.label || "Rose's recommended banks")}</a></p>` : ""}
        <form class="textrow" id="bankform">
          <input id="bank_in" type="text" maxlength="32" placeholder="${personal ? "e.g. Capital One" : "e.g. Chase"}" value="${esc(personal ? state.bank : state.bizBank)}" autocomplete="off" aria-label="Bank name">
          <button class="btn" type="submit">Continue</button>
        </form>
        <p class="err" id="bankerr" aria-live="polite"></p>
      </div>
      <div class="nav"><button class="btn ghost" id="back">Back</button></div>`;
    const set = (v) => { if (personal) state.bank = v; else state.bizBank = v; save(); render(); };
    $("#bankform").addEventListener("submit", (e) => {
      e.preventDefault();
      const v = $("#bank_in").value.trim();
      if (!v) { $("#bankerr").textContent = "Type the bank's name."; $("#bank_in").focus(); return; }
      set(v);
    });
    $("#back").addEventListener("click", () => { if (personal) state.mapSeen = false; else state.bank = ""; save(); render(); });
    setTimeout(() => $("#bank_in").focus(), 0);
  }

  // ---------------------------------------------------------
  //  MAP
  //  Grid: [Biz Hub col + spacer] [one column per bucket]
  //  Row 1 income pills, row 2 hubs, row 3 buckets.
  // ---------------------------------------------------------
  let lastResult = null;
  // Every box: name, then the account type. On the final map, a field for the real
  // account plus the printed label the PNG shows in its place.
  const bankFor = (acc) => (acc.type.startsWith("Business") ? state.bizBank : state.bank) || "";
  const digits = (v) => String(v || "").replace(/\D/g, "").slice(0, 4);
  function printedLabel(acc) {
    const v = digits(state.assign[acc.id]);
    const bank = bankFor(acc);
    if (!v) return { text: bank ? `Open new · ${bank}` : "Open new", open: true };
    return { text: `${bank} ${v}`.trim(), open: false };
  }
  function subLabel(acc, final) {
    let out = `<span class="type">${esc(acc.type)}</span>`;
    if (final) {
      const p = printedLabel(acc);
      const bank = bankFor(acc);
      out += `<label class="acct-row"><span class="acct-bank">${esc(bank)}</span><input class="acct-in" data-id="${acc.id}" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="4" value="${esc(digits(state.assign[acc.id]))}" placeholder="····" aria-label="Last four digits of your ${esc(acc.name)} account"></label>`;
      out += `<span class="acct${p.open ? " open" : ""}">${esc(p.text)}</span>`;
    }
    return out;
  }
  function node(acc, cls, final, extra = "") {
    return `<div class="node cell ${cls}" data-id="${acc.id}" ${extra}><span class="name">${esc(acc.name)}</span>${subLabel(acc, final)}</div>`;
  }
  function pill(inc) {
    return `<div class="node pill${inc.to === "later" ? " later" : ""}" data-id="${inc.id}"><span class="name">${esc(inc.name)}</span></div>`;
  }

  function renderMap(r, final) {
    lastResult = r;
    const map = $("#map");
    const biz = r.runsBusiness;
    const nb = r.buckets.length;
    const cols = [];
    if (biz) cols.push("minmax(150px,1fr)", "40px");
    for (let i = 0; i < nb; i++) cols.push("minmax(124px,1fr)");
    const b0 = biz ? 3 : 1;
    const bEnd = b0 + nb;

    let html = "";
    if (biz) {
      const bizById = (id) => r.biz.find((b) => b.id === id);
      html += `<div class="cell cell-center" style="grid-column:1;grid-row:1">${pill(r.incomes.find((i) => i.id === "revenue"))}</div>`;
      html += node(bizById("bizhub"), "hub", final, `style="grid-column:1;grid-row:2"`);
      html += node(bizById("taxes"), "small", final, `style="grid-column:1;grid-row:3"`);
      html += `<div class="cell spacer" style="grid-column:2;grid-row:1"></div>`;
    }
    // Every personal income pill sits in one row above the Hub, occasional ones dashed.
    const personal = r.incomes.filter((i) => i.id !== "revenue");
    if (personal.length) {
      html += `<div class="cell incomes" style="grid-column:${b0} / ${bEnd};grid-row:1">${personal.map(pill).join("")}</div>`;
    }
    html += `<div class="cell cell-center" style="grid-column:${b0} / ${bEnd};grid-row:2">${node(r.hub, "hub", final).replace('class="node cell', 'class="node')}</div>`;
    r.buckets.forEach((b, i) => { html += node(b, "bucket", final, `style="grid-column:${b0 + i};grid-row:3"`); });
    html += `<svg class="links" aria-hidden="true"></svg>`;

    map.style.gridTemplateColumns = cols.join(" ");
    map.innerHTML = html;
    $("#maptitle").textContent = r.title;
    $("#png").hidden = !final;

    const nav = $("#mapnav");
    if (final) {
      nav.innerHTML = ""; nav.hidden = true;
      map.querySelectorAll(".acct-in").forEach((inp) => inp.addEventListener("input", () => {
        inp.value = digits(inp.value);
        state.assign[inp.dataset.id] = inp.value; save();
        const acc = r.accounts.find((x) => x.id === inp.dataset.id);
        const p = printedLabel(acc);
        const span = inp.closest(".acct-row").nextElementSibling;
        span.textContent = p.text; span.className = "acct" + (p.open ? " open" : "");
      }));
    }
    else {
      nav.hidden = false;
      nav.innerHTML = `<button class="btn ghost" id="mapback">Back</button><button class="btn" id="mapnext">Continue to your accounts</button>`;
      $("#mapback").addEventListener("click", () => { const rel = relevant(); const last = rel[rel.length - 1]; if (last) delete state.answers[last.id]; save(); render(); });
      $("#mapnext").addEventListener("click", () => { state.mapSeen = true; save(); render(); window.scrollTo({ top: 0, behavior: "smooth" }); });
    }
    requestAnimationFrame(drawLinks);
  }

  function drawLinks() {
    const map = $("#map");
    const svg = $("svg.links", map);
    if (!svg) return;
    if (window.innerWidth <= 720) { svg.innerHTML = ""; return; }
    const mr = map.getBoundingClientRect();
    const rect = (id) => { const el = map.querySelector(`[data-id="${id}"]`); if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.left - mr.left, y: b.top - mr.top, w: b.width, h: b.height, cx: b.left - mr.left + b.width / 2, bottom: b.bottom - mr.top, right: b.right - mr.left }; };
    let out = `<defs><marker id="arr" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto" markerUnits="userSpaceOnUse"><path class="head" d="M0,0 L9,4.5 L0,9 z"/></marker></defs>`;
    const bus = (srcIds, dstIds) => {
      const S = srcIds.map(rect).filter(Boolean), D = dstIds.map(rect).filter(Boolean);
      if (!S.length || !D.length) return;
      const y = (Math.max(...S.map((s) => s.bottom)) + Math.min(...D.map((d) => d.y))) / 2;
      const xs = [...S, ...D].map((r) => r.cx);
      const x1 = Math.min(...xs), x2 = Math.max(...xs);
      if (x2 - x1 > 1) out += `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}"/>`;
      S.forEach((s) => { out += `<line x1="${s.cx}" y1="${s.bottom}" x2="${s.cx}" y2="${y}"/>`; });
      D.forEach((d) => { out += `<line x1="${d.cx}" y1="${y}" x2="${d.cx}" y2="${d.y - 1}" marker-end="url(#arr)"/>`; });
    };
    bus(["revenue"], ["bizhub"]);
    bus(["bizhub"], ["taxes"]);
    const inc = lastResult ? lastResult.incomes : [];
    bus(inc.filter((i) => i.to === "hub").map((i) => i.id), ["hub"]);
    bus(["hub"], (lastResult ? lastResult.buckets : []).map((x) => x.id));
    const bh = rect("bizhub"), hb = rect("hub");
    if (bh && hb) {
      const y = bh.y + bh.h / 2, x1 = bh.right, x2 = hb.x - 2;
      out += `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}"/><path d="M${x2 - 9},${y - 6} L${x2},${y} L${x2 - 9},${y + 6}"/>`;
      out += `<text x="${x2 - 12}" y="${y - 10}" text-anchor="end">PAY YOURSELF</text>`;
    }
    svg.innerHTML = out;
  }

  // ---------------------------------------------------------
  //  EXPORT + COPY
  // ---------------------------------------------------------
  async function exportPng() {
    if (!window.html2canvas) return;
    const bg = getComputedStyle(document.body).getPropertyValue("--bg").trim() || "#ffffff";
    const card = $("#mapcard");
    card.classList.add("exporting");
    let canvas;
    try { canvas = await html2canvas(card, { backgroundColor: bg, scale: 2, useCORS: true, ignoreElements: (el) => el.id === "png" || el.id === "mapnav" }); }
    finally { card.classList.remove("exporting"); }
    const url = canvas.toDataURL("image/png");
    $("#shot").src = url; $("#dl").href = url; $("#overlay").hidden = false;
  }

  // ---------------------------------------------------------
  //  RENDER: show exactly one screen
  // ---------------------------------------------------------
  function render() {
    const s = screen();
    const panel = $("#panel"), mapcard = $("#mapcard"), results = $("#results");
    panel.hidden = !(s === "questions" || s === "bank" || s === "bizbank");
    panel.classList.toggle("bank", s === "bank" || s === "bizbank");
    mapcard.hidden = !(s === "map" || s === "final");
    results.hidden = s !== "final";
    if (s === "questions") renderQuestions(panel);
    else {
      const r = result();
      if (s === "map") renderMap(r, false);
      if (s === "bank" || s === "bizbank") renderBank(panel, r, s);
      if (s === "final") renderMap(r, true);
    }
    postHeight();
  }
  function postHeight() {
    try { if (window.parent !== window) window.parent.postMessage({ mapperHeight: document.documentElement.scrollHeight }, "*"); } catch (e) {}
  }

  document.addEventListener("DOMContentLoaded", () => {
    $("#png").addEventListener("click", exportPng);
    $("#restart").addEventListener("click", restart);
    $("#finalback").addEventListener("click", () => { if (result().runsBusiness) state.bizBank = ""; else state.bank = ""; save(); render(); });
    $("#close").addEventListener("click", () => ($("#overlay").hidden = true));
    $("#overlay").addEventListener("click", (e) => { if (e.target === e.currentTarget) $("#overlay").hidden = true; });
    new ResizeObserver(() => { drawLinks(); postHeight(); }).observe($("#map"));
    window.addEventListener("resize", drawLinks);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawLinks);
    initGate();
  });
})();
