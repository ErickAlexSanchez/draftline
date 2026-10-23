const BROWSER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function readCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    if (trimmed.slice(0, eq) !== name) continue;
    return trimmed.slice(eq + 1);
  }
  return undefined;
}

export function readBrowserId(header: string | null): string | undefined {
  const value = readCookie(header, "dlid");
  if (!value || !BROWSER_ID.test(value)) return undefined;
  return value.toLowerCase();
}

export function readWorkspaceChunks(header: string | null): { chunks: string[]; names: string[] } {
  if (!header) return { chunks: [], names: [] };
  const found: { index: number; value: string; name: string }[] = [];
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const name = trimmed.slice(0, eq);
    const match = /^dlw(\d+)$/.exec(name);
    const indexText = match?.[1];
    if (!match || indexText === undefined) continue;
    found.push({ index: Number(indexText), value: trimmed.slice(eq + 1), name });
  }
  found.sort((left, right) => left.index - right.index);
  const chunks: string[] = [];
  for (let index = 0; index < found.length; index += 1) {
    const row = found[index];
    if (!row || row.index !== index) break;
    chunks.push(row.value);
  }
  return { chunks, names: found.map((row) => row.name) };
}

function setCookie(name: string, value: string, secure: boolean, maxAge: number): string {
  const parts = [`${name}=${value}`, "Path=/", "HttpOnly", "SameSite=Lax", `Max-Age=${maxAge}`];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function workspaceCookies(input: {
  browserId: string;
  setBrowserId: boolean;
  chunks: string[] | null;
  previousNames: readonly string[];
  secure: boolean;
  maxAge: number;
}): string[] {
  const cookies: string[] = [];
  if (input.setBrowserId) cookies.push(setCookie("dlid", input.browserId, input.secure, input.maxAge));
  if (!input.chunks) return cookies;
  const names = input.chunks.map((_, index) => `dlw${index}`);
  for (const name of input.previousNames) {
    if (!names.includes(name)) cookies.push(setCookie(name, "", input.secure, 0));
  }
  input.chunks.forEach((value, index) => {
    cookies.push(setCookie(`dlw${index}`, value, input.secure, input.maxAge));
  });
  return cookies;
}
