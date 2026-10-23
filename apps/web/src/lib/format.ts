import type { JobStatus } from "@draftline/contracts";
import { messages, type Locale } from "./i18n";

const statusKey = {
  queued: "statusQueued",
  running: "statusRunning",
  succeeded: "statusSucceeded",
  failed: "statusFailed",
} as const satisfies Record<JobStatus, "statusQueued" | "statusRunning" | "statusSucceeded" | "statusFailed">;

export function statusLabel(status: JobStatus, locale: Locale = "en"): string {
  return messages[locale][statusKey[status]];
}

export function formatWhen(iso: string, locale: Locale = "en"): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const tag = locale === "es" ? "es" : "en-US";
  return new Intl.DateTimeFormat(tag, { dateStyle: "medium", timeStyle: "short" }).format(date);
}
