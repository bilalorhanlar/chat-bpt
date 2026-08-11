"use server";

import { revalidatePath } from "next/cache";
import { Chess } from "chess.js";
import { z } from "zod";

import {
  START_MS,
  remainingMs,
  sideToMove,
  type SatrancResult,
  type SatrancState,
  type Seat,
} from "@/games/satranc/types";
import { sessionUser } from "@/lib/auth";
import {
  canAct,
  createMatch,
  finishMatch,
  joinOrCreateOnlineMatch,
  loadMatch,
  recordMove,
  saveState,
} from "@/lib/match";
import { emitMatchStarted, emitMatchState } from "@/lib/realtime";
import { requireSession } from "@/lib/session";

/**
 * Satranç sunucu eylemleri.
 *
 * Saat kararı **her zaman** burada veriliyor. Tarayıcı da geri sayımı çiziyor
 * ama yalnızca gösterim için; süre bitişini istemcinin bildirmesine
 * güvenseydik, sekmesi kapalı olan oyuncu hiç kaybetmezdi.
 */

type ActionResult = { ok: true; state: SatrancState } | { ok: false; error: string };
const fail = (error: string): ActionResult => ({ ok: false, error });

function initialState(now: number): SatrancState {
  return {
    fen: new Chess().fen(),
    history: [],
    lastMove: null,
    clocks: [START_MS, START_MS],
    turnStartedAt: now,
    winner: null,
    result: null,
  };
}

/**
 * Maç açar.
 *
 * Online modda karşı tarafın bekleyen odası varsa ona katılır; yoksa bekleyen
 * bir oda açar. Aksi hâlde ikisi de "Online oyna"ya bastığında iki ayrı oda
 * açılıp herkes tek başına kalıyordu.
 */
export async function createSatrancMatch(mode: "ONLINE" | "LOCAL"): Promise<string> {
  const session = await requireSession();
  const user = sessionUser(session);

  // Misafir: her zaman aynı cihazda ve şampiyonaya yazılmayan maç.
  if (user === null) {
    return createMatch({
      game: "SATRANC",
      mode: "LOCAL",
      creator: "bilal",
      state: initialState(Date.now()),
      status: "ACTIVE",
      guest: true,
    });
  }

  if (mode === "LOCAL") {
    const id = await createMatch({
      game: "SATRANC",
      mode,
      creator: user,
      state: initialState(Date.now()),
      status: "ACTIVE",
    });
    revalidatePath("/oyunlar/satranc");
    return id;
  }

  const { id, joined } = await joinOrCreateOnlineMatch({
    game: "SATRANC",
    user,
    createState: () => initialState(Date.now()),
    // Saat beklerken akmasın: rakip katıldığı an 5:00'dan başlar.
    onStart: () => initialState(Date.now()),
  });

  if (joined) emitMatchStarted(id);
  revalidatePath("/oyunlar/satranc");
  return id;
}

const MoveInput = z.object({
  matchId: z.string().min(1),
  from: z.string().regex(/^[a-h][1-8]$/),
  to: z.string().regex(/^[a-h][1-8]$/),
  promotion: z.enum(["q", "r", "b", "n"]).optional(),
});

export async function makeSatrancMove(input: z.infer<typeof MoveInput>): Promise<ActionResult> {
  const parsed = MoveInput.safeParse(input);
  if (!parsed.success) return fail("Geçersiz hamle.");

  const session = await requireSession();
  const match = await loadMatch(parsed.data.matchId);
  if (!match || match.game !== "SATRANC") return fail("Maç bulunamadı.");
  if (match.status === "FINISHED") return fail("Bu maç bitti.");
  if (match.status === "WAITING") return fail("Rakip henüz katılmadı.");

  const state = match.state as SatrancState;
  const mover = sideToMove(state);
  if (!canAct(match, session, mover)) return fail("Sıra sende değil.");

  const now = Date.now();

  // Hamleden **önce** saate bak: süresi bitmiş biri hamle yapamaz.
  const left = remainingMs(state, mover, now);
  if (left <= 0) return finishOnTime(match, state, mover, now);

  const chess = new Chess(state.fen);
  const move = chess.move({
    from: parsed.data.from,
    to: parsed.data.to,
    promotion: parsed.data.promotion,
  });
  if (!move) return fail("Bu hamle oynanamaz.");

  const clocks: [number, number] = [...state.clocks];
  clocks[mover] = left; // ekleme yok — 5+0

  const next: SatrancState = {
    fen: chess.fen(),
    history: [...state.history, move.san],
    lastMove: { from: move.from, to: move.to },
    clocks,
    turnStartedAt: now,
    winner: null,
    result: null,
  };

  const outcome = readOutcome(chess);
  if (outcome) {
    next.winner = outcome.winner === null ? null : outcome.winner;
    next.result = outcome.result;
    await finishMatch({
      matchId: match.id,
      state: next,
      winnerSeat: outcome.winner,
      bySeat: match.bySeat,
      result: outcome.result,
      scoreDelta: 1,
    });
    if (!match.guest) revalidatePath("/sampiyona");
  } else {
    await saveState(match.id, next);
  }

  const mover2 = sessionUser(session);
  if (mover2 !== null && !match.guest) await recordMove({
    matchId: match.id,
    userId: mover2,
    ply: match.ply,
    data: { from: move.from, to: move.to, san: move.san, piece: move.piece },
    msLeft: left,
  });

  emitMatchState(match.id, next);
  return { ok: true, state: next };
}

/**
 * Süre bitişini talep eder.
 *
 * Tarayıcının geri sayımı sıfırlanınca çağrılıyor, ama kararı sunucu veriyor:
 * gerçekten bitmemişse hiçbir şey olmuyor.
 */
export async function claimSatrancTimeout(matchId: string): Promise<ActionResult> {
  await requireSession();
  const match = await loadMatch(matchId);
  if (!match || match.game !== "SATRANC") return fail("Maç bulunamadı.");
  if (match.status === "FINISHED") return fail("Bu maç bitti.");
  if (match.status === "WAITING") return fail("Rakip henüz katılmadı.");

  const state = match.state as SatrancState;
  const mover = sideToMove(state);
  const now = Date.now();
  if (remainingMs(state, mover, now) > 0) return fail("Süre daha bitmedi.");

  return finishOnTime(match, state, mover, now);
}

export async function resignSatranc(matchId: string): Promise<ActionResult> {
  const session = await requireSession();
  const match = await loadMatch(matchId);
  if (!match || match.game !== "SATRANC") return fail("Maç bulunamadı.");
  if (match.status === "FINISHED") return fail("Bu maç zaten bitti.");

  const state = match.state as SatrancState;
  const mover = sideToMove(state);
  if (!canAct(match, session, mover)) return fail("Bu maçta değilsin.");
  const winner = (mover === 0 ? 1 : 0) as Seat;
  const next: SatrancState = { ...state, winner, result: "TERK" };

  await finishMatch({
    matchId,
    state: next,
    winnerSeat: winner,
    bySeat: match.bySeat,
    result: "TERK",
    scoreDelta: 1,
  });
  emitMatchState(matchId, next);
  revalidatePath("/sampiyona");
  return { ok: true, state: next };
}

/* ------------------------------------------------------------------ */

async function finishOnTime(
  match: NonNullable<Awaited<ReturnType<typeof loadMatch>>>,
  state: SatrancState,
  loser: Seat,
  now: number,
): Promise<ActionResult> {
  const winner = (loser === 0 ? 1 : 0) as Seat;
  const clocks: [number, number] = [...state.clocks];
  clocks[loser] = 0;

  const next: SatrancState = {
    ...state,
    clocks,
    turnStartedAt: now,
    winner,
    result: "SURE",
  };

  await finishMatch({
    matchId: match.id,
    state: next,
    winnerSeat: winner,
    bySeat: match.bySeat,
    result: "SURE",
    scoreDelta: 1,
  });
  emitMatchState(match.id, next);
  revalidatePath("/sampiyona");
  return { ok: true, state: next };
}

/** Hamle sonrası oyun bitti mi — bittiyse nasıl. */
function readOutcome(chess: Chess): { winner: Seat | null; result: SatrancResult } | null {
  if (chess.isCheckmate()) {
    // Sıra kimdeyse mat olan odur; kazanan diğeri.
    const loser: Seat = chess.turn() === "w" ? 0 : 1;
    return { winner: loser === 0 ? 1 : 0, result: "MAT" };
  }
  if (chess.isStalemate()) return { winner: null, result: "PAT" };
  if (chess.isDraw()) return { winner: null, result: "BERABERE" };
  return null;
}
