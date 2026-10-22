import { isStorageKey, objectKeyForJob } from "./object-key";

describe("objectKeyForJob", () => {
  it("builds a flat key from a job id", () => {
    const key = objectKeyForJob("44444444-4444-4444-8444-444444444444");
    expect(key).toBe("44444444-4444-4444-8444-444444444444.txt");
    expect(isStorageKey(key)).toBe(true);
  });

  it("rejects path-like ids", () => {
    expect(() => objectKeyForJob("../secrets")).toThrow("Invalid job id");
    expect(isStorageKey("../secrets.txt")).toBe(false);
  });
});
