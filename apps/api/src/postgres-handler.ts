import { compose, type Container } from "@draftline/composition";
import { backendTarget, toBackendRequest } from "./backend-request";
import { createServer } from "./server";

let pending: Promise<Container> | undefined;

function sharedContainer(): Promise<Container> {
  pending ??= compose().catch((error: unknown) => {
    pending = undefined;
    throw error;
  });
  return pending;
}

export async function handlePostgresRequest(request: Request): Promise<Response> {
  const app = createServer(await sharedContainer());
  const url = backendTarget(request);
  return app.fetch(await toBackendRequest(request, url));
}
