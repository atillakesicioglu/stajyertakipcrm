/** Verilen Date'i UTC gece yarısına normalize eder (00:00:00.000Z) */
export function toDateOnly(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  );
}

export function formatDateTR(date: Date): string {
  return new Date(date).toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
