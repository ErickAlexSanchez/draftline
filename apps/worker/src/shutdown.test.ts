import { bindStopSignals } from "./shutdown";

describe("bindStopSignals", () => {
  it("aborts the worker when SIGTERM is emitted", () => {
    const controller = new AbortController();
    const stop = (): void => {
      controller.abort();
    };
    bindStopSignals(stop);
    process.emit("SIGTERM");
    expect(controller.signal.aborted).toBe(true);
    process.removeListener("SIGTERM", stop);
    process.removeListener("SIGINT", stop);
  });
});
