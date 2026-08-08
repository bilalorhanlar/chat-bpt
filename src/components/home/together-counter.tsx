"use client";

import { useEffect, useState } from "react";

import { TOGETHER_SINCE } from "@/config/site";
import { daysBetween, parseDateOnly, trDate, trNumber } from "@/lib/utils";

/**
 * "X gündür birlikteyiz" — canlı sayan.
 *
 * Saat sunucuda hesaplanmıyor: sunucunun saat dilimi ile tarayıcının saati
 * farklı olduğunda React hidrasyon uyuşmazlığı veriyor. Bunun yerine ilk
 * karede yalnızca yer tutucu çiziliyor, gerçek değer `useEffect` ile geliyor.
 * Yer tutucu aynı genişlikte olduğu için düzen kaymıyor.
 */
export function TogetherCounter() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const start = parseDateOnly(TOGETHER_SINCE);
  const days = now ? daysBetween(start, now) : null;

  const hms = now
    ? [now.getHours(), now.getMinutes(), now.getSeconds()]
        .map((n) => String(n).padStart(2, "0"))
        .join(":")
    : "--:--:--";

  return (
    <div className="mt-8 flex flex-col items-center gap-1.5">
      <p className="flex items-baseline gap-2">
        <span className="font-display text-[2.6rem] leading-none tabular-nums text-brand-700 sm:text-[3.2rem]">
          {days === null ? "—" : trNumber(days)}
        </span>
        <span className="text-[1.05rem] text-ink-soft">gündür birlikteyiz</span>
      </p>
      <p className="text-[0.82rem] tabular-nums text-ink-faint">
        {trDate(TOGETHER_SINCE)}&apos;den beri · {hms}
      </p>
    </div>
  );
}
