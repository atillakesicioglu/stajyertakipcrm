import bcrypt from "bcryptjs";

/** Stajyer henüz şifre belirlemediğinde kullanılan dahili işaretçi. */
const UNSET_PASSWORD_PLAINTEXT =
  "__STAJYER_MUST_SET_PASSWORD_v1__@unset";

export async function createUnsetPasswordHash(): Promise<string> {
  return bcrypt.hash(UNSET_PASSWORD_PLAINTEXT, 10);
}

export async function isUnsetPassword(
  hash: string | null | undefined
): Promise<boolean> {
  if (!hash) return true;
  return bcrypt.compare(UNSET_PASSWORD_PLAINTEXT, hash);
}
