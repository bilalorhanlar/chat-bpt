"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Flag, FlipHorizontal2, FlipVertical2, RotateCcw, SkipForward } from "lucide-react";

import {
  endTavlaTurn,
  moveTavlaChecker,
  resignTavla,
  undoTavlaTurn,
} from "@/app/oyunlar/tavla/actions";
import { Dice3D } from "@/components/games/dice-3d";
import { GameOverDialog } from "@/components/games/game-over-dialog";
import { PlayerBar } from "@/components/games/player-bar";
import { RotateHint } from "@/components/games/rotate-hint";
import { TavlaBoard, useBoardOrientation } from "@/components/games/tavla/board";
import { Button } from "@/components/ui/button";
import type { PersonKey } from "@/config/site";
import { legalMoves, pipCount, reachableFrom } from "@/games/tavla/engine";
import { BAR, type Player, type Reach, type TavlaState } from "@/games/tavla/types";
import type { People } from "@/lib/people";
import { playOutcome, playSound, unlockSounds } from "@/lib/sounds";
import { useMatchChannel } from "@/lib/use-match-channel";
import { cn } from "@/lib/utils";

/** Tur göstergesi — süre bitse de bir şey olmaz, yalnızca görsel. */
const TURN_SECONDS = 90;
/** Hamleler bitince sıranın kendiliğinden geçmesi için beklenen süre. */
const AUTO_PASS_MS = 3000;
/** Bu kadar süre sıra devredilmezse uyarı sesi çalar. */
const NUDGE_MS = 20_000;

export function TavlaGame({
  matchId,
  initialState,
  mode,
  seats,
  me,
  people,
  guestMode = false,
}: {
  matchId: string;
  initialState: TavlaState;
  mode: "ONLINE" | "LOCAL";
  /** Koltuk numarasından kişiye. */
  seats: Record<number, PersonKey>;
  /** Misafir oturumunda null. */
  me: PersonKey | null;
  people: People;
  guestMode?: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState(initialState);
  const [selected, setSelected] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const [rollKey, setRollKey] = useState(0);
  const announced = useRef(false);

  const orientation = useBoardOrientation();

  // Misafir maçında kimlik yok: iki tarafı da aynı kişi sürüyor, isimler
  // taş rengiyle anılıyor.
  const seatName = (seat: number) =>
    guestMode ? (seat === 0 ? "Beyaz" : "Siyah") : people[seats[seat]].name;

  const meSeat: Player =
    me === null
      ? 0
      : ((Number(Object.entries(seats).find(([, key]) => key === me)?.[0] ?? 0) as Player));

  // Aynı cihazda / misafir modunda bakış açısı sabit; online'da herkes kendi
  // tarafını altta görür.
  const perspective: Player = mode === "LOCAL" || guestMode ? 0 : meSeat;
  const myTurn = mode === "LOCAL" || guestMode ? true : state.turn === meSeat;

  const { online, connected } = useMatchChannel<TavlaState>(
    mode === "ONLINE" && !guestMode ? matchId : "",
    useCallback((next: TavlaState) => {
      setState(next);
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

  /**
   * Seçili pulun gidebileceği **tüm** haneler — tek zarla ve iki zarı
   * zincirleyerek. Eskiden yalnızca tek zarlık hedefler yeşil oluyordu ve
   * oyuncu pulun daha ileri gidebildiğini göremiyordu.
   */
  const targets = useMemo<Reach[]>(
    () => (selected === null || !myTurn ? [] : reachableFrom(state, selected)),
    [state, selected, myTurn],
  );

  // Bar'da taş varken tek kaynak var; kullanıcıyı seçtirmeye gerek yok.
  useEffect(() => {
    if (sources.length === 1 && sources[0] === BAR && selected === null) setSelected(BAR);
  }, [sources, selected]);

  /* --- eylemler ----------------------------------------------------- */

  const run = useCallback(
    async (action: () => Promise<{ ok: true; state: TavlaState } | { ok: false; error: string }>) => {
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
    },
    [],
  );

  async function handleMoveTo(to: number) {
    if (selected === null || busy) return;
    const reach = targets.find((t) => t.to === to);
    if (!reach) return;

    playSound("place");
    await run(() =>
      moveTavlaChecker({
        matchId,
        steps: reach.path.map((m) => ({ from: m.from as number, to: m.to as number })),
      }),
    );
  }

  /* --- zar ---------------------------------------------------------- */

  // Zar sunucuda otomatik atılıyor; burada yalnızca animasyon ve ses.
  // İlk karede ses çalınmaz — sayfa yenilendiğinde "yeni atış" sanılmasın.
  const seenPly = useRef<number | null>(null);
  useEffect(() => {
    if (!state.rolled) return;
    if (seenPly.current === null) {
      seenPly.current = state.ply;
      return;
    }
    if (seenPly.current !== state.ply) {
      seenPly.current = state.ply;
      setRollKey((k) => k + 1);
      playSound("zar");
    }
  }, [state.ply, state.rolled]);

  /* --- tur bitişi --------------------------------------------------- */

  const mustEndTurn =
    myTurn && state.rolled !== null && moves.length === 0 && state.winner === null;
  const outOfMoves = mustEndTurn && state.dice.length > 0;

  /**
   * Hamleler bitince sıra 3 saniye sonra kendiliğinden geçiyor.
   * Düğmeye basmayı unutmak oyunu kilitliyordu; süre yine de var ki
   * oyuncu tahtaya son bir kez bakabilsin.
   */
  useEffect(() => {
    if (!mustEndTurn || busy) return;
    const id = setTimeout(() => void run(() => endTavlaTurn(matchId)), AUTO_PASS_MS);
    return () => clearTimeout(id);
  }, [mustEndTurn, busy, matchId, run]);

  /**
   * Sıra 20 saniyedir devredilmediyse uyarı sesi — oyuncu ekrandan ayrılmış
   * olabilir. Tur değişince (ply) sayaç sıfırlanıyor, ses tur başına bir kez.
   */
  const nudgedPly = useRef<number | null>(null);
  useEffect(() => {
    if (state.winner !== null) return;
    if (nudgedPly.current === state.ply) return;

    const id = setTimeout(() => {
      nudgedPly.current = state.ply;
      playSound("uyari");
    }, NUDGE_MS);
    return () => clearTimeout(id);
  }, [state.ply, state.winner]);

  /* --- oyun sonu ---------------------------------------------------- */

  const iWon = state.winner !== null && me !== null && seats[state.winner] === me;

  useEffect(() => {
    if (state.winner === null || announced.current) return;
    announced.current = true;
    playOutcome(mode === "LOCAL" || guestMode ? true : iWon, state.result);
    router.refresh();
  }, [state.winner, state.result, iWon, mode, guestMode, router]);

  /* --- süre --------------------------------------------------------- */

  const secondsLeft =
    now === null
      ? TURN_SECONDS
      : Math.max(0, TURN_SECONDS - Math.floor((now - state.turnStartedAt) / 1000));

  const topSeat: Player = perspective === 0 ? 1 : 0;

  const panel = (
    <div className="rounded-card border border-line bg-surface p-4 shadow-soft">
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
                      ? "Zarlarını oynadın — sıra geçiyor…"
                      : selected === null
                        ? "Oynatacağın pulu seç."
                        : "Nereye gideceğini seç."
                  : `${seatName(state.turn)} oynuyor…`}
              </p>
              <p className="mt-1 text-[0.75rem] tabular-nums text-ink-faint">
                Kalan zar: {state.dice.join(" · ") || "—"}
              </p>
            </>
          ) : (
            <p className="text-[0.9rem] text-ink-soft">Zar atılıyor…</p>
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
        {mustEndTurn ? (
          <Button size="sm" onClick={() => run(() => endTavlaTurn(matchId))} disabled={busy}>
            <SkipForward className="size-4" strokeWidth={2} aria-hidden />
            {outOfMoves ? "Pas geç" : "Sırayı devret"}
          </Button>
        ) : null}

        {myTurn && state.turnMoves.length > 0 && state.winner === null ? (
          <Button variant="outline" size="sm" onClick={() => run(() => undoTavlaTurn(matchId))} disabled={busy}>
            <RotateCcw className="size-4" strokeWidth={1.9} aria-hidden />
            Geri al
          </Button>
        ) : null}

        {/* Tahta yönü — tercih tarayıcıda saklanıyor, her girişte açılıyor. */}
        <div className="ml-auto flex gap-1">
          <IconToggle
            label="Yatay çevir"
            active={orientation.flipX}
            onClick={orientation.toggleX}
          >
            <FlipHorizontal2 className="size-4" strokeWidth={1.8} aria-hidden />
          </IconToggle>
          <IconToggle
            label="Dikey çevir"
            active={orientation.flipY}
            onClick={orientation.toggleY}
          >
            <FlipVertical2 className="size-4" strokeWidth={1.8} aria-hidden />
          </IconToggle>
        </div>
      </div>

      {state.winner === null ? (
        <button
          type="button"
          onClick={() => {
            if (confirm("Maçı terk etmek istediğine emin misin?")) {
              void run(() => resignTavla(matchId));
            }
          }}
          disabled={busy}
          className="mt-3 flex items-center gap-1.5 text-[0.78rem] text-ink-faint transition-colors hover:text-bad"
        >
          <Flag className="size-3.5" strokeWidth={1.8} aria-hidden />
          Terk et
        </button>
      ) : null}

      {mode === "ONLINE" && !guestMode && !connected ? (
        <p className="mt-3 text-[0.75rem] text-ink-faint">
          Bağlantı kurulamadı — hamleler yine kaydediliyor, sayfayı yenileyerek görebilirsin.
        </p>
      ) : null}
    </div>
  );

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-3xl",
        // Masaüstünde ve yatay telefonda tahta solda, zar/süre/geri al sağda.
        "lg:grid lg:max-w-6xl lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-5",
        "short-landscape:grid short-landscape:max-w-none short-landscape:grid-cols-[minmax(0,1fr)_15.5rem] short-landscape:items-start short-landscape:gap-3",
      )}
    >
      <RotateHint />

      <div className="lg:col-start-1 short-landscape:col-start-1">
        <PlayerBar
          person={{ name: seatName(topSeat), accent: "#0a0a0a" }}
          pip={pipCount(state, topSeat)}
          active={state.turn === topSeat && state.winner === null}
          online={mode === "ONLINE" && !guestMode ? (online[seats[topSeat]] ?? false) : true}
          showOnline={mode === "ONLINE" && !guestMode && seats[topSeat] !== me}
          checkerColor={topSeat === 0 ? "light" : "dark"}
          off={state.off[topSeat]}
        />

        <div className="my-3 short-landscape:my-2 short-landscape:[width:min(100%,calc((100svh-6.5rem)*1.45))]">
          <TavlaBoard
            state={state}
            me={perspective}
            selected={selected}
            targets={targets}
            sources={sources}
            orientation={orientation}
            onSelect={setSelected}
            onMoveTo={handleMoveTo}
            disabled={busy || state.winner !== null}
          />
        </div>

        <PlayerBar
          person={{ name: seatName(perspective), accent: "#0a0a0a" }}
          pip={pipCount(state, perspective)}
          active={state.turn === perspective && state.winner === null}
          online
          showOnline={false}
          checkerColor={perspective === 0 ? "light" : "dark"}
          off={state.off[perspective]}
        />
      </div>

      <div className="mt-4 lg:col-start-2 lg:row-start-1 lg:mt-0 short-landscape:col-start-2 short-landscape:row-start-1 short-landscape:mt-0">
        {panel}
      </div>

      {state.winner !== null ? (
        <GameOverDialog
          title={
            mode === "LOCAL" || guestMode
              ? `${seatName(state.winner)} kazandı`
              : iWon
                ? "Kazandın"
                : "Kaybettin"
          }
          detail={resultText(state.result, seatName(state.winner))}
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

function IconToggle({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cn(
        "grid size-9 place-items-center rounded-lg border transition-colors",
        active
          ? "border-ink bg-ink text-white"
          : "border-line text-ink-faint hover:border-ink hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function TurnTimer({ seconds, total }: { seconds: number; total: number }) {
  const pct = Math.max(0, Math.min(100, (seconds / total) * 100));
  return (
    <div className="shrink-0 text-right">
      <p className="font-display text-[1.35rem] font-bold leading-none tabular-nums text-ink">
        {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
      </p>
      <div className="mt-1.5 h-1 w-16 overflow-hidden rounded-full bg-[#eee]">
        <div
          className="h-full rounded-full bg-ink transition-[width] duration-500 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
