const FORWARDED_HOST = /^(?:[a-z0-9.-]+|\[[0-9a-f:]+\])(?::[0-9]{1,5})?$/i;

function firstHeader(value: string | null): string | undefined {
  const first = value?.split(",")[0]?.trim().toLowerCase();
  return first ? first : undefined;
}

export function publicOrigin(request: Request): string {
  const url = new URL(request.url);
  if (process.env.VERCEL !== "1") return url.origin;
  const host = firstHeader(request.headers.get("x-forwarded-host"));
  const proto = firstHeader(request.headers.get("x-forwarded-proto"));
  if (!host || !proto || !FORWARDED_HOST.test(host)) return url.origin;
  if (proto !== "http" && proto !== "https") return url.origin;
  return `${proto}://${host}`;
}

export function backendTarget(request: Request): URL {
  const incoming = new URL(request.url);
  const pathname = incoming.pathname.replace(/^\/api(?=\/|$)/, "") || "/";
  return new URL(`${pathname}${incoming.search}`, publicOrigin(request));
}

export async function toBackendRequest(request: Request, url: URL): Promise<Request> {
  const headers = new Headers(request.headers);
  if (request.method === "GET" || request.method === "HEAD") {
    return new Request(url, { method: request.method, headers });
  }
  const body = await request.arrayBuffer();
  return new Request(url, { method: request.method, headers, body });
}
