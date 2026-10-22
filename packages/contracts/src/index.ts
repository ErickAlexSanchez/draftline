import { z } from "zod";

export const jobStatusSchema = z.enum(["queued", "running", "succeeded", "failed"]);
export const failureCodeSchema = z.enum(["insufficient_credits", "worker_error"]);
export const roleSchema = z.enum(["editor", "viewer"]);

export const loginSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(1).max(200),
});

export const createJobSchema = z.object({
  title: z.string().trim().min(1).max(120),
  prompt: z.string().trim().min(1).max(4000),
  draftId: z.string().uuid().nullable().optional(),
});

export const createDraftSchema = z.object({
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(4000),
});

export const jobListItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  status: jobStatusSchema,
  createdAt: z.string().datetime(),
});

export const jobListSchema = z.object({
  jobs: z.array(jobListItemSchema),
});

export const jobDetailSchema = z.object({
  job: jobListItemSchema.extend({
    failureCode: failureCodeSchema.nullable(),
    prompt: z.string(),
    outputText: z.string().nullable(),
  }),
});

export const draftListItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  updatedAt: z.string().datetime(),
});

export const draftListSchema = z.object({
  drafts: z.array(draftListItemSchema),
});

export const draftDetailSchema = z.object({
  draft: draftListItemSchema.extend({
    body: z.string(),
    createdAt: z.string().datetime(),
  }),
});

export const accountSchema = z.object({
  email: z.string().email(),
  role: roleSchema,
  tenantName: z.string(),
  credits: z.number().int().nonnegative(),
});

export const createdJobSchema = z.object({
  id: z.string().uuid(),
  status: z.literal("queued"),
});

export const createdDraftSchema = z.object({
  id: z.string().uuid(),
});

export type JobStatus = z.infer<typeof jobStatusSchema>;
export type Account = z.infer<typeof accountSchema>;
export type JobList = z.infer<typeof jobListSchema>;
export type JobDetail = z.infer<typeof jobDetailSchema>;
export type DraftList = z.infer<typeof draftListSchema>;
export type DraftDetail = z.infer<typeof draftDetailSchema>;

const DRAFT_PATH = /^\/drafts\/[0-9a-f-]{36}$/i;

export function cacheControlHeader(method: string, pathname: string): string {
  if (method !== "GET" && method !== "HEAD") return "no-store";
  if (pathname === "/jobs" || pathname === "/drafts" || DRAFT_PATH.test(pathname)) {
    return "private, max-age=60";
  }
  return "no-store";
}
