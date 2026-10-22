import type { Principal, SessionRepository, TokenIssuer } from "../ports";

export async function authenticate(
  sessions: SessionRepository,
  tokens: TokenIssuer,
  token: string | undefined,
  now: Date,
): Promise<Principal | null> {
  if (!token) return null;
  return sessions.findPrincipal(tokens.hash(token), now);
}
