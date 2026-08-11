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
import { guestId, sessionUser, type Session } from "@/lib/auth";
import {
  canAct,
  createMatch,
  finishMatch,
  joinOrCreateOnlineMatch,
  loadMatch,
  recordMove,
  rollDice,
  saveState,
} from "@/lib/match";
import { emitMatchStarted, emitMatchState } from "@/lib/realtime";
import { requireSession } from "@/lib/session";

/**
 * Tavla sunucu eylemleri.
 *
 * Kuralların **tek** çalıştığı yer burası. Tarayıcı da aynı motoru kullanıyor
 * ama yalnızca anında geri bildirim için; kaydedilen durum her zaman burada
 * hesaplanan. Böylece bozuk ya da kötü niyetli bir istemci oyunu bozamıyor.
 */

type ActionResult = { ok: true; state: TavlaState } | { ok: false; error: string };

const fail = (error: string): ActionResult => ({ ok: false, error });

async function withMatch(
  matchId: string,
  handler: (input: {
    state: TavlaState;
    session: Session;
    match: NonNullable<Awaited<ReturnType<typeof loadMatch>>>;
  }) => Promise<ActionResult>,
): Promise<ActionResult> {
  const session = await requireSession();
  const match = await loadMatch(matchId);

  if (!match || match.game !== "TAVLA") return fail("Maç bulunamadı.");
  if (match.status === "FINISHED") return fail("Bu maç bitti.");
  if (match.status === "WAITING") return fail("Rakip henüz katılmadı.");

  const state = match.state as TavlaState;
  if (!canAct(match, session, state.turn)) return fail("Sıra sende değil.");

  return handler({ state, session, match });
}

/** Kimin başlayacağını belirleyip ilk zarı atmış bir başlangıç durumu üretir. */
function freshState(): TavlaState {
  // Açılış zarı: iki farklı değer atılana kadar; büyük olan başlar.
  let opening = rollDice();
  while (opening[0] === opening[1]) opening = rollDice();
  const starter: Player = opening[0] > opening[1] ? 0 : 1;

  const now = Date.now();
  // Zar otomatik: oyuncu düğmeye basmaz.
  return roll(initialState(starter, now), rollDice(), now);
}

/**
 * Maç açar.
 *
 * Misafir oturumu her zaman aynı cihazda ve `guest` işaretli maç açar —
 * arkadaşların oyunu şampiyona tablosuna karışmasın.
 *
 * Online modda önce karşı tarafın bekleyen odası aranıyor; varsa ona katılıyor.
 * Böyle olmasaydı ikisi de "Online oyna"ya bastığında iki ayrı oda açılıp
 * herkes kendi odasında tek başına oynuyordu.
 */
export async function createTavlaMatch(mode: "ONLINE" | "LOCAL"): Promise<string> {
  const session = await requireSession();
  const user = sessionUser(session);

  if (user === null) {
    const id = await createMatch({
      game: "TAVLA",
      mode: "LOCAL",
      creator: "bilal", // koltuk sahibi; misafir maçında kimliğin anlamı yok
      state: freshState(),
      status: "ACTIVE",
      guest: true,
      guestId: guestId(session),
    });
    return id;
  }

  if (mode === "LOCAL") {
    const id = await createMatch({
      game: "TAVLA",
      mode,
      creator: user,
      state: freshState(),
      status: "ACTIVE",
    });
    revalidatePath("/oyunlar/tavla");
    return id;
  }

  const { id, joined } = await joinOrCreateOnlineMatch({
    game: "TAVLA",
    user,
    createState: freshState,
    // Bekleyen oda saatlerin akmasını beklemesin: rakip katıldığı an zar ve
    // tur sayacı sıfırdan başlar.
    onStart: () => freshState(),
  });

  if (joined) emitMatchStarted(id);
  revalidatePath("/oyunlar/tavla");
  return id;
}

const MoveInput = z.object({
  matchId: z.string().min(1),
  /**
   * Oynanacak adımlar, sırayla.
   *
   * Tek zarlık hamlede bir eleman; aynı pul iki zarı da kullanıyorsa
   * (12'den 3 ve 5 ile 4'e) iki eleman. Zinciri tek istekte göndermek
   * ara durumların soketten yayınlanmasını ve yarım kalma ihtimalini
   * ortadan kaldırıyor.
   */
  steps: z
    .array(z.object({ from: z.number().int().min(-1).max(24), to: z.number().int().min(-1).max(24) }))
    .min(1)
    .max(4),
});

export async function moveTavlaChecker(input: z.infer<typeof MoveInput>): Promise<ActionResult> {
  const parsed = MoveInput.safeParse(input);
  if (!parsed.success) return fail("Geçersiz hamle.");

  return withMatch(parsed.data.matchId, async ({ state, session, match }) => {
    // Zincirin her adımı ayrı ayrı doğrulanıyor; biri geçersizse hiçbiri
    // uygulanmıyor (durum yalnızca sonda kaydediliyor).
    let next = state;
    for (const step of parsed.data.steps) {
      try {
        next = applyMove(next, step.from, step.to);
      } catch {
        return fail("Bu hamle oynanamaz.");
      }
    }

    if (next.winner !== null) {
      const result = next.result ?? "NORMAL";
      await finishMatch({
        matchId: match.id,
        state: next,
        winnerSeat: next.winner,
        bySeat: match.bySeat,
        result,
        scoreDelta: RESULT_POINTS[result],
      });
      if (!match.guest) revalidatePath("/sampiyona");
    } else {
      await saveState(match.id, next);
    }

    // Misafir maçlarının hamle kaydı tutulmuyor: kimlik yok, istatistiğe de
    // girmiyor.
    const user = sessionUser(session);
    if (user !== null && !match.guest) {
      await recordMove({
        matchId: match.id,
        userId: user,
        ply: match.ply,
        data: { steps: parsed.data.steps, dice: state.dice },
      });
    }

    emitMatchState(match.id, next);
    return { ok: true, state: next };
  });
}

export async function undoTavlaTurn(matchId: string): Promise<ActionResult> {
  return withMatch(matchId, async ({ state, match }) => {
    const next = undoTurn(state);
    await saveState(match.id, next);
    emitMatchState(match.id, next);
    return { ok: true, state: next };
  });
}

export async function endTavlaTurn(matchId: string): Promise<ActionResult> {
  return withMatch(matchId, async ({ state, match }) => {
    if (legalMoves(state).length > 0) return fail("Oynanacak hamlen var.");

    const now = Date.now();
    // Sıra devredilir devredilmez yeni oyuncunun zarı otomatik atılır —
    // "zar at" düğmesi yok. endTurn `rolled`ı sıfırladığı için canRoll açılır.
    const next = roll(endTurn(state, now), rollDice(), now);
    await saveState(match.id, next);
    emitMatchState(match.id, next);
    return { ok: true, state: next };
  });
}

export async function resignTavla(matchId: string): Promise<ActionResult> {
  const session = await requireSession();
  const match = await loadMatch(matchId);
  if (!match || match.game !== "TAVLA") return fail("Maç bulunamadı.");
  if (match.status === "FINISHED") return fail("Bu maç zaten bitti.");

  const state = match.state as TavlaState;
  if (!canAct(match, session, state.turn)) return fail("Bu maçta değilsin.");

  // Sırası gelen taraf terk eder; misafir maçında da sıradaki kaybeder.
  const winnerSeat = state.turn === 0 ? 1 : 0;
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
  if (!match.guest) revalidatePath("/sampiyona");
  return { ok: true, state: next };
}
