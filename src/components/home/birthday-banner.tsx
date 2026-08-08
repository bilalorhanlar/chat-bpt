"use client";

import { useEffect, useState } from "react";
import { Cake, Gift } from "lucide-react";

import { ageOn, daysBetween, isTodayAnniversary, nextAnniversary, trDate } from "@/lib/utils";

type Person = { key: string; name: string; birthday: string; accent: string };

type Status =
  | { kind: "today"; name: string; age: number }
  | { kind: "soon"; name: string; days: number; date: string }
  | { kind: "none" };

/** Bugün doğum günüyse kutlama, 30 güne kadar yaklaştıysa hatırlatma. */
function compute(people: Person[], now: Date): Status {
  for (const person of people) {
    if (isTodayAnniversary(person.birthday, now)) {
      return { kind: "today", name: person.name, age: ageOn(person.birthday, now) };
    }
  }

  let best: Status = { kind: "none" };
  let bestDays = Infinity;
  for (const person of people) {
    const days = daysBetween(now, nextAnniversary(person.birthday, now));
    if (days > 0 && days <= 30 && days < bestDays) {
      bestDays = days;
      best = { kind: "soon", name: person.name, days, date: person.birthday };
    }
  }
  return best;
}

export function BirthdayBanner({ people }: { people: Person[] }) {
  const [status, setStatus] = useState<Status>({ kind: "none" });

  // Tarih karşılaştırması yalnızca tarayıcıda: sunucu ile istemcinin günü
  // ayrıldığında hidrasyon uyuşmazlığı çıkardı.
  useEffect(() => {
    setStatus(compute(people, new Date()));
  }, [people]);

  useEffect(() => {
    if (status.kind !== "today") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cancelled = false;
    // Konfeti paketi yalnızca doğum gününde indiriliyor; diğer 364 gün
    // kimse bu kodu yüklemiyor.
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
