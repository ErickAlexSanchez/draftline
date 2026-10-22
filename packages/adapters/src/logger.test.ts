import { log } from "./logger";

describe("log", () => {
  it("drops prompt, password, and error messages", () => {
    const lines: string[] = [];
    const spy = jest.spyOn(console, "log").mockImplementation((line: unknown) => {
      lines.push(String(line));
    });
    const error = new Error("prompt leaked in the message");
    log("info", {
      msg: "job_finished",
      jobId: "44444444-4444-4444-8444-444444444444",
      prompt: "coach text",
      password: "secret-value",
      err: error,
    });
    spy.mockRestore();
    expect(lines).toHaveLength(1);
    const first = lines[0];
    if (!first) throw new Error("missing log line");
    expect(first).not.toContain("coach text");
    expect(first).not.toContain("secret-value");
    expect(first).not.toContain("prompt leaked");
    expect(first).toContain("job_finished");
    expect(first).toContain("Error");
  });
});
