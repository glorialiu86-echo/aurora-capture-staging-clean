/* Aurora Capture 极光捕网 v2.4
 * 重点：UI/手机适配/1h柱状图/72h依据分列
 * 逻辑：沿用“1h给行动建议；3h给系统状态 + 本地建议=1h当前建议；72h按天范围”
 */

const $ = (id) => document.getElementById(id);

const els = {
  lat: $('lat'),
  lon: $('lon'),
  runBtn: $('runBtn'),
  magBtn: $('magBtn'),
  statusLine: $('statusLine'),
  statusText: $('statusText'),

  // tabs
  tabs: Array.from(document.querySelectorAll('.tab')),
  panels: {
    t1: $('t1'),
    t3: $('t3'),
    t72: $('t72'),
  },

  // 1h
  c1_now: $('c1_now'),
  c1_meta: $('c1_meta'),
  sw_now: $('sw_now'),
  sw_meta: $('sw_meta'),
  cChart: $('cChart'),
  c1_chip: $('c1_chip'),
  chartPick: $('chartPick'),

  // 3h
  s3_state: $('s3_state'),
  s3_meta: $('s3_meta'),
  s3_local: $('s3_local'),
  p2_now: $('p2_now'),
  p2_meta: $('p2_meta'),
  cloud3: $('cloud3'),
  cloud3_meta: $('cloud3_meta'),

  // 72h
  tbl72Body: $('tbl72Body'),
  list72: $('list72'),
};

function setStatus(msg, level='idle'){
  const dot = els.statusLine.querySelector('.dot');
  dot.className = 'dot ' + level;
  els.statusText.textContent = msg;
}

function clamp(x, a, b){ return Math.max(a, Math.min(b, x)); }
function fmt1(x){ return (x===null||x===undefined||Number.isNaN(x)) ? '—' : (+x).toFixed(1); }
function fmt0(x){ return (x===null||x===undefined||Number.isNaN(x)) ? '—' : Math.round(+x).toString(); }
function fmtTime(d){
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  const hh = String(d.getHours()).padStart(2,'0');
  const mm = String(d.getMinutes()).padStart(2,'0');
  return `${y}-${m}-${day} ${hh}:${mm}`;
}
function fmtDate(d){
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}

function cacheSet(key, val){
  localStorage.setItem(key, JSON.stringify({ts: Date.now(), val}));
}
function cacheGet(key){
  try{
    const o = JSON.parse(localStorage.getItem(key) || 'null');
    if(!o) return null;
    return {ts:o.ts, val:o.val};
  }catch(e){ return null; }
}
function fmtAge(ms){
  const m = Math.round(ms/60000);
  if(m<=1) return '刚刚';
  if(m<60) return `${m} 分钟前`;
  const h = Math.round(m/60);
  return `${h} 小时前`;
}

/* -----------------------------
   Tabs
------------------------------ */
els.tabs.forEach(btn=>{
  btn.addEventListener('click', ()=>{
    els.tabs.forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const t = btn.dataset.tab;
    Object.values(els.panels).forEach(p=>p.classList.remove('active'));
    els.panels[t].classList.add('active');
  });
});

/* -----------------------------
   Data fetchers (with fallback)
------------------------------ */

/** NOAA SWPC solar-wind JSON (2-hour products) */
async function fetchSWPC2h(){
  const magUrl = 'https://services.swpc.noaa.gov/products/solar-wind/mag-2-hour.json';
  const plasmaUrl = 'https://services.swpc.noaa.gov/products/solar-wind/plasma-2-hour.json';

  let mag, plasma;
  const notes = [];
  try{
    const [resMag, resPlasma] = await Promise.all([
      fetch(magUrl, {cache:'no-store'}),
      fetch(plasmaUrl, {cache:'no-store'})
    ]);
    const [textMag, textPlasma] = await Promise.all([resMag.text(), resPlasma.text()]);
    if(!textMag || !textPlasma) throw new Error('empty');

    mag = JSON.parse(textMag);
    plasma = JSON.parse(textPlasma);

    cacheSet('cache_noaa_mag', mag);
    cacheSet('cache_noaa_plasma', plasma);
    notes.push('✅ NOAA 数据已更新');
  }catch(e){
    const cMag = cacheGet('cache_noaa_mag');
    const cPlasma = cacheGet('cache_noaa_plasma');
    if(cMag && cPlasma){
      mag = cMag.val;
      plasma = cPlasma.val;
      const age = fmtAge(Date.now() - cMag.ts);
      notes.push(`⚠️ NOAA 暂时不可用，已使用此前数据（${age}）`);
    }else{
      notes.push('⚠️ NOAA 暂时不可用，且无历史缓存');
      return {ok:false, notes, mag:null, plasma:null};
    }
  }
  return {ok:true, notes, mag, plasma};
}

/** Kp forecast (try json, fallback cache) */
async function fetchKpForecast(){
  const url = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json';
  const notes = [];
  let data = null;
  try{
    const r = await fetch(url, {cache:'no-store'});
    const t = await r.text();
    if(!t) throw new Error('empty');
    data = JSON.parse(t);
    cacheSet('cache_kp', data);
    notes.push('✅ Kp 预报已更新');
  }catch(e){
    const c = cacheGet('cache_kp');
    if(c){
      data = c.val;
      const age = fmtAge(Date.now() - c.ts);
      notes.push(`⚠️ Kp 预报暂时不可用，已使用此前数据（${age}）`);
    }else{
      notes.push('⚠️ Kp 预报暂时不可用，且无历史缓存');
    }
  }
  return {data, notes};
}

/** Ovation nowcast (optional) */
async function fetchOvation(){
  const url = 'https://services.swpc.noaa.gov/json/ovation_aurora_latest.json';
  const notes = [];
  let data = null;
  try{
    const r = await fetch(url, {cache:'no-store'});
    const t = await r.text();
    if(!t) throw new Error('empty');
    data = JSON.parse(t);
    cacheSet('cache_ovation', data);
    notes.push('✅ OVATION 已更新');
  }catch(e){
    const c = cacheGet('cache_ovation');
    if(c){
      data = c.val;
      const age = fmtAge(Date.now() - c.ts);
      notes.push(`⚠️ OVATION 暂时不可用，已使用此前数据（${age}）`);
    }else{
      notes.push('⚠️ OVATION 暂时不可用（不影响主结论）');
    }
  }
  return {data, notes};
}

/** Open-Meteo cloud low/mid/high */
async function fetchCloud(lat, lon){
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&hourly=cloud_cover_low,cloud_cover_mid,cloud_cover_high&forecast_days=3&timezone=auto`;
  const notes = [];
  let data = null;
  try{
    const r = await fetch(url, {cache:'no-store'});
    const t = await r.text();
    if(!t) throw new Error('empty');
    data = JSON.parse(t);
    cacheSet('cache_cloud', data);
    notes.push('✅ 云量预报已更新');
  }catch(e){
    const c = cacheGet('cache_cloud');
    if(c){
      data = c.val;
      const age = fmtAge(Date.now() - c.ts);
      notes.push(`⚠️ 云量暂时不可用，已使用此前数据（${age}）`);
    }else{
      notes.push('⚠️ 云量暂时不可用（将按未知处理）');
    }
  }
  return {data, notes};
}

/* -----------------------------
   Helpers: NOAA parsing
------------------------------ */
function lastRowAsObj(arr){
  // arr: [header, ...rows]
  if(!Array.isArray(arr) || arr.length < 2) return null;
  const header = arr[0];
  const row = arr[arr.length-1];
  const o = {};
  header.forEach((k,i)=>{ o[k]=row[i]; });
  return o;
}

function parseSolarWind(mag, plasma){
  // pick last rows
  const m = lastRowAsObj(mag);
  const p = lastRowAsObj(plasma);
  if(!m || !p) return null;

  // NOAA keys usually: time_tag, bt, bz_gsm, etc; plasma: speed, density
  const time = m.time_tag || p.time_tag || null;
  const Bt = toNum(m.bt);
  const Bz = toNum(m.bz_gsm) ?? toNum(m.bz_gsm_1) ?? toNum(m.bz) ?? null;
  const V  = toNum(p.speed);
  const N  = toNum(p.density);

  return {time, Bt, Bz, V, N};
}
function toNum(x){
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

/* -----------------------------
   Hidden observability gate
   (计算但不在前台解释)
------------------------------ */
// solar altitude computation (approx, no deps)
function solarAltitudeDeg(date, latDeg, lonDeg){
  // Based on simplified NOAA solar position
  const rad = Math.PI/180;
  const lat = latDeg*rad;
  const lon = lonDeg*rad;

  const jd = (date.getTime()/86400000) + 2440587.5;
  const n = jd - 2451545.0;

  const L = (280.460 + 0.9856474*n) % 360;
  const g = (357.528 + 0.9856003*n) % 360;
  const lambda = (L + 1.915*Math.sin(g*rad) + 0.020*Math.sin(2*g*rad)) * rad;
  const eps = (23.439 - 0.0000004*n) * rad;

  const alpha = Math.atan2(Math.cos(eps)*Math.sin(lambda), Math.cos(lambda));
  const delta = Math.asin(Math.sin(eps)*Math.sin(lambda));

  // GMST
  const J2000 = jd - 2451545.0;
  const GMST = (280.46061837 + 360.98564736629*J2000) % 360;
  const lst = (GMST*rad + lon);

  const H = (lst - alpha); // hour angle
  const alt = Math.asin(Math.sin(lat)*Math.sin(delta) + Math.cos(lat)*Math.cos(delta)*Math.cos(H));
  return alt / rad;
}

/* -----------------------------
   Scoring & mapping
------------------------------ */

const LABEL5 = ["不可观测","低概率","可蹲守","值得出门","强烈推荐"];

function labelColorClass(label){
  if(label==="强烈推荐" || label==="值得出门") return "good";
  if(label==="可蹲守") return "warn";
  if(label==="低概率") return "neu";
  return "bad";
}

function scoreToLabel5(c){
  // c: 0..10
  if(c <= 0.8) return "不可观测";
  if(c < 3.5) return "低概率";
  if(c < 5.5) return "可蹲守";
  if(c < 7.5) return "值得出门";
  return "强烈推荐";
}

// core C-value scoring (you can tune weights later)
function computeCValue(sw){
  // sw: {V,Bt,Bz,N}
  // Normalize each term 0..1 then weighted sum -> 0..10
  const V = sw.V ?? 0;
  const Bt = sw.Bt ?? 0;
  const Bz = sw.Bz ?? 0;
  const N = sw.N ?? 0;

  // V: 380..650
  const vN = clamp((V - 380) / (650 - 380), 0, 1);

  // Bt: 4..14
  const btN = clamp((Bt - 4) / (14 - 4), 0, 1);

  // Bz: want negative. -1..-10
  const bzN = clamp(((-Bz) - 1) / (10 - 1), 0, 1);

  // N: 1..8  (稍微放宽)
  const nN = clamp((N - 1) / (8 - 1), 0, 1);

  // weights
  const wV = 0.24, wBt = 0.26, wBz = 0.30, wN = 0.20;

  const base = (vN*wV + btN*wBt + bzN*wBz + nN*wN);
  return base * 10;
}

// soft/hidden gate: if sun altitude > 0 => force low; if > -12 => downweight
function applyHiddenVisibilityGate(c, date, lat, lon){
  const alt = solarAltitudeDeg(date, lat, lon);
  if(alt > 0) return 0.0;
  if(alt > -12){
    const k = clamp(((-alt) / 12), 0, 1); // alt=-12 =>1, alt=0=>0
    return c * (0.35 + 0.65*k);
  }
  return c;
}

// latitude hard gate (geographic as simple baseline)
function latGate(lat){
  if(lat < 20) return 0.0;
  if(lat < 35) return 0.45;
  if(lat < 45) return 0.70;
  if(lat < 50) return 0.85;
  return 1.0;
}

/* -----------------------------
   3h state machine (system state)
------------------------------ */
function computeState3h(sw){
  const V = sw.V ?? 0, Bt = sw.Bt ?? 0, Bz = sw.Bz ?? 0, N = sw.N ?? 0;

  // simplified conditions
  const condTrigger = (Bz <= -2.5) && (Bt >= 6.5);
  const condDelivery = (V >= 450) + (Bt >= 7) + (N >= 2.5); // 0..3
  const strong = (Bz <= -5) && (Bt >= 7) && (V >= 470);

  if(strong && condDelivery>=2) return {state:"爆发进行中", meta:`触发更明确｜送达能力 ${condDelivery}/3`};
  if(condTrigger && condDelivery>=2) return {state:"爆发概率上升", meta:`触发成立｜送达能力 ${condDelivery}/3`};
  if(!condTrigger && condDelivery>=2) return {state:"爆发概率上升", meta:`背景增强｜送达能力 ${condDelivery}/3`};
  return {state:"静默", meta:`背景不足｜送达能力 ${condDelivery}/3`};
}

function p2Summary(sw){
  const V = sw.V ?? 0, Bt = sw.Bt ?? 0, N = sw.N ?? 0;
  const okBt = Bt >= 6.8;
  const okV  = V  >= 450;
  const okN  = N  >= 2.5;
  const pass = (okBt?1:0)+(okV?1:0)+(okN?1:0);
  return {
    txt: `${pass}/3 成立`,
    meta: `Bt平台${okBt?'✅':'⚠️'}｜速度背景${okV?'✅':'⚠️'}｜密度结构${okN?'✅':'⚠️'}`,
    pass
  };
}

/* -----------------------------
   Cloud helpers
------------------------------ */
function cloud3hSummary(cloudData){
  if(!cloudData?.hourly?.time) return {low:null, mid:null, high:null, bestText:"云量未知"};
  const t = cloudData.hourly.time.map(x=>new Date(x));
  const now = new Date();
  const idx = t.findIndex(d=>d>=now);
  const pick = [];
  for(let i=0;i<3;i++){
    const j = idx+i;
    if(j>=0 && j<t.length) pick.push(j);
  }
  const lowArr = cloudData.hourly.cloud_cover_low || [];
  const midArr = cloudData.hourly.cloud_cover_mid || [];
  const highArr= cloudData.hourly.cloud_cover_high|| [];
  const low = avg(pick.map(i=>lowArr[i]).filter(n=>Number.isFinite(n)));
  const mid = avg(pick.map(i=>midArr[i]).filter(n=>Number.isFinite(n)));
  const high= avg(pick.map(i=>highArr[i]).filter(n=>Number.isFinite(n)));
  return {low, mid, high, bestText:"更佳参考：中云 ≤ 50%（越低越好），高云 ≤ 80%（薄幕可接受）"};
}
function avg(a){
  if(!a.length) return null;
  return a.reduce((s,x)=>s+x,0)/a.length;
}

/* -----------------------------
   72h daily build
------------------------------ */
function build72Rows(kpData, cloudData, swNow){
  // We'll output 3 days (today + next 2)
  const now = new Date();
  const days = [0,1,2].map(d=>{
    const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate()+d, 12, 0, 0);
    return dt;
  });

  // KP daily peak from forecast json if possible
  const kpDailyPeak = estimateDailyKpPeaks(kpData, days);

  // cloud daily best window (min mid/high/low as simple)
  const cloudDaily = estimateDailyCloud(cloudData, days);

  // P1 model: placeholder human analysis (for now, driven by kp peak level)
  // (You can later replace with CH/CME logic)
  return days.map((d, i)=>{
    const kpPeak = kpDailyPeak[i] ?? null;
    const cl = cloudDaily[i] || {low:null, mid:null, high:null};

    // P2: from current solar wind background (not future) as coarse range hint
    const p2 = p2Summary(swNow);

    // conclusion from kp + p2 + cloud
    let score = 0;
    if(kpPeak!==null){
      score += clamp((kpPeak-3)/4, 0, 1)*0.55;
    }
    score += clamp((p2.pass)/3, 0, 1)*0.30;

    const cloudOK = cloudScore(cl.low, cl.mid, cl.high);
    score += cloudOK*0.15;

    const label = score>=0.72 ? "可能性高" : score>=0.52 ? "有窗口" : score>=0.35 ? "小概率" : "低可能";

    const p1Text = (kpPeak===null)
      ? "背景未知：未获取到Kp峰值（已尽量使用缓存）"
      : `能量背景参考：Kp 峰值约 ${kpPeak.toFixed(1)}（越高越有戏）`;

    const p2Text = `当前送达能力：${p2.txt}（${p2.meta}）`;

    const cloudText = (cl.low===null)
      ? "云量：未知"
      : `云量参考：Low≈${fmt0(cl.low)}% Mid≈${fmt0(cl.mid)}% High≈${fmt0(cl.high)}%（越低越好）`;

    const kpText = (kpPeak===null) ? "Kp：未知" : `Kp：峰值≈${kpPeak.toFixed(1)}`;

    return {
      date: fmtDate(d),
      label,
      p1: p1Text,
      p2: p2Text,
      cloudkp: `${kpText}｜${cloudText}`,
      cloud: cl,
      kpPeak
    };
  });
}

function cloudScore(low, mid, high){
  if(low===null||mid===null||high===null) return 0.5; // unknown
  // want low low, mid <=50, high <=80
  const sLow = 1 - clamp(low/35, 0, 1);
  const sMid = 1 - clamp(mid/75, 0, 1);
  const sHigh= 1 - clamp(high/95,0,1);
  return (sLow*0.4 + sMid*0.35 + sHigh*0.25);
}

function estimateDailyCloud(cloudData, days){
  if(!cloudData?.hourly?.time) return days.map(()=>({low:null,mid:null,high:null}));
  const t = cloudData.hourly.time.map(x=>new Date(x));
  const lowArr = cloudData.hourly.cloud_cover_low || [];
  const midArr = cloudData.hourly.cloud_cover_mid || [];
  const highArr= cloudData.hourly.cloud_cover_high|| [];

  return days.map(day=>{
    // select hours of that local day (rough)
    const y=day.getFullYear(), m=day.getMonth(), d=day.getDate();
    const idxs = [];
    for(let i=0;i<t.length;i++){
      const ti=t[i];
      if(ti.getFullYear()===y && ti.getMonth()===m && ti.getDate()===d) idxs.push(i);
    }
    // take best (minimum mid+low) as “window”
    let best = null;
    idxs.forEach(i=>{
      const low=lowArr[i], mid=midArr[i], high=highArr[i];
      if(!Number.isFinite(low)||!Number.isFinite(mid)||!Number.isFinite(high)) return;
      const v = low*0.6 + mid*0.3 + high*0.1;
      if(best===null || v<best.v){
        best = {v, low, mid, high, t:t[i]};
      }
    });
    return best ? {low:best.low, mid:best.mid, high:best.high, t:best.t} : {low:null, mid:null, high:null};
  });
}

function estimateDailyKpPeaks(kpData, days){
  // kpData: NOAA forecast json, usually array with header row
  if(!Array.isArray(kpData) || kpData.length<2) return days.map(()=>null);
  const header = kpData[0];
  const rows = kpData.slice(1).map(r=>{
    const o={};
    header.forEach((k,i)=>o[k]=r[i]);
    return o;
  });
  // keys often include "time_tag" and "kp"
  const parsed = rows.map(o=>{
    const dt = new Date(o.time_tag || o.time || o.Time || o.date || '');
    const kp = Number(o.kp || o.Kp || o['Kp index'] || o['kp_index']);
    return {dt, kp: Number.isFinite(kp)?kp:null};
  }).filter(x=>x.dt.toString()!=='Invalid Date' && x.kp!==null);

  return days.map(day=>{
    const y=day.getFullYear(), m=day.getMonth(), d=day.getDate();
    let peak = null;
    parsed.forEach(p=>{
      const dt=p.dt;
      if(dt.getFullYear()===y && dt.getMonth()===m && dt.getDate()===d){
        if(peak===null || p.kp>peak) peak=p.kp;
      }
    });
    return peak;
  });
}

/* -----------------------------
   Chart
------------------------------ */
function drawBarChart(canvas, points, pickIndex=0){
  // points: [{t:Date, c:number, label:string}]
  const ctx = canvas.getContext('2d');
  const w = canvas.width = canvas.clientWidth * devicePixelRatio;
  const h = canvas.height = canvas.getAttribute('height') * devicePixelRatio;
  ctx.clearRect(0,0,w,h);

  const pad = 14*devicePixelRatio;
  const left = pad, right = pad, top = pad, bottom = pad + 18*devicePixelRatio;
  const innerW = w - left - right;
  const innerH = h - top - bottom;

  // grid
  ctx.globalAlpha = 1;
  ctx.lineWidth = 1*devicePixelRatio;
  ctx.strokeStyle = 'rgba(39,52,90,.55)';
  for(let i=0;i<=5;i++){
    const y = top + innerH*(i/5);
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(left+innerW, y);
    ctx.stroke();
  }

  // bars
  const n = points.length;
  const gap = 6*devicePixelRatio;
  const bw = (innerW - gap*(n-1)) / n;

  // helper to color by label
  function barColor(label){
    if(label==="强烈推荐" || label==="值得出门") return 'rgba(66,211,146,.85)';
    if(label==="可蹲守") return 'rgba(255,209,102,.85)';
    if(label==="低概率") return 'rgba(125,139,180,.85)';
    return 'rgba(255,92,122,.85)';
  }

  points.forEach((p,i)=>{
    const x = left + i*(bw+gap);
    const c = clamp(p.c, 0, 10);
    const barH = innerH * (c/10);
    const y = top + innerH - barH;

    // bar
    ctx.fillStyle = barColor(p.label);
    ctx.fillRect(x, y, bw, barH);

    // highlight
    if(i===pickIndex){
      ctx.strokeStyle = 'rgba(91,124,250,.95)';
      ctx.lineWidth = 2*devicePixelRatio;
      ctx.strokeRect(x-1*devicePixelRatio, y-1*devicePixelRatio, bw+2*devicePixelRatio, barH+2*devicePixelRatio);
    }
  });

  // x labels (every other to avoid crowd)
  ctx.fillStyle = 'rgba(167,179,214,.9)';
  ctx.font = `${11*devicePixelRatio}px ui-sans-serif, system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  points.forEach((p,i)=>{
    if(n>8 && i%2===1) return;
    const x = left + i*(bw+gap) + bw/2;
    const s = `${String(p.t.getHours()).padStart(2,'0')}:${String(p.t.getMinutes()).padStart(2,'0')}`;
    ctx.fillText(s, x, top + innerH + 6*devicePixelRatio);
  });
}

function bindChartClick(canvas, points, onPick){
  canvas.onclick = (e)=>{
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const n = points.length;
    const gap = 6;
    const bw = (rect.width - gap*(n-1)) / n;
    const idx = Math.floor(x / (bw+gap));
    const pick = clamp(idx, 0, n-1);
    onPick(pick);
  };
}

/* -----------------------------
   Main run
------------------------------ */
async function run(){
  const lat = Number(els.lat.value);
  const lon = Number(els.lon.value);
  if(!Number.isFinite(lat) || !Number.isFinite(lon)){
    setStatus('请输入有效经纬度。', 'warn');
    return;
  }

  // basic hard gate: too low latitude -> 直接拉低建议（不弹窗）
  const latK = latGate(lat);

  setStatus('拉取数据中…', 'idle');

  const [noaa, kp, cloud, ovation] = await Promise.all([
    fetchSWPC2h(),
    fetchKpForecast(),
    fetchCloud(lat, lon),
    fetchOvation(),
  ]);

  // build status message (no popups)
  const notes = [
    ...(noaa.notes||[]),
    ...(kp.notes||[]),
    ...(cloud.notes||[]),
    ...(ovation.notes||[]),
  ];
  setStatus(notes.join('｜'), noaa.ok ? 'ok' : 'warn');

  const sw = (noaa.mag && noaa.plasma) ? parseSolarWind(noaa.mag, noaa.plasma) : null;
  if(!sw){
    els.sw_now.textContent = `V — ｜ Bt — ｜ Bz — ｜ N —`;
    els.sw_meta.textContent = `数据时间：—`;
    els.c1_now.textContent = '不可观测';
    els.c1_meta.textContent = `本地时间：${fmtTime(new Date())}`;
    return;
  }

  // header numbers
  els.sw_now.textContent = `V ${fmt1(sw.V)} ｜ Bt ${fmt1(sw.Bt)} ｜ Bz ${fmt1(sw.Bz)} ｜ N ${fmt1(sw.N)}`;
  els.sw_meta.textContent = `数据时间：${sw.time ? sw.time : '—'}`;

  // 1h series: 10-min steps (0..60)
  const now = new Date();
  const points = [];
  let bestLabelNow = "不可观测";
  let bestCNow = 0;

  for(let i=0;i<=6;i++){
    const t = new Date(now.getTime() + i*10*60000);
    let c = computeCValue(sw);

    // apply hidden gate + latitude gate
    c = applyHiddenVisibilityGate(c, t, lat, lon);
    c = c * latK;

    const label = scoreToLabel5(c);
    points.push({t, c, label});

    if(i===0){
      bestLabelNow = label;
      bestCNow = c;
    }
  }

  els.c1_now.textContent = bestLabelNow;
  els.c1_meta.textContent = `本地时间：${fmtTime(now)} · OVATION：${ovation.data ? '已获取' : '—'}`;
  els.c1_chip.textContent = `当前 C值：${fmt1(bestCNow)} / 10`;

  // chart draw
  let pickIndex = 0;
  drawBarChart(els.cChart, points, pickIndex);
  els.chartPick.textContent = `${fmtTime(points[pickIndex].t)} ｜ 结论：${points[pickIndex].label} ｜ C值：${fmt1(points[pickIndex].c)}`;

  bindChartClick(els.cChart, points, (idx)=>{
    pickIndex = idx;
    drawBarChart(els.cChart, points, pickIndex);
    els.chartPick.textContent = `${fmtTime(points[pickIndex].t)} ｜ 结论：${points[pickIndex].label} ｜ C值：${fmt1(points[pickIndex].c)}`;
  });

  // 3h
  const state = computeState3h(sw);
  els.s3_state.textContent = state.state;
  els.s3_meta.textContent = state.meta;

  // 本地建议（完全等同 1小时当前建议）
  els.s3_local.textContent = bestLabelNow;

  const p2 = p2Summary(sw);
  els.p2_now.textContent = p2.txt;
  els.p2_meta.textContent = p2.meta;

  const c3 = cloud3hSummary(cloud.data);
  els.cloud3.textContent = `Low ${fmt0(c3.low)}% ｜ Mid ${fmt0(c3.mid)}% ｜ High ${fmt0(c3.high)}%`;
  els.cloud3_meta.textContent = c3.bestText;

  // 72h
  const rows72 = build72Rows(kp.data, cloud.data, sw);
  render72(rows72);

  // redraw chart on resize
  window.onresize = ()=>{
    drawBarChart(els.cChart, points, pickIndex);
  };
}

function render72(rows){
  // Desktop table
  els.tbl72Body.innerHTML = '';
  rows.forEach(r=>{
    const tr = document.createElement('tr');

    const tdDate = document.createElement('td');
    tdDate.textContent = r.date;

    const tdLab = document.createElement('td');
    const pill = document.createElement('span');
    pill.className = `pill ${labelColorClass72(r.label)}`;
    pill.innerHTML = `<span class="pDot"></span><span>${r.label}</span>`;
    tdLab.appendChild(pill);

    const tdP1 = document.createElement('td');
    tdP1.textContent = r.p1;

    const tdP2 = document.createElement('td');
    tdP2.textContent = r.p2;

    const tdCK = document.createElement('td');
    tdCK.textContent = r.cloudkp;

    tr.appendChild(tdDate);
    tr.appendChild(tdLab);
    tr.appendChild(tdP1);
    tr.appendChild(tdP2);
    tr.appendChild(tdCK);

    els.tbl72Body.appendChild(tr);
  });

  // Mobile cards
  els.list72.innerHTML = '';
  rows.forEach(r=>{
    const card = document.createElement('div');
    card.className = 'mCard';

    const rowTop = document.createElement('div');
    rowTop.className = 'mRow';
    rowTop.innerHTML = `
      <div class="mDate">${r.date}</div>
      <div class="pill ${labelColorClass72(r.label)}"><span class="pDot"></span><span>${r.label}</span></div>
    `;

    const cols = document.createElement('div');
    cols.className = 'mCols';
    cols.innerHTML = `
      <div class="mBlock"><div class="mKey">日冕洞与日冕物质抛射模型</div><div class="mVal">${escapeHtml(r.p1)}</div></div>
      <div class="mBlock"><div class="mKey">太阳风送达能力综合模型</div><div class="mVal">${escapeHtml(r.p2)}</div></div>
      <div class="mBlock"><div class="mKey">云量与Kp背景</div><div class="mVal">${escapeHtml(r.cloudkp)}</div></div>
    `;

    card.appendChild(rowTop);
    card.appendChild(cols);
    els.list72.appendChild(card);
  });
}

function labelColorClass72(label){
  if(label==="可能性高") return "good";
  if(label==="有窗口") return "warn";
  if(label==="小概率") return "neu";
  return "bad";
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, (m)=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[m]);
}

/* -----------------------------
   Magnetic latitude (optional, lightweight)
   这里不做真实IGRF，仅给“近似提示”，避免误导太狠
------------------------------ */
function approxMagLat(lat){
  // crude: shift by 10 deg toward pole as placeholder
  return lat + (lat>=0 ? 8 : -8);
}

els.magBtn.addEventListener('click', ()=>{
  const lat = Number(els.lat.value);
  if(!Number.isFinite(lat)){
    setStatus('先输入纬度。', 'warn');
    return;
  }
  const mlat = approxMagLat(lat);
  setStatus(`磁纬约 ${mlat.toFixed(1)}°（近似提示，仅用于粗判断）`, 'ok');
});

els.runBtn.addEventListener('click', run);

// sensible defaults (optional)
if(!els.lat.value) els.lat.value = '53.47';
if(!els.lon.value) els.lon.value = '122.35';

setStatus('等待输入经纬度。', 'idle');
