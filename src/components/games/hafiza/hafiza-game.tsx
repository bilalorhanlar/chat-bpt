"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, RotateCcw, Trophy } from "lucide-react";

import { saveHafizaScore } from "@/app/oyunlar/hafiza/actions";
import { Button } from "@/components/ui/button";
import { PHOTOS, photoSrc } from "@/data/photos";
import { playSound, unlockSounds } from "@/lib/sounds";
import { cn, shuffled } from "@/lib/utils";

/**
 * Fotoğraf eşleştirme.
 *
 * Tek kişilik ve tamamen tarayıcıda: her hamle için sunucuya gitmek hem
 * gereksiz hem de çevirme animasyonunu geciktirirdi. Yalnızca bitmiş süre
 * kaydediliyor.
 *
 * Kartlar CSS 3B çevirmesiyle dönüyor (`rotateY` + `backface-visibility`);
 * iki yüz de baştan DOM'da olduğu için çevirme anında görsel yükleme beklemesi
 * olmuyor.
 */

const PAIRS = 8;
/** Yanlış eşleşmede kartların açık kaldığı süre. */
const PEEK_MS = 850;

type Card = {
  id: number;
  photoId: number;
  flipped: boolean;
  matched: boolean;
};

function newDeck(): Card[] {
  const picks = shuffled(PHOTOS.map((p) => p.id)).slice(0, PAIRS);
  const cards = picks.flatMap((photoId, i) => [
    { id: i * 2, photoId, flipped: false, matched: false },
    { id: i * 2 + 1, photoId, flipped: false, matched: false },
  ]);
  return shuffled(cards);
}

export function HafizaGame({ bestMs }: { bestMs: number | null }) {
  const router = useRouter();
  const [cards, setCards] = useState<Card[]>(newDeck);
  const [open, setOpen] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [finishedMs, setFinishedMs] = useState<number | null>(null);
  const [isRecord, setIsRecord] = useState(false);
  const locked = useRef(false);
  const saved = useRef(false);

  const matchedCount = cards.filter((c) => c.matched).length;
  const done = matchedCount === cards.length;

  useEffect(() => {
    if (startedAt === null || done) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [startedAt, done]);

  const elapsed = finishedMs ?? (startedAt === null ? 0 : Math.max(0, now - startedAt));

  const flip = useCallback(
    (index: number) => {
      if (locked.current) return;
      const card = cards[index];
      if (card.flipped || card.matched) return;

      unlockSounds();
      if (startedAt === null) setStartedAt(Date.now());

      const nextOpen = [...open, index];
      setCards((list) => list.map((c, i) => (i === index ? { ...c, flipped: true } : c)));
      setOpen(nextOpen);

      if (nextOpen.length < 2) return;

      setMoves((m) => m + 1);
      const [a, b] = nextOpen;

      if (cards[a].photoId === cards[b].photoId) {
        playSound("satranc");
        setCards((list) =>
          list.map((c, i) => (i === a || i === b ? { ...c, matched: true, flipped: true } : c)),
        );
        setOpen([]);
        return;
      }

      // Eşleşmedi: kısa süre açık kalsın ki oyuncu görebilsin.
      locked.current = true;
      setTimeout(() => {
        setCards((list) =>
          list.map((c, i) => (i === a || i === b ? { ...c, flipped: false } : c)),
        );
        setOpen([]);
        locked.current = false;
      }, PEEK_MS);
    },
    [cards, open, startedAt],
  );

  // Oyun bitince süreyi dondur ve kaydet.
  useEffect(() => {
    if (!done || saved.current || startedAt === null) return;
    saved.current = true;
    const total = Date.now() - startedAt;
    setFinishedMs(total);
    playSound("win");
    void saveHafizaScore({ durationMs: total, moves, pairs: PAIRS }).then((result) => {
      if (result.ok) setIsRecord(result.best);
      router.refresh();
    });
  }, [done, startedAt, moves, router]);

  function restart() {
    setCards(newDeck());
    setOpen([]);
    setMoves(0);
    setStartedAt(null);
    setFinishedMs(null);
    setIsRecord(false);
    locked.current = false;
    saved.current = false;
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="mb-4 flex items-center gap-3 rounded-card border border-line bg-surface/85 px-5 py-3.5 shadow-soft backdrop-blur-sm">
        <Stat label="Süre" value={formatMs(elapsed)} />
        <Stat label="Hamle" value={String(moves)} />
        <Stat label="Eşleşen" value={`${matchedCount / 2}/${PAIRS}`} />
        {bestMs !== null ? <Stat label="Rekor" value={formatMs(bestMs)} accent /> : null}

        <Button variant="ghost" size="sm" className="ml-auto" onClick={restart}>
          <RotateCcw className="size-4" strokeWidth={1.8} aria-hidden />
          Yeniden
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {cards.map((card, index) => (
          <CardTile key={card.id} card={card} onClick={() => flip(index)} />
        ))}
      </div>

      {done ? (
        <div className="mt-5 rounded-card border border-brand-200 bg-gradient-to-br from-brand-50 via-surface to-accent-200/40 p-6 text-center shadow-lift">
          {isRecord ? (
            <Trophy className="mx-auto mb-2 size-7 text-accent-400" strokeWidth={1.4} aria-hidden />
          ) : (
            <Heart className="mx-auto mb-2 size-7 fill-accent-300 text-accent-400" aria-hidden />
          )}
          <h2 className="text-[1.5rem] leading-tight">
            {isRecord ? "Yeni rekor!" : "Hepsini buldun"}
          </h2>
          <p className="mt-1.5 text-[0.92rem] text-ink-soft">
            {formatMs(finishedMs ?? 0)} · {moves} hamle
          </p>
          <Button className="mt-5" size="lg" onClick={restart}>
            Bir daha
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-[0.65rem] uppercase tracking-[0.14em] text-ink-faint">{label}</p>
      <p
        className={cn(
          "font-display text-[1.1rem] leading-none tabular-nums",
          accent ? "text-accent-500" : "text-ink",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function CardTile({ card, onClick }: { card: Card; onClick: () => void }) {
  const faceUp = card.flipped || card.matched;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={faceUp}
      aria-label={faceUp ? "Açık kart" : "Kapalı kart"}
      className="relative aspect-[3/4] [perspective:900px] disabled:cursor-default"
    >
      <span
        className={cn(
          "absolute inset-0 transition-transform duration-500 ease-[var(--ease-out-soft)] [transform-style:preserve-3d]",
          faceUp && "[transform:rotateY(180deg)]",
        )}
      >
        {/* Arka yüz */}
        <span
          className={cn(
            "absolute inset-0 grid place-items-center rounded-xl border border-brand-200 [backface-visibility:hidden]",
            "bg-gradient-to-br from-brand-100 to-brand-200 shadow-soft",
          )}
        >
          <Heart className="size-6 fill-brand-400/60 text-brand-400/60" aria-hidden />
        </span>

        {/* Ön yüz */}
        <span
          className={cn(
            "absolute inset-0 overflow-hidden rounded-xl border [backface-visibility:hidden] [transform:rotateY(180deg)]",
            card.matched ? "border-good/60 shadow-glow" : "border-line",
          )}
        >
          <img
            src={photoSrc.trail(card.photoId, "webp")}
            alt=""
            loading="eager"
            decoding="async"
            className="size-full object-cover"
          />
        </span>
      </span>
    </button>
  );
}

function formatMs(ms: number): string {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
