import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { redactHomePath, sanitize } from "./redact.mjs";

export function sessionsDir() {
  if (process.env.OMC_SESSIONS_DIR) return path.resolve(process.env.OMC_SESSIONS_DIR);
  return path.join(os.homedir(), ".oh-my-cli", "sessions");
}

export function isPidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err?.code === "EPERM";
  }
}

export function readLock(lockPath) {
  try {
    const parsed = JSON.parse(fs.readFileSync(lockPath, "utf8"));
    if (typeof parsed.pid === "number" && typeof parsed.lockedAt === "number") {
      return { pid: parsed.pid, lockedAt: parsed.lockedAt, alive: isPidAlive(parsed.pid) };
    }
  } catch {
    /* missing or unreadable */
  }
  return null;
}

function readJsonSidecar(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function readMeta(filePath) {
  try {
    const fd = fs.openSync(filePath, "r");
    try {
      const buf = Buffer.alloc(4096);
      const n = fs.readSync(fd, buf, 0, buf.length, 0);
      const first = buf.toString("utf8", 0, n).split("\n")[0];
      const parsed = JSON.parse(first);
      if (parsed && parsed.meta === true) {
        return {
          model: typeof parsed.model === "string" ? parsed.model : null,
          workspace: typeof parsed.workspace === "string" ? redactHomePath(parsed.workspace) : null,
          createdAt: typeof parsed.createdAt === "number" ? parsed.createdAt : null,
        };
      }
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    /* empty or unreadable */
  }
  return { model: null, workspace: null, createdAt: null };
}

export function listSessions(dir = sessionsDir()) {
  let names = [];
  try {
    names = fs.readdirSync(dir);
  } catch {
    return [];
  }
  const out = [];
  for (const name of names) {
    if (!name.endsWith(".jsonl")) continue;
    const id = name.slice(0, -".jsonl".length);
    if (!id || /[/\\]/.test(id)) continue;
    const filePath = path.join(dir, name);
    let st;
    try {
      st = fs.statSync(filePath);
    } catch {
      continue;
    }
    const lock = readLock(path.join(dir, `${id}.lock`));
    const named = readJsonSidecar(path.join(dir, `${id}.name.json`));
    const archived = readJsonSidecar(path.join(dir, `${id}.archived.json`));
    const pinned = readJsonSidecar(path.join(dir, `${id}.pinned.json`));
    const meta = readMeta(filePath);
    out.push({
      id,
      shortId: id.slice(0, 8),
      name: typeof named?.name === "string" ? sanitize(named.name, 80) : null,
      path: redactHomePath(filePath),
      bytes: st.size,
      mtime: st.mtimeMs,
      locked: Boolean(lock),
      lockAlive: Boolean(lock?.alive),
      lockPid: lock?.pid ?? null,
      lockAt: lock?.lockedAt ?? null,
      archived: archived?.archived === true,
      pinned: pinned?.pinned === true,
      model: meta.model,
      workspace: meta.workspace,
      createdAt: meta.createdAt,
    });
  }
  out.sort((a, b) => {
    if (a.lockAlive !== b.lockAlive) return a.lockAlive ? -1 : 1;
    if (a.locked !== b.locked) return a.locked ? -1 : 1;
    return b.mtime - a.mtime;
  });
  return out;
}

export function resolveSession(explicitId, dir = sessionsDir()) {
  const all = listSessions(dir);
  if (explicitId) {
    const hit =
      all.find((s) => s.id === explicitId) ||
      all.find((s) => s.id.startsWith(explicitId)) ||
      all.find((s) => s.shortId === explicitId);
    return { session: hit ?? null, reason: hit ? "explicit" : "missing" };
  }
  const liveLocked = all.filter((s) => s.lockAlive);
  if (liveLocked.length) {
    liveLocked.sort((a, b) => (b.lockAt ?? b.mtime) - (a.lockAt ?? a.mtime));
    return { session: liveLocked[0], reason: "locked" };
  }
  if (all.length) return { session: all[0], reason: "newest" };
  return { session: null, reason: "empty" };
}
