/**
 * Sitenin tek sabit yapılandırma yeri.
 *
 * Buradaki isimler ve tarihler `Setting` tablosundan da okunabilir (Ayarlar
 * ekranı yazar); burada duran değerler ilk kurulumdaki tohum değerlerdir.
 */

export const SITE = {
  name: "Bizim Yerimiz",
  description: "İkimize ait küçük bir yer.",
} as const;

/** İlişkinin başladığı gün — ana sayfadaki "kaç gündür" sayacı buradan sayar. */
export const TOGETHER_SINCE = "2020-01-11";

export type PersonKey = "bilal" | "partner";

export const PEOPLE: Record<
  PersonKey,
  { key: PersonKey; name: string; birthday: string; accent: string }
> = {
  bilal: {
    key: "bilal",
    name: "Bilal",
    birthday: "2002-11-01",
    accent: "#7C3AED",
  },
  partner: {
    key: "partner",
    // TODO(bilal): gerçek ismi yaz — Ayarlar ekranından da değiştirilebilir.
    name: "Aşkım",
    birthday: "2002-02-17",
    accent: "#E879F9",
  },
};

export const PERSON_KEYS = ["bilal", "partner"] as const;
