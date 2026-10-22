import { loginUser } from "./login";
import type { SessionRepository, UserRecord } from "../ports";

const user: UserRecord = {
  id: "22222222-2222-4222-8222-222222222222",
  tenantId: "11111111-1111-4111-8111-111111111111",
  email: "editor@draftline.example",
  passwordHash: "stored-hash",
  role: "editor",
};

describe("loginUser", () => {
  it("does not open a session when the password does not match", async () => {
    let inserts = 0;
    const sessions: SessionRepository = {
      insert: async () => {
        inserts += 1;
      },
      deleteByTokenHash: async () => undefined,
      findPrincipal: async () => null,
    };
    const result = await loginUser(
      {
        users: { findByEmail: async () => user },
        sessions,
        passwords: {
          hash: async () => "hash",
          verify: async () => false,
          dummyHash: async () => "dummy",
        },
        tokens: { issue: () => ({ token: "token", tokenHash: "hash" }), hash: () => "hash" },
        clock: { now: () => new Date("2026-01-01T00:00:00.000Z") },
        ids: { next: () => "55555555-5555-4555-8555-555555555555" },
        sessionTtlMs: 1000,
      },
      { email: "editor@draftline.example", password: "wrong-password" },
    );
    expect(result.token).toBeNull();
    expect(inserts).toBe(0);
  });

  it("opens one session for a matching password", async () => {
    let inserts = 0;
    const result = await loginUser(
      {
        users: { findByEmail: async () => user },
        sessions: {
          insert: async () => {
            inserts += 1;
          },
          deleteByTokenHash: async () => undefined,
          findPrincipal: async () => null,
        },
        passwords: {
          hash: async () => "hash",
          verify: async () => true,
          dummyHash: async () => "dummy",
        },
        tokens: { issue: () => ({ token: "issued-token", tokenHash: "issued-hash" }), hash: () => "issued-hash" },
        clock: { now: () => new Date("2026-01-01T00:00:00.000Z") },
        ids: { next: () => "55555555-5555-4555-8555-555555555555" },
        sessionTtlMs: 1000,
      },
      { email: " Editor@Draftline.example ", password: "correct-password" },
    );
    expect(result).toEqual({ token: "issued-token" });
    expect(inserts).toBe(1);
  });
});
