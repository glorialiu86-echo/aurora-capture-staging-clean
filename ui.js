// ui.js (v18) — MUST export window.UI
(() => {
  // ---------- helpers ----------
  const $ = (id) => document.getElementById(id);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const round0 = (x) => Math.round(x);
  const abs = Math.abs;

  function safeText(el, t) { if (el) el.textContent = t; }
  function safeHTML(el, h) {
    // HTML injection is disallowed except for About/Footer (handled elsewhere).
    if (el) el.textContent = (h == null ? "" : String(h));
  }
  function _tKey(key){
    try{
      const i18n = window.I18N;
      if(i18n && typeof i18n.t === "function") return i18n.t(key);
    }catch(_){ /* ignore */ }
    return String(key || "");
  }

  function setStatusDots(items) {
    const box = $("statusDots");
    if (!box) return;
    while (box.firstChild) box.removeChild(box.firstChild);
    const list = Array.isArray(items) ? items : [];
    list.forEach(it => {
      const d = document.createElement("div");
      d.className = `dot ${it.level}`;
      const label = it.labelKey ? _tKey(it.labelKey) : "";
      const icon = it.iconKey ? _tKey(it.iconKey) : "";
      const txt = [label, icon].filter(Boolean).join(" ");
      d.textContent = txt;
      box.appendChild(d);
    });
  }
  function setStatusText(t) { safeText($("statusText"), t); }

  // ---------- cache ----------
  function cacheSet(key, value){
    try{ localStorage.setItem(key, JSON.stringify({ ts: Date.now(), value })); }catch(e){}
  }
  function cacheGet(key){
    try{
      const raw = localStorage.getItem(key);
      if(!raw) return null;
      return JSON.parse(raw);
    }catch(e){ return null; }
  }
  function fmtAge(ms){
    const m = Math.floor(ms/60000);
    if(m < 1) return i18n.t("UI_TIMEAGO_JUST_NOW");
    if(m < 60) return i18n.t("UI_TIMEAGO_MINUTES", { m });
    const h = Math.floor(m/60);
    return i18n.t("UI_TIMEAGO_HOURS", { h });
  }

  // ---------- status note (short, no details) ----------
  function statusNote(labelKey, state){
    // state: "ok" | "warn" | "bad"
    const iconKey = (state === "ok") ? "DOT_ICON_OK" : (state === "warn" ? "DOT_ICON_WARN" : "DOT_ICON_BAD");
    return { labelKey, iconKey };
  }

  // ---------- time fmt ----------
  function now(){ return new Date(); }
  function fmtYMD(d){
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const dd = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${dd}`;
  }
  function fmtHM(d){
    const hh = String(d.getHours()).padStart(2,'0');
    const mm = String(d.getMinutes()).padStart(2,'0');
    return `${hh}:${mm}`;
  }
  function fmtYMDHM(d){ return `${fmtYMD(d)} ${fmtHM(d)}`; }

  function escapeHTML(s){
    return String(s)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#39;");
  }

  // ---------- astro (SunCalc required) ----------
  function deg(rad){ return rad * 180 / Math.PI; }

  function getSunAltDeg(date, lat, lon){
    try{
      if(!window.SunCalc) return -999;
      const p = SunCalc.getPosition(date, lat, lon);
      return deg(p.altitude);
    }catch(e){ return -999; }
  }
  function getMoonAltDeg(date, lat, lon){
    try{
      if(!window.SunCalc) return -999;
      const p = SunCalc.getMoonPosition(date, lat, lon);
      return deg(p.altitude);
    }catch(e){ return -999; }
  }

  // 后台：可观测性门槛（不解释）
  function obsGate(date, lat, lon){
    const s = getSunAltDeg(date, lat, lon);
    // hardBlock: sky too bright for weak aurora (sun higher than -10°)
    // inWindow: the "best" observing window (sun <= -12°)
    return { hardBlock: s > -10, inWindow: s <= -12 };
  }

  // 月角软降权（不展示）
  function moonFactorByLat(lat, moonAltDeg){
    if(moonAltDeg <= 0) return 1.0;
    const L = abs(lat);
    const zone = (L >= 67) ? "high" : (L >= 62 ? "mid" : "edge");
    let tier = 0;
    if(moonAltDeg > 35) tier = 2;
    else if(moonAltDeg > 15) tier = 1;

    const table = {
      high: [1.00, 0.92, 0.82],
      mid:  [1.00, 0.88, 0.72],
      edge: [1.00, 0.80, 0.55],
    };
    return table[zone][tier];
  }
  function soften(f, ratio=0.6){
    return 1 - (1 - f) * ratio;
  }

  // ---------- language (CN default; EN only when toggled) ----------
  const LANG_KEY = "ac_lang";

  function getLang(){
    try{
      const v = localStorage.getItem(LANG_KEY);
      return (v === "en") ? "en" : "cn";
    }catch(e){
      return "cn";
    }
  }

  function setLang(lang){
    const v = (lang === "en") ? "en" : "cn";
    try{ localStorage.setItem(LANG_KEY, v); }catch(e){}
    applyLang(v);
  }

  function applyLang(lang){
    const i18n = window.I18N;
    if(!i18n || typeof i18n.setLang !== "function" || typeof i18n.t !== "function") return;

    i18n.setLang(lang === "en" ? "en" : "zh");

    // 1) Header language toggle (CN|EN)
    const lt = $("langToggle");
    if(lt){
      const opts = Array.from(lt.querySelectorAll(".langOpt"));
      opts.forEach(b => b.classList.toggle("active", (b.dataset.lang || "cn") === lang));
    }

    // 2) Render brand title (single span; text only)
    const brandMain = document.querySelector(".brandTitle .brandMain");
    if(brandMain){
      brandMain.textContent = i18n.t("HDR_TITLE_BRAND");
    }

    // 3) Static UI texts (data-i18n driven)
    const renderBoldLine = (el, text) => {
      const b = el.querySelector("b");
      if(!b){
        el.textContent = text;
        return;
      }
      const i1 = text.indexOf("：");
      const i2 = text.indexOf(":");
      let idx = -1;
      if(i1 === -1 && i2 === -1) idx = -1;
      else if(i1 === -1) idx = i2;
      else if(i2 === -1) idx = i1;
      else idx = Math.min(i1, i2);

      const left = (idx >= 0) ? text.slice(0, idx) : text;
      const right = (idx >= 0) ? text.slice(idx) : "";
      b.textContent = left;

      const toRemove = [];
      el.childNodes.forEach((n) => { if(n !== b) toRemove.push(n); });
      toRemove.forEach((n) => n.remove());
      if(right) el.appendChild(document.createTextNode(right));
    };

    const renderNode = (el) => {
      const key = el.getAttribute("data-i18n");
      const attr = el.getAttribute("data-i18n-attr");
      const attrKey = el.getAttribute("data-i18n-attr-key");

      if(attr && attrKey){
        el.setAttribute(attr, i18n.t(attrKey));
        if(!key) return;
        if(attrKey === key && (el.childElementCount > 0 || el.tagName === "META" || el.tagName === "IMG" || el.tagName === "INPUT")){
          return;
        }
      }
      if(!key) return;
      if(key === "HDR_TITLE_BRAND") return;
      if(key === "T1_SW_CLOUD_LINE"){
        const dash = i18n.t("UI_PLACEHOLDER_DASH");
        el.textContent = i18n.t(key, { l: dash, m: dash, h: dash });
        return;
      }
      if(key === "T1_SW_MOON_LINE"){
        const dash = i18n.t("UI_PLACEHOLDER_DASH");
        el.textContent = i18n.t(key, { deg: dash });
        return;
      }

      const text = i18n.t(key);
      if(attr){
        el.setAttribute(attr, text);
        if(el.tagName === "META" || el.tagName === "IMG" || el.tagName === "INPUT") return;
        if(el.childElementCount > 0) return;
      }
      if(el.tagName === "LI" && el.querySelector("b")){
        renderBoldLine(el, text);
        return;
      }
      el.textContent = text;
    };

    document.querySelectorAll("[data-i18n], [data-i18n-attr-key]").forEach(renderNode);

    // 4) About / footer (HTML only for these two keys)
    const aboutCN = $("aboutBodyCN");
    const aboutEN = $("aboutBodyEN");
    // Only HTML injection allowed here: UI_ABOUT_BODY / UI_FOOTER_BLOCK
    if(aboutCN){
      aboutCN.innerHTML = i18n.th("UI_ABOUT_BODY");
      aboutCN.classList.remove("hidden");
    }
    if(aboutEN){
      aboutEN.textContent = "";
      aboutEN.classList.add("hidden");
    }
    const footer = $("footerBlock") || document.querySelector(".foot");
    if(footer){
      footer.innerHTML = i18n.th("UI_FOOTER_BLOCK");
    }

    // 5) Keep legacy explain-card toggles (structure unchanged)
    const toggleExplainPair = (enId) => {
      const enCard = $(enId);
      if(!enCard) return;
      const cnCard = enCard.previousElementSibling;
      if(cnCard && cnCard.classList && cnCard.classList.contains("explain")){
        cnCard.classList.toggle("hidden", lang === "en");
      }
      enCard.classList.toggle("hidden", lang !== "en");
    };

    toggleExplainPair("oneExplainEN");
    toggleExplainPair("threeExplainEN");
    toggleExplainPair("outlookExplainEN");

    // NOTE: Dynamic outputs (conclusion text, reasons, etc.) are handled by app.js based on UI.getLang().
  }

  function initLangToggle(){
    const lt = $("langToggle");
    if(!lt) return;

    // init from cache
    applyLang(getLang());

    const opts = Array.from(lt.querySelectorAll(".langOpt"));
    opts.forEach(b => {
      b.addEventListener("click", () => {
        const v = (b.dataset.lang === "en") ? "en" : "cn";
        setLang(v);
      });
    });
  }

  // ---------- UI bits: tabs / modal / alert ----------
  function initTabs(){
    const tabs = Array.from(document.querySelectorAll(".tab"));
    const panes = Array.from(document.querySelectorAll(".pane"));
    if(!tabs.length || !panes.length) return;

    const activate = (tabId) => {
      tabs.forEach(b => b.classList.toggle("active", b.dataset.tab === tabId));
      panes.forEach(p => p.classList.toggle("active", p.id === tabId));
    };

    tabs.forEach(b => {
      b.addEventListener("click", () => activate(b.dataset.tab));
    });
  }

  function initAbout(){
    const modal = $("aboutModal");
    const btn = $("btnAbout");
    const close = $("btnAboutClose");

    if(!modal || !btn) return;

    const open = () => {
      // ensure About title/body matches current language
      applyLang(getLang());
      modal.classList.remove("hidden");
      modal.setAttribute("aria-hidden", "false");
    };

    const hide = () => {
      modal.classList.add("hidden");
      modal.setAttribute("aria-hidden", "true");
      try{ btn.focus?.(); }catch(e){}
    };

    btn.addEventListener("click", open);
    close?.addEventListener("click", hide);

    modal.addEventListener("click", (e) => {
      const t = e.target;
      if(t && t.getAttribute && t.getAttribute("data-close") === "1") hide();
    });

    document.addEventListener("keydown", (e) => {
      if(e.key === "Escape") hide();
    });
  }

  function showAlertModalText(text){
    const overlay = $("alertOverlay");
    const body = $("alertBody");
    const btnX = $("alertClose");
    const btnOk = $("alertOk");
    if(!overlay || !body) return;

    safeText(body, text);

    overlay.classList.remove("hidden");
    overlay.setAttribute("aria-hidden", "false");

    const hide = () => {
      overlay.classList.add("hidden");
      overlay.setAttribute("aria-hidden", "true");
    };
    btnX?.addEventListener("click", hide, { once:true });
    btnOk?.addEventListener("click", hide, { once:true });
  }

  // ---------- chart ----------
  let _chart = null;
  function renderChart(labels, vals, cols){
    const canvas = $("cChart");
    if(!canvas || !window.Chart) return;

    const ctx = canvas.getContext("2d");
    if(!ctx) return;

    // rebuild each time (simple + stable)
    if(_chart){
      try{ _chart.destroy(); }catch(e){}
      _chart = null;
    }

    _chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          data: vals,
          backgroundColor: cols,
          borderWidth: 0,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            grid: { display:false },
            ticks: {
              // Make time labels more visible (important for decision-making)
              color: "rgba(255,255,255,0.78)",
              font: { size: 12, weight: "600" },
              padding: 10,
              maxRotation: 0,
              minRotation: 0,
            }
          },
          y: {
            min: 0,
            max: 5,
            ticks: {
              stepSize: 1,
              color: "rgba(255,255,255,0.55)",
              font: { size: 11, weight: "500" },
              padding: 6,
            },
            grid: { display:false }
          }
        }
      }
    });
  }

  function badgeHTML(text, cls){
    const safe = escapeHTML(text);
    return `<span class="badge ${cls}">${safe}</span>`;
  }

  // ---------- data fetch ----------
  async function fetchKp(){
    try{
      if(!window.DataProvider || typeof window.DataProvider.fetchKpRaw !== "function"){
        throw new Error("DataProvider.fetchKpRaw unavailable");
      }
      const j = await window.DataProvider.fetchKpRaw();
      cacheSet("cache_kp", j);
      return { ok:true, note: statusNote("DOT_LABEL_KP", "ok"), data:j };
    }catch(e){
      const c = cacheGet("cache_kp");
      if(c?.value){
        // cache fallback: still usable, but warn
        return { ok:true, note: statusNote("DOT_LABEL_KP", "warn"), data:c.value };
      }
      return { ok:false, note: statusNote("DOT_LABEL_KP", "bad"), data:null };
    }
  }

  async function fetchOvation(){
    try{
      if(!window.DataProvider || typeof window.DataProvider.fetchOvationRaw !== "function"){
        throw new Error("DataProvider.fetchOvationRaw unavailable");
      }
      const j = await window.DataProvider.fetchOvationRaw();
      cacheSet("cache_ovation", j);
      return { ok:true, note: statusNote("DOT_LABEL_OVATION", "ok"), data:j };
    }catch(e){
      const c = cacheGet("cache_ovation");
      if(c?.value){
        return { ok:true, note: statusNote("DOT_LABEL_OVATION", "warn"), data:c.value };
      }
      return { ok:false, note: statusNote("DOT_LABEL_OVATION", "bad"), data:null };
    }
  }

  async function fetchClouds(lat, lon){
    const k = `cache_clouds_${Number(lat).toFixed(2)}_${Number(lon).toFixed(2)}`;
    try{
      if(!window.DataProvider || typeof window.DataProvider.fetchCloudsRaw !== "function"){
        throw new Error("DataProvider.fetchCloudsRaw unavailable");
      }
      const j = await window.DataProvider.fetchCloudsRaw(lat, lon);
      cacheSet(k, { lat, lon, j });
      return { ok:true, note: statusNote("DOT_LABEL_CLOUDS", "ok"), data:j };
    }catch(e){
      const c = cacheGet(k);
      if(c?.value?.j){
        return { ok:true, note: statusNote("DOT_LABEL_CLOUDS", "warn"), data:c.value.j };
      }
      return { ok:false, note: statusNote("DOT_LABEL_CLOUDS", "bad"), data:null };
    }
  }

  // ---------- expose ----------
  window.UI = {
    $,
    clamp,
    round0,
    abs,
    safeText,
    safeHTML,
    setStatusDots,
    setStatusText,
    cacheSet,
    cacheGet,
    fmtAge,
    now,
    fmtYMD,
    fmtHM,
    fmtYMDHM,
    escapeHTML,

    // chart / badges
    renderChart,
    badgeHTML,

    // astro helpers used by app.js
    getSunAltDeg,
    getMoonAltDeg,
    obsGate,
    moonFactorByLat,
    soften,

    // ui controls
    initTabs,
    initAbout,
    showAlertModalText,
    // language
    getLang,
    setLang,
    applyLang,
    initLangToggle,
  };

  // Deprecated compatibility entry: keep window.Data.* API unchanged for app.js callers.
  // Actual request entrances are centralized in window.DataProvider.
  window.Data = window.Data || {};
  Object.assign(window.Data, { fetchKp, fetchClouds, fetchOvation });
})();
