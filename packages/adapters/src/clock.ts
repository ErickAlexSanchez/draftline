import type { Clock } from "@draftline/domain";

export const systemClock: Clock = {
  now(): Date {
    return new Date();
  },
};
