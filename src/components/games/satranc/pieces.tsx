/**
 * Satranç taşları — 45×45 kutuda sade SVG'ler.
 *
 * Hazır setler (lichess'in kullandığı cburnett dahil) GPL lisanslı; sitenin
 * geri kalanına da uymuyorlardı. Bunlar sade, yumuşak köşeli ve mor temayla
 * uyumlu; beyaz taş dolgusu açık, siyah taş dolgusu koyu, ikisinde de aynı
 * kontur kullanılıyor.
 */

export type PieceType = "p" | "n" | "b" | "r" | "q" | "k";
export type PieceColor = "w" | "b";

const BASE = "M10.5 36h24a2.5 2.5 0 0 1 2.5 2.5V40H8v-1.5A2.5 2.5 0 0 1 10.5 36z";

const PATHS: Record<PieceType, React.ReactNode> = {
  p: (
    <>
      <circle cx="22.5" cy="14" r="5.6" />
      <path d="M17.4 20.5c3.3 1.6 6.4 1.6 10.2 0L30 32H15z" />
      <path d={BASE} />
    </>
  ),
  r: (
    <>
      <path d="M11 9h5v3.4h4.2V9h4.6v3.4H29V9h5v9H11z" />
      <path d="M14.6 19.5h15.8L28.6 32H16.4z" />
      <path d={BASE} />
    </>
  ),
  n: (
    <>
      <path d="M14.8 32c-.5-6.6 1.3-11 5.2-14.2l-2.6-3.1 3.3-2.1.9-4.1c6 1.4 11.2 6.5 11.5 14.6L33.4 32z" />
      <circle cx="26.6" cy="17.6" r="1.35" className="fill-[var(--piece-eye)]" />
      <path d={BASE} />
    </>
  ),
  b: (
    <>
      <circle cx="22.5" cy="8.4" r="2.3" />
      <path d="M22.5 11.6c4.6 4 7.4 8 7.4 12 0 4.4-3.6 6.6-7.4 6.6s-7.4-2.2-7.4-6.6c0-4 2.8-8 7.4-12z" />
      <path
        d="M22.5 16.5v7M19.4 20h6.2"
        className="stroke-[var(--piece-eye)]"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M14.6 30.4h15.8V33H14.6z" />
      <path d={BASE} />
    </>
  ),
  q: (
    <>
      <circle cx="10.6" cy="10.4" r="2.1" />
      <circle cx="17.8" cy="7.8" r="2.1" />
      <circle cx="22.5" cy="6.6" r="2.3" />
      <circle cx="27.2" cy="7.8" r="2.1" />
      <circle cx="34.4" cy="10.4" r="2.1" />
      <path d="M11 13.4l3.2 7.2 3-8.2 3.1 9 2.2-9.4 2.2 9.4 3.1-9 3 8.2 3.2-7.2 2.1 12.2H8.9z" />
      <path d="M13.2 27h18.6l-1.2 5.2H14.4z" />
      <path d={BASE} />
    </>
  ),
  k: (
    <>
      <path
        d="M22.5 4v8.4M18.6 7.6h7.8"
        className="stroke-[var(--piece-line)]"
        strokeWidth="2.8"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M22.5 13.4c3.4-4 9.6-3.2 10.8 1.6.9 3.5-1.4 6.6-4.2 9.4l-6.6 6.2-6.6-6.2c-2.8-2.8-5.1-5.9-4.2-9.4 1.2-4.8 7.4-5.6 10.8-1.6z" />
      <path d="M13.6 30.6h17.8V33H13.6z" />
      <path d={BASE} />
    </>
  ),
};

export function ChessPiece({
  type,
  color,
  className,
}: {
  type: PieceType;
  color: PieceColor;
  className?: string;
}) {
  const white = color === "w";
  return (
    <svg
      viewBox="0 0 45 45"
      className={className}
      aria-hidden
      style={
        {
          "--piece-line": white ? "#4C1D95" : "#F5F3FF",
          "--piece-eye": white ? "#4C1D95" : "#EDE9FE",
        } as React.CSSProperties
      }
    >
      <g
        fill={white ? "#FFFFFF" : "#3B2A63"}
        stroke={white ? "#5B21B6" : "#1A1523"}
        strokeWidth="1.5"
        strokeLinejoin="round"
      >
        {PATHS[type]}
      </g>
    </svg>
  );
}

export const PIECE_NAMES: Record<PieceType, string> = {
  p: "piyon",
  n: "at",
  b: "fil",
  r: "kale",
  q: "vezir",
  k: "şah",
};

/** Alınan taşları saymak için materyal değeri. */
export const PIECE_VALUE: Record<PieceType, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
