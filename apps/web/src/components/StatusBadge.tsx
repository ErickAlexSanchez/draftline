import type { JobStatus } from "@draftline/contracts";
import { statusLabel } from "../lib/format";

export function StatusBadge({ status, live = false }: { status: JobStatus; live?: boolean }) {
  return (
    <span className={`status status-${status}`} role={live ? "status" : undefined}>
      {statusLabel(status)}
    </span>
  );
}
