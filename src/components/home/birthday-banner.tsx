"use client";

import { useEffect, useState } from "react";
import { Cake, Gift } from "lucide-react";

import { PEOPLE, PERSON_KEYS } from "@/config/site";
import { ageOn, daysBetween, isTodayAnniversary, nextAnniversary, trDate } from "@/lib/utils";

type Status =
  | { kind: "today"; name: string; age: number; accent: string }
  | { kind: "soon"; name: string; days: number; date: string; accent: string }
  | { kind: "none" };

/**
 * Doğum günü şeridi.
 *
 * Bugün biriyseniz kutlama, 30 güne kadar yaklaştıysa hatırlatma çıkarır.
 * Tarih karşılaştırması yalnızca tarayıcıda yapılıyor — sunucu UTC'de
 * çalıştığında gece yarısı ile 03:00 arasında bir gün şaşabiliyor.
 */
function compute(now: Date): Status {
  for (const key of PERSON_KEYS) {
    const p = PEOPLE[key];
    if (isTodayAnniversary(p.birthday, now)) {
      return { kind: "today", name: p.name, age: ageOn(p.birthday, now), accent: p.accent };
    }
  }

  let best: Status = { kind: "none" };
  let bestDays = Infinity;
  for (const key of PERSON_KEYS) {
    const p = PEOPLE[key];
    const days = daysBetween(now, nextAnniversary(p.birthday, now));
    if (days > 0 && days <= 30 && days < bestDays) {
      bestDays = days;
      best = { kind: "soon", name: p.name, days, date: p.birthday, accent: p.accent };
    }
  }
  return best;
}

export function BirthdayBanner() {
  const [status, setStatus] = useState<Status>({ kind: "none" });

  useEffect(() => {
    setStatus(compute(new Date()));
  }, []);

  useEffect(() => {
    if (status.kind !== "today") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cancelled = false;
    // Konfeti yalnızca doğum gününde gerekiyor; paketi o an indiriyoruz ki
    // diğer 364 gün boyunca kimse bu kodu yüklemesin.
    void import("canvas-confetti").then(({ default: confetti }) => {
      if (cancelled) return;
      const shoot = (x: number) =>
        confetti({
          particleCount: 60,
          spread: 70,
          startVelocity: 42,
          origin: { x, y: 0.72 },
          colors: ["#7C3AED", "#A78BFA", "#E879F9", "#F0ABFC", "#FFFFFF"],
          disableForReducedMotion: true,
        });
      shoot(0.2);
      setTimeout(() => shoot(0.8), 220);
    });

    return () => {
      cancelled = true;
    };
  }, [status.kind]);

  if (status.kind === "none") return null;

  if (status.kind === "today") {
    return (
      <div className="mx-auto mb-12 w-full max-w-5xl px-6">
        <div
          className="relative overflow-hidden rounded-card border border-brand-200 px-6 py-7 text-center shadow-lift sm:px-10 sm:py-9"
          style={{
            background:
              "linear-gradient(135deg, rgb(245 243 255) 0%, rgb(255 255 255) 45%, rgb(253 232 255) 100%)",
          }}
        >
          <Cake className="mx-auto mb-3 size-7 text-accent-400" strokeWidth={1.5} aria-hidden />
          <h2 className="text-[1.6rem] leading-tight sm:text-[2.1rem]">
            İyi ki doğdun {status.name}
          </h2>
          <p className="mt-2 text-[0.95rem] text-ink-soft">
            Bugün {status.age} yaşına girdin. Nice senelere.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto mb-12 w-full max-w-5xl px-6">
      <div className="flex items-center gap-3 rounded-card border border-line bg-surface/70 px-5 py-3.5 shadow-soft backdrop-blur-sm">
        <Gift className="size-5 shrink-0 text-accent-400" strokeWidth={1.6} aria-hidden />
        <p className="text-[0.9rem] text-ink-soft">
          <span className="font-medium text-ink">{status.name}</span>&apos;in doğum gününe{" "}
          <span className="font-medium text-brand-700">{status.days} gün</span> kaldı ·{" "}
          {trDate(status.date, { withYear: false })}
        </p>
      </div>
    </div>
  );
}
