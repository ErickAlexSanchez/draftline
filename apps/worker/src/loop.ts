export type WorkerLoopOptions = {
  signal: AbortSignal;
  pollMs: number;
  processNext: () => Promise<"idle" | "processed">;
  sleep: (ms: number, signal: AbortSignal) => Promise<void>;
  close: () => Promise<void>;
  log: (message: string) => void;
};

export async function runWorkerLoop(options: WorkerLoopOptions): Promise<void> {
  options.log("worker_ready");
  while (!options.signal.aborted) {
    const result = await options.processNext();
    if (options.signal.aborted) break;
    if (result === "idle") await options.sleep(options.pollMs, options.signal);
  }
  await options.close();
  options.log("worker_stopped");
}

export function interruptibleSleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = (): void => {
      clearTimeout(timer);
      resolve();
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}
