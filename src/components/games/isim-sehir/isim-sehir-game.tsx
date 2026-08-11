"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, Loader2, X } from "lucide-react";

import {
  advanceIsimSehirRound,
  submitIsimSehirAnswers,
  submitIsimSehirVotes,
} from "@/app/oyunlar/isim-sehir/actions";
import { GameOverDialog } from "@/components/games/game-over-dialog";
import { Button } from "@/components/ui/button";
import type { PersonKey } from "@/config/site";
import {
  CATEGORIES,
  TOTAL_ROUNDS,
  emptyAnswers,
  startsWithLetter,
  type Answers,
  type Category,
  type IsimSehirState,
} from "@/games/isim-sehir/types";
import type { People } from "@/lib/people";
import { playOutcome } from "@/lib/sounds";
import { useMatchChannel } from "@/lib/use-match-channel";
import { cn } from "@/lib/utils";

export function IsimSehirGame({
  matchId,
  initialState,
  mode,
  seats,
  me,
  people,
}: {
  matchId: string;
  initialState: IsimSehirState;
  mode: "ONLINE" | "LOCAL";
  seats: Record<number, PersonKey>;
  /** Misafir oturumunda null. */
  me: PersonKey | null;
  people: People;
  guestMode?: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState(initialState);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const announced = useRef(false);

  const meSeat = Number(Object.entries(seats).find(([, key]) => key === me)?.[0] ?? 0) as 0 | 1;

  /**
   * Aynı cihazda sırayla oynanıyor: hangi koltuk henüz göndermediyse ekran
   * onun. Online'da herkes kendi koltuğunda.
   */
  const activeSeat: 0 | 1 =
    mode === "ONLINE"
      ? meSeat
      : state.phase === "yazma"
        ? state.submitted[0]
          ? 1
          : 0
        : state.voted[0]
          ? 1
          : 0;

  useMatchChannel<IsimSehirState>(
    mode === "ONLINE" ? matchId : "",
    useCallback((next: IsimSehirState) => setState(next), []),
  );

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  async function run(action: () => Promise<ActionLike>) {
    if (busy) return;
    setBusy(true);
    const result = await action();
    setBusy(false);
    if (!result.ok) return setError(result.error);
    setError(null);
    setState(result.state);
  }

  const finished =
    state.round >= TOTAL_ROUNDS && state.phase === "sonuc" && state.winner !== null;

  useEffect(() => {
    if (!finished || announced.current) return;
    announced.current = true;
    playOutcome(mode === "LOCAL" ? true : seats[state.winner!] === me, null);
    router.refresh();
  }, [finished, state.winner, seats, me, mode, router]);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <ScoreHeader state={state} seats={seats} people={people} meSeat={meSeat} mode={mode} />

      {error ? (
        <p className="mb-4 rounded-btn bg-bad/10 px-4 py-2.5 text-[0.85rem] text-bad">{error}</p>
      ) : null}

      {state.phase === "yazma" ? (
        <WritePhase
          key={`${state.round}-${activeSeat}`}
          state={state}
          seat={activeSeat}
          mode={mode}
          now={now}
          name={people[seats[activeSeat]].name}
          alreadySubmitted={state.submitted[activeSeat]}
          busy={busy}
          onSubmit={(answers) => run(() => submitIsimSehirAnswers({ matchId, answers }))}
        />
      ) : null}

      {state.phase === "onay" ? (
        <VotePhase
          key={`${state.round}-vote-${activeSeat}`}
          state={state}
          seat={activeSeat}
          people={people}
          seats={seats}
          busy={busy}
          onSubmit={(votes) => run(() => submitIsimSehirVotes({ matchId, votes }))}
        />
      ) : null}

      {state.phase === "sonuc" ? (
        <ResultPhase
          state={state}
          people={people}
          seats={seats}
          busy={busy}
          onNext={() => run(() => advanceIsimSehirRound(matchId))}
        />
      ) : null}

      {finished ? (
        <GameOverDialog
          title={
            state.winner === null
              ? "Berabere"
              : mode === "LOCAL"
                ? `${people[seats[state.winner]].name} kazandı`
                : seats[state.winner] === me
                  ? "Kazandın"
                  : "Kaybettin"
          }
          detail={`${state.scores[0]} – ${state.scores[1]}`}
          playAgainHref="/oyunlar/isim-sehir"
        />
      ) : null}
    </div>
  );
}

type ActionLike = { ok: true; state: IsimSehirState } | { ok: false; error: string };

/* ------------------------------------------------------------------ */

function ScoreHeader({
  state,
  seats,
  people,
  meSeat,
  mode,
}: {
  state: IsimSehirState;
  seats: Record<number, PersonKey>;
  people: People;
  meSeat: 0 | 1;
  mode: "ONLINE" | "LOCAL";
}) {
  return (
    <div className="mb-5 rounded-card border border-line bg-surface/85 p-5 shadow-soft backdrop-blur-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="text-center">
          <p className="text-[0.75rem] text-ink-soft">{people[seats[0]].name}</p>
          <p className="font-display text-[1.6rem] leading-none tabular-nums text-brand-700">
            {state.scores[0]}
          </p>
        </div>

        <div className="text-center">
          <p className="text-[0.7rem] uppercase tracking-[0.16em] text-brand-500">
            {state.round}. tur / {TOTAL_ROUNDS}
          </p>
          <p
            className="mx-auto mt-1 grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 font-display text-[2rem] leading-none text-white shadow-glow"
            aria-label={`Bu turun harfi ${state.letter}`}
          >
            {state.letter}
          </p>
        </div>

        <div className="text-center">
          <p className="text-[0.75rem] text-ink-soft">{people[seats[1]].name}</p>
          <p className="font-display text-[1.6rem] leading-none tabular-nums text-accent-500">
            {state.scores[1]}
          </p>
        </div>
      </div>
      {mode === "ONLINE" ? (
        <p className="mt-3 text-center text-[0.72rem] text-ink-faint">
          {seats[meSeat] ? `Sen: ${people[seats[meSeat]].name}` : null}
        </p>
      ) : null}
    </div>
  );
}

function WritePhase({
  state,
  seat,
  mode,
  now,
  name,
  alreadySubmitted,
  busy,
  onSubmit,
}: {
  state: IsimSehirState;
  seat: 0 | 1;
  mode: "ONLINE" | "LOCAL";
  now: number | null;
  name: string;
  alreadySubmitted: boolean;
  busy: boolean;
  onSubmit: (answers: Answers) => void;
}) {
  const [answers, setAnswers] = useState<Answers>(emptyAnswers());
  const [handedOver, setHandedOver] = useState(mode === "ONLINE");
  const sent = useRef(false);

  const secondsLeft =
    state.deadline === null || now === null
      ? null
      : Math.max(0, Math.ceil((state.deadline - now) / 1000));

  // Süre bitince kendiliğinden gönder — boş bırakılan kutular sıfır sayılır.
  useEffect(() => {
    if (secondsLeft !== 0 || sent.current || alreadySubmitted) return;
    sent.current = true;
    onSubmit(answers);
  }, [secondsLeft, answers, alreadySubmitted, onSubmit]);

  if (alreadySubmitted) {
    return (
      <Waiting text={`Gönderildi. ${mode === "ONLINE" ? "Karşı taraf yazıyor…" : "…"}`} />
    );
  }

  // Aynı cihazda: telefonu uzatma ekranı, karşıdaki cevapları görmesin.
  if (!handedOver) {
    return (
      <Handoff
        name={name}
        detail="Telefonu ona ver, sonra başla."
        onReady={() => setHandedOver(true)}
      />
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        sent.current = true;
        onSubmit(answers);
      }}
      className="rounded-card border border-line bg-surface/85 p-5 shadow-soft backdrop-blur-sm"
    >
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[0.9rem] font-medium text-ink">{name}</p>
        {secondsLeft !== null ? (
          <span
            className={cn(
              "rounded-xl px-3 py-1 font-display text-[1.1rem] tabular-nums",
              secondsLeft <= 15 ? "bg-bad/12 text-bad" : "bg-brand-50 text-brand-700",
            )}
          >
            0:{String(secondsLeft).padStart(2, "0")}
          </span>
        ) : null}
      </div>

      <div className="space-y-2.5">
        {CATEGORIES.map(({ key, label }) => {
          const value = answers[key];
          const ok = value.length === 0 || startsWithLetter(value, state.letter);
          return (
            <label key={key} className="flex items-center gap-3">
              <span className="w-14 shrink-0 text-[0.8rem] text-ink-soft">{label}</span>
              <input
                value={value}
                onChange={(e) => setAnswers((a) => ({ ...a, [key]: e.target.value }))}
                maxLength={40}
                autoComplete="off"
                autoCapitalize="words"
                className={cn(
                  "h-11 min-w-0 flex-1 rounded-btn border bg-surface px-3.5 outline-none transition-colors",
                  ok ? "border-line focus:border-brand-300" : "border-bad/50 text-bad",
                )}
                placeholder={`${state.letter} ile başlayan…`}
              />
            </label>
          );
        })}
      </div>

      <div className="mt-5 flex justify-end">
        <Button type="submit" size="lg" disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          Bitti
        </Button>
      </div>
    </form>
  );
}

function VotePhase({
  state,
  seat,
  people,
  seats,
  busy,
  onSubmit,
}: {
  state: IsimSehirState;
  seat: 0 | 1;
  people: People;
  seats: Record<number, PersonKey>;
  busy: boolean;
  onSubmit: (votes: Partial<Record<Category, boolean>>) => void;
}) {
  const other: 0 | 1 = seat === 0 ? 1 : 0;
  const [votes, setVotes] = useState<Partial<Record<Category, boolean>>>({});
  const alreadyVoted = state.voted[seat];

  const otherAnswers = state.answers[other];

  if (alreadyVoted) return <Waiting text="Oyların gitti. Karşı taraf bekleniyor…" />;

  return (
    <div className="rounded-card border border-line bg-surface/85 p-5 shadow-soft backdrop-blur-sm">
      <p className="mb-1 text-[0.95rem] font-medium text-ink">
        {people[seats[other]].name} ne yazmış?
      </p>
      <p className="mb-4 text-[0.82rem] text-ink-soft">
        Geçerli saymadığın kelimeye çarpı koy. Dokunmadıkların geçerli sayılır.
      </p>

      <ul className="space-y-2">
        {CATEGORIES.map(({ key, label }) => {
          const answer = otherAnswers[key];
          const empty = answer.trim().length === 0;
          const badLetter = !empty && !startsWithLetter(answer, state.letter);
          const vote = votes[key];

          return (
            <li
              key={key}
              className="flex items-center gap-3 rounded-btn border border-line px-3.5 py-2.5"
            >
              <span className="w-14 shrink-0 text-[0.78rem] text-ink-soft">{label}</span>
              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-[0.95rem]",
                  empty || badLetter ? "text-ink-faint line-through" : "text-ink",
                )}
              >
                {empty ? "—" : answer}
              </span>

              {empty || badLetter ? (
                <span className="text-[0.7rem] text-ink-faint">
                  {badLetter ? "harf tutmuyor" : "boş"}
                </span>
              ) : (
                <span className="flex shrink-0 gap-1">
                  <VoteButton
                    active={vote !== false}
                    tone="good"
                    label="Geçerli"
                    onClick={() => setVotes((v) => ({ ...v, [key]: true }))}
                  >
                    <Check className="size-4" strokeWidth={2.4} aria-hidden />
                  </VoteButton>
                  <VoteButton
                    active={vote === false}
                    tone="bad"
                    label="Geçersiz"
                    onClick={() => setVotes((v) => ({ ...v, [key]: false }))}
                  >
                    <X className="size-4" strokeWidth={2.4} aria-hidden />
                  </VoteButton>
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-5 flex justify-end">
        <Button size="lg" disabled={busy} onClick={() => onSubmit(votes)}>
          Onayla
        </Button>
      </div>
    </div>
  );
}

function VoteButton({
  active,
  tone,
  label,
  onClick,
  children,
}: {
  active: boolean;
  tone: "good" | "bad";
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "grid size-9 place-items-center rounded-lg transition-colors",
        active
          ? tone === "good"
            ? "bg-good text-white"
            : "bg-bad text-white"
          : "bg-brand-50 text-ink-faint hover:bg-brand-100",
      )}
    >
      {children}
    </button>
  );
}

function ResultPhase({
  state,
  people,
  seats,
  busy,
  onNext,
}: {
  state: IsimSehirState;
  people: People;
  seats: Record<number, PersonKey>;
  busy: boolean;
  onNext: () => void;
}) {
  const last = state.rounds.at(-1);
  const isFinal = state.round >= TOTAL_ROUNDS;

  return (
    <div className="rounded-card border border-line bg-surface/85 p-5 shadow-soft backdrop-blur-sm">
      <p className="mb-4 text-[0.95rem] font-medium text-ink">
        {state.round}. tur bitti — {last ? `${last.points[0]} · ${last.points[1]}` : ""}
      </p>

      <div className="overflow-hidden rounded-btn border border-line">
        <div className="grid grid-cols-[4.5rem_1fr_1fr] bg-brand-50/70 text-[0.72rem] font-medium uppercase tracking-wide text-brand-600">
          <span className="px-3 py-2" />
          <span className="px-3 py-2">{people[seats[0]].name}</span>
          <span className="px-3 py-2">{people[seats[1]].name}</span>
        </div>
        {CATEGORIES.map(({ key, label }) => (
          <div
            key={key}
            className="grid grid-cols-[4.5rem_1fr_1fr] border-t border-line text-[0.88rem]"
          >
            <span className="px-3 py-2 text-ink-soft">{label}</span>
            <span className="truncate px-3 py-2 text-ink">{state.answers[0][key] || "—"}</span>
            <span className="truncate px-3 py-2 text-ink">{state.answers[1][key] || "—"}</span>
          </div>
        ))}
      </div>

      <div className="mt-5 flex justify-end">
        <Button size="lg" onClick={onNext} disabled={busy}>
          {isFinal ? "Maçı bitir" : "Sonraki tur"}
          <ChevronRight className="size-4" strokeWidth={2} aria-hidden />
        </Button>
      </div>
    </div>
  );
}

function Waiting({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-line-strong px-6 py-14 text-center">
      <Loader2 className="size-5 animate-spin text-brand-400" aria-hidden />
      <p className="text-[0.9rem] text-ink-soft">{text}</p>
    </div>
  );
}

function Handoff({
  name,
  detail,
  onReady,
}: {
  name: string;
  detail: string;
  onReady: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-line bg-surface/85 px-6 py-14 text-center shadow-soft backdrop-blur-sm">
      <p className="font-display text-[1.5rem]">Sıra {name}&apos;de</p>
      <p className="mb-3 text-[0.88rem] text-ink-soft">{detail}</p>
      <Button size="lg" onClick={onReady}>
        Hazırım
      </Button>
    </div>
  );
}
