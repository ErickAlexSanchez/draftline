import { createHmac, timingSafeEqual } from "node:crypto";
import { deflateSync, inflateSync } from "node:zlib";
import { z } from "zod";

export const DEMO_TENANT_ID = "11111111-1111-4111-8111-111111111111";
export const DEMO_EDITOR_ID = "22222222-2222-4222-8222-222222222222";
export const DEMO_VIEWER_ID = "33333333-3333-4333-8333-333333333333";
export const DEMO_CREDITS = 20;

const CHUNK = 2800;
const MAX_CHUNKS = 16;
const MAX_INFLATED = 500_000;

const iso = z.string().datetime();

export const snapshotSchema = z.object({
  v: z.literal(1),
  credits: z.number().int().min(0).max(DEMO_CREDITS),
  sessions: z
    .array(
      z.object({
        id: z.string().uuid(),
        userId: z.string().uuid(),
        tokenHash: z.string().min(16).max(200),
        expiresAt: iso,
        createdAt: iso,
      }),
    )
    .max(20),
  jobs: z
    .array(
      z.object({
        id: z.string().uuid(),
        tenantId: z.string().uuid(),
        createdBy: z.string().uuid(),
        draftId: z.string().uuid().nullable(),
        title: z.string().min(1).max(120),
        prompt: z.string().min(1).max(4000),
        status: z.enum(["queued", "running", "succeeded", "failed"]),
        failureCode: z.enum(["insufficient_credits", "worker_error"]).nullable(),
        objectKey: z.string().max(80).nullable(),
        creditCost: z.number().int().positive().max(100),
        createdAt: iso,
        updatedAt: iso,
      }),
    )
    .max(50),
  drafts: z
    .array(
      z.object({
        id: z.string().uuid(),
        tenantId: z.string().uuid(),
        authorId: z.string().uuid(),
        title: z.string().min(1).max(120),
        body: z.string().min(1).max(4000),
        createdAt: iso,
        updatedAt: iso,
      }),
    )
    .max(50),
  objects: z.record(z.string().max(80), z.string().max(12_000)),
});

export type MemorySnapshot = z.infer<typeof snapshotSchema>;

function macOf(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

function sameMac(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function packSnapshot(snapshot: MemorySnapshot, secret: string): string[] {
  const json = JSON.stringify(snapshot);
  const body = deflateSync(Buffer.from(json, "utf8")).toString("base64url");
  const packed = `${macOf(secret, body)}.${body}`;
  const chunks: string[] = [];
  for (let index = 0; index < packed.length; index += CHUNK) {
    chunks.push(packed.slice(index, index + CHUNK));
  }
  if (chunks.length > MAX_CHUNKS) throw new Error("Workspace snapshot is too large");
  return chunks;
}

export function unpackSnapshot(chunks: readonly string[], secret: string): MemorySnapshot | null {
  if (chunks.length === 0) return null;
  try {
    const packed = chunks.join("");
    const dot = packed.indexOf(".");
    if (dot <= 0) return null;
    const mac = packed.slice(0, dot);
    const body = packed.slice(dot + 1);
    if (!sameMac(mac, macOf(secret, body))) return null;
    const json = inflateSync(Buffer.from(body, "base64url"), { maxOutputLength: MAX_INFLATED }).toString("utf8");
    const parsed: unknown = JSON.parse(json);
    const result = snapshotSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch (error) {
    if (error instanceof Error) return null;
    return null;
  }
}
