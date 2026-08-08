"use client";

import { useMemo } from "react";

import { BAR, OFF, type Move, type Player, type TavlaState } from "@/games/tavla/types";
import { cn } from "@/lib/utils";

/**
 * Tavla tahtası.
 *
 * ### Ölçüler
 * Her şey tahta kutusunun yüzdesi olarak hesaplanıyor ve kutunun en-boy oranı
 * sabit (1.45). Böylece tahta 320 px'lik telefondan 900 px'lik masaüstüne
 * kadar tek bir kodla ölçekleniyor; ayrı mobil düzen yok.
 *
 * Oran şuradan geliyor: bir yarım sütuna üst üste 5 pul sığmalı.
 * Pul çapı genişliğin %6'sı → yükseklikte %6 × oran. 5 × 6 × 1.45 = %43.5,
 * kullanılabilir yarım sütun ise %47.5. Sığıyor.
 *
 * ### Etkileşim
 * Sürükle-bırak yok: dokunmatikte sürükleme sayfa kaydırmasıyla çakışıyor ve
 * 25 px'lik bir pulu parmakla sürüklemek zor. Onun yerine "kaynağa dokun →
 * hedefe dokun". Dokunma alanı pul değil, **tüm hane sütunu** — yani 25×130 px
 * gibi rahat bir hedef.
 */

/*
 * İKİ AYRI KOORDİNAT SİSTEMİ VAR — karıştırmak kolay:
 *
 *   "board" ile biten sabitler tahta kutusunun yüzdesi. Hane sütunlarının
 *   konumu ve genişliği bunlarla veriliyor.
 *
 *   "local" ile biten sabitler **hane sütununun kendi** yüzdesi. Pullar
 *   sütunun içinde konumlandığı için CSS yüzdeleri sütuna göre çözülüyor;
 *   buraya tahta yüzdesi yazmak pulları görünmez derecede küçültüyor.
 */
const ASPECT = 1.45; // tahta en/boy

const FRAME = 2; // çerçeve payı (% tahta genişliği)
const POINT_W = 6.53; // hane genişliği (% tahta genişliği)
const BAR_W = POINT_W * 1.3;
const TRAY_W = POINT_W * 1.4;
const HALF_H = 47.5; // yarım sütun yüksekliği (% tahta yüksekliği)

const CHECKER_W_BOARD = POINT_W * 0.92; // pul çapı (% tahta genişliği)
const CHECKER_H_BOARD = CHECKER_W_BOARD * ASPECT; // aynı çap (% tahta yüksekliği)

/** Pul çapı, hane sütununun genişliğinin yüzdesi olarak. */
const CHECKER_W_LOCAL = 92;
/** Pul çapı, hane sütununun yüksekliğinin yüzdesi olarak. */
const CHECKER_H_LOCAL = (CHECKER_H_BOARD / HALF_H) * 100;
/** Bar tam yükseklikte olduğu için oradaki dikey birim tahta yüzdesiyle aynı. */
const CHECKER_W_BAR_LOCAL = (CHECKER_W_BOARD / BAR_W) * 100;

const QUADRANT_B_X = FRAME + 6 * POINT_W + BAR_W;
const TRAY_X = FRAME + 12 * POINT_W + BAR_W;
const BAR_X = FRAME + 6 * POINT_W;

type Slot = { index: number; x: number; top: boolean };

/**
 * Ekrandaki yerleşim: 13–18 üst sol, 19–24 üst sağ, 12–7 alt sol, 6–1 alt sağ.
 * (Dizin = hane numarası − 1.)
 */
const SLOTS: Slot[] = [
  ...[12, 13, 14, 15, 16, 17].map((index, i) => ({ index, x: FRAME + i * POINT_W, top: true })),
  ...[18, 19, 20, 21, 22, 23].map((index, i) => ({
    index,
    x: QUADRANT_B_X + i * POINT_W,
    top: true,
  })),
  ...[11, 10, 9, 8, 7, 6].map((index, i) => ({ index, x: FRAME + i * POINT_W, top: false })),
  ...[5, 4, 3, 2, 1, 0].map((index, i) => ({ index, x: QUADRANT_B_X + i * POINT_W, top: false })),
];

export type BoardProps = {
  state: TavlaState;
  /** Bu tarayıcının oyuncusu; kendi pulları vurgulanır. */
  me: Player;
  /** Seçili kaynak hane (yoksa null). */
  selected: number | null;
  /** Seçili kaynaktan gidilebilecek hedefler. */
  targets: Move[];
  /** Şu an hamle yapılabilen kaynak haneler. */
  sources: number[];
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
  onSelect,
  onMoveTo,
  disabled,
}: BoardProps) {
  const targetSet = useMemo(() => new Set(targets.map((m) => m.to)), [targets]);
  const sourceSet = useMemo(() => new Set(sources), [sources]);

  const handleClick = (index: number) => {
    if (disabled) return;
    if (selected !== null && targetSet.has(index)) return onMoveTo(index);
    if (sourceSet.has(index)) return onSelect(index);
  };

  return (
    <div
      className="relative w-full select-none overflow-hidden rounded-card border border-line shadow-lift"
      style={{
        aspectRatio: String(ASPECT),
        background: "linear-gradient(160deg, #FBFAFF 0%, #F5F3FF 50%, #EFEBFE 100%)",
      }}
    >
      {/* Orta bar */}
      <div
        className="absolute top-0 h-full border-x border-line bg-white/70"
        style={{ left: `${BAR_X}%`, width: `${BAR_W}%` }}
      />
      {/* Toplama tepsisi */}
      <div
        className="absolute top-0 h-full border-l border-line bg-white/50"
        style={{ left: `${TRAY_X}%`, width: `${TRAY_W}%` }}
      />

      {SLOTS.map((slot) => (
        <PointColumn
          key={slot.index}
          slot={slot}
          count={state.points[slot.index]}
          me={me}
          isSelected={selected === slot.index}
          isSource={sourceSet.has(slot.index)}
          isTarget={targetSet.has(slot.index)}
          onClick={() => handleClick(slot.index)}
        />
      ))}

      <BarStack
        state={state}
        me={me}
        isSource={sourceSet.has(BAR)}
        isSelected={selected === BAR}
        onClick={() => handleClick(BAR)}
      />

      <OffTray
        state={state}
        me={me}
        isTarget={targetSet.has(OFF)}
        onClick={() => handleClick(OFF)}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function PointColumn({
  slot,
  count,
  me,
  isSelected,
  isSource,
  isTarget,
  onClick,
}: {
  slot: Slot;
  count: number;
  me: Player;
  isSelected: boolean;
  isSource: boolean;
  isTarget: boolean;
  onClick: () => void;
}) {
  const owner: Player | null = count > 0 ? 0 : count < 0 ? 1 : null;
  const total = Math.abs(count);
  const dark = slot.index % 2 === 0;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!isSource && !isTarget}
      aria-label={`${slot.index + 1}. hane, ${total} pul`}
      className="absolute disabled:cursor-default"
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
        className="absolute inset-0 transition-opacity duration-200"
        style={{
          clipPath: slot.top
            ? "polygon(50% 100%, 0 0, 100% 0)"
            : "polygon(50% 0, 0 100%, 100% 100%)",
          background: dark
            ? "linear-gradient(to bottom, #DDD6FE, #C4B5FD)"
            : "linear-gradient(to bottom, #FFFFFF, #EDE9FE)",
          opacity: slot.top ? 1 : 0.92,
        }}
      />

      {/* Geçerli hedef halkası */}
      {isTarget ? (
        <span
          aria-hidden
          className="absolute left-1/2 -translate-x-1/2 rounded-full ring-2 ring-good/70"
          style={{
            width: `${CHECKER_W_LOCAL * 0.86}%`,
            aspectRatio: "1",
            [slot.top ? "top" : "bottom"]: "2%",
            background: "rgb(22 163 74 / 0.14)",
          }}
        />
      ) : null}

      {Array.from({ length: Math.min(total, 5) }, (_, i) => {
        // 5'ten fazlaysa üst üste bindir; taşma olmasın.
        const step =
          total <= 5 ? CHECKER_H_LOCAL : (100 - CHECKER_H_LOCAL) / (total - 1);
        const offset = i * step;
        return (
          <Checker
            key={i}
            player={owner!}
            me={me}
            highlighted={isSelected && i === Math.min(total, 5) - 1}
            widthPct={CHECKER_W_LOCAL}
            style={{
              [slot.top ? "top" : "bottom"]: `${offset}%`,
              left: "50%",
            }}
          />
        );
      })}

      {total > 5 ? (
        <span
          className="absolute left-1/2 -translate-x-1/2 rounded-full bg-ink px-1.5 text-[0.6rem] font-semibold leading-4 text-white"
          style={{ [slot.top ? "top" : "bottom"]: `${4 * CHECKER_H_LOCAL + 2}%` }}
        >
          {total}
        </span>
      ) : null}
    </button>
  );
}

function Checker({
  player,
  me,
  highlighted,
  widthPct,
  style,
}: {
  player: Player;
  me: Player;
  highlighted?: boolean;
  /** Kapsayıcının genişliğinin yüzdesi — hane ile bar farklı genişlikte. */
  widthPct: number;
  style: React.CSSProperties;
}) {
  const mine = player === me;
  return (
    <span
      className={cn(
        "absolute -translate-x-1/2 rounded-full border transition-[box-shadow,transform] duration-200",
        player === 0
          ? "border-brand-700 bg-gradient-to-br from-brand-400 to-brand-600"
          : "border-line-strong bg-gradient-to-br from-white to-brand-100",
        highlighted && "z-10 scale-110 shadow-[0_0_0_3px_rgb(139_92_246/0.55)]",
      )}
      style={{ width: `${widthPct}%`, aspectRatio: "1", ...style }}
      data-mine={mine}
    />
  );
}

function BarStack({
  state,
  me,
  isSource,
  isSelected,
  onClick,
}: {
  state: TavlaState;
  me: Player;
  isSource: boolean;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!isSource}
      aria-label={`Bar: beyaz ${state.bar[0]}, siyah ${state.bar[1]}`}
      className={cn(
        "absolute top-0 h-full transition-colors disabled:cursor-default",
        isSource && "bg-brand-200/40",
      )}
      style={{ left: `${BAR_X}%`, width: `${BAR_W}%` }}
    >
      {Array.from({ length: Math.min(state.bar[0], 4) }, (_, i) => (
        <Checker
          key={`w${i}`}
          player={0}
          me={me}
          highlighted={isSelected && me === 0 && i === Math.min(state.bar[0], 4) - 1}
          widthPct={CHECKER_W_BAR_LOCAL}
          style={{ bottom: `${28 + i * CHECKER_H_BOARD * 0.75}%`, left: "50%" }}
        />
      ))}
      {Array.from({ length: Math.min(state.bar[1], 4) }, (_, i) => (
        <Checker
          key={`b${i}`}
          player={1}
          me={me}
          highlighted={isSelected && me === 1 && i === Math.min(state.bar[1], 4) - 1}
          widthPct={CHECKER_W_BAR_LOCAL}
          style={{ top: `${28 + i * CHECKER_H_BOARD * 0.75}%`, left: "50%" }}
        />
      ))}
    </button>
  );
}

function OffTray({
  state,
  me,
  isTarget,
  onClick,
}: {
  state: TavlaState;
  me: Player;
  isTarget: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!isTarget}
      aria-label={`Toplananlar: beyaz ${state.off[0]}, siyah ${state.off[1]}`}
      className={cn(
        "absolute top-0 h-full transition-colors disabled:cursor-default",
        isTarget && "bg-good/12 ring-2 ring-inset ring-good/60",
      )}
      style={{ left: `${TRAY_X}%`, width: `${TRAY_W}%` }}
    >
      {/* Toplanan pullar ince çubuklar olarak yığılır — 15 tane daire sığmaz. */}
      {Array.from({ length: state.off[1] }, (_, i) => (
        <span
          key={`b${i}`}
          className="absolute left-1/2 h-[1.6%] w-[70%] -translate-x-1/2 rounded-full border border-line-strong bg-white"
          style={{ top: `${FRAME + i * 2.6}%` }}
        />
      ))}
      {Array.from({ length: state.off[0] }, (_, i) => (
        <span
          key={`w${i}`}
          className="absolute left-1/2 h-[1.6%] w-[70%] -translate-x-1/2 rounded-full bg-brand-600"
          style={{ bottom: `${FRAME + i * 2.6}%` }}
        />
      ))}
    </button>
  );
}
