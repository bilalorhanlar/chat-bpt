"use client";

import { cn } from "@/lib/utils";

/** Tavla ve satrancın paylaştığı oyuncu şeridi. */
export function PlayerBar({
  person,
  active,
  online,
  showOnline,
  checkerColor,
  pip,
  off,
  clock,
  captured,
  className,
}: {
  person: { name: string; accent: string };
  /** Sıra bu oyuncuda mı — şerit vurgulanır. */
  active: boolean;
  online: boolean;
  showOnline: boolean;
  /** Taş rengi göstergesi. */
  checkerColor: "light" | "dark";
  /** Tavla: kalan pip. */
  pip?: number;
  /** Tavla: toplanan pul. */
  off?: number;
  /** Satranç: kalan süre (ms). */
  clock?: number | null;
  /** Satranç: aldığı taşlar. */
  captured?: React.ReactNode;
  /** Yerleşime göre daraltmak için (yatay tavla şeridi gibi). */
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border px-4 py-2.5 transition-colors duration-300",
        active ? "border-ink bg-white shadow-soft" : "border-line bg-white/70",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-6 shrink-0 rounded-full border",
          checkerColor === "dark"
            ? "border-black/70 bg-gradient-to-br from-[#4d453d] to-[#1d1915]"
            : "border-[#a89f8f] bg-gradient-to-br from-white to-[#ddd5c4]",
        )}
      />

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-[0.95rem] font-medium text-ink">
          {person.name}
          {showOnline ? (
            <span
              title={online ? "Çevrimiçi" : "Çevrimdışı"}
              className={cn(
                "size-1.5 shrink-0 rounded-full",
                online ? "bg-good" : "bg-ink-faint/50",
              )}
            />
          ) : null}
        </p>
        {pip !== undefined ? (
          <p className="text-[0.72rem] tabular-nums text-ink-faint">
            {pip} pip{off ? ` · ${off} toplandı` : ""}
          </p>
        ) : null}
        {captured}
      </div>

      {clock !== undefined && clock !== null ? <Clock ms={clock} active={active} /> : null}
    </div>
  );
}

function Clock({ ms, active }: { ms: number; active: boolean }) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  const low = total <= 20;

  return (
    <span
      className={cn(
        "shrink-0 rounded-xl px-3 py-1.5 font-display text-[1.15rem] tabular-nums transition-colors",
        low ? "bg-bad/12 text-bad" : active ? "bg-ink text-white" : "bg-[#f0f0f0] text-ink-soft",
      )}
    >
      {minutes}:{String(seconds).padStart(2, "0")}
    </span>
  );
}
