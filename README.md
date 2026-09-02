# Qwen3.8MaxHarness

A thin setup guide and config templates for running **[HarleyCoops/oh-my-cli](https://github.com/HarleyCoops/oh-my-cli)** as a self-evolving code-agent harness against **Qwen3.8-Max** on Alibaba Cloud Model Studio (Singapore / Token Plan).

The verified path below is **Windows WSL (Ubuntu)** with Node 22+ and a Token Plan key. Clone this repo, install oh-my-cli, point it at Model Studio with your own key, and go. **No API keys are stored in this repository.**

How the terminal self-learns via Qwen is explained in [How this terminal self-learns via Qwen](#how-this-terminal-self-learns-via-qwen). After you clone oh-my-cli, read the governance contract locally (`less ~/oh-my-cli/AUTONOMY.md`) or on GitHub: https://github.com/HarleyCoops/oh-my-cli/blob/main/AUTONOMY.md

Once the Token Plan path below works, the [Full surface map](#full-surface-map) inventories every launch surface, session tool, safety gate, and CI flag oh-my-cli exposes — not just install.

---

## What this is

| Item | Detail |
|------|--------|
| Purpose | Setup guide + templates to run oh-my-cli with model qwen3.8-max |
| Target CLI | https://github.com/HarleyCoops/oh-my-cli |
| Model | qwen3.8-max |
| Provider | Alibaba Model Studio (Token Plan / DashScope intl / Singapore), OpenAI-compatible API |

This repo is not a fork of oh-my-cli. Install oh-my-cli separately; use only the env and settings examples here.

The official Qwen Code CLI (`qwen`) can use the same Token Plan credentials. This harness repo is about **oh-my-cli**.

---

## What Model Studio Singapore is

Alibaba Cloud Model Studio hosts LLM APIs (DashScope). The international / Singapore Token Plan path uses:

- Token Plan API keys (`sk-…` or `sk-ws-…`)
- An OpenAI-compatible base URL
- A Token Plan (pay-per-token) workspace that can call models such as `qwen3.8-max`

**Preferred base URL** (works with Model Studio Token Plan / Bailian Token Plan keys):

```text
https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1
```

Alternatives when they match the key:

| Endpoint | When to use it |
|----------|----------------|
| `https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1` | Default for Token Plan / Bailian Token Plan keys |
| `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` | Global DashScope intl compatible-mode, when the key is issued for that endpoint |
| `https://<workspace-id>.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1` | Private MaaS workspace URL + the key from **that same** workspace |

This is different from the Qwen **Coding Plan** product (keys with prefix `sk-sp-`, coding-intl endpoint). Wrong key → HTTP 401. Use a Model Studio / Token Plan key for this guide. Do not mix a global intl key with a private workspace URL (or vice versa).

---

## Windows WSL setup

This is the **verified** path: run it **inside WSL (Ubuntu)**, not raw PowerShell or cmd. Install **Node.js 22+** in WSL (`node -v` should report 22 or newer).

### 1. Clone, build, and link oh-my-cli

```bash
cd ~
git clone https://github.com/HarleyCoops/oh-my-cli.git
cd oh-my-cli
npm install
npm run build
npm link
```

`npm link` puts `oh-my-cli` on your PATH. Without it, run `node dist/index.js` from the clone instead.

### 2. Point oh-my-cli at Qwen3.8-Max (Token Plan)

Environment variables have the **highest** precedence. The verified layout is a user env file (never commit real keys):

```bash
mkdir -p ~/.oh-my-cli
cat > ~/.oh-my-cli/.env <<'EOF'
OPENAI_API_KEY=sk-…your Token Plan key…
OPENAI_BASE_URL=https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1
OPENAI_MODEL=qwen3.8-max
EOF
chmod 600 ~/.oh-my-cli/.env
```

Use a real Token Plan key in place of the placeholder. Keys look like `sk-…` or `sk-ws-…`. Coding Plan keys (`sk-sp-…`) are a different product and will 401 against this URL.

A copy-paste template with the same defaults lives in `.env.example` in this repo.

### 3. Check the install

```bash
oh-my-cli --help
oh-my-cli --doctor
oh-my-cli --preflight
oh-my-cli --trust-workspace
```

`--doctor` checks install/runtime readiness. `--preflight` prints a **redacted** summary of model, endpoint host, settings source, and credential env var name (never the secret). `--trust-workspace` marks the current folder as trusted so the agent can work there under your approval policy.

Optional live ping:

```bash
oh-my-cli -p "Reply with exactly: pong" --approval-mode default
```

### Notes for this path

- Stay in WSL. PowerShell/cmd can have a different Node, PATH, and home directory; the files above live under the **Linux** home (`~/.oh-my-cli`).
- Prefer the Token Plan MaaS URL above. Switch to dashscope-intl or a workspace-specific MaaS URL only when that is what the key was issued for.
- Optional parallel: the official Qwen Code CLI (`qwen`) can use the same Token Plan. This repo documents **oh-my-cli**.

### Alternative: user settings file

You can keep non-secret model config in `~/.oh-my-cli/settings.json` and only export the key. See `settings.example.json` in this repo. Example:

```json
{
  "model": {
    "baseUrl": "https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1",
    "name": "qwen3.8-max",
    "apiKeyEnv": "DASHSCOPE_API_KEY"
  },
  "mcpServers": {},
  "extensions": {}
}
```

Then export the key named by `apiKeyEnv`:

```bash
export DASHSCOPE_API_KEY="sk-…"
```

Copy the template:

```bash
mkdir -p ~/.oh-my-cli
cp settings.example.json ~/.oh-my-cli/settings.json
# edit if needed — never put the raw key in this file
```

A ready-to-edit env template also lives in `.env.example` (copy to `.env` only in a trusted workspace; `.env` is gitignored).

---

## Daily use

**One-shot task** (non-interactive):

```bash
oh-my-cli -p "Summarize the README in this directory" --approval-mode default
```

**Interactive REPL:**

```bash
oh-my-cli
```

**Sessions** are stored as JSONL under `~/.oh-my-cli/sessions/`. Resume with:

```bash
oh-my-cli --list-sessions
oh-my-cli --resume <session-id>
# or continue the latest healthy session for this workspace:
oh-my-cli --continue
```

Approval modes: `default` (prompt for mutating tools), `auto-edit` (allow write/edit), `yolo` (allow all — unsafe). Prefer `default` until you trust the workspace.

Those three commands are the daily loop. The [Full surface map](#full-surface-map) lists the rest of the product.

Full CLI docs: [oh-my-cli README](https://github.com/HarleyCoops/oh-my-cli/blob/main/README.md).

---

## How this terminal self-learns via Qwen

Two layers, one model. Qwen3.8-Max is the brain; oh-my-cli is the hands and the rules.

### Daily agent layer

**oh-my-cli** is a code agent. You talk to it in the terminal; it calls an OpenAI-compatible API. In this harness that API is Model Studio Token Plan, model `qwen3.8-max`.

On a normal day Qwen:

- Reads and edits files in a trusted workspace
- Runs shell commands under your approval mode
- Keeps sessions as JSONL under `~/.oh-my-cli/sessions/`
- Honors folder trust (`--trust-workspace`) so it does not wander outside what you allowed

That is the interactive / one-shot coding assistant. Same CLI you just installed.

### Self-learning / autonomy layer

Under `AUTONOMY.md`, `.autonomy/`, and GitHub workflows **in the oh-my-cli repo**, a coordinator loop can improve the CLI itself. It is a governed product loop, not a dumped chat transcript.

| Step | What happens |
|------|----------------|
| Intake | Product improvements become **normalized Issues** (executable work items, not vibes) |
| Lease | The loop takes **one Issue at a time** and **one mutation branch** |
| Implement | Qwen3.8-Max plans and edits on that branch |
| Gate | Checks and ledger **evidence** must pass before merge |
| Governance | The bot **cannot rewrite** `AUTONOMY.md`, `.autonomy/`, or its own workflow gates |
| Idle | An **empty backlog means idle** — not permission to invent busywork |

The “multi-day self-improving run” story is this loop driving Qwen to improve oh-my-cli, then stopping when there is nothing trusted left to do.

### What Qwen actually does in that loop

Qwen plans the change, edits code, runs verify, and writes evidence. The harness constrains what it may touch, records what it did, and refuses merge without the required checks. Qwen does not get to redefine the rules it is scored against.

Read the contract after you clone (GitHub blob links fail to open in some clients):

```bash
less ~/oh-my-cli/AUTONOMY.md
```

Same file on GitHub: [AUTONOMY.md](https://github.com/HarleyCoops/oh-my-cli/blob/main/AUTONOMY.md)

That contract lives in **oh-my-cli**, not in this setup repo.

---

## Full surface map

Install and [Daily use](#daily-use) get you a Token Plan REPL. oh-my-cli is a larger product: four launch surfaces, a durable session store, a safety plane, a headless CI kit, extension contracts, and the governed loop summarized [above](#how-this-terminal-self-learns-via-qwen). This map inventories what ships so a Qwen3.8-Max Token Plan setup is not mistaken for “install + chat.”

Authoritative detail: [oh-my-cli README](https://github.com/HarleyCoops/oh-my-cli/blob/main/README.md). Flags below match that repo’s `main`.

### Launch surfaces

| Surface | How you open it | What it is |
|---------|-----------------|------------|
| Interactive REPL | `oh-my-cli` | Full-screen / readline shell. Mid-stream `/status`, `/model`, `/settings`, `/tools`, `/capabilities`, `/continuity`, `/help` stay read-only. |
| Non-interactive | `oh-my-cli -p "…"` | One-shot (or `--continue` follow-up) turn. Pair with `--output json` for CI. |
| Web delivery board | `oh-my-cli --delivery-web` | Loopback-only HTTP server at [http://127.0.0.1:4317](http://127.0.0.1:4317). Routes: `/remote-control`, `/dynamic-workflow`. Other port: `--web-port <n>`. No credentials, settings, workspace paths, or file server. |
| Electron Desktop | `npm run desktop` from the **oh-my-cli** clone | Native shell (View → Zoom, 50–200%). Same agent, different window. |

On WSL, keep `oh-my-cli` in Ubuntu and open the loopback URL in a Windows browser. Upstream how-to: [oh-my-cli Web delivery board](https://github.com/HarleyCoops/oh-my-cli#web-delivery-board).

### Sessions

JSONL under `~/.oh-my-cli/sessions/`. Most session flags take an exact id **or** the user-owned name from `--rename-session`. Exact id always wins; ambiguous names fail closed.

| Job | Flags |
|-----|--------|
| Find / resume | `--list-sessions` (`--filter`, `--include-archived`, `--workspace-scoped`), `--browse-sessions`, `--resume <id-or-name>`, `--continue` (latest healthy session for this workspace) |
| Name / keep / hide / branch | `--rename-session` + `--session-name`, `--pin-session` / `--unpin-session`, `--archive-session` / `--unarchive-session`, `--fork-session` |
| Compact | `--compact`, `--compact-threshold` (or `OMC_COMPACT_THRESHOLD`) — sidecar only; original transcript stays |
| Share vs move | `--export-session` — redacted Markdown + manifest (safe to share). `--bundle-session` / `--bundle-store` — lossless, **unredacted** backup between *your* stores; restore with `--restore-session` / `--restore-store`; check with `--verify-bundle` |
| Undo a turn | `--undo-turn` / `--redo-turn` (`--dry-run` previews). Restores only that turn’s files + transcript |
| Side question | `--side-question "…" --session <id-or-name>` or `/ask` — read-only, nothing persisted |
| Notes / memory / journals | `--annotate-session` + `--note`, `--session-notes`, `--search-notes`; `--memory-add` / `--memory-list` / `--memory-forget`; `--session-journal` / `--workspace-journal` |
| Return-to-work / store health | `--attention` (workspace-scoped “what needs action”); `--store-doctor` (health + storage + stale census). Both accept `--strict` for a 0/1 exit |

Also useful: `--inspect-session`, `--session-stats`, `--salvage-session` (corrupt → new id; original untouched), `--stale-sessions` / `--archive-stale`.

### Safety

Approval modes are subordinate to folder trust. `yolo` cannot widen an untrusted workspace. Command policy runs **before** approval and cannot be bypassed.

| Gate | What it does |
|------|----------------|
| Approval modes | `default` — prompt for mutating tools (deny without TTY). `auto-edit` — allow `write`/`edit`, still prompt for `shell`. `yolo` — allow all (unsafe). Reads never prompt. |
| Spoof-resistant preview | Approval UI shows the command and paths with bidi / zero-width / look-alike characters replaced by `[U+XXXX]` markers |
| Folder trust | Untrusted by default. `--trust` (this run) or `--trust-workspace` (persist in `~/.oh-my-cli/trust.json`). `--trust-info` / `--trust-posture` inspect. `--enforce-folder-trust` (or `OMC_ENFORCE_FOLDER_TRUST=1`) denies mutating tools when untrusted |
| Command policy | Offline classify/deny of dangerous shell shapes (`destructive_git`, credential paths, path escape, `rm -r` at `/` or `~`, device overwrite). `--command-policy "…"` evaluates one command |
| Run budgets | `--budget <usd>` / `OMC_SPEND_BUDGET_USD`; `--max-turns`; `--max-wall-time`; `--max-tool-calls` — stop at the next round boundary |

Prefer `--approval-mode default` on Token Plan until the workspace is trusted.

### Automation / CI kit

Headless path: `-p` + `--output json` (versioned NDJSON). `--summary` / `--summary-out` write a privacy-safe run record; `--baseline` + `--candidate` score two summaries; `--recover` resumes from a checkpoint. `--export-evidence` / `--verify-evidence` move a signed digest bundle (metadata only — no prompts or secrets). `--create-worktree` / `--clean-worktree` lease a collision-safe git worktree per agent.

Read-only (or bounded) task kit — the same verbs the autonomy loop uses:

| Flag | Role |
|------|------|
| `--doctor` | Install / platform readiness |
| `--readiness` | Repo ready for a blocked task? |
| `--repo-map` | Ranked file + symbol map (`--map-tokens`) |
| `--plan <task>` | Bounded execution plan |
| `--verify-task` | Canonical verify commands, pass/fail |
| `--review-change` | Head-bound review vs `--base` |
| `--ci-handoff` | Verify + review brief |
| `--delivery-brief` | Plan + verify + review + handoff + `--ci-result` |

### Extensions

Declared in user-owned `~/.oh-my-cli/settings.json` only — a project file cannot install them. Inspect, then invoke once:

| Surface | Inspect | Invoke |
|---------|---------|--------|
| Provider | `--provider-contract` (`--provider <id>`) | `--invoke-provider` (`--provider-prompt`) |
| MCP | `--mcp-contract` (`--server <id>`) | `--invoke-mcp` (`--mcp-tool`, `--mcp-arg`) |
| Tool extension | `--tool-contract` (`--tool <id>`) | `--invoke-tool` |
| Workflows | `--list-workflows` | `--run-workflow <name>` |
| Hooks | `--list-hooks` | `PreToolUse` deny-only gate (never relaxes approval) |
| Model profiles | `--list-profiles` | `--profile <name>` (Token Plan `qwen3.8-max` is one profile among others) |

`--discover-extensions` and `--extension-compat` are the redacted inventories. Invokes honor approval mode, command policy, workspace confinement, and a hard timeout (`--invoke-timeout`).

### Built-in tools

File and search tools stay inside the workspace (symlink escapes rejected). Shell is cwd-confined and policy-gated.

| Tool | Kind | Notes |
|------|------|--------|
| `read` / `list` / `glob` / `grep` | read | Never require approval |
| `write` / `edit` | mutate-file | Approval in `default` |
| `shell` | mutate-shell | `/bin/bash`; command policy then approval; 30s default / 120s max; 1 MiB output cap |

### Self-learning / autonomy

The intake → lease → implement → evidence-gate loop is already described in [How this terminal self-learns via Qwen](#how-this-terminal-self-learns-via-qwen). The Token Plan REPL is that daily agent layer; the contract is [AUTONOMY.md](https://github.com/HarleyCoops/oh-my-cli/blob/main/AUTONOMY.md) in the **oh-my-cli** repo (`less ~/oh-my-cli/AUTONOMY.md` after clone). This harness repo does not host it.

### Command cheat-sheet

```bash
# Surfaces
oh-my-cli
oh-my-cli -p "Summarize the README" --approval-mode default
oh-my-cli --delivery-web                 # http://127.0.0.1:4317
# from ~/oh-my-cli after npm install / npm run build:
npm run desktop

# Sessions
oh-my-cli --list-sessions --filter auth
oh-my-cli --continue
oh-my-cli --rename-session <id> --session-name "auth refactor"
oh-my-cli --pin-session <id>
oh-my-cli --archive-session <id>
oh-my-cli --fork-session <id>
oh-my-cli --compact <id>
oh-my-cli --export-session <id> --out ./exports
oh-my-cli --undo-turn <id> --dry-run
oh-my-cli --side-question "which test runner?" --session <id>
oh-my-cli --attention
oh-my-cli --store-doctor --strict

# Safety / budgets
oh-my-cli --trust-posture
oh-my-cli --command-policy "git push --force"
oh-my-cli -p "…" --approval-mode default --budget 1 --max-turns 20 --max-wall-time 15m

# CI kit
oh-my-cli --doctor
oh-my-cli --repo-map
oh-my-cli --plan "add a --quiet flag"
oh-my-cli --verify-task
oh-my-cli --review-change --base origin/main
oh-my-cli --ci-handoff
oh-my-cli --delivery-brief --ci-result pending
oh-my-cli -p "…" --output json --summary
```

No keys belong in any of these commands. Token Plan credentials stay in your environment — never in this repo.

---

## What this repo is NOT

- **Not a fork** of oh-my-cli — install and update oh-my-cli from its own repo.
- **No secrets** — never commit `.env`, real API keys, or filled-in settings with credentials. Only the *name* of an env var belongs in `settings.json` (`apiKeyEnv`).
- **Not the Qwen Coding Plan** — Coding Plan keys (`sk-sp-…` / coding-intl) are a different product. For `qwen3.8-max` on Model Studio Singapore Token Plan, use a Token Plan key (`sk-…` or `sk-ws-…`) and the Token Plan MaaS URL above (or dashscope-intl / a matching workspace MaaS URL). A `401` often means the wrong key type or a mismatched base URL.

---

## Files in this repo

| File | Purpose |
|------|---------|
| `README.md` | This guide |
| `.env.example` | Env var template (no real keys) |
| `settings.example.json` | Template for `~/.oh-my-cli/settings.json` |
| `.gitignore` | Ignores `.env`, secrets, and local build artifacts |
| `LICENSE` | Apache-2.0 (same as oh-my-cli) |

---

## License

Apache License 2.0 — see [LICENSE](LICENSE).
