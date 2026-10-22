"use client";

import { DraftDetail } from "./DraftDetail";
import { Shell } from "./Shell";

export function DraftScreen({ draftId }: { draftId: string }) {
  return (
    <Shell>
      <DraftDetail draftId={draftId} />
    </Shell>
  );
}
