"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  RESULT_POINTS,
  applyMove,
  endTurn,
  initialState,
  legalMoves,
  roll,
  undoTurn,
} from "@/games/tavla/engine";
import type { Player, TavlaState } from "@/games/tavla/types";
import {
  canAct,
  createMatch,
  finishMatch,
  loadMatch,
  recordMove,
  rollDice,
  saveState,
} from "@/lib/match";
import { emitMatchState } from "@/lib/realtime";
import { requireSession } from "@/lib/session";

/**
 * Tavla sunucu eylemleri.
 *
 * Kuralların **tek** çalıştığı yer burası. Tarayıcı da aynı motoru kullanıyor
 * ama yalnızca anında geri bildirim için; kaydedilen durum her zaman burada
 * hesaplanan. Böylece bozuk ya da kötü niyetli bir istemci oyunu bozamıyor.
 */

type ActionResult =
  | { ok: true; state: TavlaState }
  | { ok: false; error: string };

const fail = (error: string): ActionResult => ({ ok: false, error });

async function withMatch(
  matchId: string,
  handler: (input: {
    state: TavlaState;
    seat: number;
    user: "bilal" | "partner";
    match: NonNullable<Awaited<ReturnType<typeof loadMatch>>>;
  }) => Promise<ActionResult>,
): Promise<ActionResult> {
  const session = await requireSession();
  const match = await loadMatch(matchId);

  if (!match || match.game !== "TAVLA") return fail("Maç bulunamadı.");
  if (match.status === "FINISHED") return fail("Bu maç bitti.");

  const state = match.state as TavlaState;
  const seat = match.seats[session.user];
  if (seat === undefined) return fail("Bu maçta değilsin.");
  if (!canAct(match, session.user, state.turn)) return fail("Sıra sende değil.");

  return handler({ state, seat, user: session.user, match });
}

/** Yeni maç açar ve kimin başlayacağını belirler. */
export async function createTavlaMatch(mode: "ONLINE" | "LOCAL"): Promise<string> {
  const session = await requireSession();

  // Açılış zarı: iki farklı değer atılana kadar; büyük olan başlar.
  let opening = rollDice();
  while (opening[0] === opening[1]) opening = rollDice();
  const starter: Player = opening[0] > opening[1] ? 0 : 1;

  const now = Date.now();
  // Zar otomatik: maç açılırken ilk tur zarı da atılır, oyuncu düğmeye basmaz.
  const state = roll(initialState(starter, now), rollDice(), now);

  const id = await createMatch({
    game: "TAVLA",
    mode,
    creator: session.user,
    state,
    status: "ACTIVE",
  });

  revalidatePath("/oyunlar/tavla");
  return id;
}

const MoveInput = z.object({
  matchId: z.string().min(1),
  from: z.number().int().min(-1).max(24),
  to: z.number().int().min(-1).max(24),
});

export async function moveTavlaChecker(input: z.infer<typeof MoveInput>): Promise<ActionResult> {
  const parsed = MoveInput.safeParse(input);
  if (!parsed.success) return fail("Geçersiz hamle.");

  return withMatch(parsed.data.matchId, async ({ state, user, match }) => {
    let next: TavlaState;
    try {
      next = applyMove(state, parsed.data.from, parsed.data.to);
    } catch {
      return fail("Bu hamle oynanamaz.");
    }

    if (next.winner !== null) {
      const result = next.result ?? "NORMAL";
      await finishMatch({
        matchId: parsed.data.matchId,
        state: next,
        winnerSeat: next.winner,
        bySeat: match.bySeat,
        result,
        scoreDelta: RESULT_POINTS[result],
      });
      revalidatePath("/sampiyona");
    } else {
      await saveState(parsed.data.matchId, next);
    }

    await recordMove({
      matchId: parsed.data.matchId,
      userId: user,
      ply: match.ply,
      data: { from: parsed.data.from, to: parsed.data.to, dice: state.dice },
    });

    emitMatchState(parsed.data.matchId, next);
    return { ok: true, state: next };
  });
}

export async function undoTavlaTurn(matchId: string): Promise<ActionResult> {
  return withMatch(matchId, async ({ state }) => {
    const next = undoTurn(state);
    await saveState(matchId, next);
    emitMatchState(matchId, next);
    return { ok: true, state: next };
  });
}

export async function endTavlaTurn(matchId: string): Promise<ActionResult> {
  return withMatch(matchId, async ({ state }) => {
    if (legalMoves(state).length > 0) return fail("Oynanacak hamlen var.");

    const now = Date.now();
    // Sıra devredilir devredilmez yeni oyuncunun zarı otomatik atılır —
    // "zar at" düğmesi yok. endTurn `rolled`ı sıfırladığı için canRoll açılır.
    const next = roll(endTurn(state, now), rollDice(), now);
    await saveState(matchId, next);
    emitMatchState(matchId, next);
    return { ok: true, state: next };
  });
}

export async function resignTavla(matchId: string): Promise<ActionResult> {
  const session = await requireSession();
  const match = await loadMatch(matchId);
  if (!match || match.game !== "TAVLA") return fail("Maç bulunamadı.");
  if (match.status === "FINISHED") return fail("Bu maç zaten bitti.");

  const seat = match.seats[session.user];
  if (seat === undefined) return fail("Bu maçta değilsin.");

  const state = match.state as TavlaState;
  const winnerSeat = seat === 0 ? 1 : 0;
  const next: TavlaState = {
    ...state,
    winner: winnerSeat as Player,
    result: "TERK",
    dice: [],
  };

  await finishMatch({
    matchId,
    state: next,
    winnerSeat,
    bySeat: match.bySeat,
    result: "TERK",
    scoreDelta: RESULT_POINTS.TERK,
  });

  emitMatchState(matchId, next);
  revalidatePath("/sampiyona");
  return { ok: true, state: next };
}
