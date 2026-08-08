import {
  BAR,
  CHECKERS_PER_PLAYER,
  OFF,
  type Move,
  type Player,
  type Result,
  type TavlaState,
} from "./types";

/**
 * Tavla kuralları — saf, yan etkisiz.
 *
 * Sunucu bu motoru otorite olarak çalıştırıyor, tarayıcı da aynı motoru anında
 * geri bildirim için kullanıyor. İkisi aynı kodu çalıştırdığı için durum
 * ayrışması yapısal olarak mümkün değil.
 *
 * En çetrefilli kural "mümkün olan en çok zarı oynama zorunluluğu": tek tek
 * bakıldığında geçerli görünen bir hamle, sonrasında ikinci zarı oynanamaz
 * hâle getiriyorsa yasaktır. Bunu tek hamleye bakarak anlamak mümkün değil,
 * bu yüzden `maxPlayable` kalan zarlar üzerinde derinlemesine arama yapıyor
 * (derinlik en fazla 4, dallanma en fazla 24 — maliyeti önemsiz).
 */

/* --- kurulum ------------------------------------------------------------ */

export function initialPoints(): number[] {
  const points = new Array<number>(24).fill(0);
  // Beyaz (+): 24, 13, 8, 6 numaralı haneler
  points[23] = 2;
  points[12] = 5;
  points[7] = 3;
  points[5] = 5;
  // Siyah (−): 1, 12, 17, 19 numaralı haneler
  points[0] = -2;
  points[11] = -5;
  points[16] = -3;
  points[18] = -5;
  return points;
}

export function initialState(starter: Player, now: number): TavlaState {
  return {
    points: initialPoints(),
    bar: [0, 0],
    off: [0, 0],
    turn: starter,
    rolled: null,
    dice: [],
    turnMoves: [],
    turnStart: null,
    winner: null,
    result: null,
    turnStartedAt: now,
    ply: 0,
  };
}

/* --- yardımcılar -------------------------------------------------------- */

const sign = (player: Player) => (player === 0 ? 1 : -1);
/** Beyaz dizinleri azaltarak, siyah artırarak ilerler. */
const direction = (player: Player) => (player === 0 ? -1 : 1);

function countAt(points: number[], index: number, player: Player): number {
  const value = points[index];
  return player === 0 ? Math.max(0, value) : Math.max(0, -value);
}

function opponentCount(points: number[], index: number, player: Player): number {
  const value = points[index];
  return player === 0 ? Math.max(0, -value) : Math.max(0, value);
}

/** Oyuncunun bu haneye taş koyabilmesi için rakipte en fazla 1 taş olmalı. */
function isOpen(points: number[], index: number, player: Player): boolean {
  return opponentCount(points, index, player) <= 1;
}

function homeRange(player: Player): [number, number] {
  return player === 0 ? [0, 5] : [18, 23];
}

/** Bar'dan giriş yapılacak hane. */
function entryIndex(player: Player, die: number): number {
  return player === 0 ? 24 - die : die - 1;
}

/** Toplamaya başlayabilmek için 15 taşın tamamı evde (ya da toplanmış) olmalı. */
export function canBearOff(state: TavlaState, player: Player): boolean {
  if (state.bar[player] > 0) return false;
  const [low, high] = homeRange(player);
  let inHome = state.off[player];
  for (let i = low; i <= high; i++) inHome += countAt(state.points, i, player);
  return inHome === CHECKERS_PER_PLAYER;
}

/**
 * Toplamada zar tam gelmiyorsa, o zardan **daha uzaktaki** hanelerde taş
 * kalmamış olması gerekir. Beyaz için "daha uzak" = daha büyük dizin.
 */
function hasCheckerFartherThan(state: TavlaState, player: Player, index: number): boolean {
  const [low, high] = homeRange(player);
  if (player === 0) {
    for (let i = index + 1; i <= high; i++) {
      if (countAt(state.points, i, player) > 0) return true;
    }
  } else {
    for (let i = low; i < index; i++) {
      if (countAt(state.points, i, player) > 0) return true;
    }
  }
  return false;
}

/** Taşın eve ne kadar uzakta olduğu — toplamada gereken zar değeri. */
function pipToOff(player: Player, index: number): number {
  return player === 0 ? index + 1 : 24 - index;
}

/* --- hamle üretimi ------------------------------------------------------ */

/** Verilen zarla yapılabilecek tüm hamleler (tek zar, zorunluluk süzgeci yok). */
function movesForDie(state: TavlaState, die: number): Move[] {
  const player = state.turn;
  const out: Move[] = [];

  // Bar'da taş varsa başka hiçbir hamle yapılamaz.
  if (state.bar[player] > 0) {
    const to = entryIndex(player, die);
    if (isOpen(state.points, to, player)) {
      out.push({ from: BAR, to, die, hit: opponentCount(state.points, to, player) === 1 });
    }
    return out;
  }

  const step = direction(player);
  const bearing = canBearOff(state, player);

  for (let from = 0; from < 24; from++) {
    if (countAt(state.points, from, player) === 0) continue;

    const to = from + step * die;

    if (to >= 0 && to <= 23) {
      if (isOpen(state.points, to, player)) {
        out.push({ from, to, die, hit: opponentCount(state.points, to, player) === 1 });
      }
      continue;
    }

    // Tahtanın dışına taşıyor → yalnızca toplama olabilir.
    if (!bearing) continue;
    const needed = pipToOff(player, from);
    if (die === needed || (die > needed && !hasCheckerFartherThan(state, player, from))) {
      out.push({ from, to: OFF, die, hit: false });
    }
  }

  return out;
}

function applyMoveUnchecked(state: TavlaState, move: Move): TavlaState {
  const player = state.turn;
  const s = sign(player);
  const points = state.points.slice();
  const bar: [number, number] = [state.bar[0], state.bar[1]];
  const off: [number, number] = [state.off[0], state.off[1]];

  if (move.from === BAR) bar[player]--;
  else points[move.from] -= s;

  if (move.to === OFF) {
    off[player]++;
  } else {
    if (opponentCount(points, move.to, player) === 1) {
      points[move.to] = 0;
      bar[player === 0 ? 1 : 0]++;
    }
    points[move.to] += s;
  }

  const dice = state.dice.slice();
  dice.splice(dice.indexOf(move.die), 1);

  return { ...state, points, bar, off, dice };
}

/**
 * Kalan zarlarla en fazla kaç zar oynanabileceğini bulur.
 *
 * Sıralamayı da hesaba katıyor: 6 sonra 3 oynanamazken 3 sonra 6 oynanabilir,
 * bu yüzden tek tek bakmak yetmiyor.
 */
function maxPlayable(state: TavlaState): number {
  if (state.dice.length === 0) return 0;

  let best = 0;
  const tried = new Set<number>();

  for (const die of state.dice) {
    if (tried.has(die)) continue; // aynı değerli zarı bir kez dene
    tried.add(die);

    for (const move of movesForDie(state, die)) {
      const depth = 1 + maxPlayable(applyMoveUnchecked(state, move));
      if (depth > best) best = depth;
      if (best === state.dice.length) return best; // daha iyisi olamaz
    }
  }
  return best;
}

/**
 * Şu an oynanabilecek geçerli hamleler.
 *
 * İki zorunluluk uygulanıyor:
 *  1. Mümkün olan en çok zarı oynamak — az zar bırakan hamleler elenir.
 *  2. Yalnızca tek zar oynanabiliyorsa büyük olanı oynamak.
 */
export function legalMoves(state: TavlaState): Move[] {
  if (state.winner !== null || state.dice.length === 0) return [];

  const target = maxPlayable(state);
  if (target === 0) return [];

  const candidates: Move[] = [];
  const seen = new Set<string>();

  for (const die of new Set(state.dice)) {
    for (const move of movesForDie(state, die)) {
      if (1 + maxPlayable(applyMoveUnchecked(state, move)) !== target) continue;
      const key = `${move.from}:${move.to}:${move.die}`;
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push(move);
    }
  }

  // Tek zar oynanabiliyorsa ve zarlar farklıysa büyük olan zorunlu.
  if (target === 1) {
    const distinct = new Set(state.dice);
    if (distinct.size > 1) {
      const highest = Math.max(...candidates.map((m) => m.die));
      return candidates.filter((m) => m.die === highest);
    }
  }

  return candidates;
}

/* --- genel API ---------------------------------------------------------- */

/**
 * Bu turda zar atılabilir mi?
 *
 * `dice`'ın boş olmasına bakmak **yetmez**: zarların hepsi oynandığında `dice`
 * boşalıyor ama tur hâlâ bitmemiş oluyor. O yüzden ölçüt `rolled` — tur
 * devredilirken `endTurn` bunu null'a çekiyor.
 */
export function canRoll(state: TavlaState): boolean {
  return state.winner === null && state.rolled === null;
}

export function roll(state: TavlaState, dice: [number, number], now: number): TavlaState {
  if (!canRoll(state)) return state;
  const isDouble = dice[0] === dice[1];
  const remaining = isDouble ? [dice[0], dice[0], dice[0], dice[0]] : [dice[0], dice[1]];

  return {
    ...state,
    rolled: dice,
    dice: remaining,
    turnMoves: [],
    turnStartedAt: now,
    turnStart: {
      points: state.points.slice(),
      bar: [state.bar[0], state.bar[1]],
      off: [state.off[0], state.off[1]],
      dice: remaining.slice(),
    },
  };
}

export class IllegalMoveError extends Error {
  constructor(message = "Bu hamle oynanamaz") {
    super(message);
    this.name = "IllegalMoveError";
  }
}

/** Hamleyi doğrular ve uygular. Geçersizse `IllegalMoveError` fırlatır. */
export function applyMove(state: TavlaState, from: number, to: number): TavlaState {
  const legal = legalMoves(state).find((m) => m.from === from && m.to === to);
  if (!legal) throw new IllegalMoveError();

  const next = applyMoveUnchecked(state, legal);
  next.turnMoves = [...state.turnMoves, legal];

  return finishIfWon(next);
}

/** Tur içindeki tüm hamleleri geri alır (zarlar aynı kalır). */
export function undoTurn(state: TavlaState): TavlaState {
  if (!state.turnStart || state.turnMoves.length === 0) return state;
  return {
    ...state,
    points: state.turnStart.points.slice(),
    bar: [state.turnStart.bar[0], state.turnStart.bar[1]],
    off: [state.turnStart.off[0], state.turnStart.off[1]],
    dice: state.turnStart.dice.slice(),
    turnMoves: [],
  };
}

/** Sıra karşıya geçer. Oynanacak hamle kaldıysa geçilmez. */
export function endTurn(state: TavlaState, now: number): TavlaState {
  if (state.winner !== null) return state;
  if (legalMoves(state).length > 0) return state;

  return {
    ...state,
    turn: state.turn === 0 ? 1 : 0,
    rolled: null,
    dice: [],
    turnMoves: [],
    turnStart: null,
    turnStartedAt: now,
    ply: state.ply + 1,
  };
}

/** Sıradaki oyuncunun hiç hamlesi yoksa turu kendiliğinden devretmek gerekir. */
export function mustPass(state: TavlaState): boolean {
  return state.winner === null && state.dice.length > 0 && legalMoves(state).length === 0;
}

function finishIfWon(state: TavlaState): TavlaState {
  const winner: Player | null =
    state.off[0] === CHECKERS_PER_PLAYER ? 0 : state.off[1] === CHECKERS_PER_PLAYER ? 1 : null;
  if (winner === null) return state;

  return { ...state, winner, result: scoreResult(state, winner), dice: [] };
}

/**
 * Sonuç türü:
 *  - Kaybeden hiç taş toplayamadıysa **mars** (2 kat).
 *  - Üstelik bar'da ya da kazananın evinde taşı kaldıysa **hamars** (3 kat).
 */
export function scoreResult(state: TavlaState, winner: Player): Result {
  const loser: Player = winner === 0 ? 1 : 0;
  if (state.off[loser] > 0) return "NORMAL";

  if (state.bar[loser] > 0) return "HAMARS";
  const [low, high] = homeRange(winner);
  for (let i = low; i <= high; i++) {
    if (countAt(state.points, i, loser) > 0) return "HAMARS";
  }
  return "MARS";
}

export const RESULT_POINTS: Record<Result, number> = {
  NORMAL: 1,
  MARS: 2,
  HAMARS: 3,
  TERK: 1,
};

/** Kalan pip sayısı — arayüzdeki "kim önde" göstergesi. */
export function pipCount(state: TavlaState, player: Player): number {
  let total = state.bar[player] * 25;
  for (let i = 0; i < 24; i++) {
    total += countAt(state.points, i, player) * pipToOff(player, i);
  }
  return total;
}
