/**
 * Satranç durumu.
 *
 * Kuralları `chess.js` yürütüyor — rok, geçerken alma, terfi, şah mat, pat ve
 * beraberlik koşulları test edilmiş bir kütüphanede. Buradaki tip yalnızca
 * veritabanına yazılan **kalıcı** durumu tanımlıyor; tahtanın kendisi her
 * seferinde FEN'den yeniden kuruluyor.
 */

export type Seat = 0 | 1; // 0 = beyaz, 1 = siyah

export type SatrancResult = "MAT" | "PAT" | "SURE" | "TERK" | "BERABERE";

export type SatrancState = {
  /** Tahtanın tam durumu. */
  fen: string;
  /** SAN gösterimiyle hamle listesi. */
  history: string[];
  /** Son hamlenin kareleri — tahtada vurgulanır. */
  lastMove: { from: string; to: string } | null;
  /**
   * Kalan süreler (ms): [beyaz, siyah].
   * Sırası gelen oyuncunun süresi buradan **düşülmemiş** hâlde durur;
   * geçen süre `turnStartedAt` ile hesaplanır.
   */
  clocks: [number, number];
  /** Sırası gelen oyuncunun saatinin başladığı an (sunucu ms). */
  turnStartedAt: number;
  winner: Seat | null;
  result: SatrancResult | null;
};

/** Başlangıç süresi: 5 dakika, ekleme yok. */
export const START_MS = 5 * 60 * 1000;

/**
 * Bir oyuncunun **şu anki** kalan süresi.
 *
 * Sırası gelen oyuncunun saati akıyor; diğerininki duruyor. Tarayıcı bunu her
 * saniye çizmek için kullanıyor, sunucu da süre bitişine karar verirken —
 * ikisi aynı fonksiyonu çağırdığı için gösterilen süre ile karar verilen süre
 * ayrışmıyor.
 */
export function remainingMs(state: SatrancState, seat: Seat, now: number): number {
  const base = state.clocks[seat];
  if (state.winner !== null) return Math.max(0, base);
  const toMove = sideToMove(state);
  if (seat !== toMove) return Math.max(0, base);
  return Math.max(0, base - (now - state.turnStartedAt));
}

/** FEN'in sıra alanından hamle sırasındaki oyuncu. */
export function sideToMove(state: SatrancState): Seat {
  return state.fen.split(" ")[1] === "w" ? 0 : 1;
}
