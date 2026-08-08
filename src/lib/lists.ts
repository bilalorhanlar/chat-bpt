import type { ListType } from "@prisma/client";

/**
 * Dört listenin tek yapılandırması.
 *
 * Hepsi aynı eylem katmanını kullanıyor; buradaki alanlar başlığı, boş durum
 * metnini ve ek alanları değiştiriyor:
 *
 *  - `link`  → satıra opsiyonel bir bağlantı eklenebilir (konum, Google Maps…)
 *  - `media` → izlenecekler: IMDb bağlantısı, kapak ve istek puanı taşır,
 *              satır listesi yerine kapaklı ızgara çizilir.
 */

export const LIST_SLUGS = ["yillik", "evlilik", "gidilecek", "izlenecek"] as const;
export type ListSlug = (typeof LIST_SLUGS)[number];

export type ListConfig = {
  type: ListType;
  title: string;
  eyebrow: string;
  blurb: string;
  icon: string;
  placeholder: string;
  emptyTitle: string;
  emptyHint: string;
  doneLabel: string;
  /** Opsiyonel bağlantı alanı — etiketi listeye göre değişir. */
  link?: { label: string; placeholder: string };
  /** IMDb'li kapaklı ızgara (yalnızca izlenecekler). */
  media?: boolean;
  kinds?: readonly { value: string; label: string }[];
};

export const LISTS: Record<ListSlug, ListConfig> = {
  yillik: {
    type: "YILLIK",
    title: "Bu Yıl",
    eyebrow: "liste",
    blurb: "Bu yıl yapacaklarımız.",
    icon: "calendar-check",
    placeholder: "Bu yıl ne yapalım?",
    emptyTitle: "Bu yıl için henüz bir şey yok",
    emptyHint: "Aklına gelen ilk şeyi yaz — sonra beraber düzenleriz.",
    doneLabel: "Yaptık",
    link: { label: "Konum ya da bağlantı", placeholder: "https://… (opsiyonel)" },
  },
  evlilik: {
    type: "EVLILIK",
    title: "Evlenince",
    eyebrow: "liste",
    blurb: "Evlenince yapacaklarımız.",
    icon: "home",
    placeholder: "Evlenince ne yapalım?",
    emptyTitle: "Liste boş",
    emptyHint: "İlk tatilimiz, alışkanlıklarımız, evimiz…",
    doneLabel: "Yaptık",
  },
  gidilecek: {
    type: "GIDILECEK",
    title: "Gidilecekler",
    eyebrow: "liste",
    blurb: "Gidip göreceğimiz yerler.",
    icon: "map-pin",
    placeholder: "Nereye gidelim?",
    emptyTitle: "Henüz yer eklenmemiş",
    emptyHint: "Şehir, ülke, kafe — aklındaki her yeri yazabilirsin.",
    doneLabel: "Gittik",
    link: {
      label: "Google Maps bağlantısı",
      placeholder: "https://maps.app.goo.gl/… (opsiyonel)",
    },
  },
  izlenecek: {
    type: "IZLENECEK",
    title: "İzlenecekler",
    eyebrow: "liste",
    blurb: "Beraber izleyeceğimiz dizi ve filmler.",
    icon: "clapperboard",
    placeholder: "Dizi ya da film adı",
    emptyTitle: "Liste boş",
    emptyHint: "IMDb bağlantısını yapıştır — kapağını ve adını kendisi çeker.",
    doneLabel: "İzledik",
    media: true,
    kinds: [
      { value: "dizi", label: "Dizi" },
      { value: "film", label: "Film" },
    ],
  },
};

export function isListSlug(value: string): value is ListSlug {
  return (LIST_SLUGS as readonly string[]).includes(value);
}
