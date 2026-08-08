/**
 * `@db.Date` sütunları için dönüşümler.
 *
 * Prisma bu sütunları UTC gece yarısı `Date` nesnesi olarak veriyor. Türkiye
 * UTC+3 olduğu için yerel getirici (`getDate()`) ile okumak günü bir geri
 * kaydırıyor — 1 Kasım, 31 Ekim görünüyor. Bu yüzden tarih-yalnız değerler
 * her yerde UTC parçalarından okunup yazılıyor.
 *
 * Bu modül bilerek sunucu eylemlerinden ayrı: `"use server"` dosyalarında
 * her export'un async olması zorunlu, bu yardımcılar ise senkron.
 */

/** `Date` (UTC gece yarısı) → `YYYY-MM-DD` */
export function toDateString(value: Date): string {
  return [
    value.getUTCFullYear(),
    String(value.getUTCMonth() + 1).padStart(2, "0"),
    String(value.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

/** `YYYY-MM-DD` → `Date` (UTC gece yarısı) */
export function fromDateString(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Bugün, UTC gece yarısı olarak. Sunucu Europe/Istanbul saatinde çalışıyor. */
export function todayDateOnly(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}
