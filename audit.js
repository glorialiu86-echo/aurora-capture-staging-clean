// Hidden audit view (?audit=1) - read-only by default.
(() => {
  const PASS = "yoyoyoyo";
  const UNLOCK_KEY = "ac_audit_unlock_v1";

  function isPreviewHost() {
    try {
      return location.hostname === "glorialiu86-echo.github.io" && location.pathname.startsWith("/aurora-capture-staging-clean/");
    } catch (_) {
      return false;
    }
  }

  function readFlag(key) {
    try {
      const v = localStorage.getItem(key);
      if (v == null) return false;
      if (v === "1" || v === "true") return true;
      try {
        return JSON.parse(v) === true;
      } catch (_) {
        return false;
      }
    } catch (_) {
      return false;
    }
  }

  const qs = new URLSearchParams(window.location.search);
  const auditParam = qs.get("audit");

  if (isPreviewHost() && auditParam === "1") {
    try { localStorage.setItem("AUDIT_MODE", "1"); } catch (_) {}
  }

  const auditEnabled = isPreviewHost()
    ? (auditParam === "1" || readFlag("AUDIT_MODE") || readFlag("ac_auth_stub"))
    : (auditParam === "1");

  if (!auditEnabled) return;

  const byId = (id) => document.getElementById(id);

  function getSnapshot() {
    try {
      if (window.DataProvider && typeof window.DataProvider.getAuditSnapshot === "function") {
        return window.DataProvider.getAuditSnapshot();
      }
      const raw = sessionStorage.getItem("ac_audit_ledger_v1");
      if (!raw) return { ledger: {}, updatedAt: null };
      return JSON.parse(raw);
    } catch (_) {
      return { ledger: {}, updatedAt: null };
    }
  }

  function esc(v) {
    return String(v == null ? "" : v)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll("\"", "&quot;")
      .replaceAll("'", "&#39;");
  }

  function ageMinText(iso) {
    const t = Date.parse(iso || "");
    if (!Number.isFinite(t)) return "—";
    return `${Math.max(0, Math.round((Date.now() - t) / 60000))}m`;
  }

  function renderLocked() {
    const lock = byId("auditLock");
    const board = byId("auditBoard");
    if (lock) lock.style.display = "";
    if (board) board.style.display = "none";
  }

  function renderBoard() {
    const lock = byId("auditLock");
    const board = byId("auditBoard");
    const updated = byId("auditUpdatedAt");
    const tbody = byId("auditTbody");
    if (lock) lock.style.display = "none";
    if (board) board.style.display = "";
    if (!tbody) return;

    const snap = getSnapshot();
    const ledger = snap?.ledger && typeof snap.ledger === "object" ? snap.ledger : {};
    const rows = Object.values(ledger);

    if (updated) updated.textContent = snap?.updatedAt ? `${snap.updatedAt} (${ageMinText(snap.updatedAt)})` : "—";

    if (!rows.length) {
      tbody.innerHTML = "<tr><td colspan=\"11\">No ledger records yet.</td></tr>";
      return;
    }

    rows.sort((a, b) => Date.parse(b?.updatedAt || 0) - Date.parse(a?.updatedAt || 0));
    tbody.innerHTML = rows.map((r) => {
      const sample = esc(JSON.stringify(r.sample || {}));
      return `<tr>
<td>${esc(r.key)}</td>
<td>${esc(r.provider || "")}</td>
<td style=\"max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;\" title=\"${esc(r.url || "")}\">${esc(r.url || "")}</td>
<td>${esc(r.status || "")}</td>
<td>${esc(r.ok)}</td>
<td title=\"${esc(r.fetchedAt || "")}\">${esc(r.fetchedAt || "")}<br><small>${ageMinText(r.fetchedAt)}</small></td>
<td title=\"${esc(r.dataTime || "")}\">${esc(r.dataTime || "")}<br><small>${r.dataTime ? ageMinText(r.dataTime) : "—"}</small></td>
<td>${esc(r.httpStatus)}</td>
<td>${esc(r.latencyMs)}</td>
<td>${esc(r.errorType || "")}<br><small>${esc(r.errorMsg || r.reason || "")}</small></td>
<td style=\"max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;\" title=\"${sample}\">${sample}</td>
</tr>`;
    }).join("");
  }

  function isUnlocked() {
    try {
      return sessionStorage.getItem(UNLOCK_KEY) === "1";
    } catch (_) {
      return false;
    }
  }

  function setUnlocked(v) {
    try {
      if (v) sessionStorage.setItem(UNLOCK_KEY, "1");
      else sessionStorage.removeItem(UNLOCK_KEY);
    } catch (_) {
      // ignore
    }
  }

  function boot() {
    const root = byId("auditContainer");
    if (!root) return;
    root.style.display = "";

    byId("auditUnlockBtn")?.addEventListener("click", () => {
      const input = byId("auditPass");
      const err = byId("auditErr");
      const val = (input?.value || "").trim();
      if (val === PASS) {
        setUnlocked(true);
        if (err) err.textContent = "";
        renderBoard();
      } else if (err) {
        err.textContent = "口令错误";
      }
    });

    byId("auditRefreshBtn")?.addEventListener("click", () => {
      renderBoard();
    });

    if (isUnlocked()) renderBoard();
    else renderLocked();
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
