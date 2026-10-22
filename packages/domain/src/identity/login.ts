import type { Clock, IdGenerator, PasswordHasher, SessionRepository, TokenIssuer, UserRepository } from "../ports";

export async function loginUser(
  deps: {
    users: UserRepository;
    sessions: SessionRepository;
    passwords: PasswordHasher;
    tokens: TokenIssuer;
    clock: Clock;
    ids: IdGenerator;
    sessionTtlMs: number;
  },
  input: { email: string; password: string },
): Promise<{ token: string } | { token: null }> {
  const email = input.email.trim().toLowerCase();
  const user = await deps.users.findByEmail(email);
  const hash = user?.passwordHash ?? (await deps.passwords.dummyHash());
  const matches = await deps.passwords.verify(input.password, hash);
  if (!user || !matches) return { token: null };

  const now = deps.clock.now();
  const issued = deps.tokens.issue();
  await deps.sessions.insert({
    id: deps.ids.next(),
    userId: user.id,
    tokenHash: issued.tokenHash,
    expiresAt: new Date(now.getTime() + deps.sessionTtlMs),
    createdAt: now,
  });
  return { token: issued.token };
}
