"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Flag,
  FlipHorizontal2,
  FlipVertical2,
  RotateCcw,
  SkipForward,
} from "lucide-react";

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
import {
  FLIGHT_MS,
  TavlaBoard,
  useBoardOrientation,
  type Flight,
} from "@/components/games/tavla/board";
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
const AUTO_PASS_MS = 5000;
/** Bu kadar süre sıra devredilmezse uyarı sesi çalar. */
const NUDGE_MS = 30_000;

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
  const [rollKey, setRollKey] = useState(0);
  const [flight, setFlight] = useState<Flight | null>(null);
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

  /* --- taş kaydırma ------------------------------------------------- */

  /**
   * Oynanan pulun kaynaktan hedefe kayması.
   *
   * Durum sunucudan bütün olarak geliyor; hangi pulun oynandığını `turnMoves`
   * söylüyor. Aynı turda listeye eklenen hamleler canlandırılır — geri alma ve
   * tur devri tahtayı topluca değiştirdiği için onlarda animasyon yok.
   * Rakibin hamlesi de soketten aynı yoldan geldiği için o da kayarak gelir.
   */
  const previous = useRef(initialState);
  const flightKey = useRef(0);

  useEffect(() => {
    const prev = previous.current;
    previous.current = state;

    if (state === prev || state.ply !== prev.ply) return;
    if (state.turnMoves.length <= prev.turnMoves.length) return;

    const added = state.turnMoves.slice(prev.turnMoves.length);
    flightKey.current += 1;
    setFlight({
      key: flightKey.current,
      // Zincir hamlede ara duraklar atlanır: göz tek bir kayış görür.
      from: added[0].from,
      to: added[added.length - 1].to,
      player: prev.turn,
    });
  }, [state]);

  useEffect(() => {
    if (flight === null) return;
    // Kayış iki kare sonra başlıyor; pay bırakılmazsa son adım kesilirdi.
    const id = setTimeout(() => setFlight(null), FLIGHT_MS + 80);
    return () => clearTimeout(id);
  }, [flight]);

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

  /* --- panel -------------------------------------------------------- */

  const topSeat: Player = perspective === 0 ? 1 : 0;

  // Yatayda sağ şerit dar: düğmeler sütunu tam kaplar, yazı küçülür — yoksa
  // "Sırayı devret" iki satıra bölünüp sabit yüksekliğin dışına taşıyor.
  const compactButton =
    "short-landscape:h-8 short-landscape:w-full short-landscape:px-2 short-landscape:text-[0.78rem]";

  const panel = (
    <div
      className={cn(
        "rounded-card border border-line bg-surface p-4 shadow-soft",
        /* Yatayda tahtanın üstüne biniyor. Burada bilerek `backdrop-blur` YOK:
           blur bir kapsayıcı blok yaratıyor ve içindeki `fixed` zarı ekranın
           ortasına değil bu kartın içine sabitliyordu. */
        "short-landscape:border-white/50 short-landscape:bg-surface/95 short-landscape:p-2",
      )}
    >
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

        <TurnTimer startedAt={state.turnStartedAt} total={TURN_SECONDS} />
      </div>

      {state.rolled ? (
        <Dice3D
          dice={state.rolled}
          rollKey={rollKey}
          className={cn(
            "mx-auto h-28 w-full max-w-[16rem]",
            /* Yatayda zar panelden kopup ekranın tam ortasına, orta bandın
               üzerine sabitleniyor. `fixed` üstündeki katmandan bağımsız
               çalışıyor çünkü hiçbir atasında `transform` yok. Dokunuşları
               yutmasın diye tıklama geçirgen. */
            "short-landscape:pointer-events-none short-landscape:fixed short-landscape:left-1/2 short-landscape:top-1/2",
            "short-landscape:z-30 short-landscape:h-24 short-landscape:w-36 short-landscape:max-w-none",
            "short-landscape:-translate-x-1/2 short-landscape:-translate-y-1/2",
          )}
        />
      ) : null}

      {error ? (
        <p className="mb-3 rounded-btn bg-bad/10 px-3.5 py-2 text-[0.82rem] text-bad">{error}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {mustEndTurn ? (
          <Button
            size="sm"
            onClick={() => run(() => endTavlaTurn(matchId))}
            disabled={busy}
            className={compactButton}
          >
            <SkipForward className="size-4" strokeWidth={2} aria-hidden />
            {outOfMoves ? "Pas geç" : "Sırayı devret"}
          </Button>
        ) : null}

        {myTurn && state.turnMoves.length > 0 && state.winner === null ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => run(() => undoTavlaTurn(matchId))}
            disabled={busy}
            className={compactButton}
          >
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

  // Yatayda şeritler tahtanın üstüne biniyor: dar, yuvarlak ve yarı saydam.
  const barCompact = cn(
    "short-landscape:gap-2 short-landscape:rounded-xl short-landscape:px-2 short-landscape:py-1.5",
    "short-landscape:border-white/40 short-landscape:bg-white/88 short-landscape:backdrop-blur-sm",
  );

  return (
    <div
      className={cn(
        "tavla-tam-ekran mx-auto w-full max-w-3xl",
        // Masaüstünde tahta solda, zar/süre/geri al sağda.
        "lg:grid lg:max-w-6xl lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-5",
        /* Yan çevrilen telefon: sayfa kabuğunun üstüne sabit bir katman açılıyor
           ve tahta ekranın verdiği en büyük ölçüye çıkıyor. Şeritler yerleşimden
           yer ALMIYOR — tahtanın yanındaki boşluğa mutlak konumla oturuyorlar.
           Önceki ızgara düzeninde önce şeritlere yer ayrılıyor, tahtaya kalan
           veriliyordu; tahtanın küçük kalmasının sebebi buydu.
           Dikeydeki sıra bozulmasın diye sarmalayıcı `contents` oluyor. */
        "short-landscape:fixed short-landscape:inset-0 short-landscape:z-40 short-landscape:m-0 short-landscape:p-0",
        "short-landscape:flex short-landscape:max-w-none short-landscape:items-center short-landscape:justify-center",
        "short-landscape:overflow-hidden short-landscape:bg-[#2b2620]",
      )}
    >
      <RotateHint />

      <div className="lg:col-start-1 short-landscape:contents">
        <div className="short-landscape:absolute short-landscape:left-1 short-landscape:top-1 short-landscape:z-10 short-landscape:w-[7rem]">
          <PlayerBar
            person={{ name: seatName(topSeat), accent: "#0a0a0a" }}
            pip={pipCount(state, topSeat)}
            active={state.turn === topSeat && state.winner === null}
            online={mode === "ONLINE" && !guestMode ? (online[seats[topSeat]] ?? false) : true}
            showOnline={mode === "ONLINE" && !guestMode && seats[topSeat] !== me}
            checkerColor={topSeat === 0 ? "light" : "dark"}
            off={state.off[topSeat]}
            className={barCompact}
          />
        </div>

        {/* Yatayda tek akıştaki öğe tahta; ortalanıyor ve ekranı boydan boya
            kaplıyor. Genişlik iki sınırın küçüğü: tam yükseklikteki tahtanın
            genişliği (yükseklik × en-boy) ya da şeritlere pay bırakan ekran
            genişliği. Modern telefonda (2:1 ve daha uzun ekran) ilki kazanıyor,
            yani tahta tam yükseklikte. */}
        <div
          className={cn(
            "my-3",
            "short-landscape:my-0 short-landscape:shrink-0",
            "short-landscape:[width:min(calc(100vw-12rem),calc(100svh*1.45))]",
          )}
        >
          <TavlaBoard
            state={state}
            me={perspective}
            selected={selected}
            targets={targets}
            sources={sources}
            orientation={orientation}
            flight={flight}
            onSelect={setSelected}
            onMoveTo={handleMoveTo}
            disabled={busy || state.winner !== null}
          />
        </div>

        <div className="short-landscape:absolute short-landscape:bottom-1 short-landscape:left-1 short-landscape:z-10 short-landscape:w-[7rem]">
          <PlayerBar
            person={{ name: seatName(perspective), accent: "#0a0a0a" }}
            pip={pipCount(state, perspective)}
            active={state.turn === perspective && state.winner === null}
            online
            showOnline={false}
            checkerColor={perspective === 0 ? "light" : "dark"}
            off={state.off[perspective]}
            className={barCompact}
          />
        </div>
      </div>

      {/* Tam ekran katman başlık çubuğunu örtüyor; çıkış yolu burada. Sol
          kenarın ortası, tahtanın iki yarısı arasındaki boşluğa denk geliyor. */}
      <div className="hidden short-landscape:absolute short-landscape:left-1 short-landscape:top-1/2 short-landscape:z-10 short-landscape:flex short-landscape:-translate-y-1/2">
        <Link
          href="/oyunlar/tavla"
          className="flex items-center gap-1.5 rounded-btn border border-white/40 bg-white/88 px-2.5 py-1.5 text-[0.78rem] text-ink-soft backdrop-blur-sm transition-colors hover:border-ink hover:text-ink"
        >
          <ArrowLeft className="size-3.5" strokeWidth={1.9} aria-hidden />
          Çık
        </Link>
      </div>

      <div
        className={cn(
          "mt-4 lg:col-start-2 lg:row-start-1 lg:mt-0",
          "short-landscape:absolute short-landscape:right-1 short-landscape:top-1 short-landscape:z-10 short-landscape:mt-0",
          "short-landscape:w-[8.75rem] short-landscape:max-h-[calc(100svh-0.5rem)] short-landscape:overflow-y-auto",
        )}
      >
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

/**
 * Sayaç kendi kendine işliyor.
 *
 * Eskiden saniye üst bileşende tutuluyordu ve saniyede iki kez bütün tahtayı
 * (24 hane, kırk küsur pul, zar sahnesi) yeniden çizdiriyordu — telefonda
 * hissedilen takılmanın kaynaklarından biri buydu. Şimdi yalnızca bu küçük
 * kutu yeniden çiziliyor.
 *
 * İlk kare sunucuyla aynı olsun diye yer tutucu çiziliyor; gerçek değer
 * `useEffect` ile geliyor (bkz. CLAUDE.md — hidrasyon).
 */
function TurnTimer({ startedAt, total }: { startedAt: number; total: number }) {
  const [seconds, setSeconds] = useState<number | null>(null);

  useEffect(() => {
    const tick = () =>
      setSeconds(Math.max(0, total - Math.floor((Date.now() - startedAt) / 1000)));
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [startedAt, total]);

  const shown = seconds ?? total;
  const pct = Math.max(0, Math.min(100, (shown / total) * 100));
  return (
    <div className="shrink-0 text-right">
      <p className="font-display text-[1.35rem] font-bold leading-none tabular-nums text-ink">
        {Math.floor(shown / 60)}:{String(shown % 60).padStart(2, "0")}
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
