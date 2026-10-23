"use client";

import type { JobStatus } from "@draftline/contracts";
import { statusLabel } from "../lib/format";
import { usePreferences } from "../lib/preferences";

export function StatusBadge({ status, live = false }: { status: JobStatus; live?: boolean }) {
  const { locale } = usePreferences();
  return (
    <span className={`status status-${status}`} role={live ? "status" : undefined}>
      {statusLabel(status, locale)}
    </span>
  );
}
