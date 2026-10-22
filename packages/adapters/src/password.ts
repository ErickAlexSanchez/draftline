import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { PasswordHasher } from "@draftline/domain";

const scryptAsync = promisify(scrypt);
const KEY_LEN = 32;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, KEY_LEN)) as Buffer;
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const parts = encoded.split("$");
  const algo = parts[0];
  const salt = parts[1];
  const expectedHex = parts[2];
  if (algo !== "scrypt" || salt === undefined || expectedHex === undefined) return false;
  const derived = (await scryptAsync(password, salt, KEY_LEN)) as Buffer;
  const expected = Buffer.from(expectedHex, "hex");
  if (expected.length !== derived.length) return false;
  return timingSafeEqual(expected, derived);
}

let dummyHashPromise: Promise<string> | undefined;

export function dummyPasswordHash(): Promise<string> {
  dummyHashPromise ??= hashPassword("not-a-real-password");
  return dummyHashPromise;
}

export const scryptHasher: PasswordHasher = {
  hash: hashPassword,
  verify: verifyPassword,
  dummyHash: dummyPasswordHash,
};
