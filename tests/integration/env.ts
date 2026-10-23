import { mkdtempSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";

const url = process.env.INTEGRATION_DATABASE_URL ?? "postgresql://draftline:draftline@127.0.0.1:5433/draftline_test";
if (/:5432\//.test(url)) throw new Error("Refusing to use host port 5432");

process.env.DATABASE_URL = url;
process.env.SESSION_SECRET = "integration-test-session-secret-32chars";
process.env.WEB_ORIGIN = "http://localhost:3201";
process.env.API_URL = "http://localhost:3202";
process.env.API_PORT = "3202";
process.env.STORAGE_DIR = mkdtempSync(path.join(tmpdir(), "draftline-it-"));
process.env.MODEL_CREDIT_COST = "1";
process.env.FAKE_MODEL_DELAY_MS = "0";
process.env.JOB_POLL_MS = "200";
process.env.JOB_VISIBILITY_DELAY_MS = "0";
process.env.SEED_EDITOR_EMAIL = "editor@draftline.example";
process.env.SEED_VIEWER_EMAIL = "viewer@draftline.example";
process.env.SEED_EDITOR_PASSWORD = "editor-test-password";
process.env.SEED_VIEWER_PASSWORD = "viewer-test-password";
