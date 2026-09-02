import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseSessionJsonl, summarize } from "./lib/events.mjs";
import { listSessions, resolveSession, sessionsDir } from "./lib/sessions.mjs";

const HOST = "127.0.0.1";
const PORT = Number(process.env.OMC_OBS_PORT || 4330);
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(ROOT, "dist");
const POLL_MS = 400;

function log(msg) {
  process.stderr.write(`[obs] ${msg}\n`);
}

function json(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(data),
  });
  res.end(data);
}

function readSessionFile(id) {
  const dir = sessionsDir();
  const filePath = path.join(dir, `${id}.jsonl`);
  if (!filePath.startsWith(dir) || /[/\\]/.test(id) || id.includes("\0")) return null;
  try {
    return { raw: fs.readFileSync(filePath, "utf8"), mtime: fs.statSync(filePath).mtimeMs };
  } catch {
    return null;
  }
}

function snapshot(explicitId) {
  const { session, reason } = resolveSession(explicitId);
  if (!session) {
    return {
      reason,
      session: null,
      events: [],
      summary: summarize([]),
      sessions: listSessions(),
    };
  }
  const file = readSessionFile(session.id);
  const events = parseSessionJsonl(file?.raw ?? "", { locked: session.lockAlive });
  return {
    reason,
    session,
    events,
    summary: summarize(events),
    sessions: listSessions(),
  };
}

function requestedSession(reqUrl) {
  const q = reqUrl.searchParams.get("session") || process.env.OMC_SESSION || "";
  return q.trim() || null;
}

const clients = new Set();

function sendSse(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function attachSse(req, res) {
  const reqUrl = new URL(req.url, `http://${HOST}:${PORT}`);
  const explicit = requestedSession(reqUrl);
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-store",
    Connection: "keep-alive",
  });
  res.write(":\n\n");
  const client = { res, explicit, lastSig: "", lastCount: 0 };
  clients.add(client);
  pushClient(client, true);
  req.on("close", () => clients.delete(client));
}

function signature(snap) {
  const s = snap.session;
  return [
    s?.id ?? "",
    s?.mtime ?? 0,
    s?.lockAlive ? 1 : 0,
    s?.lockPid ?? "",
    snap.events.length,
    snap.reason,
  ].join(":");
}

function pushClient(client, replay) {
  const snap = snapshot(client.explicit);
  const sig = signature(snap);
  if (!snap.session) {
    sendSse(client.res, {
      cls: "ctl",
      kind: "idle",
      title: "No session",
      detail: "oh-my-cli is not writing a session under ~/.oh-my-cli/sessions/. Empty state is expected.",
      badges: ["idle"],
      sessions: snap.sessions,
    });
    client.lastSig = sig;
    client.lastCount = 0;
    return;
  }
  if (replay || sig !== client.lastSig) {
    sendSse(client.res, {
      cls: "ctl",
      kind: "hello",
      title: snap.session.shortId,
      detail: `${snap.reason} · ${snap.session.lockAlive ? "locked" : "replay"}`,
      badges: [snap.reason, snap.session.lockAlive ? "locked" : "unlocked"],
      session: snap.session,
      sessions: snap.sessions,
      summary: snap.summary,
      reset: true,
    });
    for (const ev of snap.events) sendSse(client.res, ev);
    client.lastCount = snap.events.length;
    client.lastSig = sig;
    return;
  }
}

setInterval(() => {
  for (const client of clients) {
    try {
      pushClient(client, false);
    } catch {
      clients.delete(client);
    }
  }
}, POLL_MS);

function safeStatic(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  let rel = decoded === "/" ? "/index.html" : decoded;
  if (rel.endsWith("/")) rel += "index.html";
  const full = path.normalize(path.join(DIST, rel));
  if (!full.startsWith(DIST)) return null;
  return full;
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".map": "application/json",
};

function serveStatic(req, res) {
  const filePath = safeStatic(req.url || "/");
  if (!filePath) {
    res.writeHead(403);
    res.end("forbidden");
    return;
  }
  fs.readFile(filePath, (err, buf) => {
    if (err) {
      if (!fs.existsSync(DIST)) {
        res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Build missing. Run: npm run build\n");
        return;
      }
      if (path.extname(filePath) !== ".html") {
        const index = path.join(DIST, "index.html");
        fs.readFile(index, (indexErr, indexBuf) => {
          if (indexErr) {
            res.writeHead(404);
            res.end("not found");
            return;
          }
          res.writeHead(200, { "Content-Type": MIME[".html"] });
          res.end(indexBuf);
        });
        return;
      }
      res.writeHead(404);
      res.end("not found");
      return;
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream" });
    res.end(buf);
  });
}

const server = http.createServer((req, res) => {
  const reqUrl = new URL(req.url || "/", `http://${HOST}:${PORT}`);
  if (req.method === "GET" && reqUrl.pathname === "/events") {
    attachSse(req, res);
    return;
  }
  if (req.method === "GET" && reqUrl.pathname === "/api/sessions") {
    json(res, 200, { sessions: listSessions(), dir: sessionsDir() });
    return;
  }
  if (req.method === "GET" && reqUrl.pathname === "/api/status") {
    const snap = snapshot(requestedSession(reqUrl));
    json(res, 200, {
      bind: `${HOST}:${PORT}`,
      dir: sessionsDir(),
      reason: snap.reason,
      session: snap.session,
      counters: snap.summary.counters,
      sessions: snap.sessions,
    });
    return;
  }
  if (req.method === "GET" && reqUrl.pathname === "/health") {
    json(res, 200, { ok: true, bind: `${HOST}:${PORT}` });
    return;
  }
  if (req.method === "GET") {
    serveStatic(req, res);
    return;
  }
  res.writeHead(405);
  res.end("method not allowed");
});

server.listen(PORT, HOST, () => {
  log(`listening on http://${HOST}:${PORT} (loopback only)`);
  log(`sessions ${sessionsDir()}`);
  if (!fs.existsSync(DIST)) log("dist/ missing — run npm run build before serving the UI");
});
