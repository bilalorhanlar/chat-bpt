"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";

import { changePin, saveProfile } from "@/app/ayarlar/actions";
import { Button } from "@/components/ui/button";
import { PERSON_KEYS, type PersonKey } from "@/config/site";
import type { People } from "@/lib/people";

export function SettingsForm({
  people,
  togetherSince,
}: {
  people: People;
  togetherSince: string;
}) {
  return (
    <div className="space-y-4">
      <ProfileSection people={people} togetherSince={togetherSince} />
      <PinSection />
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-card border border-line bg-surface/85 p-5 shadow-soft backdrop-blur-sm sm:p-6">
      <h2 className="text-[1.25rem] leading-tight">{title}</h2>
      {hint ? <p className="mt-1 text-[0.85rem] text-ink-soft">{hint}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[0.8rem] text-ink-soft">{label}</span>
      {children}
    </label>
  );
}

const INPUT =
  "h-11 w-full rounded-btn border border-line bg-surface px-3.5 outline-none transition-colors placeholder:text-ink-faint focus:border-brand-300";

function ProfileSection({ people, togetherSince }: { people: People; togetherSince: string }) {
  const router = useRouter();
  const [names, setNames] = useState<Record<string, string>>(
    Object.fromEntries(PERSON_KEYS.map((k) => [k, people[k].name])),
  );
  const [birthdays, setBirthdays] = useState<Record<string, string>>(
    Object.fromEntries(PERSON_KEYS.map((k) => [k, people[k].birthday])),
  );
  const [since, setSince] = useState(togetherSince);
  const [state, setState] = useState<"idle" | "busy" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    const result = await saveProfile({
      names: names as Record<PersonKey, string>,
      birthdays: birthdays as Record<PersonKey, string>,
      togetherSince: since,
    });
    if (!result.ok) {
      setError(result.error);
      setState("idle");
      return;
    }
    setError(null);
    setState("saved");
    router.refresh();
    setTimeout(() => setState("idle"), 2200);
  }

  return (
    <Section title="Biz" hint="İsimler ve tarihler sitenin her yerinde kullanılıyor.">
      <form onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-2">
          {PERSON_KEYS.map((key) => (
            <div key={key} className="space-y-3">
              <div className="flex items-center gap-2">
                <span
                  className="size-2.5 rounded-full"
                  style={{ background: people[key].accent }}
                />
                <span className="text-[0.72rem] font-medium uppercase tracking-[0.16em] text-brand-500">
                  {key === "bilal" ? "Sen" : "O"}
                </span>
              </div>

              <Field label="İsim">
                <input
                  className={INPUT}
                  value={names[key] ?? ""}
                  maxLength={40}
                  required
                  onChange={(e) => setNames((n) => ({ ...n, [key]: e.target.value }))}
                />
              </Field>

              <Field label="Doğum günü">
                <input
                  type="date"
                  className={INPUT}
                  value={birthdays[key] ?? ""}
                  required
                  onChange={(e) => setBirthdays((b) => ({ ...b, [key]: e.target.value }))}
                />
              </Field>
            </div>
          ))}
        </div>

        <div className="mt-5 max-w-xs">
          <Field label="Birlikte olduğumuz tarih">
            <input
              type="date"
              className={INPUT}
              value={since}
              required
              onChange={(e) => setSince(e.target.value)}
            />
          </Field>
        </div>

        {error ? <p className="mt-3 text-[0.85rem] text-bad">{error}</p> : null}

        <div className="mt-5 flex items-center justify-end gap-3">
          {state === "saved" ? (
            <span className="flex items-center gap-1.5 text-[0.85rem] text-good">
              <Check className="size-4" strokeWidth={2.2} aria-hidden /> Kaydedildi
            </span>
          ) : null}
          <Button type="submit" disabled={state === "busy"}>
            Kaydet
          </Button>
        </div>
      </form>
    </Section>
  );
}

function PinSection() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    const result = await changePin({ current, next });
    if (!result.ok) {
      setError(result.error);
      setState("idle");
      return;
    }
    setError(null);
    setState("saved");
    setCurrent("");
    setNext("");
    setTimeout(() => setState("idle"), 2200);
  }

  return (
    <Section title="Giriş PIN'i" hint="İkinizin de kullandığı 4 haneli kod.">
      <form onSubmit={submit} className="grid max-w-md gap-4 sm:grid-cols-2">
        <Field label="Mevcut PIN">
          <input
            className={INPUT}
            value={current}
            inputMode="numeric"
            pattern="\d{4}"
            maxLength={4}
            required
            onChange={(e) => setCurrent(e.target.value.replace(/\D/g, ""))}
          />
        </Field>

        <Field label="Yeni PIN">
          <input
            className={INPUT}
            value={next}
            inputMode="numeric"
            pattern="\d{4}"
            maxLength={4}
            required
            onChange={(e) => setNext(e.target.value.replace(/\D/g, ""))}
          />
        </Field>

        {error ? <p className="text-[0.85rem] text-bad sm:col-span-2">{error}</p> : null}

        <div className="flex items-center justify-end gap-3 sm:col-span-2">
          {state === "saved" ? (
            <span className="flex items-center gap-1.5 text-[0.85rem] text-good">
              <Check className="size-4" strokeWidth={2.2} aria-hidden /> PIN değişti
            </span>
          ) : null}
          <Button
            type="submit"
            disabled={state === "busy" || current.length !== 4 || next.length !== 4}
          >
            PIN&apos;i değiştir
          </Button>
        </div>
      </form>
    </Section>
  );
}
