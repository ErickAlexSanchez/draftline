"use client";

import { useCopy } from "../lib/preferences";

export function SkipLink() {
  const copy = useCopy();
  return (
    <a className="skip-link" href="#content">
      {copy.skipToContent}
    </a>
  );
}
