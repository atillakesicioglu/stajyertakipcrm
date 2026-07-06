export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** user+tag@gmail.com ve user@gmail.com aynı kutuya düşer */
export function mailboxKey(email: string): string {
  const normalized = normalizeEmail(email);
  const [local, domain] = normalized.split("@");
  if (!local || !domain) return normalized;
  return `${local.split("+")[0]}@${domain}`;
}

export function isSameMailbox(a: string, b: string): boolean {
  return mailboxKey(a) === mailboxKey(b);
}

export function validateDistinctMailboxes(
  recipient: string,
  sender: string
): string | null {
  if (isSameMailbox(recipient, sender)) {
    return `Stajyer e-postası (${recipient}) gönderen adresinizle aynı posta kutusuna düşüyor (Gmail +alias dahil). Stajyere tamamen farklı bir e-posta tanımlayın — örn. kişisel Hotmail/Outlook hesabı.`;
  }
  return null;
}
