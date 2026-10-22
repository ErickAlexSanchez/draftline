const SENSITIVE = ["password", "token", "secret", "cookie", "authorization", "prompt", "output", "body"];

function isSensitive(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE.some((part) => lower.includes(part));
}

function describeError(value: unknown): { name: string; code?: string } {
  if (value instanceof Error) {
    const maybe = value as Error & { code?: unknown };
    const code = typeof maybe.code === "string" ? maybe.code : undefined;
    return code ? { name: value.name, code } : { name: value.name };
  }
  return { name: "UnknownError" };
}

export function log(level: "info" | "error", fields: Record<string, unknown>): void {
  const safe: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (isSensitive(key)) continue;
    if (value instanceof Error || key === "err") {
      const described = describeError(value);
      safe[`${key}Name`] = described.name;
      if (described.code) safe[`${key}Code`] = described.code;
      continue;
    }
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null) {
      safe[key] = value;
    }
  }
  const line = JSON.stringify({ level, time: new Date().toISOString(), ...safe });
  if (level === "error") console.error(line);
  else console.log(line);
}
