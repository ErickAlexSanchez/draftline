import { Client } from "pg";

const SAFE_NAME = /^[a-z_][a-z0-9_]*$/;

export function databaseName(connectionString: string): string {
  const url = new URL(connectionString);
  const name = url.pathname.replace(/^\//, "");
  if (!SAFE_NAME.test(name)) throw new Error("Unsafe database name");
  return name;
}

function withDatabase(connectionString: string, name: string): string {
  const url = new URL(connectionString);
  url.pathname = `/${name}`;
  return url.toString();
}

function errorCode(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "code" in error && typeof error.code === "string") {
    return error.code;
  }
  return undefined;
}

export async function ensureDatabase(targetUrl: string): Promise<void> {
  const name = databaseName(targetUrl);
  const probe = new Client({ connectionString: targetUrl, connectionTimeoutMillis: 5000 });
  try {
    await probe.connect();
    await probe.end();
    return;
  } catch (error) {
    try {
      await probe.end();
    } catch (endError) {
      if (errorCode(error) !== "3D000") throw endError;
    }
    if (errorCode(error) !== "3D000") throw error;
  }

  const adminUrls = [withDatabase(targetUrl, "draftline"), withDatabase(targetUrl, "postgres")].filter(
    (url) => databaseName(url) !== name,
  );
  let lastError: unknown;
  for (const adminUrl of adminUrls) {
    const admin = new Client({ connectionString: adminUrl, connectionTimeoutMillis: 5000 });
    try {
      await admin.connect();
      const exists = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [name]);
      if (exists.rowCount === 0) {
        await admin.query(`CREATE DATABASE ${name}`);
      }
      await admin.end();
      return;
    } catch (error) {
      lastError = error;
      try {
        await admin.end();
      } catch (endError) {
        lastError = endError;
      }
    }
  }
  if (lastError instanceof Error) throw lastError;
  throw new Error("Could not ensure the database");
}
