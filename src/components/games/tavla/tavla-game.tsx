"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Flag, RotateCcw, SkipForward } from "lucide-react";

import {
  endTavlaTurn,
  moveTavlaChecker,
  resignTavla,
  rollTavlaDice,
  undoTavlaTurn,
} from "@/app/oyunlar/tavla/actions";
import { Dice3D } from "@/components/games/dice-3d";
import { TavlaBoard } from "@/components/games/tavla/board";
import { GameOverDialog } from "@/components/games/game-over-dialog";
import { PlayerBar } from "@/components/games/player-bar";
import { Button } from "@/components/ui/button";
import { legalMoves, pipCount } from "@/games/tavla/engine";
import { BAR, type Move, type Player, type TavlaState } from "@/games/tavla/types";
import type { People } from "@/lib/people";
import type { PersonKey } from "@/config/site";
import { playOutcome, playSound, unlockSounds } from "@/lib/sounds";
import { useMatchChannel } from "@/lib/use-match-channel";

/** Tur göstergesi — süre bitse de bir şey olmaz, yalnızca görsel. */
const TURN_SECONDS = 90;

export function TavlaGame({
  matchId,
  initialState,
  mode,
  seats,
  me,
  people,
  finished,
}: {
  matchId: string;
  initialState: TavlaState;
  mode: "ONLINE" | "LOCAL";
  /** Koltuk numarasından kişiye. */
  seats: Record<number, PersonKey>;
  me: PersonKey;
  people: People;
  finished: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState(initialState);
  const [selected, setSelected] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const [rollKey, setRollKey] = useState(0);
  const announced = useRef(false);

  const mySeat = (Object.entries(seats).find(([, key]) => key === me)?.[0] ?? "0") as string;
  const meSeat = Number(mySeat) as Player;

  // Aynı cihazda oynarken bakış açısı **sabit** kalmalı: sırayla değiştirmek
  // oyuncu şeritlerini her turda yer değiştirtiyor ve tahtayı takip etmeyi
  // zorlaştırıyor. Online'da herkes kendi tarafını altta görür.
  const perspective: Player = mode === "LOCAL" ? 0 : meSeat;
  const myTurn = mode === "LOCAL" ? true : state.turn === meSeat;

  const { online, connected } = useMatchChannel<TavlaState>(
    mode === "ONLINE" ? matchId : "",
    useCallback((next: TavlaState) => {
      setState((current) => {
        // Yeni bir atış geldiyse zar animasyonunu tetikle.
        if (next.rolled && next.rolled !== current.rolled) setRollKey((k) => k + 1);
        return next;
      });
      setSelected(null);
    }, []),
  );

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  /* --- hamle seçenekleri ------------------------------------------- */

  const moves = useMemo(() => (myTurn ? legalMoves(state) : []), [state, myTurn]);
  const sources = useMemo(() => [...new Set(moves.map((m) => m.from as number))], [moves]);
  const targets = useMemo<Move[]>(
    () => (selected === null ? [] : moves.filter((m) => m.from === selected)),
    [moves, selected],
  );

  // Bar'da taş varken tek kaynak var; kullanıcıyı seçtirmeye gerek yok.
  useEffect(() => {
    if (sources.length === 1 && sources[0] === BAR && selected === null) setSelected(BAR);
  }, [sources, selected]);

  /* --- eylemler ----------------------------------------------------- */

  async function run<T>(action: () => Promise<{ ok: true; state: TavlaState } | { ok: false; error: string }>) {
    if (busy) return;
    setBusy(true);
    unlockSounds();
    const result = await action();
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    setState(result.state);
    setSelected(null);
  }

  async function handleRoll() {
    setRollKey((k) => k + 1);
    playSound("zar");
    await run(() => rollTavlaDice(matchId));
  }

  async function handleMoveTo(to: number) {
    if (selected === null) return;
    await run(() => moveTavlaChecker({ matchId, from: selected, to }));
  }

  /* --- oyun sonu ---------------------------------------------------- */

  const iWon = state.winner !== null && seats[state.winner] === me;

  useEffect(() => {
    if (state.winner === null || announced.current) return;
    announced.current = true;
    playOutcome(mode === "LOCAL" ? true : iWon, state.result);
    router.refresh();
  }, [state.winner, state.result, iWon, mode, router]);

  /* --- süre --------------------------------------------------------- */

  const secondsLeft =
    now === null
      ? TURN_SECONDS
      : Math.max(0, TURN_SECONDS - Math.floor((now - state.turnStartedAt) / 1000));

  const topSeat: Player = perspective === 0 ? 1 : 0;

  // Zar atılmış ve oynanacak hamle kalmamışsa sıra devredilmeli. İki hâli var:
  // zarların hepsi oynandı (dice boş) ya da hiç oynanabilir hamle çıkmadı.
  const mustEndTurn = myTurn && state.rolled !== null && moves.length === 0 && state.winner === null;
  const canRoll = myTurn && state.rolled === null && state.winner === null;
  const outOfMoves = mustEndTurn && state.dice.length > 0;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PlayerBar
        person={people[seats[topSeat]]}
        pip={pipCount(state, topSeat)}
        active={state.turn === topSeat && state.winner === null}
        online={mode === "ONLINE" ? (online[seats[topSeat]] ?? false) : true}
        showOnline={mode === "ONLINE" && seats[topSeat] !== me}
        checkerColor={topSeat === 0 ? "brand" : "light"}
        off={state.off[topSeat]}
      />

      <div className="my-3">
        <TavlaBoard
          state={state}
          me={perspective}
          selected={selected}
          targets={targets}
          sources={sources}
          onSelect={setSelected}
          onMoveTo={handleMoveTo}
          disabled={busy || state.winner !== null}
        />
      </div>

      <PlayerBar
        person={people[seats[perspective]]}
        pip={pipCount(state, perspective)}
        active={state.turn === perspective && state.winner === null}
        online
        showOnline={false}
        checkerColor={perspective === 0 ? "brand" : "light"}
        off={state.off[perspective]}
      />

      {/* --- zar ve eylemler --- */}
      <div className="mt-4 rounded-card border border-line bg-surface/85 p-4 shadow-soft backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            {state.winner !== null ? (
              <p className="text-[0.9rem] text-ink-soft">Oyun bitti.</p>
            ) : state.rolled ? (
              <>
                <p className="text-[0.85rem] text-ink-soft">
                  {myTurn
                    ? outOfMoves
                      ? "Oynayabileceğin hamle yok."
                      : mustEndTurn
                        ? "Zarlarını oynadın — sıra karşıya."
                        : selected === null
                          ? "Oynatacağın pulu seç."
                          : "Nereye gideceğini seç."
                    : `${people[seats[state.turn]].name} oynuyor…`}
                </p>
                <p className="mt-1 text-[0.75rem] tabular-nums text-ink-faint">
                  Kalan zar: {state.dice.join(" · ") || "—"}
                </p>
              </>
            ) : (
              <p className="text-[0.9rem] text-ink-soft">
                {myTurn ? "Zar atma sırası sende." : `${people[seats[state.turn]].name} zar atacak.`}
              </p>
            )}
          </div>

          <TurnTimer seconds={secondsLeft} total={TURN_SECONDS} />
        </div>

        {state.rolled ? (
          <Dice3D dice={state.rolled} rollKey={rollKey} className="mx-auto h-28 w-full max-w-[16rem]" />
        ) : null}

        {error ? (
          <p className="mb-3 rounded-btn bg-bad/10 px-3.5 py-2 text-[0.82rem] text-bad">{error}</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          {canRoll ? (
            <Button size="lg" onClick={handleRoll} disabled={busy}>
              Zar at
            </Button>
          ) : null}

          {mustEndTurn ? (
            <Button size="lg" onClick={() => run(() => endTavlaTurn(matchId))} disabled={busy}>
              <SkipForward className="size-4" strokeWidth={2} aria-hidden />
              {outOfMoves ? "Pas geç" : "Sırayı devret"}
            </Button>
          ) : null}

          {myTurn && state.turnMoves.length > 0 && state.winner === null ? (
            <Button variant="outline" onClick={() => run(() => undoTavlaTurn(matchId))} disabled={busy}>
              <RotateCcw className="size-4" strokeWidth={1.9} aria-hidden />
              Geri al
            </Button>
          ) : null}

          {state.winner === null ? (
            <Button
              variant="ghost"
              className="ml-auto"
              onClick={() => {
                if (confirm("Maçı terk etmek istediğine emin misin?")) {
                  void run(() => resignTavla(matchId));
                }
              }}
              disabled={busy}
            >
              <Flag className="size-4" strokeWidth={1.8} aria-hidden />
              Terk et
            </Button>
          ) : null}
        </div>

        {mode === "ONLINE" && !connected ? (
          <p className="mt-3 text-[0.75rem] text-ink-faint">
            Bağlantı kurulamadı — hamleler yine kaydediliyor, sayfayı yenileyerek görebilirsin.
          </p>
        ) : null}
      </div>

      {state.winner !== null ? (
        <GameOverDialog
          title={
            mode === "LOCAL"
              ? `${people[seats[state.winner]].name} kazandı`
              : iWon
                ? "Kazandın"
                : "Kaybettin"
          }
          detail={resultText(state.result, people[seats[state.winner]].name)}
          playAgainHref="/oyunlar/tavla"
        />
      ) : null}
    </div>
  );
}

function resultText(result: string | null, winner: string): string {
  if (result === "MARS") return `${winner} mars yaptı — 2 puan.`;
  if (result === "HAMARS") return `${winner} hamars yaptı — 3 puan.`;
  if (result === "TERK") return "Maç terk edildi.";
  return `${winner} 1 puan aldı.`;
}

function TurnTimer({ seconds, total }: { seconds: number; total: number }) {
  const pct = Math.max(0, Math.min(100, (seconds / total) * 100));
  return (
    <div className="shrink-0 text-right">
      <p className="font-display text-[1.35rem] leading-none tabular-nums text-ink">
        {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
      </p>
      <div className="mt-1.5 h-1 w-16 overflow-hidden rounded-full bg-brand-100">
        <div
          className="h-full rounded-full bg-brand-500 transition-[width] duration-500 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
