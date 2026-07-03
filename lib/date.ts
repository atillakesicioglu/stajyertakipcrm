/** Yerel takvim gününü UTC gece yarısına normalize eder (00:00:00.000Z) */
export function toDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

/** @deprecated toDateOnly ile aynı — geriye dönük uyumluluk */
export const toLocalDateOnly = toDateOnly;

export function isSameDateOnly(a: Date, b: Date): boolean {
  return a.getTime() === b.getTime();
}

export const WEEKDAY_NAMES_TR = [
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
] as const;

/** Referans tarihin içinde olduğu haftanın iş günleri (varsayılan Pazartesi başlangıç) */
export function getWorkWeekDates(
  reference = new Date(),
  weekStartDay = 1
): Date[] {
  const ref = new Date(reference);
  const dayOfWeek = ref.getDay();
  let diff = dayOfWeek - weekStartDay;
  if (diff < 0) diff += 7;

  const start = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  start.setDate(start.getDate() - diff);

  const dates: Date[] = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(toDateOnly(d));
  }
  return dates;
}

/** Bir sonraki iş haftasının günleri */
export function getNextWorkWeekDates(
  reference = new Date(),
  weekStartDay = 1
): Date[] {
  const thisWeek = getWorkWeekDates(reference, weekStartDay);
  const nextMonday = new Date(thisWeek[0]!);
  nextMonday.setUTCDate(nextMonday.getUTCDate() + 7);

  const dates: Date[] = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(nextMonday);
    d.setUTCDate(nextMonday.getUTCDate() + i);
    dates.push(toDateOnly(d));
  }
  return dates;
}

export function formatWeekRangeLabel(dates: Date[]): string {
  if (dates.length === 0) return "";
  const first = dates[0]!;
  const last = dates[dates.length - 1]!;
  const fmt = (d: Date) =>
    d.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      timeZone: "UTC",
    });
  return `${fmt(first)} – ${fmt(last)}`;
}

export function formatWeekdayLabel(date: Date): string {
  const d = new Date(date);
  const weekdayIndex = (d.getUTCDay() + 6) % 7;
  const weekday = WEEKDAY_NAMES_TR[weekdayIndex] ?? "";
  const dayMonth = d.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
  return `${weekday}, ${dayMonth}`;
}

export function dateToKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function formatDateTR(date: Date): string {
  return new Date(date).toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
