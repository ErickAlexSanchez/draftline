import { ForbiddenError } from "../errors";
import type { Role } from "../ports";

export function assertEditor(role: Role): void {
  if (role !== "editor") {
    throw new ForbiddenError("You do not have permission to enqueue drafts.");
  }
}
