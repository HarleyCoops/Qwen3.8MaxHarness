const SECRET_FLAG_RE =
  /(--?(?:password|passwd|pass|secret|token|api[_-]?key|apikey|access[_-]?key|secret[_-]?key|private[_-]?key|auth|authorization|credential|credentials|client[_-]?secret)[=\s]+)(?!\[REDACTED\])("[^"]*"|'[^']*'|\S+)/gi;
const ENV_SECRET_RE =
  /(\b[A-Za-z_][A-Za-z0-9_]*(?:KEY|SECRET|TOKEN|PASSWORD|PASSWD|CREDENTIAL|AUTH)[A-Za-z0-9_]*)=(?!\[REDACTED\])("[^"]*"|'[^']*'|\S+)/g;
const URL_CRED_RE = /(\/\/)[^/@\s]+:[^/@\s]+@/g;
const BEARER_RE = /\b(Bearer\s+)[A-Za-z0-9._\-]+=*/gi;
const BASIC_RE = /\b(Basic\s+)[A-Za-z0-9._\-]+=*/gi;
const KNOWN_TOKEN_RE =
  /\b(?:sk-[A-Za-z0-9]{16,}|sk-ws-[A-Za-z0-9]{16,}|sk-sp-[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{20,}|gho_[A-Za-z0-9]{20,}|ghs_[A-Za-z0-9]{20,}|ghu_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{10,})\b/g;

export const DETAIL_BOUND = 800;
export const TITLE_BOUND = 96;

export function redactSecrets(input) {
  if (typeof input !== "string" || input.length === 0) return { text: input ?? "", count: 0 };
  let count = 0;
  let text = input;
  text = text.replace(URL_CRED_RE, (_m, p1) => {
    count += 1;
    return `${p1}[REDACTED]@`;
  });
  text = text.replace(BEARER_RE, (_m, p1) => {
    count += 1;
    return `${p1}[REDACTED]`;
  });
  text = text.replace(BASIC_RE, (_m, p1) => {
    count += 1;
    return `${p1}[REDACTED]`;
  });
  text = text.replace(SECRET_FLAG_RE, (_m, p1) => {
    count += 1;
    return `${p1}[REDACTED]`;
  });
  text = text.replace(ENV_SECRET_RE, (_m, p1) => {
    count += 1;
    return `${p1}=[REDACTED]`;
  });
  text = text.replace(KNOWN_TOKEN_RE, () => {
    count += 1;
    return "[REDACTED]";
  });
  return { text, count };
}

export function redactHomePath(p, home = process.env.HOME ?? process.env.USERPROFILE) {
  if (typeof p !== "string" || !p) return "";
  if (!home) return p;
  const sep = home.includes("\\") ? "\\" : "/";
  const base = home.length > 1 && home.endsWith(sep) ? home.slice(0, -1) : home;
  if (p === base) return "~";
  if (p.startsWith(base + sep)) return "~" + p.slice(base.length);
  return p;
}

export function collapse(text, bound = DETAIL_BOUND) {
  const one = String(text ?? "").replace(/\s+/g, " ").trim();
  if (one.length <= bound) return one;
  return `${one.slice(0, bound)}…[+${one.length - bound}]`;
}

export function sanitize(text, bound = DETAIL_BOUND) {
  const redacted = redactSecrets(String(text ?? "")).text.replace(
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g,
    "",
  );
  return collapse(redacted, bound);
}
