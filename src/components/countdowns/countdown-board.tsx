"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Plus, Trash2, X } from "lucide-react";

import { addCountdown, deleteCountdown, type CountdownView } from "@/app/sayaclar/actions";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { PEOPLE, type PersonKey } from "@/config/site";
import { cn, parseDateOnly, trDate } from "@/lib/utils";

/** Hedef ana kalan süre; geçmiş tek seferlik olaylarda `past` doğru olur. */
type Remaining = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  today: boolean;
  past: boolean;
  targetYear: number;
};

/**
 * Hedef günün **yerel gece yarısına** kalan süre.
 *
 * Yıldönümü işaretli olanlar için bu yılın tarihi geçtiyse gelecek yıla
 * atlanır. Tarih dizesi yerel olarak çözümleniyor; UTC'den okumak Türkiye'de
 * günü bir geri kaydırıyor.
 */
function remainingUntil(dateString: string, repeatYearly: boolean, now: Date): Remaining {
  const source = parseDateOnly(dateString);
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let target = repeatYearly
    ? new Date(now.getFullYear(), source.getMonth(), source.getDate())
    : source;

  if (repeatYearly && target < todayMidnight) {
    target = new Date(now.getFullYear() + 1, source.getMonth(), source.getDate());
  }

  const today = target.getTime() === todayMidnight.getTime();
  const past = !repeatYearly && target < todayMidnight;

  const diff = Math.max(0, target.getTime() - now.getTime());
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor(diff / 3_600_000) % 24,
    minutes: Math.floor(diff / 60_000) % 60,
    seconds: Math.floor(diff / 1000) % 60,
    today,
    past,
    targetYear: target.getFullYear(),
  };
}

export function CountdownBoard({ initialItems }: { initialItems: CountdownView[] }) {
  const [items, setItems] = useState(initialItems);
  const [now, setNow] = useState<Date | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Tek zamanlayıcı tüm kartları besliyor: kart başına interval açmak
  // gereksiz uyandırma demek.
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const { upcoming, past } = useMemo(() => {
    if (!now) return { upcoming: [], past: [] };
    const withTime = items.map((item) => ({
      item,
      remaining: remainingUntil(item.date, item.repeatYearly, now),
    }));
    return {
      upcoming: withTime
        .filter((x) => !x.remaining.past)
        .sort(
          (a, b) =>
            a.remaining.days - b.remaining.days ||
            a.remaining.hours - b.remaining.hours ||
            a.remaining.minutes - b.remaining.minutes,
        ),
      past: withTime.filter((x) => x.remaining.past),
    };
  }, [items, now]);

  function handleDelete(id: string) {
    const snapshot = items;
    setItems((list) => list.filter((i) => i.id !== id));
    startTransition(async () => {
      try {
        await deleteCountdown(id);
      } catch {
        setItems(snapshot);
        setError("Silinemedi.");
      }
    });
  }

  return (
    <div>
      <div className="mb-6 flex justify-end">
        <Button
          variant={adding ? "outline" : "primary"}
          onClick={() => setAdding((v) => !v)}
          aria-expanded={adding}
        >
          {adding ? (
            <>
              <X className="size-4" strokeWidth={2} aria-hidden /> Vazgeç
            </>
          ) : (
            <>
              <Plus className="size-4" strokeWidth={2} aria-hidden /> Özel gün ekle
            </>
          )}
        </Button>
      </div>

      {adding ? (
        <AddForm
          onAdded={(item) => {
            setItems((list) => [...list, item]);
            setAdding(false);
            setError(null);
          }}
          onError={setError}
        />
      ) : null}

      {error ? (
        <p className="mb-4 rounded-btn bg-bad/10 px-4 py-2.5 text-[0.85rem] text-bad">{error}</p>
      ) : null}

      {items.length === 0 ? (
        <EmptyState
          icon={<Icon name="timer" className="size-9" strokeWidth={1.3} />}
          title="Henüz sayaç yok"
          hint="Yıldönümü, tatil, sınav — geri sayması güzel olacak her şeyi ekleyebilirsin."
        />
      ) : null}

      {/* Sunucu ile istemcinin saati farklı olabildiği için ilk kare boş çizilir. */}
      {now === null ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <div key={item.id} className="h-36 animate-pulse rounded-card bg-brand-50/70" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {upcoming.map(({ item, remaining }) => (
            <CountdownCard
              key={item.id}
              item={item}
              remaining={remaining}
              onDelete={() => handleDelete(item.id)}
            />
          ))}
        </div>
      )}

      {past.length > 0 ? (
        <div className="mt-8">
          <h2 className="mb-3 text-[0.72rem] font-medium uppercase tracking-[0.18em] text-ink-faint">
            Geçti
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {past.map(({ item, remaining }) => (
              <CountdownCard
                key={item.id}
                item={item}
                remaining={remaining}
                onDelete={() => handleDelete(item.id)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function CountdownCard({
  item,
  remaining,
  onDelete,
}: {
  item: CountdownView;
  remaining: Remaining;
  onDelete: () => void;
}) {
  const person = PEOPLE[item.createdById as PersonKey];
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-card border p-5 shadow-soft backdrop-blur-sm transition-[border-color,box-shadow] duration-300",
        remaining.today
          ? "border-accent-300 bg-gradient-to-br from-brand-50 via-surface to-accent-200/40"
          : remaining.past
            ? "border-line bg-surface/50"
            : "border-line bg-surface/80 hover:border-brand-200 hover:shadow-lift",
      )}
    >
      <button
        type="button"
        onClick={onDelete}
        aria-label={`${item.title} sayacını sil`}
        className="absolute right-3 top-3 grid size-8 place-items-center rounded-lg text-ink-faint opacity-100 transition-colors hover:bg-bad/10 hover:text-bad sm:opacity-0 sm:group-hover:opacity-100"
      >
        <Trash2 className="size-4" strokeWidth={1.7} aria-hidden />
      </button>

      <div className="mb-3 flex items-center gap-2.5">
        {item.emoji ? <span className="text-[1.4rem] leading-none">{item.emoji}</span> : null}
        <div className="min-w-0">
          <p className="truncate pr-8 font-display text-[1.15rem] leading-tight">{item.title}</p>
          <p className="text-[0.75rem] text-ink-faint">
            {trDate(item.date, { withYear: !item.repeatYearly })}
            {item.repeatYearly ? ` · ${remaining.targetYear}` : null}
          </p>
        </div>
      </div>

      {remaining.today ? (
        <p className="font-display text-[1.9rem] leading-none text-accent-500">Bugün!</p>
      ) : remaining.past ? (
        <p className="text-[0.9rem] text-ink-faint">Geçti</p>
      ) : (
        <div className="flex items-baseline gap-2">
          <span className="font-display text-[2.2rem] leading-none tabular-nums text-brand-700">
            {remaining.days}
          </span>
          <span className="text-[0.9rem] text-ink-soft">gün</span>
          <span className="ml-auto text-[0.85rem] tabular-nums text-ink-faint">
            {pad(remaining.hours)}:{pad(remaining.minutes)}:{pad(remaining.seconds)}
          </span>
        </div>
      )}

      {person ? (
        <span
          className="absolute bottom-4 right-5 size-2 rounded-full"
          title={`${person.name} ekledi`}
          style={{ background: person.accent }}
        />
      ) : null}
    </div>
  );
}

const EMOJI_CHOICES = ["🎂", "💜", "✈️", "🏖️", "🎓", "🎄", "🥳", "🏡", "💍", "🎬"];

function AddForm({
  onAdded,
  onError,
}: {
  onAdded: (item: CountdownView) => void;
  onError: (message: string | null) => void;
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [emoji, setEmoji] = useState("💜");
  const [repeatYearly, setRepeatYearly] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const result = await addCountdown({ title, date, emoji, repeatYearly });
    setBusy(false);
    if (!result.ok) return onError(result.error);
    onAdded(result.item);
  }

  return (
    <form
      onSubmit={submit}
      className="mb-6 animate-[rise-in_.3s_var(--ease-out-soft)] rounded-card border border-line bg-surface/85 p-5 shadow-soft backdrop-blur-sm"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-[0.8rem] text-ink-soft">Ne için?</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Yıldönümümüz"
            maxLength={80}
            required
            className="h-11 w-full rounded-btn border border-line bg-surface px-3.5 outline-none transition-colors placeholder:text-ink-faint focus:border-brand-300"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[0.8rem] text-ink-soft">Tarih</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="h-11 w-full rounded-btn border border-line bg-surface px-3.5 outline-none transition-colors focus:border-brand-300"
          />
        </label>
      </div>

      <div className="mt-4">
        <span className="mb-2 block text-[0.8rem] text-ink-soft">Simge</span>
        <div className="flex flex-wrap gap-1.5">
          {EMOJI_CHOICES.map((choice) => (
            <button
              key={choice}
              type="button"
              onClick={() => setEmoji(choice)}
              aria-label={choice}
              aria-pressed={emoji === choice}
              className={cn(
                "grid size-10 place-items-center rounded-xl text-[1.15rem] transition-colors",
                emoji === choice ? "bg-brand-100 ring-2 ring-brand-400" : "bg-brand-50/70 hover:bg-brand-100",
              )}
            >
              {choice}
            </button>
          ))}
        </div>
      </div>

      <label className="mt-4 flex cursor-pointer items-center gap-2.5">
        <input
          type="checkbox"
          checked={repeatYearly}
          onChange={(e) => setRepeatYearly(e.target.checked)}
          className="size-4 accent-brand-600"
        />
        <span className="text-[0.88rem] text-ink-soft">Her yıl tekrarlansın</span>
      </label>

      <div className="mt-5 flex justify-end">
        <Button type="submit" disabled={busy || !title.trim() || !date}>
          Ekle
        </Button>
      </div>
    </form>
  );
}
