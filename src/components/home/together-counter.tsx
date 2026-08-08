"use client";

import { useEffect, useState } from "react";

import { daysBetween, parseDateOnly, trDate, trNumber } from "@/lib/utils";

/**
 * "X gündür birlikteyiz" — canlı sayan.
 *
 * Saat sunucuda hesaplanmıyor: sunucunun saati ile tarayıcının saati farklı
 * olduğunda React hidrasyon uyuşmazlığı veriyor. İlk karede yer tutucu
 * çiziliyor, gerçek değer `useEffect` ile geliyor.
 */
export function TogetherCounter({ since }: { since: string }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const days = now ? daysBetween(parseDateOnly(since), now) : null;
  const hms = now
    ? [now.getHours(), now.getMinutes(), now.getSeconds()]
        .map((n) => String(n).padStart(2, "0"))
        .join(":")
    : "--:--:--";

  return (
    <div className="sm:text-right">
      <p className="font-display text-[2.2rem] font-bold leading-none tabular-nums tracking-tight sm:text-[2.8rem]">
        {days === null ? "—" : trNumber(days)}
        <span className="ml-2 text-[1rem] font-normal tracking-normal text-ink-soft">gün</span>
      </p>
      <p className="mt-1 text-[0.78rem] uppercase tracking-[0.14em] text-ink-soft">
        {trDate(since)}&apos;den beri <span className="text-brand-600">·</span>{" "}
        <span className="tabular-nums">{hms}</span>
      </p>
    </div>
  );
}
