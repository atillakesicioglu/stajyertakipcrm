export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

const GOOGLE_MAIL_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

function normalizeLocalPart(local: string, domain: string): string {
  let result = local;

  // RFC 5233 plus addressing — Gmail, Outlook, Yahoo, iCloud, Proton vb.
  const plusIndex = result.indexOf("+");
  if (plusIndex !== -1) {
    result = result.slice(0, plusIndex);
  }

  // Google hesaplarında nokta farkı aynı kutuya düşer.
  if (GOOGLE_MAIL_DOMAINS.has(domain)) {
    result = result.replace(/\./g, "");
  }

  return result;
}

/** Farklı yazılsa da aynı posta kutusuna düşebilecek adresleri tek anahtarda toplar. */
export function mailboxKey(email: string): string {
  const normalized = normalizeEmail(email);
  const at = normalized.lastIndexOf("@");
  if (at === -1) return normalized;

  const local = normalized.slice(0, at);
  const domain = normalized.slice(at + 1);
  return `${normalizeLocalPart(local, domain)}@${domain}`;
}

export function isSameMailbox(a: string, b: string): boolean {
  const na = normalizeEmail(a);
  const nb = normalizeEmail(b);
  if (na === nb) return true;
  return mailboxKey(a) === mailboxKey(b);
}

export function validateDistinctMailboxes(
  recipient: string,
  sender: string
): string | null {
  if (!sender.trim()) return null;

  if (isSameMailbox(recipient, sender)) {
    return `Stajyer e-postası (${recipient}) gönderen adresinizle aynı posta kutusuna düşüyor. Stajyere tamamen farklı bir e-posta adresi tanımlayın.`;
  }
  return null;
}
