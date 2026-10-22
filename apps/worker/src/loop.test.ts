import { interruptibleSleep, runWorkerLoop } from "./loop";

describe("runWorkerLoop", () => {
  it("finishes the current job and closes when the stop signal arrives", async () => {
    const controller = new AbortController();
    const order: string[] = [];
    await runWorkerLoop({
      signal: controller.signal,
      pollMs: 1000,
      sleep: async () => {
        order.push("sleep");
      },
      processNext: async () => {
        order.push("process");
        controller.abort();
        return "processed";
      },
      close: async () => {
        order.push("close");
      },
      log: () => undefined,
    });
    expect(order).toEqual(["process", "close"]);
  });

  it("closes after an idle sleep is aborted and does not claim another job", async () => {
    const controller = new AbortController();
    let calls = 0;
    const events: string[] = [];
    await runWorkerLoop({
      signal: controller.signal,
      pollMs: 5000,
      sleep: async (_ms, signal) => {
        events.push("sleep");
        controller.abort();
        if (signal.aborted) return;
      },
      processNext: async () => {
        calls += 1;
        return "idle";
      },
      close: async () => {
        events.push("close");
      },
      log: (message) => {
        events.push(message);
      },
    });
    expect(calls).toBe(1);
    expect(events).toEqual(["worker_ready", "sleep", "close", "worker_stopped"]);
  });

  it("resolves interruptible sleep when the signal aborts", async () => {
    const controller = new AbortController();
    const pending = interruptibleSleep(30_000, controller.signal);
    controller.abort();
    await pending;
    expect(controller.signal.aborted).toBe(true);
  });
});
