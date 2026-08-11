"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { BAR, OFF, type Player, type Reach, type TavlaState } from "@/games/tavla/types";
import { cn } from "@/lib/utils";

/** Tahta yönü: hangi tarafa toplanacağı ve hangi yarının altta olduğu. */
export type Orientation = {
  /** Sağ/sol aynalama — toplama tepsisi hangi kenarda. */
  flipX: boolean;
  /** Üst/alt çevirme. */
  flipY: boolean;
  toggleX: () => void;
  toggleY: () => void;
};

const ORIENTATION_KEY = "tavla-yon";

/**
 * Tahta yönü tercihi.
 *
 * Tarayıcıda saklanıyor (veritabanında değil): tercih cihaza bağlı — aynı
 * kişi telefonu ve bilgisayarı farklı tutabiliyor — ve misafir oturumunda da
 * çalışması gerekiyor. İlk karede varsayılan çiziliyor, tercih `useEffect`
 * ile geliyor; sunucu tarafında localStorage olmadığı için hidrasyon
 * uyuşmazlığı böyle engelleniyor.
 */
export function useBoardOrientation(): Orientation {
  const [flipX, setFlipX] = useState(false);
  const [flipY, setFlipY] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(ORIENTATION_KEY) ?? "{}");
      setFlipX(Boolean(saved.flipX));
      setFlipY(Boolean(saved.flipY));
    } catch {
      // Bozuk kayıt: varsayılanla devam.
    }
  }, []);

  const save = useCallback((next: { flipX: boolean; flipY: boolean }) => {
    localStorage.setItem(ORIENTATION_KEY, JSON.stringify(next));
  }, []);

  const toggleX = useCallback(() => {
    setFlipX((current) => {
      const next = !current;
      setFlipY((y) => {
        save({ flipX: next, flipY: y });
        return y;
      });
      return next;
    });
  }, [save]);

  const toggleY = useCallback(() => {
    setFlipY((current) => {
      const next = !current;
      setFlipX((x) => {
        save({ flipX: x, flipY: next });
        return x;
      });
      return next;
    });
  }, [save]);

  return { flipX, flipY, toggleX, toggleY };
}

/**
 * Tavla tahtası — ahşap/nötr palet, mor yalnızca seçim vurgusunda.
 *
 * ### Ölçüler
 * Her şey tahta kutusunun yüzdesi; kutunun en-boy oranı sabit (1.45). Tahta
 * telefondan masaüstüne tek kodla ölçekleniyor.
 *
 * İKİ AYRI KOORDİNAT SİSTEMİ VAR:
 *   *_BOARD sabitleri tahta kutusunun yüzdesi (sütun konumları).
 *   *_LOCAL sabitleri hane sütununun kendi yüzdesi (pul yerleşimi) — pullar
 *   sütunun içinde konumlandığı için CSS yüzdeleri sütuna göre çözülüyor.
 *
 * ### Etkileşim
 * İki yol birden çalışıyor:
 *   1. Dokun-dokun: kaynağa dokun → hedefe dokun.
 *   2. Sürükle-bırak: pulu tut, hedefe bırak. Pointer olaylarıyla; sürükleme
 *      sırasında hayalet pul imleci izliyor (doğrudan DOM, render yok) ve
 *      `touch-action: none` sayfa kaydırmasını bastırıyor.
 * Bırakma hedefi `document.elementFromPoint` ile bulunuyor — hedef büyütmesi
 * yok, çünkü sütunların tamamı zaten dokunma hedefi.
 */

const ASPECT = 1.45;

const FRAME = 2;
const POINT_W = 6.53;
const BAR_W = POINT_W * 1.3;
const TRAY_W = POINT_W * 1.4;
const HALF_H = 47.5;

const CHECKER_W_BOARD = POINT_W * 0.92;
const CHECKER_H_BOARD = CHECKER_W_BOARD * ASPECT;

const CHECKER_W_LOCAL = 92;
const CHECKER_H_LOCAL = (CHECKER_H_BOARD / HALF_H) * 100;
const CHECKER_W_BAR_LOCAL = (CHECKER_W_BOARD / BAR_W) * 100;

const QUADRANT_B_X = FRAME + 6 * POINT_W + BAR_W;
const TRAY_X = FRAME + 12 * POINT_W + BAR_W;
const BAR_X = FRAME + 6 * POINT_W;

/** Sürükleme sayılması için gereken piksel — altı dokunma kabul edilir. */
const DRAG_THRESHOLD = 8;

type Slot = { index: number; x: number; top: boolean };

/** Varsayılan yerleşim: 13–18 üst sol, 19–24 üst sağ, 12–7 alt sol, 6–1 alt sağ. */
const BASE_SLOTS: Slot[] = [
  ...[12, 13, 14, 15, 16, 17].map((index, i) => ({ index, x: FRAME + i * POINT_W, top: true })),
  ...[18, 19, 20, 21, 22, 23].map((index, i) => ({
    index,
    x: QUADRANT_B_X + i * POINT_W,
    top: true,
  })),
  ...[11, 10, 9, 8, 7, 6].map((index, i) => ({ index, x: FRAME + i * POINT_W, top: false })),
  ...[5, 4, 3, 2, 1, 0].map((index, i) => ({ index, x: QUADRANT_B_X + i * POINT_W, top: false })),
];

/**
 * Yön uygulanmış düzen.
 *
 * Aynalama CSS `transform: scaleX(-1)` ile yapılmıyor — o, pulların üstündeki
 * sayı rozetini ve koordinatları da ters çevirirdi. Onun yerine hane
 * konumları yeniden hesaplanıyor; toplama tepsisi ile bar da onlarla birlikte
 * yer değiştiriyor.
 */
function layoutFor(orientation: { flipX: boolean; flipY: boolean }) {
  const mirror = (x: number, width: number) => 100 - x - width;

  const slots = BASE_SLOTS.map((slot) => ({
    index: slot.index,
    x: orientation.flipX ? mirror(slot.x, POINT_W) : slot.x,
    top: orientation.flipY ? !slot.top : slot.top,
  }));

  return {
    slots,
    barX: orientation.flipX ? mirror(BAR_X, BAR_W) : BAR_X,
    trayX: orientation.flipX ? mirror(TRAY_X, TRAY_W) : TRAY_X,
  };
}

export type BoardProps = {
  state: TavlaState;
  me: Player;
  selected: number | null;
  /** Zincirlenmiş hedefler dahil. */
  targets: Reach[];
  sources: number[];
  orientation: { flipX: boolean; flipY: boolean };
  onSelect: (index: number) => void;
  onMoveTo: (to: number) => void;
  disabled?: boolean;
};

export function TavlaBoard({
  state,
  me,
  selected,
  targets,
  sources,
  orientation,
  onSelect,
  onMoveTo,
  disabled,
}: BoardProps) {
  const layout = useMemo(() => layoutFor(orientation), [orientation]);
  const targetSet = useMemo(() => new Set(targets.map((m) => m.to)), [targets]);
  const sourceSet = useMemo(() => new Set(sources), [sources]);

  const boardRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    from: number;
    startX: number;
    startY: number;
    moved: boolean;
    player: Player;
  } | null>(null);

  // Callback'ler pointer dinleyicilerinde ref üzerinden okunur; her render'da
  // dinleyici söküp takmamak için.
  const live = useRef({ selected, targetSet, sourceSet, onSelect, onMoveTo, disabled });
  live.current = { selected, targetSet, sourceSet, onSelect, onMoveTo, disabled };

  useEffect(() => {
    const board = boardRef.current;
    const ghost = ghostRef.current;
    if (!board || !ghost) return;

    const pointIndexAt = (clientX: number, clientY: number): number | null => {
      const el = document
        .elementFromPoint(clientX, clientY)
        ?.closest<HTMLElement>("[data-point]");
      if (!el || !board.contains(el)) return null;
      return Number(el.dataset.point);
    };

    const moveGhost = (clientX: number, clientY: number) => {
      const rect = board.getBoundingClientRect();
      ghost.style.transform = `translate3d(${clientX - rect.left}px, ${clientY - rect.top}px, 0) translate(-50%, -50%)`;
    };

    const onPointerDown = (e: PointerEvent) => {
      const { selected, targetSet, sourceSet, onMoveTo, onSelect, disabled } = live.current;
      if (disabled || e.button > 0) return;

      const index = pointIndexAt(e.clientX, e.clientY);
      if (index === null) return;

      // Seçili taş varsa ve buraya gidilebiliyorsa dokunuş hamledir.
      if (selected !== null && targetSet.has(index)) {
        onMoveTo(index);
        return;
      }
      if (!sourceSet.has(index)) return;

      // Kaynağa dokunuldu: hem seç hem olası sürüklemeyi başlat.
      onSelect(index);
      drag.current = {
        from: index,
        startX: e.clientX,
        startY: e.clientY,
        moved: false,
        player: state.turn,
      };
      board.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;

      if (!d.moved) {
        const dx = e.clientX - d.startX;
        const dy = e.clientY - d.startY;
        if (dx * dx + dy * dy < DRAG_THRESHOLD * DRAG_THRESHOLD) return;
        d.moved = true;
        ghost.style.background =
          d.player === 0
            ? "radial-gradient(circle at 35% 30%, #FFFFFF 0%, #F1EDE3 45%, #DDD5C4 100%)"
            : "radial-gradient(circle at 35% 30%, #575046 0%, #35302A 45%, #1D1915 100%)";
        ghost.style.border = d.player === 0 ? "1px solid #A89F8F" : "1px solid rgba(0,0,0,0.75)";
        ghost.style.opacity = "1";
      }
      moveGhost(e.clientX, e.clientY);
    };

    const onPointerUp = (e: PointerEvent) => {
      const d = drag.current;
      drag.current = null;
      ghost.style.opacity = "0";
      if (!d) return;

      // Sürüklenmediyse dokunmaydı: seçim zaten yapıldı, hedef bekleniyor.
      if (!d.moved) return;

      const { targetSet, onMoveTo, onSelect } = live.current;
      const index = pointIndexAt(e.clientX, e.clientY);
      if (index !== null && targetSet.has(index)) {
        onMoveTo(index);
      } else {
        // Boşa bırakıldı: seçimi koru — dokunarak da bitirebilir.
        onSelect(d.from);
      }
    };

    board.addEventListener("pointerdown", onPointerDown);
    board.addEventListener("pointermove", onPointerMove);
    board.addEventListener("pointerup", onPointerUp);
    board.addEventListener("pointercancel", onPointerUp);
    return () => {
      board.removeEventListener("pointerdown", onPointerDown);
      board.removeEventListener("pointermove", onPointerMove);
      board.removeEventListener("pointerup", onPointerUp);
      board.removeEventListener("pointercancel", onPointerUp);
    };
  }, [state.turn]);

  return (
    <div
      ref={boardRef}
      className="relative w-full select-none overflow-hidden rounded-card border-[3px] border-[#2b2620] shadow-lift [touch-action:none]"
      style={{
        aspectRatio: String(ASPECT),
        background: "linear-gradient(165deg, #FAF7F1 0%, #F1EDE4 60%, #EAE4D8 100%)",
      }}
    >
      {/* Orta bar */}
      <div
        className="absolute top-0 h-full border-x border-[#2b2620]/25 bg-[#2b2620]/10"
        style={{ left: `${layout.barX}%`, width: `${BAR_W}%` }}
      />
      {/* Toplama tepsisi */}
      <div
        className="absolute top-0 h-full border-l border-[#2b2620]/25 bg-[#2b2620]/5"
        style={{ left: `${layout.trayX}%`, width: `${TRAY_W}%` }}
      />

      {layout.slots.map((slot) => (
        <PointColumn
          key={slot.index}
          slot={slot}
          count={state.points[slot.index]}
          isSelected={selected === slot.index}
          isSource={sourceSet.has(slot.index)}
          isTarget={targetSet.has(slot.index)}
        />
      ))}

      <BarStack
        state={state}
        me={me}
        x={layout.barX}
        isSource={sourceSet.has(BAR)}
        isSelected={selected === BAR}
      />
      <OffTray state={state} x={layout.trayX} isTarget={targetSet.has(OFF)} />

      {/* Sürükleme hayaleti — doğrudan DOM'dan sürülür, render tetiklemez.
          Rengi sürükleme başlarken JS veriyor. */}
      <div
        ref={ghostRef}
        aria-hidden
        className="gpu pointer-events-none absolute left-0 top-0 z-30 rounded-full opacity-0 shadow-lift"
        style={{ width: `${CHECKER_W_BOARD}%`, aspectRatio: "1" }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function PointColumn({
  slot,
  count,
  isSelected,
  isSource,
  isTarget,
}: {
  slot: Slot;
  count: number;
  isSelected: boolean;
  isSource: boolean;
  isTarget: boolean;
}) {
  const owner: Player | null = count > 0 ? 0 : count < 0 ? 1 : null;
  const total = Math.abs(count);
  const dark = slot.index % 2 === 0;
  const visible = Math.min(total, 5);

  // Hedef halkası mevcut yığının ÜSTÜNE çizilir — "taşın nereye oturacağı"
  // görünsün. Eskiden hep sütun ucundaydı ve dolu sütunlarda pulların
  // altında kalıyordu.
  const ringOffset = visible * CHECKER_H_LOCAL + 1;

  return (
    <div
      data-point={slot.index}
      role="button"
      aria-label={`${slot.index + 1}. hane, ${total} pul`}
      aria-disabled={!isSource && !isTarget}
      className={cn("absolute", (isSource || isTarget) && "cursor-pointer")}
      style={{
        left: `${slot.x}%`,
        width: `${POINT_W}%`,
        top: slot.top ? `${FRAME}%` : undefined,
        bottom: slot.top ? undefined : `${FRAME}%`,
        height: `${HALF_H}%`,
      }}
    >
      {/* Üçgen */}
      <span
        aria-hidden
        className="absolute inset-0"
        style={{
          clipPath: slot.top
            ? "polygon(50% 100%, 0 0, 100% 0)"
            : "polygon(50% 0, 0 100%, 100% 100%)",
          background: dark
            ? "linear-gradient(to bottom, #55493B, #6B5D4B)"
            : "linear-gradient(to bottom, #D9D0C0, #CBC0AC)",
          opacity: 0.95,
        }}
      />

      {/* Oynanabilir kaynak ipucu: sütun dibinde ince mor çizgi */}
      {isSource && !isSelected ? (
        <span
          aria-hidden
          className="absolute left-1/2 h-[3px] w-3/5 -translate-x-1/2 rounded-full bg-brand-500/80"
          style={{ [slot.top ? "top" : "bottom"]: "1%" }}
        />
      ) : null}

      {/* Hedef göstergesi: yığının üstünde yeşil hayalet halka */}
      {isTarget ? (
        <span
          aria-hidden
          className="absolute left-1/2 -translate-x-1/2 rounded-full border-2 border-dashed border-good/80 bg-good/15"
          style={{
            width: `${CHECKER_W_LOCAL * 0.9}%`,
            aspectRatio: "1",
            [slot.top ? "top" : "bottom"]: `${Math.min(ringOffset, 100 - CHECKER_H_LOCAL)}%`,
          }}
        />
      ) : null}

      {Array.from({ length: visible }, (_, i) => {
        const step = total <= 5 ? CHECKER_H_LOCAL : (100 - CHECKER_H_LOCAL) / (total - 1);
        return (
          <Checker
            key={i}
            player={owner!}
            highlighted={isSelected && i === visible - 1}
            widthPct={CHECKER_W_LOCAL}
            style={{ [slot.top ? "top" : "bottom"]: `${i * step}%`, left: "50%" }}
          />
        );
      })}

      {total > 5 ? (
        <span
          className="absolute left-1/2 z-10 -translate-x-1/2 rounded-full bg-[#2b2620] px-1.5 text-[0.6rem] font-bold leading-4 text-white"
          style={{ [slot.top ? "top" : "bottom"]: `${4 * CHECKER_H_LOCAL + 2}%` }}
        >
          {total}
        </span>
      ) : null}
    </div>
  );
}

/**
 * Pul: hafif üç boyut hissi veren radyal degrade + kenar çizgisi.
 * Açık pul koyu kenarıyla açık zeminde, koyu pul açık iç halkasıyla koyu
 * zeminde seçiliyor — "beyaz üstüne beyaz görünmüyor" derdi bu kenarlarla
 * çözülüyor.
 */
function Checker({
  player,
  highlighted,
  widthPct,
  style,
}: {
  player: Player;
  highlighted?: boolean;
  widthPct: number;
  style: React.CSSProperties;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "absolute -translate-x-1/2 rounded-full transition-[box-shadow,transform] duration-200",
        highlighted && "z-20 scale-110",
      )}
      style={{
        width: `${widthPct}%`,
        aspectRatio: "1",
        background:
          player === 0
            ? "radial-gradient(circle at 35% 30%, #FFFFFF 0%, #F1EDE3 45%, #DDD5C4 100%)"
            : "radial-gradient(circle at 35% 30%, #575046 0%, #35302A 45%, #1D1915 100%)",
        border: player === 0 ? "1px solid #A89F8F" : "1px solid rgba(0,0,0,0.75)",
        boxShadow: highlighted
          ? "0 0 0 3px rgb(139 92 246 / 0.85), 0 4px 10px -2px rgb(0 0 0 / 0.4)"
          : player === 0
            ? "inset 0 0 0 3px rgb(255 255 255 / 0.8), inset 0 0 0 4px rgb(168 159 143 / 0.6), 0 2px 4px -1px rgb(0 0 0 / 0.35)"
            : "inset 0 0 0 3px rgb(255 255 255 / 0.14), inset 0 0 0 4px rgb(0 0 0 / 0.4), 0 2px 4px -1px rgb(0 0 0 / 0.5)",
        ...style,
      }}
    />
  );
}

function BarStack({
  state,
  me,
  x,
  isSource,
  isSelected,
}: {
  state: TavlaState;
  me: Player;
  x: number;
  isSource: boolean;
  isSelected: boolean;
}) {
  return (
    <div
      data-point={BAR}
      role="button"
      aria-label={`Bar: beyaz ${state.bar[0]}, siyah ${state.bar[1]}`}
      aria-disabled={!isSource}
      className={cn(
        "absolute top-0 h-full",
        isSource && "cursor-pointer bg-brand-400/15",
      )}
      style={{ left: `${x}%`, width: `${BAR_W}%` }}
    >
      {Array.from({ length: Math.min(state.bar[0], 4) }, (_, i) => (
        <Checker
          key={`w${i}`}
          player={0}
          highlighted={isSelected && me === 0 && i === Math.min(state.bar[0], 4) - 1}
          widthPct={CHECKER_W_BAR_LOCAL}
          style={{ bottom: `${28 + i * CHECKER_H_BOARD * 0.75}%`, left: "50%" }}
        />
      ))}
      {Array.from({ length: Math.min(state.bar[1], 4) }, (_, i) => (
        <Checker
          key={`b${i}`}
          player={1}
          highlighted={isSelected && me === 1 && i === Math.min(state.bar[1], 4) - 1}
          widthPct={CHECKER_W_BAR_LOCAL}
          style={{ top: `${28 + i * CHECKER_H_BOARD * 0.75}%`, left: "50%" }}
        />
      ))}
    </div>
  );
}

function OffTray({ state, x, isTarget }: { state: TavlaState; x: number; isTarget: boolean }) {
  return (
    <div
      data-point={OFF}
      role="button"
      aria-label={`Toplananlar: beyaz ${state.off[0]}, siyah ${state.off[1]}`}
      aria-disabled={!isTarget}
      className={cn(
        "absolute top-0 h-full transition-colors",
        isTarget && "cursor-pointer bg-good/15 ring-2 ring-inset ring-good/70",
      )}
      style={{ left: `${x}%`, width: `${TRAY_W}%` }}
    >
      {Array.from({ length: state.off[1] }, (_, i) => (
        <span
          key={`b${i}`}
          className="absolute left-1/2 h-[1.6%] w-[70%] -translate-x-1/2 rounded-full border border-black/60 bg-[#35302A]"
          style={{ top: `${FRAME + i * 2.6}%` }}
        />
      ))}
      {Array.from({ length: state.off[0] }, (_, i) => (
        <span
          key={`w${i}`}
          className="absolute left-1/2 h-[1.6%] w-[70%] -translate-x-1/2 rounded-full border border-[#A89F8F] bg-[#F5F1E8]"
          style={{ bottom: `${FRAME + i * 2.6}%` }}
        />
      ))}
    </div>
  );
}
