"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Delete, Loader2 } from "lucide-react";

import { PEOPLE, PERSON_KEYS, type PersonKey } from "@/config/site";
import { cn } from "@/lib/utils";

type Step = "pin" | "kim";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "sil"] as const;

export function LockForm({ next }: { next: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("pin");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(0);

  const submitPin = useCallback(
    async (value: string) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/giris", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin: value }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error ?? "Bir şeyler ters gitti.");
          setPin("");
          setShake((n) => n + 1);
          return;
        }
        setStep("kim");
      } catch {
        setError("Bağlantı kurulamadı.");
        setPin("");
        setShake((n) => n + 1);
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  // Dördüncü rakam girilince kendiliğinden gönder — ayrıca "Giriş" tuşu yok.
  useEffect(() => {
    if (step === "pin" && pin.length === 4 && !busy) void submitPin(pin);
  }, [pin, step, busy, submitPin]);

  // Fiziksel klavye desteği: telefonda tuş takımı, masaüstünde klavye.
  useEffect(() => {
    if (step !== "pin") return;
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) setPin((p) => (p.length < 4 ? p + e.key : p));
      else if (e.key === "Backspace") setPin((p) => p.slice(0, -1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);

  async function chooseUser(user: PersonKey) {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/giris", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin, user }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Giriş yapılamadı.");
      setBusy(false);
      setStep("pin");
      setPin("");
      return;
    }
    router.replace(next);
    router.refresh();
  }

  if (step === "kim") {
    return (
      <div className="animate-[rise-in_.4s_var(--ease-out-soft)]">
        <p className="mb-4 text-center text-[0.95rem] text-ink-soft">Kimsin?</p>
        <div className="grid grid-cols-2 gap-3">
          {PERSON_KEYS.map((key) => {
            const person = PEOPLE[key];
            return (
              <button
                key={key}
                type="button"
                disabled={busy}
                onClick={() => chooseUser(key)}
                className="group rounded-card border border-line bg-surface px-4 py-7 text-center shadow-soft transition-[transform,box-shadow,border-color] duration-300 ease-[var(--ease-out-soft)] hover:-translate-y-1 hover:shadow-lift active:scale-[0.98] disabled:opacity-50"
                style={{ borderColor: busy ? undefined : `${person.accent}33` }}
              >
                <span
                  className="mx-auto mb-3 block size-12 rounded-full transition-transform duration-300 group-hover:scale-110"
                  style={{
                    background: `radial-gradient(circle at 32% 28%, ${person.accent}, ${person.accent}88)`,
                  }}
                />
                <span className="font-display text-[1.2rem]">{person.name}</span>
              </button>
            );
          })}
        </div>
        {error ? <p className="mt-4 text-center text-sm text-bad">{error}</p> : null}
      </div>
    );
  }

  return (
    <div>
      {/* PIN noktaları */}
      <div
        key={shake}
        className={cn(
          "mb-8 flex justify-center gap-3.5",
          shake > 0 && "animate-[shake_.42s_var(--ease-in-out-soft)]",
        )}
      >
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              "size-3.5 rounded-full border transition-[background-color,border-color,transform] duration-200",
              i < pin.length
                ? "scale-110 border-brand-600 bg-brand-600"
                : "border-line-strong bg-transparent",
            )}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {KEYS.map((key, i) =>
          key === "" ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              type="button"
              disabled={busy}
              onClick={() =>
                setPin((p) => (key === "sil" ? p.slice(0, -1) : p.length < 4 ? p + key : p))
              }
              className="h-14 rounded-btn border border-line bg-surface/70 font-display text-[1.35rem] text-ink shadow-soft backdrop-blur-sm transition-[transform,background-color,border-color] duration-150 hover:border-brand-200 hover:bg-brand-50 active:scale-95 disabled:opacity-50"
              aria-label={key === "sil" ? "Sil" : key}
            >
              {key === "sil" ? (
                <Delete className="mx-auto size-5 text-ink-soft" strokeWidth={1.6} aria-hidden />
              ) : (
                key
              )}
            </button>
          ),
        )}
      </div>

      <div className="mt-5 flex min-h-6 items-center justify-center">
        {busy ? (
          <Loader2 className="size-4 animate-spin text-brand-400" aria-hidden />
        ) : error ? (
          <p className="text-center text-sm text-bad">{error}</p>
        ) : null}
      </div>
    </div>
  );
}
