(() => {
  
// ---------- helpers ----------
  const $ = (id) => document.getElementById(id);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const round0 = (x) => Math.round(x);
  const abs = Math.abs;

  function safeText(el, t) { if (el) el.textContent = t; }
  function safeHTML(el, h) { if (el) el.innerHTML = h; }

  function setStatusDots(items) {
    const box = $("statusDots");
    if (!box) return;
    box.innerHTML = "";
    items.forEach(it => {
      const d = document.createElement("div");
      d.className = `dot ${it.level}`;
      d.textContent = it.text;
      box.appendChild(d);
    });
  }
  function setStatusText(t) { safeText($("statusText"), t); }

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
    if(m < 1) return "刚刚";
    if(m < 60) return `${m} 分钟前`;
    const h = Math.floor(m/60);
    return `${h} 小时前`;
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
      .replaceAll(">","&gt;");
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
    return { hardBlock: s > 0, inWindow: s <= -12 };
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

  // ---------- NOAA fetch helpers ----------
  function lastFinite(rows, key){
    for(let i = rows.length - 1; i >= 0; i--){
      const v = Number(rows[i]?.[key]);
      if(Number.isFinite(v)) return v;
    }
    return null;
  }
  function lastTimeTag(rows){
    for(let i = rows.length - 1; i >= 0; i--){
      const t = rows[i]?.time_tag;
      if(t) return t;
    }
    return null;
  }

  // ---------- data fetch ----------

  async function fetchKp(){
    const url = "https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json";
    try{
      const r = await fetch(url, { cache:"no-store" });
      const t = await r.text();
      if(!t) throw new Error("empty");
      const j = JSON.parse(t);
      cacheSet("cache_kp", j);
      return { ok:true, note:"✅ Kp 已更新", data:j };
    }catch(e){
      const c = cacheGet("cache_kp");
      if(c?.value){
        return { ok:true, note:`⚠️ Kp 拉取失败，使用缓存（${fmtAge(Date.now() - (c.ts || Date.now()))}）`, data:c.value };
      }
      return { ok:false, note:"❌ Kp 拉取失败且无缓存", data:null };
    }
  }

  async function fetchOvation(){
    const url = "https://services.swpc.noaa.gov/json/ovation_aurora_latest.json";
    try{
      const r = await fetch(url, { cache:"no-store" });
      const t = await r.text();
      if(!t) throw new Error("empty");
      const j = JSON.parse(t);
      cacheSet("cache_ovation", j);
      return { ok:true, note:"✅ OVATION 已更新", data:j };
    }catch(e){
      const c = cacheGet("cache_ovation");
      if(c?.value){
        return { ok:true, note:`⚠️ OVATION 拉取失败，使用缓存（${fmtAge(Date.now() - (c.ts || Date.now()))}）`, data:c.value };
      }
      return { ok:false, note:"❌ OVATION 拉取失败且无缓存", data:null };
    }
  }

  async function fetchClouds(lat, lon){
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&hourly=cloudcover_low,cloudcover_mid,cloudcover_high&forecast_days=3&timezone=auto`;
    try{
      const r = await fetch(url, { cache:"no-store" });
      const t = await r.text();
      if(!t) throw new Error("empty");
      const j = JSON.parse(t);
      cacheSet("cache_clouds", { lat, lon, j });
      return { ok:true, note:"✅ 云量已更新", data:j };
    }catch(e){
      const c = cacheGet("cache_clouds");
      if(c?.value?.j){
        return { ok:true, note:`⚠️ 云量拉取失败，使用缓存（${fmtAge(Date.now() - (c.ts || Date.now()))}）`, data:c.value.j };
      }
      return { ok:false, note:"❌ 云量拉取失败且无缓存", data:null };
    }
  }

// ---------- expose data fetchers for app.js (window.Data.*) ----------
window.Data = window.Data || {};
Object.assign(window.Data, { fetchKp, fetchClouds, fetchOvation });
  
})();
