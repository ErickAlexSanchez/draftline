import { log } from "@draftline/adapters";
import { compose } from "@draftline/composition";
import { interruptibleSleep, runWorkerLoop } from "./loop";
import { bindStopSignals } from "./shutdown";

async function main(): Promise<void> {
  const container = await compose();
  const controller = new AbortController();
  bindStopSignals(() => {
    controller.abort();
  });
  await runWorkerLoop({
    signal: controller.signal,
    pollMs: container.env.JOB_POLL_MS,
    processNext: () => container.processNextJob(),
    sleep: interruptibleSleep,
    close: () => container.close(),
    log: (message) => log("info", { msg: message }),
  });
  process.exit(0);
}

main().catch((error: unknown) => {
  log("error", { msg: "worker_start_failed", err: error });
  process.exit(1);
});
