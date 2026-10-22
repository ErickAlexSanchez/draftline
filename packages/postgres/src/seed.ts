import type { Pool, PoolClient } from "pg";
import { scryptHasher } from "@draftline/adapters";
import { DEMO_CREDITS, DEMO_EDITOR_ID, DEMO_TENANT_ID, DEMO_VIEWER_ID } from "./ids";

export async function seed(
  pool: Pool,
  input: { editorEmail: string; viewerEmail: string; editorPassword: string; viewerPassword: string },
): Promise<void> {
  const editorHash = await scryptHasher.hash(input.editorPassword);
  const viewerHash = await scryptHasher.hash(input.viewerPassword);
  const now = new Date();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO tenants (id, name, credits, created_at)
       VALUES ($1, 'Draftline', $2, $3)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
      [DEMO_TENANT_ID, DEMO_CREDITS, now],
    );
    await upsertUser(client, {
      id: DEMO_EDITOR_ID,
      email: input.editorEmail.trim().toLowerCase(),
      passwordHash: editorHash,
      role: "editor",
      now,
    });
    await upsertUser(client, {
      id: DEMO_VIEWER_ID,
      email: input.viewerEmail.trim().toLowerCase(),
      passwordHash: viewerHash,
      role: "viewer",
      now,
    });
    await client.query("COMMIT");
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      throw new Error("Seed rollback failed", { cause: rollbackError });
    }
    throw error;
  } finally {
    client.release();
  }
}

async function upsertUser(
  client: PoolClient,
  input: { id: string; email: string; passwordHash: string; role: "editor" | "viewer"; now: Date },
): Promise<void> {
  await client.query(
    `INSERT INTO users (id, tenant_id, email, password_hash, role, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (email) DO UPDATE
     SET password_hash = EXCLUDED.password_hash,
         role = EXCLUDED.role,
         tenant_id = EXCLUDED.tenant_id`,
    [input.id, DEMO_TENANT_ID, input.email, input.passwordHash, input.role, input.now],
  );
}

export async function resetWorkspace(pool: Pool): Promise<void> {
  await pool.query("TRUNCATE TABLE jobs, drafts, sessions");
  const updated = await pool.query("UPDATE tenants SET credits = $2 WHERE id = $1", [DEMO_TENANT_ID, DEMO_CREDITS]);
  if (updated.rowCount !== 1) throw new Error("Workspace reset could not find the tenant");
}

export async function setTenantCredits(pool: Pool, tenantId: string, credits: number): Promise<void> {
  const updated = await pool.query("UPDATE tenants SET credits = $2 WHERE id = $1", [tenantId, credits]);
  if (updated.rowCount !== 1) throw new Error("Tenant not found");
}
