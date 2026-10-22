import { cacheControlHeader } from "./index";

describe("cacheControlHeader", () => {
  it("caches job lists, draft lists, and saved drafts", () => {
    expect(cacheControlHeader("GET", "/jobs")).toBe("private, max-age=60");
    expect(cacheControlHeader("GET", "/drafts")).toBe("private, max-age=60");
    expect(cacheControlHeader("GET", "/drafts/44444444-4444-4444-8444-444444444444")).toBe("private, max-age=60");
  });

  it("does not cache generation status", () => {
    expect(cacheControlHeader("GET", "/jobs/44444444-4444-4444-8444-444444444444")).toBe("no-store");
    expect(cacheControlHeader("POST", "/jobs")).toBe("no-store");
    expect(cacheControlHeader("GET", "/health")).toBe("no-store");
  });
});
