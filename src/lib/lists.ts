import type { ListType } from "@prisma/client";

/**
 * Dört listenin tek yapılandırması.
 *
 * Hepsi aynı sayfa bileşenini kullanıyor; buradaki alanlar başlığı, boş durum
 * metnini ve (izlenecekler için) ek alanları değiştiriyor.
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
  /** İzlenecekler listesi tür seçimi taşıyor; diğerlerinde yok. */
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
  },
  evlilik: {
    type: "EVLILIK",
    title: "Evlenince",
    eyebrow: "liste",
    blurb: "Evlenince yapacaklarımız.",
    icon: "home",
    placeholder: "Evlenince ne yapalım?",
    emptyTitle: "Liste boş",
    emptyHint: "Evimize alacaklarımız, ilk tatilimiz, alışkanlıklarımız…",
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
  },
  izlenecek: {
    type: "IZLENECEK",
    title: "İzlenecekler",
    eyebrow: "liste",
    blurb: "Beraber izleyeceğimiz dizi ve filmler.",
    icon: "clapperboard",
    placeholder: "Hangi dizi ya da film?",
    emptyTitle: "Liste boş",
    emptyHint: "Bir dizi ya da film ekle, izleyince işaretleriz.",
    doneLabel: "İzledik",
    kinds: [
      { value: "dizi", label: "Dizi" },
      { value: "film", label: "Film" },
    ],
  },
};

export function isListSlug(value: string): value is ListSlug {
  return (LIST_SLUGS as readonly string[]).includes(value);
}
