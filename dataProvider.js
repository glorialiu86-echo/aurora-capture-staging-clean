// Unified data access entry (Step 2).
// This file only centralizes request entrances; business decisions remain in callers.
(() => {
  const NOAA_RTSW_MAG_1M = "https://services.swpc.noaa.gov/json/rtsw/rtsw_mag_1m.json";
  const NOAA_RTSW_WIND_1M = "https://services.swpc.noaa.gov/json/rtsw/rtsw_wind_1m.json";
  const FMI_R_INDEX = "https://space.fmi.fi/MIRACLE/RWC/data/r_index_latest_en.json";
  const NOAA_KP_FORECAST = "https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json";
  const NOAA_OVATION = "https://services.swpc.noaa.gov/json/ovation_aurora_latest.json";

  const _num = (x) => {
    const v = Number(x);
    return Number.isFinite(v) ? v : null;
  };

  const _parseTimeLike = (v) => {
    if (!v) return null;
    const t = Date.parse(v);
    return Number.isFinite(t) ? t : null;
  };

  const _pick = (obj, keys) => {
    if (!obj) return null;
    for (const k of keys) {
      if (obj[k] != null) return obj[k];
    }
    return null;
  };

  const _policy = () => window.RequestPolicy;

  async function requestJsonDetailed(url, timeoutMs = 12000) {
    const p = _policy();
    if (!p || typeof p.requestJson !== "function") {
      return {
        ok: false,
        httpStatus: null,
        errorType: "policy_unavailable",
        errorMsg: "RequestPolicy.requestJson unavailable",
        latencyMs: 0,
        fetchedAt: new Date().toISOString(),
        data: null
      };
    }
    return p.requestJson(url, { timeoutMs, cache: "no-store" });
  }

  async function requestTextDetailed(url, timeoutMs = 12000) {
    const p = _policy();
    if (!p || typeof p.requestText !== "function") {
      return {
        ok: false,
        httpStatus: null,
        errorType: "policy_unavailable",
        errorMsg: "RequestPolicy.requestText unavailable",
        latencyMs: 0,
        fetchedAt: new Date().toISOString(),
        data: null
      };
    }
    return p.requestText(url, { timeoutMs, cache: "no-store" });
  }

  async function requestJson(url, timeoutMs = 12000) {
    const res = await requestJsonDetailed(url, timeoutMs);
    if (!res.ok) throw new Error(res.errorMsg || "request failed");
    return res.data;
  }

  async function requestTextJson(url, timeoutMs = 12000) {
    const res = await requestTextDetailed(url, timeoutMs);
    if (!res.ok) throw new Error(res.errorMsg || "request failed");
    const t = res.data;
    if (!t) throw new Error("empty");
    return JSON.parse(t);
  }

  function _latestValidFromNoaaTable(noaaTable, want) {
    try {
      if (!Array.isArray(noaaTable) || noaaTable.length < 2) return null;
      const header = noaaTable[0];
      if (!Array.isArray(header)) return null;

      const idxT = header.indexOf(want.time);
      if (idxT < 0) return null;

      const idx = {};
      for (const [outKey, candKeys] of Object.entries(want.fields)) {
        let found = -1;
        for (const ck of candKeys) {
          const j = header.indexOf(ck);
          if (j >= 0) {
            found = j;
            break;
          }
        }
        idx[outKey] = found;
      }

      for (let i = noaaTable.length - 1; i >= 1; i--) {
        const row = noaaTable[i];
        if (!Array.isArray(row)) continue;

        const tsStr = row[idxT];
        const ts = _parseTimeLike(tsStr);
        if (!Number.isFinite(ts)) continue;

        const out = { ts: tsStr };
        let hasAny = false;
        for (const [k, j] of Object.entries(idx)) {
          if (j < 0) continue;
          const v = _num(row[j]);
          if (v != null) {
            out[k] = v;
            hasAny = true;
          }
        }
        if (hasAny) return out;
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  async function fetchRtsw1m() {
    const out = {
      ok: false,
      src: "rtsw-1m",
      imf: {
        bt_nT: null,
        bz_gsm_nT: null,
        ts: null,
        ageMin: Infinity,
        bz15_nT: null,
        bz30_nT: null,
        dbz15_nT: null,
        dbz30_nT: null
      },
      solarWind: { speed_km_s: null, density_cm3: null, ts: null, ageMin: Infinity }
    };

    try {
      const [magJ, windJ] = await Promise.all([
        requestJson(NOAA_RTSW_MAG_1M, 12000),
        requestJson(NOAA_RTSW_WIND_1M, 12000)
      ]);

      const pickLast = (j) => {
        if (Array.isArray(j) && j.length) return j[j.length - 1];
        if (j && Array.isArray(j.data) && j.data.length) return j.data[j.data.length - 1];
        return null;
      };

      const magLast = pickLast(magJ);
      const windLast = pickLast(windJ);

      const pickBzBack = (arr, minutesBack) => {
        try {
          const a = Array.isArray(arr) ? arr : (Array.isArray(arr?.data) ? arr.data : null);
          if (!a || !a.length) return null;
          const last = a[a.length - 1];
          const tLastStr = _pick(last, ["time_tag", "time", "timestamp", "datetime", "date_time"]);
          const tLast = _parseTimeLike(tLastStr);
          if (!Number.isFinite(tLast)) return null;
          const target = tLast - minutesBack * 60000;
          let best = null;
          let bestD = Infinity;

          for (let i = a.length - 1; i >= 0; i--) {
            const row = a[i];
            const tsStr = _pick(row, ["time_tag", "time", "timestamp", "datetime", "date_time"]);
            const t = _parseTimeLike(tsStr);
            if (!Number.isFinite(t)) continue;
            if (t < target - 10 * 60000) break;
            const d = Math.abs(t - target);
            if (d < bestD) {
              const bzv = _num(_pick(row, ["bz_gsm", "bz_gsm_nT", "bz", "bz_nt", "Bz"]));
              if (bzv != null) {
                bestD = d;
                best = bzv;
              }
            }
          }
          return best;
        } catch (_) {
          return null;
        }
      };

      const bz15 = pickBzBack(magJ, 15);
      const bz30 = pickBzBack(magJ, 30);

      const magTs = _pick(magLast, ["time_tag", "time", "timestamp", "datetime", "date_time"]);
      const bt = _num(_pick(magLast, ["bt", "bt_nT", "bt_nt", "B_t", "total"]));
      const bz = _num(_pick(magLast, ["bz_gsm", "bz_gsm_nT", "bz", "bz_nt", "Bz"]));
      const windTs = _pick(windLast, ["time_tag", "time", "timestamp", "datetime", "date_time"]);
      const v = _num(_pick(windLast, ["speed", "speed_km_s", "v", "V", "flow_speed"]));
      const n = _num(_pick(windLast, ["density", "density_cm3", "n", "N", "proton_density"]));

      const nowMs = Date.now();
      const tMag = _parseTimeLike(magTs);
      const tWind = _parseTimeLike(windTs);

      if (bt != null) out.imf.bt_nT = bt;
      if (bz != null) out.imf.bz_gsm_nT = bz;
      if (bz15 != null) out.imf.bz15_nT = bz15;
      if (bz30 != null) out.imf.bz30_nT = bz30;
      if (bz != null && bz15 != null) out.imf.dbz15_nT = (bz - bz15);
      if (bz != null && bz30 != null) out.imf.dbz30_nT = (bz - bz30);
      if (magTs) out.imf.ts = magTs;
      if (Number.isFinite(tMag)) out.imf.ageMin = (nowMs - tMag) / 60000;

      if (v != null) out.solarWind.speed_km_s = v;
      if (n != null) out.solarWind.density_cm3 = n;
      if (windTs) out.solarWind.ts = windTs;
      if (Number.isFinite(tWind)) out.solarWind.ageMin = (nowMs - tWind) / 60000;

      const okMag = (out.imf.bt_nT != null || out.imf.bz_gsm_nT != null) && Number.isFinite(out.imf.ageMin);
      const okWind = (out.solarWind.speed_km_s != null || out.solarWind.density_cm3 != null) && Number.isFinite(out.solarWind.ageMin);
      out.ok = okMag || okWind;
      return out;
    } catch (e) {
      out.err = String(e?.message || e);
      return out;
    }
  }

  async function fetchMirrorProducts() {
    const out = {
      ok: false,
      src: "mirror-products",
      imf: { bt_nT: null, bz_gsm_nT: null, ts: null, ageMin: Infinity },
      solarWind: { speed_km_s: null, density_cm3: null, ts: null, ageMin: Infinity }
    };

    try {
      const [magWrap, plasmaWrap] = await Promise.all([
        requestJson(`./noaa/mag.json?t=${Date.now()}`, 12000),
        requestJson(`./noaa/plasma.json?t=${Date.now()}`, 12000)
      ]);

      const magLast = _latestValidFromNoaaTable(magWrap?.noaa, {
        time: "time_tag",
        fields: {
          bt: ["bt", "Bt", "bt_nT", "bt_nt"],
          bz: ["bz_gsm", "Bz", "bz", "bz_gsm_nT", "bz_nt"]
        }
      });

      const plasmaLast = _latestValidFromNoaaTable(plasmaWrap?.noaa, {
        time: "time_tag",
        fields: {
          v: ["speed", "V", "speed_km_s", "flow_speed"],
          n: ["density", "N", "density_cm3", "proton_density"]
        }
      });

      const nowMs = Date.now();
      if (magLast) {
        if (magLast.bt != null) out.imf.bt_nT = magLast.bt;
        if (magLast.bz != null) out.imf.bz_gsm_nT = magLast.bz;
        out.imf.ts = magLast.ts;
        const t = _parseTimeLike(magLast.ts);
        if (Number.isFinite(t)) out.imf.ageMin = (nowMs - t) / 60000;
      }
      if (plasmaLast) {
        if (plasmaLast.v != null) out.solarWind.speed_km_s = plasmaLast.v;
        if (plasmaLast.n != null) out.solarWind.density_cm3 = plasmaLast.n;
        out.solarWind.ts = plasmaLast.ts;
        const t = _parseTimeLike(plasmaLast.ts);
        if (Number.isFinite(t)) out.solarWind.ageMin = (nowMs - t) / 60000;
      }

      const hasAny = out.imf.bt_nT != null || out.imf.bz_gsm_nT != null || out.solarWind.speed_km_s != null || out.solarWind.density_cm3 != null;
      out.ok = hasAny && (Number.isFinite(out.imf.ageMin) || Number.isFinite(out.solarWind.ageMin));
      return out;
    } catch (e) {
      out.err = String(e?.message || e);
      return out;
    }
  }

  async function fetchFmiHint() {
    try {
      const j = await requestJson(FMI_R_INDEX, 12000);
      let bestProb = null;
      const scan = (node) => {
        if (!node) return;
        if (Array.isArray(node)) return node.forEach(scan);
        if (typeof node !== "object") return;
        const prob = _num(_pick(node, ["probability", "prob", "AuroraProbability", "aurora_probability"]));
        if (prob != null) bestProb = (bestProb == null ? prob : Math.max(bestProb, prob));
        for (const v of Object.values(node)) scan(v);
      };
      scan(j);
      return { ok: bestProb != null, prob: bestProb };
    } catch (e) {
      return { ok: false, err: String(e?.message || e) };
    }
  }

  async function fetchNoaaPlasmaMirrorRaw() {
    return requestJson(`./noaa/plasma.json?t=${Date.now()}`, 12000);
  }

  async function fetchKpRaw() {
    return requestTextJson(NOAA_KP_FORECAST, 12000);
  }

  async function fetchOvationRaw() {
    return requestTextJson(NOAA_OVATION, 12000);
  }

  async function fetchCloudsRaw(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&hourly=cloudcover_low,cloudcover_mid,cloudcover_high&forecast_days=3&timezone=auto`;
    return requestTextJson(url, 12000);
  }

  window.DataProvider = {
    requestJson,
    requestJsonDetailed,
    requestTextDetailed,
    fetchRtsw1m,
    fetchMirrorProducts,
    fetchFmiHint,
    fetchNoaaPlasmaMirrorRaw,
    fetchKpRaw,
    fetchOvationRaw,
    fetchCloudsRaw
  };
})();
