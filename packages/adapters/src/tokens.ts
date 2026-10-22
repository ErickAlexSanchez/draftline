import { createHash, randomBytes } from "node:crypto";
import type { TokenIssuer } from "@draftline/domain";

export function hashToken(secret: string, token: string): string {
  return createHash("sha256").update(secret).update(":").update(token).digest("hex");
}

export function createTokenIssuer(secret: string): TokenIssuer {
  return {
    issue() {
      const token = randomBytes(32).toString("base64url");
      return { token, tokenHash: hashToken(secret, token) };
    },
    hash(token: string) {
      return hashToken(secret, token);
    },
  };
}
