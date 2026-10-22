import { planGeneration } from "./plan-generation";

describe("planGeneration", () => {
  it("denies a generation when credits cannot cover the cost", () => {
    expect(planGeneration({ credits: 0, cost: 1 })).toEqual({
      outcome: "deny",
      code: "insufficient_credits",
    });
    expect(planGeneration({ credits: 3, cost: 5 })).toEqual({
      outcome: "deny",
      code: "insufficient_credits",
    });
  });

  it("allows a generation when the balance covers the cost", () => {
    expect(planGeneration({ credits: 1, cost: 1 })).toEqual({ outcome: "allow" });
    expect(planGeneration({ credits: 8, cost: 1 })).toEqual({ outcome: "allow" });
  });

  it("rejects a non-positive cost", () => {
    expect(() => planGeneration({ credits: 5, cost: 0 })).toThrow("Invalid credit cost");
  });
});
