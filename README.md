# Qwen3.8MaxHarness

A thin setup guide and config templates for running **[HarleyCoops/oh-my-cli](https://github.com/HarleyCoops/oh-my-cli)** as a self-evolving code-agent harness against **Qwen3.8-Max** on Alibaba Cloud Model Studio (Singapore / Token Plan).

The verified path below is **Windows WSL (Ubuntu)** with Node 22+ and a Token Plan key. Clone this repo, install oh-my-cli, point it at Model Studio with your own key, and go. **No API keys are stored in this repository.**

How the terminal self-learns via Qwen is explained in [How this terminal self-learns via Qwen](#how-this-terminal-self-learns-via-qwen). After you clone oh-my-cli, read the governance contract locally (`less ~/oh-my-cli/AUTONOMY.md`) or on GitHub: https://github.com/HarleyCoops/oh-my-cli/blob/main/AUTONOMY.md

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

### How oh-my-cli loads model config

oh-my-cli resolves model config in this order (highest first):

1. **Real process env:** `OPENAI_MODEL`, `OPENAI_API_KEY`, `OPENAI_BASE_URL`
2. **Trusted workspace `.env`** at `<cwd>/.env` (for the clone, that is `~/oh-my-cli/.env`) — only after `--trust` or `--trust-workspace`
3. **User settings** `~/.oh-my-cli/settings.json` with `model.name` / `model.baseUrl` / `model.apiKeyEnv`

`~/.oh-my-cli/` holds `settings.json` and sessions. It is **not** an auto-loaded `.env` location for model config.

**Do not put keys in `~/.oh-my-cli/.env`.** That path is ignored. Keys go in the clone workspace `.env` or in the shell.

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

### 2. Write user settings (model name + base URL)

Non-secret model config belongs in `~/.oh-my-cli/settings.json` (never the raw key):

```bash
mkdir -p ~/.oh-my-cli
cat > ~/.oh-my-cli/settings.json <<'EOF'
{
  "model": {
    "baseUrl": "https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1",
    "name": "qwen3.8-max",
    "apiKeyEnv": "DASHSCOPE_API_KEY"
  },
  "mcpServers": {},
  "extensions": {}
}
EOF
```

Or copy `settings.example.json` from this repo into that path. Never put the raw key in this file.

### 3. Write secrets into the clone workspace `.env`

Put `OPENAI_*` in the **clone**, not under `~/.oh-my-cli/`:

```bash
cat > ~/oh-my-cli/.env <<'EOF'
OPENAI_API_KEY=sk-…your Token Plan key…
OPENAI_BASE_URL=https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1
OPENAI_MODEL=qwen3.8-max
EOF
chmod 600 ~/oh-my-cli/.env
```

Use a real Token Plan key in place of the placeholder. Keys look like `sk-…` or `sk-ws-…`. Coding Plan keys (`sk-sp-…`) are a different product and will 401 against this URL.

A copy-paste template with the same defaults lives in `.env.example` in this repo. Copy it to `~/oh-my-cli/.env` (the workspace root you run the CLI from).

Then persist trust so oh-my-cli will read that `.env` (must be run from the clone):

```bash
cd ~/oh-my-cli
oh-my-cli --trust-workspace
```

Without `--trust` / `--trust-workspace`, the workspace `.env` is not loaded.

### Or export `OPENAI_*` in the shell

Process env always wins. You can skip the workspace `.env` if you export these every session:

```bash
export OPENAI_API_KEY="sk-…"
export OPENAI_BASE_URL="https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1"
export OPENAI_MODEL="qwen3.8-max"
```

If you use `apiKeyEnv` in `settings.json` instead of `OPENAI_API_KEY`, export that name (for example `DASHSCOPE_API_KEY`).

### 4. Check the install

Run these from the clone so `<cwd>/.env` is `~/oh-my-cli/.env`:

```bash
cd ~/oh-my-cli
oh-my-cli --help
oh-my-cli --doctor
oh-my-cli --preflight
```

`--doctor` checks install/runtime readiness. `--preflight` prints a **redacted** summary of model, endpoint host, settings source, and credential env var name (never the secret). `--trust-workspace` (step 3) marks the current folder as trusted so the workspace `.env` is loaded and the agent can work there under your approval policy.

Optional live ping:

```bash
oh-my-cli -p "Reply with exactly: pong" --approval-mode default
```

### Notes for this path

- Stay in WSL. PowerShell/cmd can have a different Node, PATH, and home directory. `settings.json` lives under the **Linux** home (`~/.oh-my-cli/settings.json`). The secret `.env` lives in the **clone** (`~/oh-my-cli/.env`).
- **Do not** write `~/.oh-my-cli/.env` — oh-my-cli never loads that path for model config.
- Prefer the Token Plan MaaS URL above. Switch to dashscope-intl or a workspace-specific MaaS URL only when that is what the key was issued for.
- Optional parallel: the official Qwen Code CLI (`qwen`) can use the same Token Plan. This repo documents **oh-my-cli**.

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

## What this repo is NOT

- **Not a fork** of oh-my-cli — install and update oh-my-cli from its own repo.
- **No secrets** — never commit `.env`, real API keys, or filled-in settings with credentials. Only the *name* of an env var belongs in `settings.json` (`apiKeyEnv`). Do **not** put keys in `~/.oh-my-cli/.env` (ignored); use `~/oh-my-cli/.env` or process env.
- **Not the Qwen Coding Plan** — Coding Plan keys (`sk-sp-…` / coding-intl) are a different product. For `qwen3.8-max` on Model Studio Singapore Token Plan, use a Token Plan key (`sk-…` or `sk-ws-…`) and the Token Plan MaaS URL above (or dashscope-intl / a matching workspace MaaS URL). A `401` often means the wrong key type or a mismatched base URL.

---

## Files in this repo

| File | Purpose |
|------|---------|
| `README.md` | This guide |
| `.env.example` | Env var template for the **clone** workspace `.env` (e.g. `~/oh-my-cli/.env`). Not `~/.oh-my-cli/.env`. No real keys. |
| `settings.example.json` | Template for `~/.oh-my-cli/settings.json` (model name + baseUrl; no raw key) |
| `.gitignore` | Ignores `.env`, secrets, and local build artifacts |
| `LICENSE` | Apache-2.0 (same as oh-my-cli) |

---

## License

Apache License 2.0 — see [LICENSE](LICENSE).
