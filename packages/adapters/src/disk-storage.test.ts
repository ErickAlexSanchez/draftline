import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { DiskObjectStorage } from "./disk-storage";

describe("DiskObjectStorage", () => {
  it("writes and reads a job file and refuses traversal", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "draftline-disk-"));
    const storage = new DiskObjectStorage(root);
    const key = "44444444-4444-4444-8444-444444444444.txt";
    await storage.put(key, "A draft.");
    expect(await storage.get(key)).toBe("A draft.");
    expect(await readFile(path.join(root, key), "utf8")).toBe("A draft.");
    await expect(storage.put("../secrets.txt", "nope")).rejects.toThrow("Invalid storage key");
    await storage.delete(key);
    expect(await storage.get(key)).toBeNull();
  });
});
