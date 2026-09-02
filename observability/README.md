# Observability layer

Ops console for **[HarleyCoops/oh-my-cli](https://github.com/HarleyCoops/oh-my-cli)** long-running harness tasks. It tails real session JSONL under `~/.oh-my-cli/sessions/` and serves a dense tabbed UI on **loopback only**.

This is **not** a fork of oh-my-cli and **not** a replacement for `oh-my-cli --delivery-web` (demo board on `:4317`). Demos stay on 4317. This app watches live (or recent) sessions on `:4330`.

## Install and run (WSL / Linux)

From a clone of **Qwen3.8MaxHarness**:

```bash
cd observability
npm i
npm run build
npm start
```

Then open [http://127.0.0.1:4330](http://127.0.0.1:4330) while `oh-my-cli -p …` runs in another terminal.

The server binds `127.0.0.1:4330` only. If oh-my-cli is not running, the UI stays in an empty idle state (Sessions lists whatever JSONL already exists).

## What you get

| Tab | Purpose |
|-----|---------|
| **Live** | Event list + badges (tool names, mcp, approval-wait, errors) and counters |
| **Graph** | One Three.js spatial mission view (turns / tools / MCP; amber pulse = approval-wait; crimson = errors) |
| **Tools / MCP** | Histogram + recent calls |
| **Approvals** | Filtered approval / in-flight states |
| **Sessions** | Recent `*.jsonl` with lock status (click to pin `?session=`) |

## How it picks a session

1. `?session=<id>` on `/events` or the UI
2. `OMC_SESSION`
3. Newest **live-locked** session (`*.lock` whose pid is still alive)
4. Else newest `*.jsonl` (replay)
5. Else idle / empty

Override the store with `OMC_SESSIONS_DIR` if needed. `OMC_OBS_PORT` changes the port (still loopback).

## Endpoints

| Path | Role |
|------|------|
| `/` | Built Vite UI (`npm run build` writes `dist/`) |
| `/events` | SSE of structured events `{cls, kind, title, detail, badges, tool?, path?, command?, mcp?, approval?}` |
| `/api/sessions` | Session list + lock status |
| `/api/status` | Current tail target + counters |
| `/health` | `{ ok, bind }` |

Secret-looking values (`sk-…`, bearer tokens, `API_KEY=`, URL userinfo, …) are redacted before they hit SSE. The server does not log API keys.

## Layer

Token Plan Qwen → oh-my-cli agent → `~/.oh-my-cli/sessions/*.jsonl` → this app (SSE + console).

Upstream CLI: https://github.com/HarleyCoops/oh-my-cli
