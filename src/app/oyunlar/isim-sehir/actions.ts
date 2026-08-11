"use server";

import { randomInt } from "node:crypto";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  CATEGORIES,
  LETTERS,
  ROUND_SECONDS,
  TOTAL_ROUNDS,
  emptyAnswers,
  initialState,
  nextRound,
  scoreRound,
  type Answers,
  type Category,
  type IsimSehirState,
} from "@/games/isim-sehir/types";
import { guestId, sessionUser } from "@/lib/auth";
import {
  canAct,
  createMatch,
  finishMatch,
  joinOrCreateOnlineMatch,
  loadMatch,
  saveState,
} from "@/lib/match";
import { emitMatchStarted, emitMatchState } from "@/lib/realtime";
import { requireSession } from "@/lib/session";

type ActionResult = { ok: true; state: IsimSehirState } | { ok: false; error: string };
const fail = (error: string): ActionResult => ({ ok: false, error });

/**
 * Bu oturum hangi koltuk adına yazıyor?
 *
 * Kişi oturumunda kendi koltuğu. Misafir maçı tek cihazda oynandığı için
 * sırayla yazılıyor: henüz göndermemiş olan koltuk.
 */
function seatFor(
  match: NonNullable<Awaited<ReturnType<typeof loadMatch>>>,
  session: Parameters<typeof canAct>[1],
  state: IsimSehirState,
): 0 | 1 | null {
  if (match.guest) {
    if (state.phase === "yazma") return state.submitted[0] ? 1 : 0;
    return state.voted[0] ? 1 : 0;
  }
  const user = sessionUser(session);
  if (user === null) return null;
  const seat = match.seats[user];
  return seat === undefined ? null : (seat as 0 | 1);
}

function drawLetter(previous?: string): string {
  let letter = LETTERS[randomInt(0, LETTERS.length)];
  // Aynı harfin arka arkaya gelmesi turu tekrar gibi gösteriyor.
  while (letter === previous) letter = LETTERS[randomInt(0, LETTERS.length)];
  return letter;
}

function deadlineFor(mode: "ONLINE" | "LOCAL"): number | null {
  // Aynı cihazda sırayla yazılıyor; paylaşılan geri sayım anlamsız olurdu.
  return mode === "ONLINE" ? Date.now() + ROUND_SECONDS * 1000 : null;
}

/**
 * Maç açar.
 *
 * Online modda karşı tarafın bekleyen odasına katılır; yoksa bekleyen oda açar.
 * Böylece ikisi ayrı odada tek başına kalmıyor.
 */
export async function createIsimSehirMatch(mode: "ONLINE" | "LOCAL"): Promise<string> {
  const session = await requireSession();
  const user = sessionUser(session);

  if (user === null) {
    return createMatch({
      game: "ISIM_SEHIR",
      mode: "LOCAL",
      creator: "bilal",
      state: initialState(drawLetter(), null),
      status: "ACTIVE",
      guest: true,
      guestId: guestId(session),
    });
  }

  if (mode === "LOCAL") {
    const id = await createMatch({
      game: "ISIM_SEHIR",
      mode,
      creator: user,
      state: initialState(drawLetter(), deadlineFor(mode)),
      status: "ACTIVE",
    });
    revalidatePath("/oyunlar/isim-sehir");
    return id;
  }

  const { id, joined } = await joinOrCreateOnlineMatch({
    game: "ISIM_SEHIR",
    user,
    createState: () => initialState(drawLetter(), deadlineFor("ONLINE")),
    // Süre beklerken akmasın: rakip katıldığı an 90 saniye baştan başlar.
    onStart: () => initialState(drawLetter(), deadlineFor("ONLINE")),
  });

  if (joined) emitMatchStarted(id);
  revalidatePath("/oyunlar/isim-sehir");
  return id;
}

const AnswersInput = z.object({
  matchId: z.string().min(1),
  answers: z.record(
    z.enum(CATEGORIES.map((c) => c.key) as [Category, ...Category[]]),
    z.string().max(40),
  ),
});

/**
 * Cevapları kaydeder.
 *
 * İkisi de gönderdiğinde ya da süre dolduğunda tur kendiliğinden onay
 * aşamasına geçiyor — süre bitince tarayıcı otomatik gönderiyor, ama karar
 * yine sunucuda: geç kalan istemci bir şeyi bozamıyor.
 */
export async function submitIsimSehirAnswers(
  input: z.infer<typeof AnswersInput>,
): Promise<ActionResult> {
  const parsed = AnswersInput.safeParse(input);
  if (!parsed.success) return fail("Geçersiz cevap.");

  const session = await requireSession();
  const match = await loadMatch(parsed.data.matchId);
  if (!match || match.game !== "ISIM_SEHIR") return fail("Maç bulunamadı.");
  if (match.status !== "ACTIVE") return fail("Maç sürmüyor.");

  const state = match.state as IsimSehirState;
  if (state.phase !== "yazma") return fail("Yazma süresi bitti.");

  const seat = seatFor(match, session, state);
  if (seat === null) return fail("Bu maçta değilsin.");

  const answers: Answers = { ...emptyAnswers() };
  for (const { key } of CATEGORIES) {
    answers[key] = (parsed.data.answers[key] ?? "").slice(0, 40);
  }

  const next: IsimSehirState = {
    ...state,
    answers: seat === 0 ? [answers, state.answers[1]] : [state.answers[0], answers],
    submitted: seat === 0 ? [true, state.submitted[1]] : [state.submitted[0], true],
  };

  const expired = next.deadline !== null && Date.now() >= next.deadline;
  if ((next.submitted[0] && next.submitted[1]) || expired) next.phase = "onay";

  await saveState(match.id, next);
  emitMatchState(match.id, next);
  return { ok: true, state: next };
}

// Oylar kısmi geliyor: dokunulmayan kategori "geçerli" sayılıyor, bu yüzden
// anahtarlar zorunlu değil. Bilinmeyen anahtarlar aşağıda süzülüyor.
const VotesInput = z.object({
  matchId: z.string().min(1),
  votes: z.record(z.string(), z.boolean()),
});

export async function submitIsimSehirVotes(
  input: z.infer<typeof VotesInput>,
): Promise<ActionResult> {
  const parsed = VotesInput.safeParse(input);
  if (!parsed.success) return fail("Geçersiz oy.");

  const session = await requireSession();
  const match = await loadMatch(parsed.data.matchId);
  if (!match || match.game !== "ISIM_SEHIR") return fail("Maç bulunamadı.");
  if (match.status !== "ACTIVE") return fail("Maç sürmüyor.");

  const state = match.state as IsimSehirState;
  if (state.phase !== "onay") return fail("Şu an oylama yok.");

  const seat = seatFor(match, session, state);
  if (seat === null) return fail("Bu maçta değilsin.");

  const clean: Partial<Record<Category, boolean>> = {};
  for (const { key } of CATEGORIES) {
    if (typeof parsed.data.votes[key] === "boolean") clean[key] = parsed.data.votes[key];
  }

  const votes: IsimSehirState["votes"] =
    seat === 0 ? [clean, state.votes[1]] : [state.votes[0], clean];
  const voted: [boolean, boolean] =
    seat === 0 ? [true, state.voted[1]] : [state.voted[0], true];

  let next: IsimSehirState = { ...state, votes, voted };

  if (voted[0] && voted[1]) {
    const points = scoreRound(next);
    next = {
      ...next,
      phase: "sonuc",
      scores: [next.scores[0] + points[0], next.scores[1] + points[1]],
      rounds: [
        ...next.rounds,
        { letter: next.letter, answers: next.answers, points },
      ],
    };
  }

  await saveState(match.id, next);
  emitMatchState(match.id, next);
  return { ok: true, state: next };
}

/** Sonraki tura geçer; son turdaysa maçı bitirir. */
export async function advanceIsimSehirRound(matchId: string): Promise<ActionResult> {
  const session = await requireSession();
  const match = await loadMatch(matchId);
  if (!match || match.game !== "ISIM_SEHIR") return fail("Maç bulunamadı.");
  if (match.status !== "ACTIVE") return fail("Maç sürmüyor.");

  const state = match.state as IsimSehirState;
  if (state.phase !== "sonuc") return fail("Tur henüz bitmedi.");
  if (!canAct(match, session, 0)) return fail("Bu maçta değilsin.");

  if (state.round >= TOTAL_ROUNDS) {
    const winner =
      state.scores[0] === state.scores[1] ? null : state.scores[0] > state.scores[1] ? 0 : 1;
    const next: IsimSehirState = { ...state, winner: winner as 0 | 1 | null };

    await finishMatch({
      matchId,
      state: next,
      winnerSeat: winner,
      bySeat: match.bySeat,
      result: winner === null ? "BERABERE" : "NORMAL",
      scoreDelta: 1,
    });
    emitMatchState(matchId, next);
    if (!match.guest) revalidatePath("/sampiyona");
    return { ok: true, state: next };
  }

  const next = nextRound(state, drawLetter(state.letter), deadlineFor(match.mode));
  await saveState(matchId, next);
  emitMatchState(matchId, next);
  return { ok: true, state: next };
}
