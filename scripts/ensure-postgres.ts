import { ensurePostgres } from "./postgres-local";

void ensurePostgres().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "postgres unavailable";
  console.error(JSON.stringify({ level: "error", msg: "postgres_unavailable", detail: message }));
  process.exit(1);
});
