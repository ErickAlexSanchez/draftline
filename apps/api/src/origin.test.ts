import { isAllowedOrigin } from "./server";

describe("isAllowedOrigin", () => {
  const webOrigin = "http://localhost:3201";

  it("accepts the configured origin and the same loopback on another name", () => {
    expect(isAllowedOrigin(undefined, webOrigin)).toBe(true);
    expect(isAllowedOrigin("http://localhost:3201", webOrigin)).toBe(true);
    expect(isAllowedOrigin("http://127.0.0.1:3201", webOrigin)).toBe(true);
    expect(isAllowedOrigin("http://[::1]:3201", webOrigin)).toBe(true);
    expect(isAllowedOrigin("http://localhost:3201", "http://127.0.0.1:3201")).toBe(true);
    expect(isAllowedOrigin("http://127.0.0.1:3201", "http://127.0.0.1:3201")).toBe(true);
  });

  it("rejects a different host, port, or scheme", () => {
    expect(isAllowedOrigin("https://evil.example", webOrigin)).toBe(false);
    expect(isAllowedOrigin("http://127.0.0.1:3202", webOrigin)).toBe(false);
    expect(isAllowedOrigin("https://127.0.0.1:3201", webOrigin)).toBe(false);
    expect(isAllowedOrigin("http://127.0.0.1:3201", "http://draftline.example:3201")).toBe(false);
    expect(isAllowedOrigin("not a url", webOrigin)).toBe(false);
  });

  it("accepts the host that received the request", () => {
    const hosted = "https://web-xi-nine-93.vercel.app";
    expect(isAllowedOrigin(hosted, webOrigin, `${hosted}/api/sessions`)).toBe(true);
    expect(isAllowedOrigin("https://preview.example", webOrigin, "https://preview.example/api/sessions")).toBe(true);
    expect(isAllowedOrigin("https://evil.example", webOrigin, `${hosted}/api/sessions`)).toBe(false);
    expect(isAllowedOrigin("http://preview.example", webOrigin, "https://preview.example/api/sessions")).toBe(false);
    expect(isAllowedOrigin("http://127.0.0.1:3211", webOrigin, "http://localhost:3211/api/sessions")).toBe(true);
    expect(isAllowedOrigin("http://[::1]:3211", webOrigin, "http://127.0.0.1:3211/api/sessions")).toBe(true);
    expect(isAllowedOrigin("http://127.0.0.1:3202", webOrigin, "http://localhost:3211/api/sessions")).toBe(false);
  });
});
