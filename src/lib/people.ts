import { cache } from "react";

import { PEOPLE as DEFAULTS, PERSON_KEYS, TOGETHER_SINCE, type PersonKey } from "@/config/site";
import { toDateString } from "@/lib/date-only";
import { db } from "@/lib/db";

/**
 * Kişiler ve ilişki tarihi — çalışma anındaki gerçek kaynak.
 *
 * `config/site.ts` yalnızca ilk kurulum değerlerini taşıyor; Ayarlar ekranından
 * değiştirilen isim ve tarihler veritabanında duruyor. Sunucu bileşenleri
 * buradan okur, istemci bileşenlerine ise değerler prop olarak iner —
 * istemcinin veritabanına erişimi yok.
 *
 * `cache()` aynı istek içindeki tekrar çağrıları tek sorguya indiriyor.
 */

export type Person = {
  key: PersonKey;
  name: string;
  /** `YYYY-MM-DD` */
  birthday: string;
  accent: string;
};

export type People = Record<PersonKey, Person>;

export const getPeople = cache(async (): Promise<People> => {
  const rows = await db.user.findMany();
  const byId = new Map(rows.map((row) => [row.id, row]));

  const out = {} as People;
  for (const key of PERSON_KEYS) {
    const row = byId.get(key);
    out[key] = row
      ? {
          key,
          name: row.name,
          birthday: toDateString(row.birthday),
          accent: row.accent,
        }
      : DEFAULTS[key];
  }
  return out;
});

export const getTogetherSince = cache(async (): Promise<string> => {
  const row = await db.setting.findUnique({ where: { key: "togetherSince" } });
  const value = row?.value as { date?: string } | null;
  return value?.date ?? TOGETHER_SINCE;
});

export function partnerOf(user: PersonKey): PersonKey {
  return user === "bilal" ? "partner" : "bilal";
}
