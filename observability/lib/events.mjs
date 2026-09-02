import { redactHomePath, sanitize, TITLE_BOUND, DETAIL_BOUND } from "./redact.mjs";

const MUTATING = new Set(["write", "edit", "shell"]);

export function isMcpName(name) {
  if (!name) return false;
  const n = String(name).toLowerCase();
  return n.startsWith("mcp_") || n.startsWith("mcp__") || n.startsWith("mcp/") || n.includes("mcp");
}

function parseArgs(raw) {
  if (typeof raw !== "string" || !raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function looksError(content) {
  if (typeof content !== "string" || !content) return false;
  return (
    /^\s*error[:\s]/i.test(content) ||
    /\bexit code\b/i.test(content) ||
    /\btimed? out\b/i.test(content) ||
    /\bfailed\b/i.test(content)
  );
}

function looksApproval(text) {
  if (typeof text !== "string") return false;
  return /requires approval|allow\?\s*\(y\/n\)|approval-wait|waiting for approval/i.test(text);
}

function eventBase(id, cls, kind, title, detail, badges = []) {
  return {
    id,
    cls,
    kind,
    title: sanitize(title, TITLE_BOUND),
    detail: sanitize(detail, DETAIL_BOUND),
    badges,
  };
}

export function parseSessionJsonl(raw, { locked = false } = {}) {
  const events = [];
  const pending = new Map();
  const lines = String(raw ?? "").split("\n");
  let turn = 0;
  let seq = 0;

  const push = (partial) => {
    seq += 1;
    events.push({ ...partial, seq });
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) continue;
    let rec;
    try {
      rec = JSON.parse(line);
    } catch {
      push(
        eventBase(`${i}:bad`, "error", "parse", "Unparseable JSONL line", line.slice(0, 200), [
          "error",
          "corrupt",
        ]),
      );
      continue;
    }

    if (rec && rec.meta === true) {
      const title = rec.model ? `session · ${rec.model}` : "session meta";
      const bits = [rec.workspace ? redactHomePath(rec.workspace) : "", rec.profile].filter(Boolean).join(" · ");
      push(eventBase(`${i}:meta`, "meta", "session-meta", title, bits, ["meta"]));
      continue;
    }

    const role = rec?.role;
    if (role === "system") {
      push(eventBase(`${i}:sys`, "system", "system", "system", rec.content ?? "", ["system"]));
      continue;
    }

    if (role === "user") {
      turn += 1;
      const content = rec.content ?? "";
      const approval = looksApproval(content) ? "needed" : undefined;
      push({
        ...eventBase(`${i}:user`, "turn", "user", `turn ${turn}`, content, ["user", `t${turn}`]),
        turn,
        approval,
      });
      continue;
    }

    if (role === "assistant") {
      if (rec.content) {
        const badges = ["assistant"];
        if (rec.interrupted) badges.push("interrupted");
        push({
          ...eventBase(`${i}:asst`, "turn", rec.interrupted ? "assistant-interrupted" : "assistant", "assistant", rec.content, badges),
          turn,
        });
      }
      const calls = Array.isArray(rec.tool_calls) ? rec.tool_calls : [];
      for (let c = 0; c < calls.length; c += 1) {
        const call = calls[c];
        const name = call?.function?.name || "tool";
        const args = parseArgs(call?.function?.arguments);
        const mcp = isMcpName(name) || typeof args.server === "string" ? args.server || name : undefined;
        const cls = mcp ? "mcp" : "tool";
        const badges = [name];
        if (mcp) badges.push("mcp");
        if (MUTATING.has(name) || mcp) badges.push("mutate");
        const ev = {
          ...eventBase(`${i}:call:${c}`, cls, "tool-call", name, rec.content ?? JSON.stringify(args), badges),
          tool: name,
          path: typeof args.path === "string" ? sanitize(args.path, 160) : undefined,
          command: typeof args.command === "string" ? sanitize(args.command, 200) : undefined,
          mcp,
          turn,
        };
        push(ev);
        if (call?.id) pending.set(call.id, { name, mcp, mutating: MUTATING.has(name) || Boolean(mcp), evId: ev.id });
      }
      continue;
    }

    if (role === "tool") {
      const name = pending.get(rec.tool_call_id)?.name;
      pending.delete(rec.tool_call_id);
      const content = rec.content ?? "";
      const err = rec.isError === true || looksError(content);
      const mcp = name && isMcpName(name) ? name : undefined;
      const cls = err ? "error" : mcp ? "mcp" : "tool";
      const badges = [name || "tool", err ? "error" : "ok"];
      if (mcp) badges.push("mcp");
      push({
        ...eventBase(`${i}:tool`, cls, err ? "tool-error" : "tool-result", name || "tool result", content, badges),
        tool: name,
        mcp,
        turn,
      });
      continue;
    }

    push(eventBase(`${i}:unk`, "meta", "unknown", "record", JSON.stringify(rec).slice(0, 200), ["unknown"]));
  }

  if (locked) {
    for (const [callId, info] of pending) {
      const approval = info.mutating ? "wait" : undefined;
      const badges = [info.name, "in-flight"];
      if (info.mcp) badges.push("mcp");
      if (approval) badges.push("approval-wait");
      push({
        ...eventBase(`pend:${callId}`, approval ? "approval" : "tool", approval ? "approval-wait" : "in-flight", info.name, "No tool result yet — session is locked.", badges),
        tool: info.name,
        mcp: info.mcp,
        approval,
      });
    }
  }

  return events;
}

export function summarize(events) {
  const counters = { events: events.length, tools: 0, mcp: 0, approvals: 0, errors: 0, turns: 0 };
  const tools = new Map();
  const mcp = new Map();
  const recentTools = [];
  const approvals = [];
  for (const ev of events) {
    if (ev.kind === "user") counters.turns += 1;
    if (ev.cls === "tool" || ev.kind === "tool-call" || ev.kind === "tool-result" || ev.kind === "tool-error") {
      counters.tools += 1;
    }
    if (ev.cls === "mcp" || ev.badges?.includes("mcp")) counters.mcp += 1;
    if (ev.cls === "approval" || ev.approval || ev.badges?.includes("approval-wait")) counters.approvals += 1;
    if (ev.cls === "error" || ev.badges?.includes("error")) counters.errors += 1;
    if (ev.tool) {
      tools.set(ev.tool, (tools.get(ev.tool) || 0) + 1);
      if (ev.kind === "tool-call" || ev.kind === "tool-result" || ev.kind === "tool-error" || ev.kind === "approval-wait") {
        recentTools.push(ev);
      }
    }
    if (ev.mcp) mcp.set(ev.mcp, (mcp.get(ev.mcp) || 0) + 1);
    if (ev.cls === "approval" || ev.approval) approvals.push(ev);
  }
  return {
    counters,
    toolHistogram: [...tools.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
    mcpHistogram: [...mcp.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
    recentTools: recentTools.slice(-40).reverse(),
    approvals: approvals.slice().reverse(),
  };
}
