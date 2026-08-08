import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Diziyi kopyalayıp karıştırır (Fisher-Yates). Girdiye dokunmaz. */
export function shuffled<T>(items: readonly T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** `1.234` → `1.234` (Türkçe binlik ayracı) */
export function trNumber(n: number) {
  return n.toLocaleString("tr-TR");
}

const TR_MONTHS = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
] as const;

/** `2020-01-11` → `11 Ocak 2020` */
export function trDate(input: string | Date, opts?: { withYear?: boolean }) {
  const d = typeof input === "string" ? parseDateOnly(input) : input;
  const day = d.getDate();
  const month = TR_MONTHS[d.getMonth()];
  return opts?.withYear === false ? `${day} ${month}` : `${day} ${month} ${d.getFullYear()}`;
}

/**
 * `YYYY-MM-DD` metnini **yerel** gün olarak okur.
 * `new Date("2002-11-01")` UTC gece yarısı üretir ve Türkiye'de bir gün geriye
 * kayabilir; doğum günü hesapları bu yüzden elle parçalanıyor.
 */
export function parseDateOnly(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** İki yerel gün arasındaki tam gün sayısı (saat farklarından etkilenmez). */
export function daysBetween(a: Date, b: Date): number {
  const ms =
    Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) -
    Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  return Math.round(ms / 86_400_000);
}

/** Verilen gün-ay için bir sonraki yıldönümü (bugün ise bugünü döner). */
export function nextAnniversary(iso: string, now = new Date()): Date {
  const src = parseDateOnly(iso);
  const candidate = new Date(now.getFullYear(), src.getMonth(), src.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (candidate < today) candidate.setFullYear(candidate.getFullYear() + 1);
  return candidate;
}

/** Doğum tarihinden bugünkü yaşı verir. */
export function ageOn(iso: string, now = new Date()): number {
  const b = parseDateOnly(iso);
  let age = now.getFullYear() - b.getFullYear();
  const beforeBirthday =
    now.getMonth() < b.getMonth() ||
    (now.getMonth() === b.getMonth() && now.getDate() < b.getDate());
  if (beforeBirthday) age--;
  return age;
}

/** Bugün verilen gün-ay mı? */
export function isTodayAnniversary(iso: string, now = new Date()): boolean {
  const d = parseDateOnly(iso);
  return now.getMonth() === d.getMonth() && now.getDate() === d.getDate();
}
