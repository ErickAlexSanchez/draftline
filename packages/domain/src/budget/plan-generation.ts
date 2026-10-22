export type GenerationPlan =
  | { outcome: "allow" }
  | { outcome: "deny"; code: "insufficient_credits" };

export function planGeneration(input: { credits: number; cost: number }): GenerationPlan {
  if (!Number.isInteger(input.credits) || input.credits < 0) {
    throw new Error("Invalid credit balance");
  }
  if (!Number.isInteger(input.cost) || input.cost <= 0) {
    throw new Error("Invalid credit cost");
  }
  if (input.credits < input.cost) {
    return { outcome: "deny", code: "insufficient_credits" };
  }
  return { outcome: "allow" };
}
