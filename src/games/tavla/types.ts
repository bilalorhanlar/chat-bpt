/**
 * Tavla durum tipleri.
 *
 * Bu dosya hem tarayıcıda hem sunucuda kullanılıyor: DOM'a, Node API'lerine ve
 * rastgeleliğe hiç dokunmuyor. Zar atışı dışarıdan veriliyor (sunucu atar),
 * böylece aynı kod iki tarafta da aynı sonucu üretiyor.
 */

/** 0 = beyaz (24→1 yönünde), 1 = siyah (1→24 yönünde). */
export type Player = 0 | 1;

/** Bar'dan giriş. */
export const BAR = -1;
/** Toplama (evden çıkarma). */
export const OFF = 24;

export type Point = typeof BAR | typeof OFF | number;

export type Move = {
  from: Point;
  to: Point;
  /** Bu hamlede kullanılan zar. */
  die: number;
  /** Rakibin blot'u vuruldu mu. */
  hit: boolean;
};

export type Result = "NORMAL" | "MARS" | "HAMARS" | "TERK";

export type TavlaState = {
  /**
   * 24 hane. Pozitif = beyazın taş sayısı, negatif = siyahın.
   * Dizin 0 = 1 numaralı hane. Beyazın evi 0–5, siyahınki 18–23.
   */
  points: number[];
  /** Bar'daki taşlar: [beyaz, siyah]. */
  bar: [number, number];
  /** Toplanan taşlar: [beyaz, siyah]. */
  off: [number, number];

  turn: Player;

  /** Bu tur atılan zarlar — gösterim için (çiftte iki değer görünür). */
  rolled: [number, number] | null;
  /** Henüz kullanılmamış zarlar. Çift atışta dört değer olur. */
  dice: number[];

  /** Bu turda yapılan hamleler — geri alma için. */
  turnMoves: Move[];
  /** Tur başındaki durum (geri alma bunu geri yükler). */
  turnStart: {
    points: number[];
    bar: [number, number];
    off: [number, number];
    dice: number[];
  } | null;

  winner: Player | null;
  result: Result | null;

  /** Sunucu saatiyle turun başladığı an (ms). Süre göstergesi bunu kullanır. */
  turnStartedAt: number;
  /** Kaçıncı tur — hamle kaydı için. */
  ply: number;
};

export const CHECKERS_PER_PLAYER = 15;
