// =========================
// Aurora Decision v2
// ① 1h 精准：OVATION nowcast 网格 + 10min 时间轴
// ② 3h 概率态：四态状态机（基于近实时太阳风特征）
// ③ 72h 范围：Kp 3-day forecast + 云量窗口（按天）
// =========================

const $ = (id) => document.getElementById(id);
const H1_MINUTES = 60;
const H1_STEP = 10;
const H3_HOURS = 3;
const DAYS = 3;

function setStatus(s){ $('status').textContent = s; }
function setNote(s){ $('note').textContent = s || ''; }

// ---------- 时间格式 ----------
function pad(n){ return String(n).padStart(2,'0'); }
function fmtLocal(d){
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fmtHM(d){ return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
function addMin(d, m){ return new Date(d.getTime() + m*60000); }
function addHour(d, h){ return new Date(d.getTime() + h*3600000); }

// ---------- localStorage cache ----------
function cacheSet(key, obj){ try{ localStorage.setItem(key, JSON.stringify(obj)); }catch{} }
function cacheGet(key){ try{ const t=localStorage.getItem(key); return t?JSON.parse(t):null; }catch{ return null; } }
function fmtAge(ms){
  const m = Math.round(ms/60000);
  if (m < 60) return `${m} 分钟前`;
  const h = m/60;
  return `${h.toFixed(h < 10 ? 1 : 0)} 小时前`;
}
async function fetchJSONWithFallback(url, label, cacheKey, notes){
  const now = Date.now();
  try{
    const res = await fetch(url, { cache:'no-store' });
    if(!res.ok) throw new Error(String(res.status));
    const text = await res.text();
    if(!text) throw new Error('empty');
    const data = JSON.parse(text);
    cacheSet(cacheKey, { ts: now, data });
    notes.push(`✅ ${label} 已更新`);
    return { data, ts: now, stale:false };
  }catch(e){
    const c = cacheGet(cacheKey);
    if(c?.data){
      notes.push(`⚠️ ${label}接口暂时无法拉取目前数据，将使用此前最新数据做解析（${fmtAge(now-c.ts)}）`);
      return { data:c.data, ts:c.ts, stale:true };
    }
    notes.push(`❌ ${label}接口无法拉取，且本地无历史缓存`);
    return { data:null, ts:null, stale:true };
  }
}

// ---------- NOAA 数据源 ----------
async function fetchOvation(notes){
  // OVATION nowcast 网格：MultiPoint coordinates: [lon, lat, aurora]
  // (公开 json)  [oai_citation:4‡地理信息系统问答](https://gis.stackexchange.com/questions/389279/how-to-display-swpc-aurora-forecast-data-in-leaflet?utm_source=chatgpt.com)
  const url = 'https://services.swpc.noaa.gov/json/ovation_aurora_latest.json';
  const r = await fetchJSONWithFallback(url, 'OVATION(30–90min)', 'cache_ovation_latest', notes);
  if(!r.data) return null;
  return r.data;
}

async function fetchSWPC2h(notes){
  // 近2小时太阳风：mag/plasma 2-hour json（数组表头+行）  [oai_citation:5‡NOAA Space Weather Prediction Center](https://www.swpc.noaa.gov/products/real-time-solar-wind?utm_source=chatgpt.com)
  const magUrl = 'https://services.swpc.noaa.gov/products/solar-wind/mag-2-hour.json';
  const plasmaUrl = 'https://services.swpc.noaa.gov/products/solar-wind/plasma-2-hour.json';

  const magR = await fetchJSONWithFallback(magUrl, 'NOAA磁场', 'cache_mag_2h', notes);
  const plaR = await fetchJSONWithFallback(plasmaUrl, 'NOAA等离子体', 'cache_plasma_2h', notes);
  if(!magR.data || !plaR.data) return null;

  const mag = magR.data, plasma = plaR.data;
  const magH = mag[0], plaH = plasma[0];
  const magRows = mag.slice(1).map(row => Object.fromEntries(magH.map((k,i)=>[k,row[i]])));
  const plaRows = plasma.slice(1).map(row => Object.fromEntries(plaH.map((k,i)=>[k,row[i]])));

  const map = new Map();
  for(const r of magRows){
    const t = r.time_tag || r.time || r.timestamp;
    if(!t) continue;
    if(!map.has(t)) map.set(t, { time: new Date(t+'Z') });
    map.get(t).bt = Number(r.bt);
    map.get(t).bz = Number(r.bz_gsm ?? r.bz);
  }
  for(const r of plaRows){
    const t = r.time_tag || r.time || r.timestamp;
    if(!t) continue;
    if(!map.has(t)) map.set(t, { time: new Date(t+'Z') });
    map.get(t).v = Number(r.speed);
    map.get(t).n = Number(r.density);
  }

  const series = Array.from(map.values())
    .filter(x => x.time instanceof Date && !isNaN(x.time))
    .sort((a,b)=>a.time-b.time);

  return { series };
}

async function fetchKpForecast(notes){
  // 3-day Kp forecast json 在 /products 根目录可见  [oai_citation:6‡NOAA SWPC Services](https://services.swpc.noaa.gov/products/)
  const url = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json';
  const r = await fetchJSONWithFallback(url, 'Kp三日预报', 'cache_kp_3day', notes);
  if(!r.data) return null;
  return r.data;
}

// ---------- 云量：Open-Meteo ----------
async function fetchClouds3Days(lat, lon, notes){
  // 用 hourly cloud_cover_*，timezone=auto
  // Open-Meteo 文档：hourly 参数支持 cloud_cover_*  [oai_citation:7‡Open-Meteo](https://open-meteo.com/en/docs?utm_source=chatgpt.com)
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lon));
  url.searchParams.set('hourly', 'cloud_cover_low,cloud_cover_mid,cloud_cover_high');
  url.searchParams.set('forecast_days', String(DAYS));
  url.searchParams.set('timezone', 'auto');

  const r = await fetchJSONWithFallback(url.toString(), '云量', 'cache_cloud_3d', notes);
  const j = r.data;
  if(!j?.hourly?.time) return null;

  const h = j.hourly;
  const out = h.time.map((t,i)=>({
    timeLocal: new Date(t),
    low: Number(h.cloud_cover_low?.[i] ?? NaN),
    mid: Number(h.cloud_cover_mid?.[i] ?? NaN),
    high:Number(h.cloud_cover_high?.[i] ?? NaN),
  }));
  return out;
}

// ---------- 数学 ----------
function mean(arr){
  const v = arr.filter(x=>Number.isFinite(x));
  if(!v.length) return NaN;
  return v.reduce((a,b)=>a+b,0)/v.length;
}
function std(arr){
  const v = arr.filter(x=>Number.isFinite(x));
  if(v.length<2) return NaN;
  const m = mean(v);
  const s2 = v.reduce((a,b)=>a+(b-m)*(b-m),0)/(v.length-1);
  return Math.sqrt(s2);
}

// ---------- OVATION 网格取值 ----------
function ovationValueAt(ovation, lat, lon){
  // coordinates: [lon(0..359), lat(-90..90), aurora]
  // 索引： (lat+90)*360 + lon
  if(!ovation?.coordinates?.length) return NaN;
  const lonN = ((lon % 360) + 360) % 360;
  const lonI = Math.round(lonN);
  const latI = Math.round(lat);
  if(latI < -90 || latI > 90) return NaN;
  const idx = (latI + 90) * 360 + lonI;
  const p = ovation.coordinates[idx]?.[2];
  return Number(p);
}

// ---------- 近实时特征 ----------
function computeFeatures(series){
  if(!series?.length) return null;
  const last = series[series.length-1];
  const t0 = last.time;

  const w120 = series.filter(x => (t0 - x.time) <= 120*60*1000);
  const w60  = series.filter(x => (t0 - x.time) <= 60*60*1000);

  // Bz 连续分钟（从末尾往前数）
  let bzMinutes = 0;
  for(let i=w120.length-1;i>=0;i--){
    const bz = w120[i].bz;
    if(!Number.isFinite(bz)) break;
    if(bz <= -2) bzMinutes++;
    else break;
  }

  // Bz 触及次数（<= -1.5）
  const bzTouches = w60.filter(x => Number.isFinite(x.bz) && x.bz <= -1.5).length;

  // 锯齿：60分钟内符号翻转次数
  let flips = 0;
  let prev = null;
  for(const x of w60){
    if(!Number.isFinite(x.bz)) continue;
    const s = x.bz >= 0 ? 1 : -1;
    if(prev !== null && s !== prev) flips++;
    prev = s;
  }
  const bzSaw = flips >= 6;

  const btArr = w60.map(x=>x.bt);
  const vArr  = w60.map(x=>x.v);
  const nArr  = w60.map(x=>x.n);

  const btMean = mean(btArr);
  const btStd  = std(btArr);
  const vMean  = mean(vArr);
  const nMean  = mean(nArr);

  // Bt 平台化：均值高 & 波动低
  const btPlatform = (btMean >= 6) && (btStd <= 1.5);

  // 速度背景
  const vOk = vMean >= 420;

  // 密度结构：均值>=2 且 w60 中至少有一些 >=3 回拉
  const nBack = nMean >= 2;
  const nRebounds = w60.filter(x=>Number.isFinite(x.n) && x.n >= 3).length >= 6; // ~6分钟以上

  // 是否刚经历过爆发：过去60分钟曾经有 bzMinutes>=10 或 bz<=-5
  const hadStrongBz = w60.some(x=>Number.isFinite(x.bz) && x.bz <= -5);

  return {
    now:last,
    t0,
    bzMinutes,
    bzTouches,
    bzSaw,
    btMean, btStd, btPlatform,
    vMean, vOk,
    nMean, nBack, nRebounds,
    hadStrongBz
  };
}

// ---------- ② 3小时概率态（状态机） ----------
function classifyState(f){
  if(!f?.now) return { state:'未知', reason:['缺少近实时太阳风数据'] };

  const { bzMinutes, btPlatform, vOk, nBack, nRebounds, bzSaw, bzTouches, hadStrongBz } = f;
  const p2Ready = (btPlatform && vOk && (nBack || nRebounds));

  // 爆发进行中
  if(bzMinutes >= 10 && p2Ready){
    return {
      state:'爆发进行中',
      reason:[
        `Bz 南向持续≈${bzMinutes} 分钟（<=-2）`,
        `P2 背景就绪（Bt平台+速度背景+密度结构）`,
        `锯齿：${bzSaw ? '是（但仍在爆发）' : '否'}`
      ]
    };
  }

  // 爆发后衰落期（曾强南向，但当前不再持续南向，且平台开始不稳/锯齿明显）
  if((hadStrongBz || bzTouches >= 15) && bzMinutes < 3 && (bzSaw || !btPlatform)){
    return {
      state:'爆发后衰落期',
      reason:[
        `近1小时出现过较强南向/触及（触及次数≈${bzTouches}）`,
        `当前南向不连续（≈${bzMinutes} 分钟）`,
        `平台/方向开始不稳（锯齿或平台破坏）`
      ]
    };
  }

  // 爆发概率上升（P2就绪 + Bz 多次触及，但未形成连续触发）
  if(p2Ready && bzTouches >= 12 && bzMinutes < 10){
    return {
      state:'爆发概率上升',
      reason:[
        `P2 背景就绪（Bt平台+速度背景+密度结构）`,
        `Bz 在近1小时内多次触及南向（触及次数≈${bzTouches}）`,
        `但尚未形成连续触发（<10 分钟）`
      ]
    };
  }

  // 静默
  return {
    state:'静默',
    reason:[
      `P2 背景${p2Ready ? '部分成立' : '不成立'}`,
      `Bz 连续南向不足（≈${bzMinutes} 分钟）`,
      `触及次数≈${bzTouches}（不够形成爆发态）`
    ]
  };
}

// ---------- ① 1小时精准（10min） ----------
// 用 OVATION 值作为“可见概率底盘”，用实时Bz触发做小幅加成/扣分，并随时间衰减（越远越不精确）
function score1h(prob, f, minutesAhead){
  // prob: 0..100(实际常见较小)，先映射到 0..10 底盘
  const base = Math.max(0, Math.min(10, (prob/20)*10)); // prob=20 -> 10分（经验映射）

  let trigger = 0;
  if(f?.bzMinutes >= 10 && f.now?.bz <= -2) trigger += 2.0;
  else if((f?.bzTouches ?? 0) >= 12) trigger += 1.0;
  if(f?.bzSaw) trigger -= 0.8;

  // 时间衰减：10min很准，60min不那么准（但仍给“趋势”）
  // decay = exp(-t/45min)
  const decay = Math.exp(-minutesAhead / 45);

  let s = base + trigger * decay;

  s = Math.max(0, Math.min(10, s));
  const level =
    s >= 9 ? '强烈推荐' :
    s >= 7 ? '值得蹲守' :
    s >= 5 ? '可尝试' :
    s >= 3 ? '低概率' : '不建议';

  return { score: Math.round(s), level, base: base.toFixed(1), trigger: trigger.toFixed(1), decay: decay.toFixed(2) };
}

function dotColor(score){
  if(score <= 0) return getCSS('--g0');
  if(score <= 2) return getCSS('--r1');
  if(score <= 4) return getCSS('--r2');
  if(score <= 6) return getCSS('--y1');
  if(score <= 7) return getCSS('--g1');
  if(score <= 8) return getCSS('--g2');
  return getCSS('--g3');
}
function getCSS(v){ return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }

// ---------- ③ 72小时范围（按天） ----------
function parseKpForecast(kpJson){
  // 文件是二维数组（header+rows）
  // 通常列含 time_tag, kp
  if(!Array.isArray(kpJson) || kpJson.length < 2) return [];
  const header = kpJson[0];
  const rows = kpJson.slice(1).map(r => Object.fromEntries(header.map((k,i)=>[k,r[i]])));
  // kp 可能字段名为 "kp" 或 "Kp"
  return rows.map(r => ({
    time: new Date((r.time_tag || r.time || r.timestamp) + 'Z'),
    kp: Number(r.kp ?? r.Kp ?? r['Kp Index'] ?? NaN)
  })).filter(x => x.time instanceof Date && !isNaN(x.time) && Number.isFinite(x.kp));
}

function dayKey(d){ return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }

function cloudWindowScore(hour){
  // 你 v1.4 边缘纬那套阈值作为默认摄影窗口（通用、对普通人也合理）
  // Low<=10 一票否决（窗口无效）
  if(!Number.isFinite(hour.low) || hour.low > 10) return -1;
  let s = 0;
  if(Number.isFinite(hour.mid)){
    s += hour.mid <= 35 ? 1 : (hour.mid <= 50 ? 0.5 : 0);
  }
  if(Number.isFinite(hour.high)){
    s += hour.high <= 65 ? 1 : (hour.high <= 80 ? 0.5 : 0);
  }
  return s; // 0..2
}

function summarize72h(kpSeries, clouds){
  // 取本地今天起三天
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0,0,0);

  const days = [];
  for(let i=0;i<DAYS;i++){
    const d0 = addHour(start, i*24);
    const key = dayKey(d0);

    // kp：当日最大
    const kpMax = Math.max(...kpSeries.filter(x => dayKey(x.time)===key).map(x=>x.kp), -Infinity);
    const kpVal = Number.isFinite(kpMax) ? kpMax : NaN;

    // 云量：找当日“最佳小时”（窗口分最高，且低云通过）
    const dayClouds = (clouds||[]).filter(x => dayKey(x.timeLocal)===key);
    let best = null;
    for(const h of dayClouds){
      const s = cloudWindowScore(h);
      if(s < 0) continue;
      if(!best || s > best.s) best = { s, h };
    }

    // 可能性等级（按 Kp max）
    let chance = '低可能';
    let explain = [];
    if(Number.isFinite(kpVal)){
      if(kpVal >= 6) chance = '可能性高';
      else if(kpVal >= 5) chance = '有窗口';
      else if(kpVal >= 4) chance = '小概率';
      else chance = '低可能';
      explain.push(`Kp 预报峰值≈${kpVal.toFixed(1)}（越高越可能）`);
    }else{
      explain.push('Kp 预报缺失（按低可能处理）');
    }

    if(best){
      explain.push(`云量窗口：${fmtHM(best.h.timeLocal)} 附近更好（Low=${best.h.low} Mid=${best.h.mid} High=${best.h.high}）`);
    }else{
      explain.push('云量窗口：未找到低云≤10%的小时（更像“拍不到”）');
    }

    days.push({ date:key, chance, explain });
  }
  return days;
}

// ---------- 渲染 ----------
function render1h(lat, lon, ovation, f){
  const box = $('out1h');
  const now = new Date();

  const prob = ovationValueAt(ovation, lat, lon);

  const rows = [];
  for(let m=0;m<=H1_MINUTES;m+=H1_STEP){
    const t = addMin(now, m);
    const r = score1h(prob, f, m);
    rows.push({ t, ...r });
  }

  const obs = ovation?.['Observation Time'] ? new Date(ovation['Observation Time']+'Z') : null;
  const fc  = ovation?.['Forecast Time'] ? new Date(ovation['Forecast Time']+'Z') : null;
  const leadMin = (obs && fc) ? Math.round((fc-obs)/60000) : null;

  box.innerHTML = `
    <div class="row">
      <div class="kpi">
        <div class="t">当前位置OVATION可见概率（近似）</div>
        <div class="v">${Number.isFinite(prob) ? `${prob}%` : '—'}</div>
        <div class="s">
          ${leadMin!==null ? `OVATION 预报提前量≈${leadMin} 分钟（L1→地球传播）` : 'OVATION 时间字段缺失'}
        </div>
      </div>
      <div class="kpi">
        <div class="t">当前太阳风（近实时）</div>
        <div class="v">${f?.now ? `V ${f.now.v}｜Bt ${f.now.bt}｜Bz ${f.now.bz}｜N ${f.now.n}` : '—'}</div>
        <div class="s">${f?.bzMinutes!=null ? `Bz连续南向≈${f.bzMinutes}min｜锯齿:${f.bzSaw?'是':'否'}` : '—'}</div>
      </div>
    </div>

    <table class="table" style="margin-top:10px">
      <thead>
        <tr>
          <th>时间（本地）</th>
          <th>分数(0-10)</th>
          <th>结论</th>
          <th>分解（base/trigger/decay）</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(x=>`
          <tr>
            <td>${fmtLocal(x.t)}</td>
            <td><span class="badge"><span class="dot" style="background:${dotColor(x.score)}"></span>${x.score}</span></td>
            <td>${x.level}</td>
            <td class="pill">${x.base} / ${x.trigger} / ${x.decay}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function render3h(stateObj, f){
  const box = $('out3h');

  const color =
    stateObj.state.includes('进行中') ? getCSS('--g3') :
    stateObj.state.includes('上升') ? getCSS('--g2') :
    stateObj.state.includes('衰落') ? getCSS('--y1') :
    stateObj.state.includes('静默') ? getCSS('--r2') : getCSS('--g0');

  box.innerHTML = `
    <div class="row">
      <div class="kpi">
        <div class="t">当前系统状态（未来3小时不分分钟）</div>
        <div class="v"><span class="badge"><span class="dot" style="background:${color}"></span>${stateObj.state}</span></div>
        <div class="s">
          ${stateObj.reason.map(x=>`• ${x}`).join('<br/>')}
        </div>
      </div>

      <div class="kpi">
        <div class="t">P2背景（用于“容易发生的状态”）</div>
        <div class="v">${f?.btPlatform ? 'Bt平台✅' : 'Bt平台⚠️/❌'}｜${f?.vOk ? '速度背景✅' : '速度背景⚠️/❌'}｜${(f?.nBack||f?.nRebounds) ? '密度结构✅' : '密度结构⚠️/❌'}</div>
        <div class="s">Bt均值≈${Number.isFinite(f?.btMean)?f.btMean.toFixed(1):'—'}，Bt波动≈${Number.isFinite(f?.btStd)?f.btStd.toFixed(2):'—'}；Bz触及≈${f?.bzTouches ?? '—'}次</div>
      </div>
    </div>
  `;
}

function render72h(days){
  const box = $('out72h');
  box.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>日期（本地）</th>
          <th>结论</th>
          <th>依据（人话）</th>
        </tr>
      </thead>
      <tbody>
        ${days.map(d=>`
          <tr>
            <td>${d.date}</td>
            <td><span class="badge"><span class="dot" style="background:${d.chance.includes('高')?getCSS('--g3'):d.chance.includes('窗口')?getCSS('--g2'):d.chance.includes('小')?getCSS('--y1'):getCSS('--r2')}"></span>${d.chance}</span></td>
            <td style="text-align:left">${d.explain.map(x=>`• ${x}`).join('<br/>')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderExplain(){
  const box = $('explain');
  box.innerHTML = `
    <h3>说明（为什么要分三层）</h3>
    <ul>
      <li><b>1小时精准</b>：用 OVATION nowcast（本质是 L1→地球传播后的 30–90min 预报），再叠加实时Bz触发；所以可以做到 10 分钟粒度。 [oai_citation:8‡NOAA Space Weather Prediction Center](https://www.swpc.noaa.gov/products/aurora-30-minute-forecast?utm_source=chatgpt.com)</li>
      <li><b>3小时概率态</b>：不预测时间点，只判断系统处于“静默/上升/进行中/衰落”。用近2小时 NOAA 太阳风数据提特征。 [oai_citation:9‡NOAA Space Weather Prediction Center](https://www.swpc.noaa.gov/products/real-time-solar-wind?utm_source=chatgpt.com)</li>
      <li><b>72小时范围</b>：按天只给“可能性”，用 NOAA 的 Kp 三日预报（背景）+ 云量窗口（可拍与否）。 [oai_citation:10‡NOAA SWPC Services](https://services.swpc.noaa.gov/products/)</li>
    </ul>
  `;
}

// ---------- 入口 ----------
async function run(){
  const lat = Number($('lat').value);
  const lon = Number($('lon').value);
  if(!Number.isFinite(lat) || lat < -90 || lat > 90){ setStatus('纬度应在 -90 到 90'); return; }
  if(!Number.isFinite(lon) || lon < -180 || lon > 180){ setStatus('经度应在 -180 到 180'); return; }

  $('run').disabled = true;
  setStatus('拉取数据中…');
  setNote('');

  try{
    const notes = [];
    const [ovation, swpc, kpJ, clouds] = await Promise.all([
      fetchOvation(notes),
      fetchSWPC2h(notes),
      fetchKpForecast(notes),
      fetchClouds3Days(lat, lon, notes),
    ]);

    setNote(notes.join('｜'));

    const f = swpc?.series ? computeFeatures(swpc.series) : null;

    // ① 1h
    if(ovation){
      render1h(lat, lon, ovation, f);
    }else{
      $('out1h').innerHTML = 'OVATION 数据不可用（无缓存则无法生成1小时精准预测）。';
    }

    // ② 3h
    const st = classifyState(f);
    render3h(st, f);

    // ③ 72h
    const kpSeries = kpJ ? parseKpForecast(kpJ) : [];
    const days = summarize72h(kpSeries, clouds);
    render72h(days);

    renderExplain();

    setStatus(`完成｜本地时间：${fmtLocal(new Date())}`);
  }catch(e){
    setStatus(`异常：${String(e?.message || e)}`);
  }finally{
    $('run').disabled = false;
  }
}

function swapLatLon(){
  const a = $('lat').value;
  $('lat').value = $('lon').value;
  $('lon').value = a;
}

window.addEventListener('DOMContentLoaded', ()=>{
  $('run').addEventListener('click', run);
  $('swap').addEventListener('click', swapLatLon);

  // 默认填一个测试点（你可改）
  $('lat').value = '53.47';
  $('lon').value = '122.35';

  renderExplain();
});
