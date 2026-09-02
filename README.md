# Qwen3.8MaxHarness

A thin setup guide and config templates for running **[HarleyCoops/oh-my-cli](https://github.com/HarleyCoops/oh-my-cli)** as a self-evolving code-agent harness against **Qwen3.8-Max** on Alibaba Cloud Model Studio (Singapore / Token Plan).

Clone this repo on Windows/WSL (or any machine with Node 22+), install oh-my-cli, point it at Model Studio with your own key, and go. **No API keys are stored in this repository.**

For the self-evolving autonomous loop, read AUTONOMY.md on oh-my-cli:
https://github.com/HarleyCoops/oh-my-cli/blob/main/AUTONOMY.md

---

## What this is

| Item | Detail |
|------|--------|
| Purpose | Setup guide + templates to run oh-my-cli with model qwen3.8-max |
| Target CLI | https://github.com/HarleyCoops/oh-my-cli |
| Model | qwen3.8-max |
| Provider | Alibaba Model Studio (DashScope intl / Singapore), OpenAI-compatible API |

This repo is not a fork of oh-my-cli. Install oh-my-cli separately; use only the env and settings examples here.

---

## What Model Studio Singapore is

Alibaba Cloud Model Studio hosts LLM APIs (DashScope). The international / Singapore path uses:

- Token Plan API keys (prefix sk-)
- An OpenAI-compatible base URL (global intl or a workspace-specific MaaS URL)
- A Token Plan (pay-per-token) workspace that can call models such as qwen3.8-max

This is different from the Qwen Coding Plan product (keys with prefix sk-sp-, coding-intl endpoint). If you get HTTP 401, you are likely using the wrong product or a mismatched base URL. Use a Model Studio / Token Plan key for this guide.

---

## Prerequisites

- **Node.js 22+** and **npm**
- **git**
- A Model Studio / QwenCloud (DashScope intl) API key that can call `qwen3.8-max` (Token Plan `sk-…`, not Coding Plan `sk-sp-…`)

---

## Install oh-my-cli

```bash
git clone https://github.com/HarleyCoops/oh-my-cli.git
cd oh-my-cli
npm install
npm run build
npm link   # optional; or use node dist/index.js
```

---

## Configure for Qwen3.8-Max

Environment variables have the **highest** precedence in oh-my-cli. Export these in your shell (or put them in a trusted workspace `.env` — never commit real keys):

```bash
export OPENAI_API_KEY="sk-…"          # your Model Studio / DashScope key
export OPENAI_BASE_URL="https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
# OR if you use a private MaaS workspace URL, put that instead
export OPENAI_MODEL="qwen3.8-max"
```

### Alternative: user settings file

You can keep non-secret model config in `~/.oh-my-cli/settings.json` and only export the key. See `settings.example.json` in this repo. Example:

```json
{
  "model": {
    "baseUrl": "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
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

### Workspace-specific MaaS URLs

Private Model Studio / MaaS workspace URLs also work when paired with the **matching** workspace key, for example:

```text
https://<workspace-id>.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1
```

Use that as `OPENAI_BASE_URL` (or `model.baseUrl`) with the key from that same workspace. Do not mix a global intl key with a private workspace URL (or vice versa).

A ready-to-edit env template lives in `.env.example` (copy to `.env` only in a trusted workspace; `.env` is gitignored).

---

## Verify

```bash
oh-my-cli --doctor
oh-my-cli --preflight
oh-my-cli -p "Reply with exactly: pong" --approval-mode default
```

`--doctor` checks install/runtime readiness. `--preflight` prints a **redacted** summary of model, endpoint host, settings source, and credential env var name (never the secret). The ping confirms the live Model Studio call.

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

## What this repo is NOT

- **Not a fork** of oh-my-cli — install and update oh-my-cli from its own repo.
- **No secrets** — never commit `.env`, real API keys, or filled-in settings with credentials. Only the *name* of an env var belongs in `settings.json` (`apiKeyEnv`).
- **Not the Qwen Coding Plan** — Coding Plan keys (`sk-sp-…` / coding-intl) are a different product. For `qwen3.8-max` on Model Studio Singapore Token Plan, use a Model Studio / DashScope intl `sk-…` key and the compatible-mode URL above (or your matching MaaS workspace URL). A `401` often means the wrong key type or mismatched base URL.

---

## Self-evolving harness

oh-my-cli can improve itself through an evidence-bound autonomous loop under a protected governance plane. Read:

- [AUTONOMY.md](https://github.com/HarleyCoops/oh-my-cli/blob/main/AUTONOMY.md)

That contract lives in **oh-my-cli**, not in this setup repo.

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
