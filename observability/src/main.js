import "./style.css";
import { createGraph } from "./graph.js";

const state = {
  events: [],
  sessions: [],
  session: null,
  summary: null,
  filter: "all",
  tab: "live",
};

const graph = createGraph(document.getElementById("graph-root"));

function $(id) {
  return document.getElementById(id);
}

function setTab(name) {
  state.tab = name;
  for (const btn of document.querySelectorAll(".tab")) {
    btn.classList.toggle("on", btn.dataset.tab === name);
  }
  for (const panel of document.querySelectorAll(".panel")) {
    panel.classList.toggle("on", panel.id === `panel-${name}`);
  }
  if (name === "graph") graph.resize();
}

function badges(list) {
  return (list || [])
    .map((b) => {
      const extra = ["mcp", "approval-wait", "error", "ok", "mutate", "corrupt"].includes(b) ? b : "";
      return `<span class="badge ${extra}">${esc(b)}</span>`;
    })
    .join("");
}

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function row(ev, compact = false) {
  const cls = ev.cls === "error" ? "row-error" : ev.cls === "approval" ? "row-approval" : ev.cls === "mcp" ? "row-mcp" : "";
  const meta = [ev.tool, ev.path, ev.command, ev.mcp, ev.approval].filter(Boolean).join(" · ");
  const detail = [ev.detail, meta !== ev.detail ? meta : ""].filter(Boolean).join(" — ");
  if (compact) {
    return `<li class="${cls}"><span class="k">${esc(ev.cls)}</span><span class="t">${esc(ev.title)}</span><span class="d">${esc(detail)}</span></li>`;
  }
  return `<li class="${cls}">
    <span class="k">${esc(ev.kind)}</span>
    <span class="t">${esc(ev.title)}</span>
    <span class="d">${esc(detail)}</span>
    <span class="badges">${badges(ev.badges)}</span>
  </li>`;
}

function matchesFilter(ev) {
  if (state.filter === "all") return ev.cls !== "ctl";
  if (state.filter === "tool") return ev.cls === "tool" || ev.kind?.startsWith("tool");
  if (state.filter === "mcp") return ev.cls === "mcp" || ev.badges?.includes("mcp");
  if (state.filter === "approval") return ev.cls === "approval" || ev.approval || ev.badges?.includes("approval-wait");
  if (state.filter === "error") return ev.cls === "error" || ev.badges?.includes("error");
  return true;
}

function renderLive() {
  const events = state.events.filter(matchesFilter);
  $("empty-live").classList.toggle("hidden", state.events.length > 0);
  $("live-list").innerHTML = events.map((ev) => row(ev)).join("");
  $("live-list").scrollTop = $("live-list").scrollHeight;
}

function renderTools() {
  const hist = state.summary?.toolHistogram || [];
  const mcp = state.summary?.mcpHistogram || [];
  const maxT = hist[0]?.[1] || 1;
  const maxM = mcp[0]?.[1] || 1;
  $("tool-hist").innerHTML = hist.length
    ? hist.map(([name, n]) => `<li><b>${esc(name)}</b><div class="bar"><span style="width:${(n / maxT) * 100}%"></span></div><i>${n}</i></li>`).join("")
    : "<li class='empty'>No tool calls yet.</li>";
  $("mcp-hist").innerHTML = mcp.length
    ? mcp.map(([name, n]) => `<li><b>${esc(name)}</b><div class="bar mcp"><span style="width:${(n / maxM) * 100}%"></span></div><i>${n}</i></li>`).join("")
    : "<li class='empty'>No MCP calls yet.</li>";
  $("tool-recent").innerHTML = (state.summary?.recentTools || []).map((ev) => row(ev, true)).join("");
}

function renderApprovals() {
  const items = state.events.filter((ev) => ev.cls === "approval" || ev.approval || ev.badges?.includes("approval-wait"));
  $("empty-approvals").classList.toggle("hidden", items.length > 0);
  $("approval-list").innerHTML = items.map((ev) => row(ev)).join("");
}

function lockLabel(s) {
  if (s.lockAlive) return `<span class="lock-live">live pid ${s.lockPid}</span>`;
  if (s.locked) return `<span class="lock-stale">stale</span>`;
  return `<span class="lock-off">unlocked</span>`;
}

function renderSessions() {
  const rows = state.sessions;
  $("empty-sessions").classList.toggle("hidden", rows.length > 0);
  $("session-rows").innerHTML = rows
    .map((s) => {
      const when = s.mtime ? new Date(s.mtime).toISOString().replace("T", " ").slice(0, 19) : "—";
      return `<tr>
        <td><button type="button" data-sid="${esc(s.id)}">${esc(s.shortId)}</button>${s.name ? ` <span class="muted">${esc(s.name)}</span>` : ""}</td>
        <td>${lockLabel(s)}</td>
        <td>${esc(s.model || "—")}</td>
        <td>${esc(s.workspace || "—")}</td>
        <td>${when}</td>
        <td>${s.bytes}</td>
      </tr>`;
    })
    .join("");
}

function renderStatus() {
  const el = $("status");
  const s = state.session;
  if (!s) {
    el.className = "status idle";
    el.textContent = "idle — no oh-my-cli session under ~/.oh-my-cli/sessions/";
    return;
  }
  const waiting = state.events.some((ev) => ev.approval === "wait");
  const errors = state.events.some((ev) => ev.cls === "error");
  el.className = `status ${waiting ? "wait" : errors ? "err" : s.lockAlive ? "live" : "replay"}`;
  el.textContent = `${s.lockAlive ? "tailing" : "replay"} ${s.shortId}${s.name ? " · " + s.name : ""} · ${s.lockAlive ? `locked pid ${s.lockPid}` : "unlocked"} · ${s.model || "model?"} · ${s.workspace || ""}`;
}

function recount() {
  const events = state.events;
  const counters = { events: events.length, tools: 0, mcp: 0, approvals: 0, errors: 0 };
  const tools = new Map();
  const mcp = new Map();
  const recentTools = [];
  for (const ev of events) {
    if (ev.cls === "tool" || String(ev.kind || "").startsWith("tool")) counters.tools += 1;
    if (ev.cls === "mcp" || ev.badges?.includes("mcp")) counters.mcp += 1;
    if (ev.cls === "approval" || ev.approval || ev.badges?.includes("approval-wait")) counters.approvals += 1;
    if (ev.cls === "error" || ev.badges?.includes("error")) counters.errors += 1;
    if (ev.tool) {
      tools.set(ev.tool, (tools.get(ev.tool) || 0) + 1);
      if (["tool-call", "tool-result", "tool-error", "approval-wait", "in-flight"].includes(ev.kind)) {
        recentTools.push(ev);
      }
    }
    if (ev.mcp) mcp.set(ev.mcp, (mcp.get(ev.mcp) || 0) + 1);
  }
  state.summary = {
    counters,
    toolHistogram: [...tools.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
    mcpHistogram: [...mcp.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
    recentTools: recentTools.slice(-40).reverse(),
  };
}

function renderCounters() {
  if (!state.summary) recount();
  const c = state.summary.counters;
  $("c-events").textContent = c.events;
  $("c-tools").textContent = c.tools;
  $("c-mcp").textContent = c.mcp;
  $("c-approvals").textContent = c.approvals;
  $("c-errors").textContent = c.errors;
}

function render() {
  renderStatus();
  renderCounters();
  renderLive();
  renderTools();
  renderApprovals();
  renderSessions();
  $("empty-graph").classList.toggle("hidden", state.events.length > 0);
}

function applyHello(msg) {
  state.session = msg.session || null;
  state.sessions = msg.sessions || [];
  state.summary = msg.summary || null;
  if (msg.reset) {
    state.events = [];
    graph.reset();
  }
}

function applyEvent(ev) {
  if (ev.cls === "ctl") {
    if (ev.kind === "hello" || ev.kind === "idle") applyHello(ev);
    if (ev.kind === "idle") {
      state.events = [];
      state.session = null;
      state.summary = null;
      graph.reset();
    }
    render();
    return;
  }
  state.events.push(ev);
  graph.addEvent(ev);
  recount();
  render();
}

function connect() {
  const params = new URLSearchParams(window.location.search);
  const session = params.get("session");
  const src = session ? `/events?session=${encodeURIComponent(session)}` : "/events";
  const es = new EventSource(src);
  es.onmessage = (m) => {
    try {
      applyEvent(JSON.parse(m.data));
    } catch {
      /* ignore a malformed frame */
    }
  };
  es.onerror = () => {
    $("status").className = "status err";
    $("status").textContent = "SSE disconnected — retrying";
  };
}

document.querySelector(".tabs").addEventListener("click", (e) => {
  const tab = e.target.closest(".tab");
  if (tab) setTab(tab.dataset.tab);
});

$("live-filters").addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  state.filter = chip.dataset.filter;
  for (const c of $("live-filters").querySelectorAll(".chip")) c.classList.toggle("on", c === chip);
  renderLive();
});

$("session-rows").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-sid]");
  if (!btn) return;
  const url = new URL(window.location.href);
  url.searchParams.set("session", btn.dataset.sid);
  window.location.href = url.toString();
});

window.addEventListener("keydown", (e) => {
  const map = { 1: "live", 2: "graph", 3: "tools", 4: "approvals", 5: "sessions" };
  if (map[e.key]) setTab(map[e.key]);
});

connect();
render();
