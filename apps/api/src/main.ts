import { log } from "@draftline/adapters";
import { compose } from "@draftline/composition";
import { listen } from "./listen";
import { createServer } from "./server";

async function main(): Promise<void> {
  const container = await compose();
  const app = createServer(container);
  const server = await listen(app, container.env.API_PORT);
  log("info", { msg: "api_listening", port: server.port });
  const stop = (): void => {
    void server
      .close()
      .then(() => container.close())
      .then(() => {
        process.exit(0);
      })
      .catch((error: unknown) => {
        log("error", { msg: "api_shutdown_failed", err: error });
        process.exit(1);
      });
  };
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);
}

main().catch((error: unknown) => {
  log("error", { msg: "api_start_failed", err: error });
  process.exit(1);
});
