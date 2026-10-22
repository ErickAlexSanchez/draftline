export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string) {
    super(code);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export async function api(path: string, init?: RequestInit): Promise<unknown> {
  const headers = new Headers(init?.headers);
  if (init?.body !== undefined && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  const response = await fetch(path, { ...init, headers, credentials: "same-origin" });
  if (response.status === 204) return undefined;
  let body: unknown = null;
  try {
    body = await response.json();
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
  }
  if (!response.ok) {
    const code = readCode(body) ?? "request_failed";
    throw new ApiError(response.status, code);
  }
  return body;
}

function readCode(body: unknown): string | undefined {
  if (typeof body !== "object" || body === null || !("error" in body)) return undefined;
  const error = body.error;
  if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
}
