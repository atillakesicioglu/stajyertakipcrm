import crypto from "crypto";

export function createEmailToken() {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  return { token, tokenHash };
}

export function hashEmailToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export const EMAIL_TOKEN_TTL_MS = 30 * 60 * 1000;
