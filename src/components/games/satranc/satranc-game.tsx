"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Chess, type Square } from "chess.js";
import { Flag } from "lucide-react";

import {
  claimSatrancTimeout,
  makeSatrancMove,
  resignSatranc,
} from "@/app/oyunlar/satranc/actions";
import { GameOverDialog } from "@/components/games/game-over-dialog";
import { PlayerBar } from "@/components/games/player-bar";
import { PromotionPicker, SatrancBoard } from "@/components/games/satranc/board";
import { ChessPiece, PIECE_VALUE, type PieceType } from "@/components/games/satranc/pieces";
import { Button } from "@/components/ui/button";
import type { PersonKey } from "@/config/site";
import {
  remainingMs,
  sideToMove,
  type SatrancState,
  type Seat,
} from "@/games/satranc/types";
import type { People } from "@/lib/people";
import { playOutcome, playSound, unlockSounds } from "@/lib/sounds";
import { useMatchChannel } from "@/lib/use-match-channel";

export function SatrancGame({
  matchId,
  initialState,
  mode,
  seats,
  me,
  people,
}: {
  matchId: string;
  initialState: SatrancState;
  mode: "ONLINE" | "LOCAL";
  seats: Record<number, PersonKey>;
  /** Misafir oturumunda null. */
  me: PersonKey | null;
  people: People;
  guestMode?: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState(initialState);
  const [selected, setSelected] = useState<Square | null>(null);
  const [pending, setPending] = useState<{ from: Square; to: Square } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const announced = useRef(false);
  const timeoutClaimed = useRef(false);

  const meSeat = Number(
    Object.entries(seats).find(([, key]) => key === me)?.[0] ?? 0,
  ) as Seat;
  const toMove = sideToMove(state);
  const myTurn = mode === "LOCAL" ? true : toMove === meSeat;

  // Aynı cihazda tahta sabit kalsın (beyaz altta); online'da herkes kendi
  // rengini altta görsün.
  const perspective: Seat = mode === "LOCAL" ? 0 : meSeat;

  useMatchChannel<SatrancState>(
    mode === "ONLINE" ? matchId : "",
    useCallback((next: SatrancState) => {
      setState(next);
      setSelected(null);
    }, []),
  );

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  /* --- tahta --------------------------------------------------------- */

  const chess = useMemo(() => new Chess(state.fen), [state.fen]);

  const targets = useMemo(() => {
    if (!selected || state.winner !== null) return [];
    return chess
      .moves({ square: selected, verbose: true })
      .map((m) => ({ to: m.to as Square, capture: Boolean(m.captured) }));
  }, [chess, selected, state.winner]);

  const checkSquare = useMemo<Square | null>(() => {
    if (!chess.inCheck()) return null;
    const color = chess.turn();
    for (const row of chess.board()) {
      for (const cell of row) {
        if (cell && cell.type === "k" && cell.color === color) return cell.square as Square;
      }
    }
    return null;
  }, [chess]);

  const captured = useMemo(() => countCaptured(state.fen), [state.fen]);

  function handleSquare(square: Square) {
    if (state.winner !== null || busy || !myTurn) return;

    // Zaten seçili taş varsa ve buraya gidebiliyorsa hamleyi yap.
    if (selected) {
      const move = chess.moves({ square: selected, verbose: true }).find((m) => m.to === square);
      if (move) {
        if (move.promotion) {
          setPending({ from: selected, to: square });
          return;
        }
        void submit(selected, square);
        return;
      }
    }

    // Değilse: kendi taşınsa seç, değilse seçimi bırak.
    const piece = chess.get(square);
    if (piece && piece.color === (toMove === 0 ? "w" : "b")) setSelected(square);
    else setSelected(null);
  }

  async function submit(from: Square, to: Square, promotion?: "q" | "r" | "b" | "n") {
    setBusy(true);
    unlockSounds();

    // Sesi hamleden önce çal: ağ turunu beklemek tıklamayı gecikmeli hissettirir.
    // Hangi taş oynadığını yerel tahtadan biliyoruz.
    const piece = chess.get(from)?.type;
    playSound(piece === "n" ? "at" : "satranc");

    const result = await makeSatrancMove({ matchId, from, to, promotion });
    setBusy(false);
    setSelected(null);
    setPending(null);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    setState(result.state);
  }

  /* --- saat ---------------------------------------------------------- */

  const clockMs: [number, number] = [
    remainingMs(state, 0, now ?? state.turnStartedAt),
    remainingMs(state, 1, now ?? state.turnStartedAt),
  ];

  // Süre bittiğinde sunucudan karar iste. Kararı istemci vermiyor; sunucu
  // gerçekten bitmediyse reddediyor.
  useEffect(() => {
    if (state.winner !== null || now === null || timeoutClaimed.current) return;
    if (clockMs[toMove] > 0) return;
    timeoutClaimed.current = true;
    void claimSatrancTimeout(matchId).then((result) => {
      if (result.ok) setState(result.state);
      else timeoutClaimed.current = false;
    });
  }, [clockMs, toMove, state.winner, now, matchId]);

  /* --- oyun sonu ----------------------------------------------------- */

  const iWon = state.winner !== null && seats[state.winner] === me;

  useEffect(() => {
    if (state.result === null || announced.current) return;
    announced.current = true;
    if (state.winner !== null) playOutcome(mode === "LOCAL" ? true : iWon, null);
    router.refresh();
  }, [state.result, state.winner, iWon, mode, router]);

  const topSeat: Seat = perspective === 0 ? 1 : 0;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <PlayerBar
        person={people[seats[topSeat]]}
        active={toMove === topSeat && state.winner === null}
        online
        showOnline={false}
        checkerColor={topSeat === 0 ? "light" : "dark"}
        clock={clockMs[topSeat]}
        captured={<CapturedRow pieces={captured[topSeat === 0 ? "b" : "w"]} color={topSeat === 0 ? "b" : "w"} />}
      />

      <div className="my-3">
        <SatrancBoard
          fen={state.fen}
          flipped={perspective === 1}
          selected={selected}
          targets={targets}
          lastMove={state.lastMove}
          checkSquare={checkSquare}
          onSquare={handleSquare}
          disabled={busy || state.winner !== null || !myTurn}
        />
      </div>

      <PlayerBar
        person={people[seats[perspective]]}
        active={toMove === perspective && state.winner === null}
        online
        showOnline={false}
        checkerColor={perspective === 0 ? "light" : "dark"}
        clock={clockMs[perspective]}
        captured={<CapturedRow pieces={captured[perspective === 0 ? "b" : "w"]} color={perspective === 0 ? "b" : "w"} />}
      />

      <div className="mt-4 rounded-card border border-line bg-surface/85 p-4 shadow-soft backdrop-blur-sm">
        <div className="mb-3 flex items-center gap-3">
          <p className="min-w-0 flex-1 text-[0.88rem] text-ink-soft">
            {state.winner !== null || state.result
              ? "Oyun bitti."
              : chess.inCheck()
                ? "Şah!"
                : myTurn
                  ? selected
                    ? "Nereye oynayacağını seç."
                    : "Sıra sende."
                  : `${people[seats[toMove]].name} düşünüyor…`}
          </p>
          {state.result === null ? (
            <Button
              variant="ghost"
              onClick={() => {
                if (confirm("Maçı terk etmek istediğine emin misin?")) {
                  setBusy(true);
                  void resignSatranc(matchId).then((r) => {
                    setBusy(false);
                    if (r.ok) setState(r.state);
                  });
                }
              }}
              disabled={busy}
            >
              <Flag className="size-4" strokeWidth={1.8} aria-hidden />
              Terk et
            </Button>
          ) : null}
        </div>

        {error ? (
          <p className="mb-3 rounded-btn bg-bad/10 px-3.5 py-2 text-[0.82rem] text-bad">{error}</p>
        ) : null}

        <MoveList history={state.history} />
      </div>

      {pending ? (
        <PromotionPicker
          color={toMove === 0 ? "w" : "b"}
          onPick={(piece) => void submit(pending.from, pending.to, piece)}
          onCancel={() => setPending(null)}
        />
      ) : null}

      {state.result !== null ? (
        <GameOverDialog
          title={
            state.winner === null
              ? "Berabere"
              : mode === "LOCAL"
                ? `${people[seats[state.winner]].name} kazandı`
                : iWon
                  ? "Kazandın"
                  : "Kaybettin"
          }
          detail={resultText(state.result)}
          playAgainHref="/oyunlar/satranc"
        />
      ) : null}
    </div>
  );
}

function resultText(result: string): string {
  switch (result) {
    case "MAT":
      return "Şah mat.";
    case "PAT":
      return "Pat — berabere.";
    case "SURE":
      return "Süre bitti.";
    case "TERK":
      return "Maç terk edildi.";
    default:
      return "Berabere.";
  }
}

/* ------------------------------------------------------------------ */

const INITIAL_COUNT: Record<PieceType, number> = { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 };

/**
 * Alınan taşları FEN'den çıkarır: başlangıç sayısından tahtadaki sayıyı düşer.
 * Hamle geçmişini taramaktan daha ucuz ve terfi durumunu da doğru sayar.
 */
function countCaptured(fen: string): Record<"w" | "b", PieceType[]> {
  const present: Record<"w" | "b", Record<string, number>> = { w: {}, b: {} };
  for (const char of fen.split(" ")[0]) {
    if (!/[a-zA-Z]/.test(char)) continue;
    const color = char === char.toUpperCase() ? "w" : "b";
    const type = char.toLowerCase();
    present[color][type] = (present[color][type] ?? 0) + 1;
  }

  const out: Record<"w" | "b", PieceType[]> = { w: [], b: [] };
  for (const color of ["w", "b"] as const) {
    for (const [type, count] of Object.entries(INITIAL_COUNT) as [PieceType, number][]) {
      const missing = count - (present[color][type] ?? 0);
      for (let i = 0; i < missing; i++) out[color].push(type);
    }
    out[color].sort((a, b) => PIECE_VALUE[b] - PIECE_VALUE[a]);
  }
  return out;
}

function CapturedRow({ pieces, color }: { pieces: PieceType[]; color: "w" | "b" }) {
  if (pieces.length === 0) return null;
  return (
    <span className="mt-0.5 flex flex-wrap items-center gap-px">
      {pieces.map((type, i) => (
        <ChessPiece key={`${type}${i}`} type={type} color={color} className="size-4 opacity-70" />
      ))}
    </span>
  );
}

function MoveList({ history }: { history: string[] }) {
  if (history.length === 0) {
    return <p className="text-[0.8rem] text-ink-faint">Henüz hamle yok.</p>;
  }

  const pairs: [string, string | undefined][] = [];
  for (let i = 0; i < history.length; i += 2) pairs.push([history[i], history[i + 1]]);

  return (
    <div className="max-h-32 overflow-y-auto">
      <ol className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[0.82rem] tabular-nums sm:grid-cols-3">
        {pairs.map(([white, black], i) => (
          <li key={i} className="flex gap-2">
            <span className="w-5 shrink-0 text-right text-ink-faint">{i + 1}.</span>
            <span className="w-12 text-ink">{white}</span>
            <span className="w-12 text-ink-soft">{black ?? ""}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
