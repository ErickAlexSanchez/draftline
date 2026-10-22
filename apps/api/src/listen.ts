import { serve, type ServerType } from "@hono/node-server";

type FetchApp = {
  fetch: (request: Request) => Response | Promise<Response>;
};

export function listen(app: FetchApp, port: number): Promise<{ port: number; close: () => Promise<void> }> {
  const fetch = (request: Request): Response | Promise<Response> => app.fetch(request);
  return new Promise((resolve, reject) => {
    let settled = false;
    const server = serve(
      { fetch, port, hostname: "127.0.0.1" },
      (info) => {
        if (settled) return;
        settled = true;
        resolve({
          port: info.port,
          close: () => closeServer(server),
        });
      },
    );
    server.on("error", (error: Error) => {
      if (settled) return;
      settled = true;
      reject(error);
    });
  });
}

function closeServer(server: ServerType): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}
