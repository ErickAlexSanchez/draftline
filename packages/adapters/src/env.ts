import { z } from "zod";

const blank = (value: string | undefined): string | undefined => {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
};

export const runtimeEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  SESSION_SECRET: z.string().min(32),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3202),
  WEB_ORIGIN: z.string().url().default("http://localhost:3201"),
  STORAGE_DIR: z.string().min(1).default("var/storage"),
  MODEL_CREDIT_COST: z.coerce.number().int().positive().default(1),
  FAKE_MODEL_DELAY_MS: z.coerce.number().int().min(0).max(60_000).default(0),
  JOB_POLL_MS: z.coerce.number().int().min(50).max(60_000).default(1000),
  JOB_VISIBILITY_DELAY_MS: z.coerce.number().int().min(0).max(60_000).default(0),
  SESSION_TTL_MS: z.coerce.number().int().positive().default(7 * 24 * 60 * 60 * 1000),
  SEED_EDITOR_EMAIL: z.string().email().default("editor@draftline.example"),
  SEED_VIEWER_EMAIL: z.string().email().default("viewer@draftline.example"),
});

export const seedEnvSchema = runtimeEnvSchema.extend({
  SEED_EDITOR_PASSWORD: z.string().min(8).max(200),
  SEED_VIEWER_PASSWORD: z.string().min(8).max(200),
});

const demoEnvSchema = runtimeEnvSchema.omit({ DATABASE_URL: true });

export type RuntimeEnv = z.infer<typeof runtimeEnvSchema>;
export type SeedEnv = z.infer<typeof seedEnvSchema>;
export type DemoEnv = z.infer<typeof demoEnvSchema>;

const DEMO_SESSION_SECRET = "replace-with-a-random-string-at-least-32-chars";

function collect(source: NodeJS.ProcessEnv): Record<string, string | undefined> {
  return {
    DATABASE_URL: blank(source.DATABASE_URL),
    SESSION_SECRET: blank(source.SESSION_SECRET),
    API_PORT: blank(source.API_PORT),
    WEB_ORIGIN: blank(source.WEB_ORIGIN),
    STORAGE_DIR: blank(source.STORAGE_DIR),
    MODEL_CREDIT_COST: blank(source.MODEL_CREDIT_COST),
    FAKE_MODEL_DELAY_MS: blank(source.FAKE_MODEL_DELAY_MS),
    JOB_POLL_MS: blank(source.JOB_POLL_MS),
    JOB_VISIBILITY_DELAY_MS: blank(source.JOB_VISIBILITY_DELAY_MS),
    SESSION_TTL_MS: blank(source.SESSION_TTL_MS),
    SEED_EDITOR_EMAIL: blank(source.SEED_EDITOR_EMAIL),
    SEED_VIEWER_EMAIL: blank(source.SEED_VIEWER_EMAIL),
    SEED_EDITOR_PASSWORD: blank(source.SEED_EDITOR_PASSWORD),
    SEED_VIEWER_PASSWORD: blank(source.SEED_VIEWER_PASSWORD),
  };
}

function fail(error: z.ZodError): never {
  const keys = error.issues.map((issue) => issue.path.map(String).join(".")).join(", ");
  throw new Error(`Invalid environment: ${keys}`);
}

export function hasDatabaseUrl(source: NodeJS.ProcessEnv): boolean {
  return blank(source.DATABASE_URL) !== undefined;
}

export function readRuntimeEnv(source: NodeJS.ProcessEnv): RuntimeEnv {
  const parsed = runtimeEnvSchema.safeParse(collect(source));
  if (!parsed.success) fail(parsed.error);
  return parsed.data;
}

export function readDemoEnv(source: NodeJS.ProcessEnv): DemoEnv {
  const values = collect(source);
  const parsed = demoEnvSchema.safeParse({
    SESSION_SECRET: values.SESSION_SECRET ?? DEMO_SESSION_SECRET,
    API_PORT: values.API_PORT,
    WEB_ORIGIN: values.WEB_ORIGIN,
    STORAGE_DIR: values.STORAGE_DIR,
    MODEL_CREDIT_COST: values.MODEL_CREDIT_COST,
    FAKE_MODEL_DELAY_MS: values.FAKE_MODEL_DELAY_MS ?? "400",
    JOB_POLL_MS: values.JOB_POLL_MS,
    JOB_VISIBILITY_DELAY_MS: values.JOB_VISIBILITY_DELAY_MS ?? "2000",
    SESSION_TTL_MS: values.SESSION_TTL_MS,
    SEED_EDITOR_EMAIL: values.SEED_EDITOR_EMAIL,
    SEED_VIEWER_EMAIL: values.SEED_VIEWER_EMAIL,
  });
  if (!parsed.success) fail(parsed.error);
  return parsed.data;
}

export function readSeedEnv(source: NodeJS.ProcessEnv): SeedEnv {
  const parsed = seedEnvSchema.safeParse(collect(source));
  if (!parsed.success) fail(parsed.error);
  return parsed.data;
}
