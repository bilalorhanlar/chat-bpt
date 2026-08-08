"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import { PHOTOS, photoSrc } from "@/data/photos";

/**
 * Tüm anılar.
 *
 * Küçük resimler ana sayfadaki 4:5 varyantı yeniden kullanıyor — zaten
 * üretilmiş ve tarayıcı önbelleğinde olma ihtimali yüksek. Büyütünce doğal
 * oranlı `full` varyantı yükleniyor.
 *
 * `<picture>` ile AVIF önce sunuluyor; desteklemeyen tarayıcı WebP'ye düşüyor.
 * Ana sayfadaki iz efekti bunu yapamıyor (kaynağı JS ile değiştiriyor), burada
 * yapabiliyoruz.
 */
export function Gallery() {
  const [active, setActive] = useState<number | null>(null);

  const step = useCallback((delta: number) => {
    setActive((current) => {
      if (current === null) return current;
      return (current + delta + PHOTOS.length) % PHOTOS.length;
    });
  }, []);

  useEffect(() => {
    if (active === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null);
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [active, step]);

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
        {PHOTOS.map((photo, index) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setActive(index)}
            className="group relative aspect-[4/5] overflow-hidden rounded-2xl border border-line bg-brand-50 shadow-soft transition-[transform,box-shadow] duration-300 ease-[var(--ease-out-soft)] hover:-translate-y-1 hover:shadow-lift"
            aria-label={`${index + 1}. anıyı aç`}
          >
            <picture>
              <source srcSet={photoSrc.trail(photo.id, "avif")} type="image/avif" />
              <img
                src={photoSrc.trail(photo.id, "webp")}
                alt=""
                loading="lazy"
                decoding="async"
                className="size-full object-cover transition-transform duration-500 ease-[var(--ease-out-soft)] group-hover:scale-105"
              />
            </picture>
          </button>
        ))}
      </div>

      {active !== null ? (
        <Lightbox index={active} onClose={() => setActive(null)} onStep={step} />
      ) : null}
    </>
  );
}

function Lightbox({
  index,
  onClose,
  onStep,
}: {
  index: number;
  onClose: () => void;
  onStep: (delta: number) => void;
}) {
  const photo = PHOTOS[index];
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  // Komşu kareleri önden çek: ok tuşuna basınca beklemesin.
  useEffect(() => {
    for (const delta of [1, -1]) {
      const neighbour = PHOTOS[(index + delta + PHOTOS.length) % PHOTOS.length];
      const probe = new Image();
      probe.src = photoSrc.full(neighbour.id, "webp");
    }
  }, [index]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-900/55 backdrop-blur-md"
      onClick={onClose}
      onTouchStart={(e) => {
        const t = e.touches[0];
        touchStart.current = { x: t.clientX, y: t.clientY };
      }}
      onTouchEnd={(e) => {
        const start = touchStart.current;
        if (!start) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - start.x;
        const dy = t.clientY - start.y;
        // Yatay hareket dikeyden belirgin şekilde büyükse kaydırma sayılır.
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) onStep(dx < 0 ? 1 : -1);
        touchStart.current = null;
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Kapat"
        className="absolute right-4 top-4 z-10 grid size-11 place-items-center rounded-full bg-white/90 text-ink shadow-lift transition-transform hover:scale-105"
      >
        <X className="size-5" strokeWidth={1.8} aria-hidden />
      </button>

      <NavButton side="left" onClick={() => onStep(-1)} />
      <NavButton side="right" onClick={() => onStep(1)} />

      <figure
        onClick={(e) => e.stopPropagation()}
        className="animate-[rise-in_.25s_var(--ease-out-soft)] px-4"
      >
        <picture>
          <source srcSet={photoSrc.full(photo.id, "avif")} type="image/avif" />
          <img
            src={photoSrc.full(photo.id, "webp")}
            alt=""
            width={photo.w}
            height={photo.h}
            className="max-h-[82svh] w-auto rounded-2xl object-contain shadow-lift"
          />
        </picture>
        <figcaption className="mt-3 text-center text-[0.78rem] tabular-nums text-white/80">
          {index + 1} / {PHOTOS.length}
        </figcaption>
      </figure>
    </div>
  );
}

function NavButton({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={side === "left" ? "Önceki" : "Sonraki"}
      className={`absolute top-1/2 z-10 hidden size-12 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-ink shadow-lift transition-transform hover:scale-105 sm:grid ${
        side === "left" ? "left-5" : "right-5"
      }`}
    >
      <Icon className="size-6" strokeWidth={1.7} aria-hidden />
    </button>
  );
}
