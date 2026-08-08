"use client";

import { useMemo } from "react";
import { Chess, type Square } from "chess.js";

import { ChessPiece, type PieceType } from "@/components/games/satranc/pieces";
import { cn } from "@/lib/utils";

/**
 * Satranç tahtası — lichess düzeni.
 *
 * Etkileşim tavlayla aynı mantıkta: "taşa dokun → hedefe dokun". Sürükle-bırak
 * yok, çünkü telefonda 40 px'lik bir kareden sürüklemek kaydırmayla çakışıyor.
 * Geçerli kareler nokta, taş alınabilen kareler halka olarak gösteriliyor —
 * hangi hamlenin taş aldığı bir bakışta anlaşılsın.
 */

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"] as const;

export type BoardSquare = {
  square: Square;
  type: PieceType;
  color: "w" | "b";
} | null;

export function SatrancBoard({
  fen,
  flipped,
  selected,
  targets,
  lastMove,
  checkSquare,
  onSquare,
  disabled,
}: {
  fen: string;
  /** Siyah oynayan tahtayı ters görür. */
  flipped: boolean;
  selected: Square | null;
  /** Seçili taşın gidebileceği kareler. */
  targets: { to: Square; capture: boolean }[];
  lastMove: { from: string; to: string } | null;
  /** Şah çekilmişse şahın karesi. */
  checkSquare: Square | null;
  onSquare: (square: Square) => void;
  disabled?: boolean;
}) {
  const board = useMemo(() => new Chess(fen).board(), [fen]);
  const targetMap = useMemo(
    () => new Map(targets.map((t) => [t.to, t.capture])),
    [targets],
  );

  const rows = flipped ? [...board].reverse() : board;

  return (
    <div className="relative w-full select-none overflow-hidden rounded-card border border-line shadow-lift">
      {/* Kare garantisi hücrede: kapsayıcıya aspect-square verip yüksekliği
          8'e bölmek, tam sayıya yuvarlanmayan pikselleri satırlara dağıtıyor ve
          bazı kareler dikdörtgen oluyordu. Her hücre kendi oranını taşıyınca
          hepsi birebir kare. */}
      <div className="grid grid-cols-8">
        {rows.map((row, rowIndex) => {
          const cells = flipped ? [...row].reverse() : row;
          return cells.map((cell, colIndex) => {
            const rank = flipped ? RANKS[7 - rowIndex] : RANKS[rowIndex];
            const file = flipped ? FILES[7 - colIndex] : FILES[colIndex];
            const square = `${file}${rank}` as Square;

            const light = (rowIndex + colIndex) % 2 === 0;
            const isTarget = targetMap.has(square);
            const isCapture = targetMap.get(square) === true;
            const isLast = lastMove?.from === square || lastMove?.to === square;

            return (
              <button
                key={square}
                type="button"
                onClick={() => !disabled && onSquare(square)}
                aria-label={`${square}${cell ? `, ${cell.color === "w" ? "beyaz" : "siyah"}` : " boş"}`}
                className={cn(
                  "relative flex aspect-square items-center justify-center transition-colors duration-150",
                  light ? "bg-[#F5F3EE]" : "bg-[#B8AE9C]",
                  // Son hamle vurgusu: bej tahtaya uyan sıcak sarı.
                  isLast && (light ? "bg-[#F1E3AE]" : "bg-[#CDBB78]"),
                  selected === square && "bg-brand-400/85",
                  checkSquare === square &&
                    "bg-[radial-gradient(circle,rgb(225_29_72/0.55)_0%,rgb(225_29_72/0.15)_60%,transparent_75%)]",
                )}
              >
                {/* Koordinatlar — yalnızca kenar karelerde, lichess gibi */}
                {colIndex === 0 ? (
                  <span
                    className={cn(
                      "pointer-events-none absolute left-[3px] top-[1px] text-[0.5rem] font-semibold sm:text-[0.6rem]",
                      light ? "text-[#A69B87]" : "text-[#F5F3EE]",
                    )}
                  >
                    {rank}
                  </span>
                ) : null}
                {rowIndex === 7 ? (
                  <span
                    className={cn(
                      "pointer-events-none absolute bottom-[1px] right-[3px] text-[0.5rem] font-semibold sm:text-[0.6rem]",
                      light ? "text-[#A69B87]" : "text-[#F5F3EE]",
                    )}
                  >
                    {file}
                  </span>
                ) : null}

                {cell ? (
                  <ChessPiece
                    type={cell.type as PieceType}
                    color={cell.color}
                    className="pointer-events-none relative z-10 size-[86%]"
                  />
                ) : null}

                {isTarget ? (
                  isCapture ? (
                    <span
                      aria-hidden
                      className="absolute inset-[6%] rounded-full ring-[3px] ring-inset ring-good/60"
                    />
                  ) : (
                    <span
                      aria-hidden
                      className="absolute size-[26%] rounded-full bg-good/45"
                    />
                  )
                ) : null}
              </button>
            );
          });
        })}
      </div>
    </div>
  );
}

/** Terfi seçici — piyon son sıraya ulaştığında açılır. */
export function PromotionPicker({
  color,
  onPick,
  onCancel,
}: {
  color: "w" | "b";
  onPick: (piece: "q" | "r" | "b" | "n") => void;
  onCancel: () => void;
}) {
  const options: ("q" | "r" | "b" | "n")[] = ["q", "r", "b", "n"];
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-900/30 p-6 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-[rise-in_.24s_var(--ease-out-soft)] rounded-card border border-line bg-surface p-5 shadow-lift"
      >
        <p className="mb-3 text-center text-[0.9rem] text-ink-soft">Piyon neye dönüşsün?</p>
        <div className="flex gap-2">
          {options.map((piece) => (
            <button
              key={piece}
              type="button"
              onClick={() => onPick(piece)}
              className="grid size-16 place-items-center rounded-2xl bg-brand-50 transition-colors hover:bg-brand-100"
            >
              <ChessPiece type={piece} color={color} className="size-12" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
