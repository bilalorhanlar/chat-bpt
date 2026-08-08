import { randomInt } from "node:crypto";

import type { Game, MatchMode, MatchStatus } from "@prisma/client";

import { PERSON_KEYS, type PersonKey } from "@/config/site";
import { db } from "@/lib/db";

/**
 * Maçların ortak katmanı — dört oyun da bunu kullanıyor.
 *
 * Koltuk (seat) ataması:
 *   ONLINE → koltuk 0 maçı açan, koltuk 1 karşı taraf.
 *   LOCAL  → koltuk 0 her zaman `bilal`, koltuk 1 `partner`; tek cihazda
 *            sırayla oynandığı için hamleyi kimin gönderdiği önemli değil.
 */

export type LoadedMatch = {
  id: string;
  game: Game;
  mode: MatchMode;
  status: MatchStatus;
  state: unknown;
  winnerId: string | null;
  result: string | null;
  seats: Record<PersonKey, number>;
  /** Koltuk numarasından kullanıcıya ters eşleme. */
  bySeat: Record<number, PersonKey>;
  ply: number;
};

export function partnerKey(user: PersonKey): PersonKey {
  return user === "bilal" ? "partner" : "bilal";
}

/** Kriptografik zar — `Math.random()` oyun sonucunu belirleyen yerde kullanılmaz. */
export function rollDice(): [number, number] {
  return [randomInt(1, 7), randomInt(1, 7)];
}

export async function createMatch(input: {
  game: Game;
  mode: MatchMode;
  creator: PersonKey;
  state: unknown;
  /** ONLINE maçlar karşı taraf katılana kadar WAITING'de bekler. */
  status?: MatchStatus;
}): Promise<string> {
  const other = partnerKey(input.creator);

  /*
   * Koltuk kaydı "kim gerçekten odada" demek.
   *
   * WAITING açılan online maçta yalnızca açan kişinin koltuğu yazılır; karşı
   * tarafınki katıldığında eklenir. Eskiden ikisi de baştan yazılıyordu ve
   * "rakibin bekleyen odası var mı?" sorgusu kişinin **kendi** odasını
   * buluyordu — herkes kendi odasına katılıp tek başına oynuyordu.
   */
  const waitingForOpponent = input.mode === "ONLINE" && input.status === "WAITING";
  const seats: Array<{ userId: PersonKey; seat: number }> =
    input.mode === "LOCAL"
      ? PERSON_KEYS.map((key, index) => ({ userId: key, seat: index }))
      : waitingForOpponent
        ? [{ userId: input.creator, seat: 0 }]
        : [
            { userId: input.creator, seat: 0 },
            { userId: other, seat: 1 },
          ];

  const match = await db.gameMatch.create({
    data: {
      game: input.game,
      mode: input.mode,
      status: input.status ?? "ACTIVE",
      state: input.state as never,
      players: { create: seats },
    },
  });

  return match.id;
}

export async function loadMatch(id: string): Promise<LoadedMatch | null> {
  const row = await db.gameMatch.findUnique({
    where: { id },
    include: { players: true, _count: { select: { moves: true } } },
  });
  if (!row) return null;

  const seats = {} as Record<PersonKey, number>;
  const bySeat: Record<number, PersonKey> = {};
  for (const player of row.players) {
    seats[player.userId as PersonKey] = player.seat;
    bySeat[player.seat] = player.userId as PersonKey;
  }

  return {
    id: row.id,
    game: row.game,
    mode: row.mode,
    status: row.status,
    state: row.state,
    winnerId: row.winnerId,
    result: row.result,
    seats,
    bySeat,
    ply: row._count.moves,
  };
}

/**
 * Online maça katılır; yoksa yeni bir bekleyen oda açar.
 *
 * Bu fonksiyon olmadan iki kişi de "Online oyna"ya bastığında iki ayrı oda
 * açılıyor ve herkes kendi odasında tek başına kalıyordu. Kural basit:
 * karşı tarafın açtığı **bekleyen** bir oda varsa ona katıl, yenisini açma.
 *
 * `status` alanı buradaki tek doğruluk kaynağı:
 *   WAITING → rakip henüz katılmadı, oyun başlamadı
 *   ACTIVE  → ikisi de içeride, oyun sürüyor
 *
 * `onStart` maç gerçekten başlarken çağrılır; saatlerin ve tur süresinin
 * bekleme boyunca akmaması için başlangıç durumu o anda tazelenir.
 */
export async function joinOrCreateOnlineMatch(input: {
  game: Game;
  user: PersonKey;
  /** Yeni oda açılırsa kullanılacak başlangıç durumu. */
  createState: () => unknown;
  /** Bekleyen odaya katılırken durumu "şimdi başlıyor" hâline getirir. */
  onStart?: (state: unknown) => unknown;
}): Promise<{ id: string; joined: boolean }> {
  const other = partnerKey(input.user);

  // Kendi bekleyen odam varsa yenisini açma, ona geri dön. Bu kontrol
  // önce gelmeli: aksi hâlde arka arkaya basan kişi kendi odasına "katılıyor".
  const mine = await db.gameMatch.findFirst({
    where: {
      game: input.game,
      mode: "ONLINE",
      status: "WAITING",
      players: { some: { userId: input.user } },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (mine) return { id: mine.id, joined: false };

  // Karşı tarafın açtığı, ben içinde olmadığım bekleyen oda var mı?
  const waiting = await db.gameMatch.findFirst({
    where: {
      game: input.game,
      mode: "ONLINE",
      status: "WAITING",
      players: { some: { userId: other } },
      NOT: { players: { some: { userId: input.user } } },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, state: true },
  });

  if (waiting) {
    // Koltuğu şimdi ekle: karşı taraf gerçekten odaya girdi.
    await db.$transaction([
      db.matchPlayer.create({
        data: { matchId: waiting.id, userId: input.user, seat: 1 },
      }),
      db.gameMatch.update({
        where: { id: waiting.id },
        data: {
          status: "ACTIVE",
          state: (input.onStart ? input.onStart(waiting.state) : waiting.state) as never,
        },
      }),
    ]);
    return { id: waiting.id, joined: true };
  }

  const id = await createMatch({
    game: input.game,
    mode: "ONLINE",
    creator: input.user,
    state: input.createState(),
    status: "WAITING",
  });
  return { id, joined: false };
}

/**
 * Bu kullanıcı şu an hamle yapabilir mi?
 *
 * Aynı cihazda oynanan maçta iki koltuk da aynı tarayıcıdan sürüldüğü için
 * kontrol yalnızca maçın katılımcısı olmakla sınırlı. Online maçta sıranın
 * gerçekten o kişide olması gerekiyor.
 */
export function canAct(match: LoadedMatch, user: PersonKey, turnSeat: number): boolean {
  const seat = match.seats[user];
  if (seat === undefined) return false;
  if (match.mode === "LOCAL") return true;
  return seat === turnSeat;
}

export async function saveState(id: string, state: unknown) {
  await db.gameMatch.update({ where: { id }, data: { state: state as never } });
}

export async function recordMove(input: {
  matchId: string;
  userId: PersonKey;
  ply: number;
  data: unknown;
  msLeft?: number | null;
}) {
  await db.move.create({
    data: {
      matchId: input.matchId,
      userId: input.userId,
      ply: input.ply,
      data: input.data as never,
      msLeft: input.msLeft ?? null,
    },
  });
}

export async function finishMatch(input: {
  matchId: string;
  state: unknown;
  winnerSeat: number | null;
  bySeat: Record<number, PersonKey>;
  result: string;
  scoreDelta: number;
  durationMs?: number | null;
}) {
  await db.gameMatch.update({
    where: { id: input.matchId },
    data: {
      state: input.state as never,
      status: "FINISHED",
      winnerId: input.winnerSeat === null ? null : input.bySeat[input.winnerSeat],
      result: input.result,
      scoreDelta: input.scoreDelta,
      durationMs: input.durationMs ?? null,
      finishedAt: new Date(),
    },
  });
}

/** Kullanıcının bu oyunda yarım kalmış maçı — "devam et" için. */
export async function findOpenMatch(game: Game, user: PersonKey) {
  return db.gameMatch.findFirst({
    where: {
      game,
      status: { in: ["WAITING", "ACTIVE"] },
      players: { some: { userId: user } },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, mode: true, status: true, createdAt: true },
  });
}
