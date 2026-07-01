import bcrypt from "bcryptjs";

/** Hızlı kontrol için sabit işaretçi (bcrypt gerektirmez). */
export const UNSET_PASSWORD_MARKER = "$unset$";

const UNSET_PASSWORD_PLAINTEXT =
  "__STAJYER_MUST_SET_PASSWORD_v1__@unset";

export function createUnsetPasswordHash(): string {
  return UNSET_PASSWORD_MARKER;
}

export function isUnsetPasswordSync(
  hash: string | null | undefined
): boolean {
  return !hash || hash === UNSET_PASSWORD_MARKER;
}

/** Eski bcrypt tabanlı işaretçiler için geriye dönük uyumluluk. */
export async function isUnsetPassword(
  hash: string | null | undefined
): Promise<boolean> {
  if (isUnsetPasswordSync(hash)) return true;
  if (hash?.startsWith("$2")) {
    return bcrypt.compare(UNSET_PASSWORD_PLAINTEXT, hash);
  }
  return false;
}
