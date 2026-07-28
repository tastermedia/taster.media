#!/usr/bin/env python3
"""
arr-remote — add movies & shows to Radarr / Sonarr from your phone.

A single-file, zero-dependency web app. Run it on the same machine as
Radarr/Sonarr (or anywhere on your tailnet) and open it from your phone
over Tailscale.

Usage:
    python3 app.py

Configuration (first match wins):
    1. arr-remote/config.json  (copy config.example.json)
    2. environment variables:
         RADARR_URL, RADARR_API_KEY
         SONARR_URL, SONARR_API_KEY
         ARR_REMOTE_HOST (default 0.0.0.0)
         ARR_REMOTE_PORT (default 7878-ish -> 8585)

Nothing here is stored except the config file, and no traffic leaves your
tailnet: the browser on your phone talks to this server, and this server
talks to Radarr/Sonarr on localhost/LAN.
"""

import json
import os
import ssl
import sys
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(HERE, "config.json")

DEFAULT_HOST = "0.0.0.0"
DEFAULT_PORT = 8585


# --------------------------------------------------------------------------
# Configuration
# --------------------------------------------------------------------------
def load_config():
    """Load config from config.json, falling back to environment variables."""
    cfg = {}
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as fh:
                cfg = json.load(fh)
        except (OSError, ValueError) as exc:
            sys.stderr.write(f"[arr-remote] Could not read config.json: {exc}\n")

    def env_service(prefix):
        url = os.environ.get(f"{prefix}_URL")
        key = os.environ.get(f"{prefix}_API_KEY")
        if url or key:
            return {"url": url or "", "apiKey": key or ""}
        return None

    for name, prefix in (("radarr", "RADARR"), ("sonarr", "SONARR")):
        env = env_service(prefix)
        if env and not cfg.get(name):
            cfg[name] = env

    cfg["host"] = os.environ.get("ARR_REMOTE_HOST", cfg.get("host", DEFAULT_HOST))
    cfg["port"] = int(os.environ.get("ARR_REMOTE_PORT", cfg.get("port", DEFAULT_PORT)))
    return cfg


CONFIG = load_config()


def service_conf(kind):
    """Return normalized {url, apiKey} for 'radarr' or 'sonarr', or None."""
    svc = CONFIG.get(kind)
    if not svc or not svc.get("url") or not svc.get("apiKey"):
        return None
    return {"url": svc["url"].rstrip("/"), "apiKey": svc["apiKey"]}


# --------------------------------------------------------------------------
# Talking to Radarr / Sonarr
# --------------------------------------------------------------------------
# Radarr/Sonarr on a tailnet often use self-signed certs; be forgiving.
_SSL_CTX = ssl.create_default_context()
_SSL_CTX.check_hostname = False
_SSL_CTX.verify_mode = ssl.CERT_NONE


class ArrError(Exception):
    def __init__(self, message, status=502):
        super().__init__(message)
        self.status = status


def arr_request(kind, path, method="GET", params=None, body=None):
    """Make an authenticated request to a Radarr/Sonarr v3 API endpoint."""
    conf = service_conf(kind)
    if not conf:
        raise ArrError(f"{kind.capitalize()} is not configured.", status=400)

    url = f"{conf['url']}/api/v3/{path.lstrip('/')}"
    if params:
        url += "?" + urllib.parse.urlencode(params)

    data = None
    headers = {"X-Api-Key": conf["apiKey"], "Accept": "application/json"}
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"

    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30, context=_SSL_CTX) as resp:
            raw = resp.read()
            if not raw:
                return None
            return json.loads(raw)
    except urllib.error.HTTPError as exc:
        detail = ""
        try:
            detail = exc.read().decode("utf-8", "replace")[:500]
        except Exception:  # noqa: BLE001
            pass
        raise ArrError(
            f"{kind.capitalize()} returned HTTP {exc.code}. {detail}".strip(),
            status=502,
        )
    except urllib.error.URLError as exc:
        raise ArrError(
            f"Could not reach {kind.capitalize()} at {conf['url']}: {exc.reason}",
            status=502,
        )
    except (TimeoutError, OSError) as exc:
        raise ArrError(f"Could not reach {kind.capitalize()}: {exc}", status=502)


# --------------------------------------------------------------------------
# API handlers
# --------------------------------------------------------------------------
def api_config():
    """Report which services are configured, plus their profiles/folders."""
    out = {"radarr": None, "sonarr": None}
    for kind in ("radarr", "sonarr"):
        if not service_conf(kind):
            continue
        try:
            profiles = arr_request(kind, "qualityprofile") or []
            folders = arr_request(kind, "rootfolder") or []
            out[kind] = {
                "connected": True,
                "profiles": [
                    {"id": p["id"], "name": p["name"]} for p in profiles
                ],
                "rootFolders": [
                    {"path": f["path"], "freeSpace": f.get("freeSpace")}
                    for f in folders
                ],
            }
        except ArrError as exc:
            out[kind] = {"connected": False, "error": str(exc)}
    return out


def api_search(query, kind):
    """Look up movies (radarr) or series (sonarr) by term."""
    if not query.strip():
        return []
    if kind == "radarr":
        results = arr_request("radarr", "movie/lookup", params={"term": query}) or []
        return [_movie_card(m) for m in results[:20]]
    if kind == "sonarr":
        results = arr_request("sonarr", "series/lookup", params={"term": query}) or []
        return [_series_card(s) for s in results[:20]]
    raise ArrError("Unknown service.", status=400)


def _poster(images):
    for img in images or []:
        if img.get("coverType") == "poster":
            return img.get("remoteUrl") or img.get("url")
    return None


def _movie_card(m):
    return {
        "type": "radarr",
        "id": m.get("tmdbId"),
        "title": m.get("title"),
        "year": m.get("year"),
        "overview": m.get("overview"),
        "poster": _poster(m.get("images")),
        "exists": bool(m.get("id")),  # already in Radarr library
        "raw": m,
    }


def _series_card(s):
    return {
        "type": "sonarr",
        "id": s.get("tvdbId"),
        "title": s.get("title"),
        "year": s.get("year"),
        "overview": s.get("overview"),
        "poster": _poster(s.get("images")),
        "exists": bool(s.get("id")),  # already in Sonarr library
        "raw": s,
    }


def api_add(payload):
    """Add a movie or series to the library and trigger a search."""
    kind = payload.get("type")
    item = payload.get("raw")
    profile_id = payload.get("qualityProfileId")
    root_folder = payload.get("rootFolderPath")

    if not item:
        raise ArrError("Missing item to add.", status=400)
    if not profile_id:
        raise ArrError("Please choose a quality profile.", status=400)
    if not root_folder:
        raise ArrError("Please choose a root folder.", status=400)

    if kind == "radarr":
        body = dict(item)
        body.update(
            {
                "qualityProfileId": int(profile_id),
                "rootFolderPath": root_folder,
                "monitored": True,
                "minimumAvailability": "released",
                "addOptions": {"searchForMovie": True},
            }
        )
        body.pop("id", None)
        created = arr_request("radarr", "movie", method="POST", body=body)
        return {"ok": True, "title": created.get("title") if created else item.get("title")}

    if kind == "sonarr":
        body = dict(item)
        body.update(
            {
                "qualityProfileId": int(profile_id),
                "rootFolderPath": root_folder,
                "monitored": True,
                "seasonFolder": True,
                "addOptions": {
                    "searchForMissingEpisodes": True,
                    "monitor": "all",
                },
            }
        )
        body.pop("id", None)
        created = arr_request("sonarr", "series", method="POST", body=body)
        return {"ok": True, "title": created.get("title") if created else item.get("title")}

    raise ArrError("Unknown service.", status=400)


# --------------------------------------------------------------------------
# HTTP server
# --------------------------------------------------------------------------
class Handler(BaseHTTPRequestHandler):
    server_version = "arr-remote/1.0"

    def log_message(self, fmt, *args):  # quieter logs
        sys.stderr.write("[arr-remote] " + (fmt % args) + "\n")

    def _send_json(self, obj, status=200):
        payload = json.dumps(obj).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(payload)

    def _send_asset(self, body, content_type):
        data = body.encode("utf-8") if isinstance(body, str) else body
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        try:
            if path in ("/", "/index.html"):
                return self._send_asset(INDEX_HTML, "text/html; charset=utf-8")
            if path == "/manifest.json":
                return self._send_asset(MANIFEST_JSON, "application/manifest+json")
            if path == "/api/config":
                return self._send_json(api_config())
            if path == "/api/search":
                q = urllib.parse.parse_qs(parsed.query)
                term = (q.get("q") or [""])[0]
                kind = (q.get("type") or ["radarr"])[0]
                return self._send_json(api_search(term, kind))
            return self._send_json({"error": "Not found"}, status=404)
        except ArrError as exc:
            return self._send_json({"error": str(exc)}, status=exc.status)
        except Exception as exc:  # noqa: BLE001
            return self._send_json({"error": f"Unexpected error: {exc}"}, status=500)

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        try:
            length = int(self.headers.get("Content-Length", 0))
            raw = self.rfile.read(length) if length else b""
            payload = json.loads(raw or b"{}")
            if parsed.path == "/api/add":
                return self._send_json(api_add(payload))
            return self._send_json({"error": "Not found"}, status=404)
        except ArrError as exc:
            return self._send_json({"error": str(exc)}, status=exc.status)
        except ValueError:
            return self._send_json({"error": "Invalid JSON body."}, status=400)
        except Exception as exc:  # noqa: BLE001
            return self._send_json({"error": f"Unexpected error: {exc}"}, status=500)


def main():
    host, port = CONFIG["host"], CONFIG["port"]
    configured = [k for k in ("radarr", "sonarr") if service_conf(k)]
    if not configured:
        sys.stderr.write(
            "[arr-remote] WARNING: neither Radarr nor Sonarr is configured.\n"
            "  Copy config.example.json to config.json and fill it in,\n"
            "  or set RADARR_URL/RADARR_API_KEY / SONARR_URL/SONARR_API_KEY.\n"
        )
    else:
        sys.stderr.write(f"[arr-remote] Configured: {', '.join(configured)}\n")
    sys.stderr.write(f"[arr-remote] Serving on http://{host}:{port}\n")
    sys.stderr.write(
        "[arr-remote] Open http://<your-tailscale-ip>:"
        f"{port} on your phone.\n"
    )
    ThreadingHTTPServer((host, port), Handler).serve_forever()


# --------------------------------------------------------------------------
# Static assets (embedded so the app stays a single file)
# --------------------------------------------------------------------------
MANIFEST_JSON = json.dumps(
    {
        "name": "arr-remote",
        "short_name": "arr-remote",
        "start_url": "/",
        "display": "standalone",
        "background_color": "#0f1115",
        "theme_color": "#0f1115",
        "icons": [],
    }
)

INDEX_HTML = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0f1115">
<link rel="manifest" href="/manifest.json">
<title>arr-remote</title>
<style>
  :root {
    --bg: #0f1115;
    --panel: #171a21;
    --panel-2: #1e222b;
    --text: #e7e9ee;
    --muted: #8b93a3;
    --accent: #ffb020;
    --radarr: #ffc230;
    --sonarr: #35c5f0;
    --ok: #37d67a;
    --err: #ff5c5c;
    --radius: 14px;
  }
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  html, body { margin: 0; background: var(--bg); color: var(--text);
    font: 16px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  body { padding: env(safe-area-inset-top) 0 env(safe-area-inset-bottom); }
  header {
    position: sticky; top: 0; z-index: 10; background: rgba(15,17,21,.92);
    backdrop-filter: blur(10px); padding: 14px 16px 10px;
    border-bottom: 1px solid #23262f;
  }
  h1 { margin: 0 0 10px; font-size: 20px; letter-spacing: .3px; }
  h1 span { color: var(--accent); }
  .tabs { display: flex; gap: 8px; margin-bottom: 10px; }
  .tab {
    flex: 1; text-align: center; padding: 9px 0; border-radius: 10px;
    background: var(--panel-2); color: var(--muted); border: 1px solid #262a34;
    font-weight: 600; cursor: pointer; user-select: none;
  }
  .tab.active[data-k="radarr"] { color: #1a1300; background: var(--radarr); border-color: var(--radarr); }
  .tab.active[data-k="sonarr"] { color: #012230; background: var(--sonarr); border-color: var(--sonarr); }
  .searchbar { display: flex; gap: 8px; }
  input[type=search] {
    flex: 1; padding: 12px 14px; font-size: 16px; border-radius: 12px;
    border: 1px solid #2a2f3a; background: var(--panel); color: var(--text); outline: none;
  }
  input[type=search]:focus { border-color: var(--accent); }
  button {
    font: inherit; cursor: pointer; border: none; border-radius: 12px;
    padding: 12px 16px; font-weight: 600; background: var(--accent); color: #1a1300;
  }
  button:disabled { opacity: .5; cursor: default; }
  main { padding: 12px 16px 40px; max-width: 720px; margin: 0 auto; }
  .status { text-align: center; color: var(--muted); padding: 24px 0; }
  .status.err { color: var(--err); }
  .card {
    display: flex; gap: 12px; background: var(--panel); border: 1px solid #23262f;
    border-radius: var(--radius); padding: 10px; margin-bottom: 12px;
  }
  .poster {
    width: 74px; min-width: 74px; height: 110px; border-radius: 8px; object-fit: cover;
    background: var(--panel-2); display: flex; align-items: center; justify-content: center;
    color: var(--muted); font-size: 11px;
  }
  .meta { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .title { font-weight: 700; font-size: 16px; }
  .title .year { color: var(--muted); font-weight: 500; }
  .overview {
    color: var(--muted); font-size: 13px; margin: 4px 0 8px;
    display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
  }
  .row { margin-top: auto; display: flex; gap: 8px; align-items: center; }
  .add { padding: 9px 16px; }
  .badge {
    font-size: 12px; font-weight: 600; color: var(--ok); border: 1px solid #244c37;
    background: #10241a; padding: 8px 12px; border-radius: 10px;
  }
  .settings-link { color: var(--muted); font-size: 13px; text-decoration: none; }
  dialog {
    border: 1px solid #2a2f3a; background: var(--panel); color: var(--text);
    border-radius: var(--radius); padding: 18px; width: min(92vw, 420px);
  }
  dialog::backdrop { background: rgba(0,0,0,.6); }
  label { display: block; font-size: 13px; color: var(--muted); margin: 12px 0 4px; }
  select {
    width: 100%; padding: 11px; border-radius: 10px; background: var(--panel-2);
    color: var(--text); border: 1px solid #2a2f3a; font-size: 15px;
  }
  .dlg-actions { display: flex; gap: 8px; margin-top: 18px; }
  .dlg-actions button { flex: 1; }
  .ghost { background: var(--panel-2); color: var(--text); }
  .toast {
    position: fixed; left: 50%; bottom: calc(20px + env(safe-area-inset-bottom));
    transform: translateX(-50%); background: #23262f; color: var(--text);
    padding: 12px 18px; border-radius: 12px; border: 1px solid #333846;
    box-shadow: 0 8px 24px rgba(0,0,0,.4); opacity: 0; transition: opacity .2s, transform .2s;
    max-width: 90vw; text-align: center; pointer-events: none;
  }
  .toast.show { opacity: 1; transform: translateX(-50%) translateY(-4px); }
  .toast.ok { border-color: #244c37; }
  .toast.err { border-color: #4c2424; }
</style>
</head>
<body>
<header>
  <h1><span>arr</span>-remote &nbsp;<a class="settings-link" href="#" id="reload">refresh</a></h1>
  <div class="tabs">
    <div class="tab active" data-k="radarr" id="tab-radarr">🎬 Movies</div>
    <div class="tab" data-k="sonarr" id="tab-sonarr">📺 Shows</div>
  </div>
  <form class="searchbar" id="searchform">
    <input type="search" id="q" placeholder="Search movies…" autocomplete="off"
           autocapitalize="none" enterkeyhint="search">
    <button type="submit" id="go">Search</button>
  </form>
</header>

<main>
  <div class="status" id="status">Search for something to add.</div>
  <div id="results"></div>
</main>

<dialog id="addDlg">
  <div id="dlgTitle" style="font-weight:700;font-size:17px"></div>
  <label for="profile">Quality profile</label>
  <select id="profile"></select>
  <label for="rootfolder">Root folder</label>
  <select id="rootfolder"></select>
  <div class="dlg-actions">
    <button class="ghost" id="cancelAdd" type="button">Cancel</button>
    <button id="confirmAdd" type="button">Add &amp; search</button>
  </div>
</dialog>

<div class="toast" id="toast"></div>

<script>
const state = { kind: "radarr", config: {}, pending: null };
const $ = (s) => document.querySelector(s);

function toast(msg, cls = "") {
  const t = $("#toast");
  t.textContent = msg;
  t.className = "toast show " + cls;
  clearTimeout(t._t);
  t._t = setTimeout(() => (t.className = "toast " + cls), 2600);
}

async function loadConfig() {
  try {
    state.config = await (await fetch("/api/config")).json();
  } catch (e) {
    state.config = {};
  }
  // If the active tab isn't connected, switch to one that is.
  if (!isConnected(state.kind)) {
    const other = state.kind === "radarr" ? "sonarr" : "radarr";
    if (isConnected(other)) setKind(other);
  }
  reflectTabs();
}

function isConnected(kind) {
  return !!(state.config[kind] && state.config[kind].connected);
}

function reflectTabs() {
  for (const kind of ["radarr", "sonarr"]) {
    const el = $("#tab-" + kind);
    if (!state.config[kind]) { el.style.opacity = .4; }
    else if (!isConnected(kind)) { el.style.opacity = .6; }
    else { el.style.opacity = 1; }
  }
}

function setKind(kind) {
  state.kind = kind;
  document.querySelectorAll(".tab").forEach((t) =>
    t.classList.toggle("active", t.dataset.k === kind));
  $("#q").placeholder = kind === "radarr" ? "Search movies…" : "Search shows…";
}

document.querySelectorAll(".tab").forEach((t) =>
  t.addEventListener("click", () => {
    if (state.config[t.dataset.k] === undefined || state.config[t.dataset.k] === null) {
      toast(t.dataset.k + " is not configured", "err");
      return;
    }
    setKind(t.dataset.k);
    if ($("#q").value.trim()) search();
  }));

$("#reload").addEventListener("click", (e) => { e.preventDefault(); loadConfig().then(() => toast("Refreshed")); });

$("#searchform").addEventListener("submit", (e) => { e.preventDefault(); search(); });

async function search() {
  const term = $("#q").value.trim();
  if (!term) return;
  if (!isConnected(state.kind)) {
    const err = state.config[state.kind] && state.config[state.kind].error;
    setStatus(err || (state.kind + " is not connected."), true);
    return;
  }
  setStatus("Searching…");
  $("#results").innerHTML = "";
  $("#go").disabled = true;
  try {
    const res = await fetch("/api/search?type=" + state.kind +
      "&q=" + encodeURIComponent(term));
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Search failed");
    render(data);
  } catch (e) {
    setStatus(e.message, true);
  } finally {
    $("#go").disabled = false;
  }
}

function setStatus(msg, isErr) {
  const s = $("#status");
  s.textContent = msg;
  s.className = "status" + (isErr ? " err" : "");
  s.style.display = msg ? "block" : "none";
}

function render(items) {
  const wrap = $("#results");
  wrap.innerHTML = "";
  if (!items.length) { setStatus("No results.", false); return; }
  setStatus("", false);
  for (const it of items) {
    const card = document.createElement("div");
    card.className = "card";
    const poster = it.poster
      ? `<img class="poster" src="${it.poster}" alt="" loading="lazy"
             onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'poster',textContent:'no art'}))">`
      : `<div class="poster">no art</div>`;
    const year = it.year ? ` <span class="year">${it.year}</span>` : "";
    const action = it.exists
      ? `<span class="badge">✓ In library</span>`
      : `<button class="add">Add</button>`;
    card.innerHTML = `
      ${poster}
      <div class="meta">
        <div class="title">${escapeHtml(it.title || "Untitled")}${year}</div>
        <div class="overview">${escapeHtml(it.overview || "")}</div>
        <div class="row">${action}</div>
      </div>`;
    if (!it.exists) {
      card.querySelector(".add").addEventListener("click", () => openAdd(it));
    }
    wrap.appendChild(card);
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function openAdd(item) {
  state.pending = item;
  const conf = state.config[item.type];
  const prof = $("#profile");
  const root = $("#rootfolder");
  prof.innerHTML = (conf.profiles || [])
    .map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join("");
  root.innerHTML = (conf.rootFolders || [])
    .map((f) => `<option value="${escapeHtml(f.path)}">${escapeHtml(f.path)}</option>`).join("");
  $("#dlgTitle").textContent =
    (item.title || "") + (item.year ? " (" + item.year + ")" : "");
  $("#addDlg").showModal();
}

$("#cancelAdd").addEventListener("click", () => $("#addDlg").close());

$("#confirmAdd").addEventListener("click", async () => {
  const item = state.pending;
  if (!item) return;
  const btn = $("#confirmAdd");
  btn.disabled = true;
  try {
    const res = await fetch("/api/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: item.type,
        raw: item.raw,
        qualityProfileId: Number($("#profile").value),
        rootFolderPath: $("#rootfolder").value,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Add failed");
    $("#addDlg").close();
    toast("Added " + (data.title || item.title) + " ✓", "ok");
    if ($("#q").value.trim()) search();  // refresh so it shows "In library"
  } catch (e) {
    toast(e.message, "err");
  } finally {
    btn.disabled = false;
  }
});

setKind("radarr");
loadConfig();
</script>
</body>
</html>
"""


if __name__ == "__main__":
    main()
