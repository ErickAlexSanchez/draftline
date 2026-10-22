import type { Pool, PoolClient } from "pg";
import type { BudgetStore } from "@draftline/domain";

export class PgBudget implements BudgetStore {
  constructor(private readonly pool: Pool) {}

  async readCredits(tenantId: string): Promise<number> {
    const result = await this.pool.query("SELECT credits FROM tenants WHERE id = $1", [tenantId]);
    const row = result.rows[0] as { credits?: unknown } | undefined;
    if (!row || typeof row.credits !== "number") throw new Error("Tenant not found");
    return row.credits;
  }

  async commitSuccess(input: {
    tenantId: string;
    jobId: string;
    cost: number;
    objectKey: string;
    now: Date;
  }): Promise<{ ok: true } | { ok: false; code: "insufficient_credits" }> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const debit = await client.query(
        "UPDATE tenants SET credits = credits - $2 WHERE id = $1 AND credits >= $2",
        [input.tenantId, input.cost],
      );
      if (debit.rowCount !== 1) {
        await markInsufficient(client, input.jobId, input.now);
        await client.query("COMMIT");
        return { ok: false, code: "insufficient_credits" };
      }
      const jobUpdate = await client.query(
        `UPDATE jobs
         SET status = 'succeeded', object_key = $2, failure_code = NULL, updated_at = $3
         WHERE id = $1 AND status = 'running'`,
        [input.jobId, input.objectKey, input.now],
      );
      if (jobUpdate.rowCount !== 1) throw new Error("Job was not running");
      await client.query("COMMIT");
      return { ok: true };
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        throw new Error("Credit transaction rollback failed", { cause: rollbackError });
      }
      throw error;
    } finally {
      client.release();
    }
  }
}

async function markInsufficient(client: PoolClient, jobId: string, now: Date): Promise<void> {
  await client.query(
    `UPDATE jobs
     SET status = 'failed', failure_code = 'insufficient_credits', object_key = NULL, updated_at = $2
     WHERE id = $1 AND status = 'running'`,
    [jobId, now],
  );
}
