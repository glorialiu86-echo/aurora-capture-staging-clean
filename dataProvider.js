// Unified data access entry (Step 2/3/4).
// This file centralizes request entrances and keeps an internal request ledger for audit view.
(() => {
  const NOAA_RTSW_MAG_1M = "https://services.swpc.noaa.gov/json/rtsw/rtsw_mag_1m.json";
  const NOAA_RTSW_WIND_1M = "https://services.swpc.noaa.gov/json/rtsw/rtsw_wind_1m.json";
  const FMI_R_INDEX = "https://space.fmi.fi/MIRACLE/RWC/data/r_index_latest_en.json";
  const NOAA_KP_FORECAST = "https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json";
  const NOAA_OVATION = "https://services.swpc.noaa.gov/json/ovation_aurora_latest.json";
  const AUDIT_STORAGE_KEY = "ac_audit_ledger_v1";

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

  function _ensureAudit() {
    if (!window.__AC_AUDIT__ || typeof window.__AC_AUDIT__ !== "object") {
      window.__AC_AUDIT__ = { ledger: {}, updatedAt: null };
      try {
        const raw = sessionStorage.getItem(AUDIT_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === "object") {
            window.__AC_AUDIT__.ledger = parsed.ledger && typeof parsed.ledger === "object" ? parsed.ledger : {};
            window.__AC_AUDIT__.updatedAt = parsed.updatedAt || null;
          }
        }
      } catch (_) {
        // keep in-memory fallback only
      }
    }
    return window.__AC_AUDIT__;
  }

  function _saveAudit() {
    const audit = _ensureAudit();
    try {
      sessionStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify({ ledger: audit.ledger, updatedAt: audit.updatedAt }));
    } catch (_) {
      // ignore storage failures
    }
  }

  function _setLedger(key, patch) {
    const audit = _ensureAudit();
    audit.ledger[key] = {
      ...(audit.ledger[key] || {}),
      ...patch,
      key,
      updatedAt: new Date().toISOString()
    };
    audit.updatedAt = audit.ledger[key].updatedAt;
    _saveAudit();
  }

  function _computeAgeMin(iso) {
    const t = Date.parse(iso || "");
    if (!Number.isFinite(t)) return null;
    return Math.round((Date.now() - t) / 60000);
  }

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

    let magReq = null;
    let windReq = null;

    try {
      [magReq, windReq] = await Promise.all([
        requestJsonDetailed(NOAA_RTSW_MAG_1M, 12000),
        requestJsonDetailed(NOAA_RTSW_WIND_1M, 12000)
      ]);

      if (!magReq.ok) throw new Error(magReq.errorMsg || "mag request failed");
      if (!windReq.ok) throw new Error(windReq.errorMsg || "wind request failed");

      const magJ = magReq.data;
      const windJ = windReq.data;

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
    } finally {
      const reqOk = !!(magReq?.ok && windReq?.ok);
      _setLedger("solar_wind_rtsw", {
        provider: "rtsw-1m",
        url: `${NOAA_RTSW_MAG_1M} | ${NOAA_RTSW_WIND_1M}`,
        fetchedAt: windReq?.fetchedAt || magReq?.fetchedAt || new Date().toISOString(),
        fetchAgeMin: 0,
        dataTime: out?.imf?.ts || out?.solarWind?.ts || null,
        dataAgeMin: Number.isFinite(Number(out?.imf?.ageMin)) ? Math.round(Number(out.imf.ageMin)) : (Number.isFinite(Number(out?.solarWind?.ageMin)) ? Math.round(Number(out.solarWind.ageMin)) : null),
        ok: reqOk,
        status: reqOk ? "ok" : "bad",
        reason: out?.err || "",
        errorType: (!reqOk && (magReq?.errorType || windReq?.errorType)) ? (magReq?.errorType || windReq?.errorType) : "",
        errorMsg: (!reqOk && (magReq?.errorMsg || windReq?.errorMsg)) ? (magReq?.errorMsg || windReq?.errorMsg) : "",
        latencyMs: (Number(magReq?.latencyMs) || 0) + (Number(windReq?.latencyMs) || 0),
        httpStatus: reqOk ? `${magReq?.httpStatus}/${windReq?.httpStatus}` : (magReq?.httpStatus || windReq?.httpStatus || null),
        sample: {
          v: out?.solarWind?.speed_km_s ?? null,
          n: out?.solarWind?.density_cm3 ?? null,
          bt: out?.imf?.bt_nT ?? null,
          bz: out?.imf?.bz_gsm_nT ?? null
        }
      });
    }
  }

  async function fetchMirrorProducts() {
    const out = {
      ok: false,
      src: "mirror-products",
      imf: { bt_nT: null, bz_gsm_nT: null, ts: null, ageMin: Infinity },
      solarWind: { speed_km_s: null, density_cm3: null, ts: null, ageMin: Infinity }
    };

    const magUrl = `./noaa/mag.json?t=${Date.now()}`;
    const plasmaUrl = `./noaa/plasma.json?t=${Date.now()}`;
    let magReq = null;
    let plasmaReq = null;

    try {
      [magReq, plasmaReq] = await Promise.all([
        requestJsonDetailed(magUrl, 12000),
        requestJsonDetailed(plasmaUrl, 12000)
      ]);
      if (!magReq.ok) throw new Error(magReq.errorMsg || "mag mirror failed");
      if (!plasmaReq.ok) throw new Error(plasmaReq.errorMsg || "plasma mirror failed");

      const magWrap = magReq.data;
      const plasmaWrap = plasmaReq.data;

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
    } finally {
      const reqOk = !!(magReq?.ok && plasmaReq?.ok);
      _setLedger("solar_wind_mirror", {
        provider: "mirror-products",
        url: `${magUrl} | ${plasmaUrl}`,
        fetchedAt: plasmaReq?.fetchedAt || magReq?.fetchedAt || new Date().toISOString(),
        fetchAgeMin: 0,
        dataTime: out?.imf?.ts || out?.solarWind?.ts || null,
        dataAgeMin: Number.isFinite(Number(out?.imf?.ageMin)) ? Math.round(Number(out.imf.ageMin)) : (Number.isFinite(Number(out?.solarWind?.ageMin)) ? Math.round(Number(out.solarWind.ageMin)) : null),
        ok: reqOk,
        status: reqOk ? "ok" : "bad",
        reason: out?.err || "",
        errorType: (!reqOk && (magReq?.errorType || plasmaReq?.errorType)) ? (magReq?.errorType || plasmaReq?.errorType) : "",
        errorMsg: (!reqOk && (magReq?.errorMsg || plasmaReq?.errorMsg)) ? (magReq?.errorMsg || plasmaReq?.errorMsg) : "",
        latencyMs: (Number(magReq?.latencyMs) || 0) + (Number(plasmaReq?.latencyMs) || 0),
        httpStatus: reqOk ? `${magReq?.httpStatus}/${plasmaReq?.httpStatus}` : (magReq?.httpStatus || plasmaReq?.httpStatus || null),
        sample: {
          v: out?.solarWind?.speed_km_s ?? null,
          n: out?.solarWind?.density_cm3 ?? null,
          bt: out?.imf?.bt_nT ?? null,
          bz: out?.imf?.bz_gsm_nT ?? null
        }
      });
    }
  }

  async function fetchFmiHint() {
    const req = await requestJsonDetailed(FMI_R_INDEX, 12000);
    if (!req.ok) {
      const errMsg = String(req.errorMsg || "");
      _setLedger("fmi_hint", {
        provider: "fmi",
        url: FMI_R_INDEX,
        fetchedAt: req.fetchedAt,
        fetchAgeMin: 0,
        dataTime: null,
        dataAgeMin: null,
        ok: false,
        status: "bad",
        reason: errMsg,
        errorType: req.errorType || "",
        errorMsg: errMsg,
        latencyMs: req.latencyMs,
        httpStatus: req.httpStatus,
        sample: { rIndex: null }
      });
      return { ok: false, err: errMsg };
    }

    const j = req.data;
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

    _setLedger("fmi_hint", {
      provider: "fmi",
      url: FMI_R_INDEX,
      fetchedAt: req.fetchedAt,
      fetchAgeMin: 0,
      dataTime: null,
      dataAgeMin: null,
      ok: bestProb != null,
      status: bestProb != null ? "ok" : "bad",
      reason: bestProb != null ? "" : "no_probability_found",
      errorType: "",
      errorMsg: "",
      latencyMs: req.latencyMs,
      httpStatus: req.httpStatus,
      sample: { rIndex: bestProb }
    });

    return { ok: bestProb != null, prob: bestProb };
  }

  async function fetchNoaaPlasmaMirrorRaw() {
    const url = `./noaa/plasma.json?t=${Date.now()}`;
    const req = await requestJsonDetailed(url, 12000);

    if (!req.ok) {
      _setLedger("mirror_plasma_backfill", {
        provider: "mirror-products",
        url,
        fetchedAt: req.fetchedAt,
        fetchAgeMin: 0,
        dataTime: null,
        dataAgeMin: null,
        ok: false,
        status: "bad",
        reason: req.errorMsg || "",
        errorType: req.errorType || "",
        errorMsg: req.errorMsg || "",
        latencyMs: req.latencyMs,
        httpStatus: req.httpStatus,
        sample: {}
      });
      throw new Error(req.errorMsg || "request failed");
    }

    _setLedger("mirror_plasma_backfill", {
      provider: "mirror-products",
      url,
      fetchedAt: req.fetchedAt,
      fetchAgeMin: 0,
      dataTime: null,
      dataAgeMin: null,
      ok: true,
      status: "ok",
      reason: "",
      errorType: "",
      errorMsg: "",
      latencyMs: req.latencyMs,
      httpStatus: req.httpStatus,
      sample: {}
    });

    return req.data;
  }

  function _kpSample(j) {
    if (!Array.isArray(j) || j.length < 2) return { todayMax: null, tomorrowMax: null };
    const now = new Date();
    const d0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const d1 = d0 + 24 * 3600 * 1000;
    const d2 = d1 + 24 * 3600 * 1000;
    let todayMax = null;
    let tomorrowMax = null;
    for (let i = 1; i < j.length; i++) {
      const row = j[i];
      if (!Array.isArray(row) || row.length < 2) continue;
      const t = Date.parse(row[0]);
      const kp = Number(row[1]);
      if (!Number.isFinite(t) || !Number.isFinite(kp)) continue;
      if (t >= d0 && t < d1) todayMax = todayMax == null ? kp : Math.max(todayMax, kp);
      if (t >= d1 && t < d2) tomorrowMax = tomorrowMax == null ? kp : Math.max(tomorrowMax, kp);
    }
    return { todayMax, tomorrowMax };
  }

  async function fetchKpRaw() {
    const req = await requestTextDetailed(NOAA_KP_FORECAST, 12000);
    if (!req.ok) {
      _setLedger("kp", {
        provider: "swpc-noaa",
        url: NOAA_KP_FORECAST,
        fetchedAt: req.fetchedAt,
        fetchAgeMin: 0,
        dataTime: null,
        dataAgeMin: null,
        ok: false,
        status: "bad",
        reason: req.errorMsg || "",
        errorType: req.errorType || "",
        errorMsg: req.errorMsg || "",
        latencyMs: req.latencyMs,
        httpStatus: req.httpStatus,
        sample: { todayMax: null, tomorrowMax: null }
      });
      throw new Error(req.errorMsg || "request failed");
    }

    try {
      const t = req.data;
      if (!t) throw new Error("empty");
      const j = JSON.parse(t);
      _setLedger("kp", {
        provider: "swpc-noaa",
        url: NOAA_KP_FORECAST,
        fetchedAt: req.fetchedAt,
        fetchAgeMin: 0,
        dataTime: null,
        dataAgeMin: null,
        ok: true,
        status: "ok",
        reason: "",
        errorType: "",
        errorMsg: "",
        latencyMs: req.latencyMs,
        httpStatus: req.httpStatus,
        sample: _kpSample(j)
      });
      return j;
    } catch (e) {
      const msg = String(e?.message || e);
      _setLedger("kp", {
        provider: "swpc-noaa",
        url: NOAA_KP_FORECAST,
        fetchedAt: req.fetchedAt,
        fetchAgeMin: 0,
        dataTime: null,
        dataAgeMin: null,
        ok: false,
        status: "bad",
        reason: msg,
        errorType: "parse",
        errorMsg: msg,
        latencyMs: req.latencyMs,
        httpStatus: req.httpStatus,
        sample: { todayMax: null, tomorrowMax: null }
      });
      throw e;
    }
  }

  async function fetchOvationRaw() {
    const req = await requestTextDetailed(NOAA_OVATION, 12000);
    if (!req.ok) {
      _setLedger("ovation", {
        provider: "swpc-noaa",
        url: NOAA_OVATION,
        fetchedAt: req.fetchedAt,
        fetchAgeMin: 0,
        dataTime: null,
        dataAgeMin: null,
        ok: false,
        status: "bad",
        reason: req.errorMsg || "",
        errorType: req.errorType || "",
        errorMsg: req.errorMsg || "",
        latencyMs: req.latencyMs,
        httpStatus: req.httpStatus,
        sample: { observationTime: null, forecastTime: null }
      });
      throw new Error(req.errorMsg || "request failed");
    }

    try {
      const t = req.data;
      if (!t) throw new Error("empty");
      const j = JSON.parse(t);
      const dataTime = j?.ObservationTime || j?.ForecastTime || null;
      _setLedger("ovation", {
        provider: "swpc-noaa",
        url: NOAA_OVATION,
        fetchedAt: req.fetchedAt,
        fetchAgeMin: 0,
        dataTime,
        dataAgeMin: _computeAgeMin(dataTime),
        ok: true,
        status: "ok",
        reason: "",
        errorType: "",
        errorMsg: "",
        latencyMs: req.latencyMs,
        httpStatus: req.httpStatus,
        sample: {
          observationTime: j?.ObservationTime || null,
          forecastTime: j?.ForecastTime || null
        }
      });
      return j;
    } catch (e) {
      const msg = String(e?.message || e);
      _setLedger("ovation", {
        provider: "swpc-noaa",
        url: NOAA_OVATION,
        fetchedAt: req.fetchedAt,
        fetchAgeMin: 0,
        dataTime: null,
        dataAgeMin: null,
        ok: false,
        status: "bad",
        reason: msg,
        errorType: "parse",
        errorMsg: msg,
        latencyMs: req.latencyMs,
        httpStatus: req.httpStatus,
        sample: { observationTime: null, forecastTime: null }
      });
      throw e;
    }
  }

  function _cloudSample(j) {
    const h = j?.hourly;
    if (!h) return { low: null, mid: null, high: null, max3: null };
    const low = Array.isArray(h.cloudcover_low) ? Number(h.cloudcover_low[0]) : null;
    const mid = Array.isArray(h.cloudcover_mid) ? Number(h.cloudcover_mid[0]) : null;
    const high = Array.isArray(h.cloudcover_high) ? Number(h.cloudcover_high[0]) : null;
    const values = [low, mid, high].filter((v) => Number.isFinite(v));
    return {
      low: Number.isFinite(low) ? low : null,
      mid: Number.isFinite(mid) ? mid : null,
      high: Number.isFinite(high) ? high : null,
      max3: values.length ? Math.max(...values) : null
    };
  }

  async function fetchCloudsRaw(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&hourly=cloudcover_low,cloudcover_mid,cloudcover_high&forecast_days=3&timezone=auto`;
    const req = await requestTextDetailed(url, 12000);

    if (!req.ok) {
      _setLedger("clouds", {
        provider: "open-meteo",
        url,
        fetchedAt: req.fetchedAt,
        fetchAgeMin: 0,
        dataTime: null,
        dataAgeMin: null,
        ok: false,
        status: "bad",
        reason: req.errorMsg || "",
        errorType: req.errorType || "",
        errorMsg: req.errorMsg || "",
        latencyMs: req.latencyMs,
        httpStatus: req.httpStatus,
        sample: { low: null, mid: null, high: null, max3: null }
      });
      throw new Error(req.errorMsg || "request failed");
    }

    try {
      const t = req.data;
      if (!t) throw new Error("empty");
      const j = JSON.parse(t);
      const dataTime = Array.isArray(j?.hourly?.time) ? j.hourly.time[0] : null;
      _setLedger("clouds", {
        provider: "open-meteo",
        url,
        fetchedAt: req.fetchedAt,
        fetchAgeMin: 0,
        dataTime,
        dataAgeMin: _computeAgeMin(dataTime),
        ok: true,
        status: "ok",
        reason: "",
        errorType: "",
        errorMsg: "",
        latencyMs: req.latencyMs,
        httpStatus: req.httpStatus,
        sample: _cloudSample(j)
      });
      return j;
    } catch (e) {
      const msg = String(e?.message || e);
      _setLedger("clouds", {
        provider: "open-meteo",
        url,
        fetchedAt: req.fetchedAt,
        fetchAgeMin: 0,
        dataTime: null,
        dataAgeMin: null,
        ok: false,
        status: "bad",
        reason: msg,
        errorType: "parse",
        errorMsg: msg,
        latencyMs: req.latencyMs,
        httpStatus: req.httpStatus,
        sample: { low: null, mid: null, high: null, max3: null }
      });
      throw e;
    }
  }

  function getAuditLedger() {
    const audit = _ensureAudit();
    return JSON.parse(JSON.stringify(audit.ledger || {}));
  }

  function getAuditSnapshot() {
    const audit = _ensureAudit();
    return JSON.parse(JSON.stringify(audit));
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
    fetchCloudsRaw,
    getAuditLedger,
    getAuditSnapshot
  };

  _ensureAudit();
})();
