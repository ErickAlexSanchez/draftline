import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { isStorageKey, type ObjectStorage } from "@draftline/domain";

function isEnoent(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

export class DiskObjectStorage implements ObjectStorage {
  constructor(private readonly root: string) {}

  private resolve(key: string): string {
    if (!isStorageKey(key)) throw new Error("Invalid storage key");
    const full = path.resolve(this.root, key);
    const root = path.resolve(this.root);
    if (full !== path.join(root, key)) throw new Error("Invalid storage key");
    return full;
  }

  async put(key: string, body: string): Promise<void> {
    const full = this.resolve(key);
    await mkdir(this.root, { recursive: true });
    await writeFile(full, body, "utf8");
  }

  async get(key: string): Promise<string | null> {
    const full = this.resolve(key);
    try {
      return await readFile(full, "utf8");
    } catch (error) {
      if (isEnoent(error)) return null;
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    const full = this.resolve(key);
    try {
      await rm(full);
    } catch (error) {
      if (isEnoent(error)) return;
      throw error;
    }
  }
}
