// Unified request policy (Step 3): timeout + no-store + normalized error structure.
(() => {
  function _classifyError(err) {
    if (err?.name === "AbortError") return "timeout";
    return "network";
  }

  async function _request(url, opts = {}) {
    const timeoutMs = Number.isFinite(Number(opts.timeoutMs)) ? Number(opts.timeoutMs) : 12000;
    const cacheMode = opts.cache || "no-store";
    const parseAs = opts.parseAs || "json"; // "json" | "text"
    const fetchedAt = new Date().toISOString();
    const started = Date.now();

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { cache: cacheMode, signal: ctrl.signal });
      const latencyMs = Date.now() - started;
      const httpStatus = res.status;
      if (!res.ok) {
        return {
          ok: false,
          httpStatus,
          errorType: "http",
          errorMsg: `HTTP ${httpStatus}`,
          latencyMs,
          fetchedAt,
          data: null
        };
      }

      const data = parseAs === "text" ? await res.text() : await res.json();
      return {
        ok: true,
        httpStatus,
        errorType: null,
        errorMsg: "",
        latencyMs,
        fetchedAt,
        data
      };
    } catch (err) {
      const latencyMs = Date.now() - started;
      return {
        ok: false,
        httpStatus: null,
        errorType: _classifyError(err),
        errorMsg: String(err?.message || err),
        latencyMs,
        fetchedAt,
        data: null
      };
    } finally {
      clearTimeout(timer);
    }
  }

  async function requestJson(url, opts = {}) {
    return _request(url, { ...opts, parseAs: "json" });
  }

  async function requestText(url, opts = {}) {
    return _request(url, { ...opts, parseAs: "text" });
  }

  window.RequestPolicy = {
    requestJson,
    requestText
  };
})();
