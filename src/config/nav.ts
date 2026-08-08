/**
 * Sitedeki bölümlerin tek listesi.
 *
 * Ana sayfadaki kart ızgarası, üst gezinme ve mobil menü hep buradan okuyor;
 * yeni bir bölüm eklemek için tek yer burası.
 */

export type NavGroup = "oyun" | "liste" | "biz";

export type NavItem = {
  href: string;
  title: string;
  blurb: string;
  /** lucide-react ikon adı — bileşen eşlemesi `icon-map.tsx` içinde. */
  icon: string;
  group: NavGroup;
};

export const NAV: NavItem[] = [
  {
    href: "/oyunlar/tavla",
    title: "Tavla",
    blurb: "Zarı at, mars yapmaya çalış.",
    icon: "dice",
    group: "oyun",
  },
  {
    href: "/oyunlar/satranc",
    title: "Satranç",
    blurb: "5 dakika, ekleme yok. Süren biterse kaybedersin.",
    icon: "crown",
    group: "oyun",
  },
  {
    href: "/oyunlar/isim-sehir",
    title: "İsim Şehir",
    blurb: "Harf çekilir, süre başlar, puanı birbirinize verirsiniz.",
    icon: "type",
    group: "oyun",
  },
  {
    href: "/oyunlar/hafiza",
    title: "Hafıza",
    blurb: "Kendi fotoğraflarımızla eşleştirme. Rekoru kır.",
    icon: "grid",
    group: "oyun",
  },
  {
    href: "/sampiyona",
    title: "Şampiyona",
    blurb: "Kim kaç kere kazandı, seriler, ayın şampiyonu.",
    icon: "trophy",
    group: "oyun",
  },
  {
    href: "/listeler/yillik",
    title: "Bu Yıl",
    blurb: "Bu yıl yapacaklarımız.",
    icon: "calendar-check",
    group: "liste",
  },
  {
    href: "/listeler/evlilik",
    title: "Evlenince",
    blurb: "Evlenince yapacaklarımız.",
    icon: "home",
    group: "liste",
  },
  {
    href: "/listeler/gidilecek",
    title: "Gidilecekler",
    blurb: "Gidip göreceğimiz yerler.",
    icon: "map-pin",
    group: "liste",
  },
  {
    href: "/listeler/izlenecek",
    title: "İzlenecekler",
    blurb: "Beraber izleyeceğimiz dizi ve filmler.",
    icon: "clapperboard",
    group: "liste",
  },
  {
    href: "/sayaclar",
    title: "Sayaçlar",
    blurb: "Özel günlere kaç gün kaldı.",
    icon: "timer",
    group: "biz",
  },
  {
    href: "/gunun-sorusu",
    title: "Günün Sorusu",
    blurb: "İkimiz de cevaplayınca açılır.",
    icon: "message-circle",
    group: "biz",
  },
  {
    href: "/mektuplar",
    title: "Mektuplar",
    blurb: "Açılma tarihi gelene kadar kilitli kalır.",
    icon: "mail",
    group: "biz",
  },
  {
    href: "/ceyiz",
    title: "Çeyiz",
    blurb: "Kim ne alacak, ne kadara — toplamıyla birlikte.",
    icon: "gem",
    group: "liste",
  },
  {
    href: "/sifreler",
    title: "Şifreler",
    blurb: "Netflix, Wi-Fi… unutmayalım diye.",
    icon: "key",
    group: "biz",
  },
];

export const GROUP_LABELS: Record<NavGroup, string> = {
  oyun: "Oyunlar",
  liste: "Listeler",
  biz: "Bizden",
};

export const GROUP_ORDER: NavGroup[] = ["oyun", "liste", "biz"];
