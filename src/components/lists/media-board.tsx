"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Clapperboard, ExternalLink, Loader2, Plus, Trash2 } from "lucide-react";

import {
  addListItem,
  deleteListItem,
  rateListItem,
  toggleListItem,
  type ListItemView,
} from "@/app/listeler/[tur]/actions";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";
import { PEOPLE, PERSON_KEYS, type PersonKey } from "@/config/site";
import type { ListConfig } from "@/lib/lists";
import type { People } from "@/lib/people";
import { cn } from "@/lib/utils";

/**
 * İzlenecekler — kapaklı ızgara.
 *
 * IMDb bağlantısı yapıştırılınca sunucu kapağı, adı, türü ve yılı IMDb'nin
 * öneri API'sinden çekiyor; ad kutusu boş bırakılabiliyor.
 *
 * "Ne kadar istiyorum" puanı kişi başına 1–10; kart ikisinin ortalamasını
 * gösteriyor. Puanlar `meta.ratings` içinde kişi anahtarıyla duruyor.
 */
export function MediaBoard({
  config,
  initialItems,
  me,
  people,
}: {
  config: ListConfig;
  initialItems: ListItemView[];
  me: PersonKey;
  people: People;
}) {
  const [items, setItems] = useState(initialItems);
  const [error, setError] = useState<string | null>(null);

  const { open, done } = useMemo(
    () => ({
      open: items.filter((i) => !i.done),
      done: items.filter((i) => i.done),
    }),
    [items],
  );

  return (
    <div>
      <AddForm
        onAdded={(item) => {
          setItems((list) => [item, ...list]);
          setError(null);
        }}
        onError={setError}
      />

      {error ? (
        <p className="mb-4 rounded-btn bg-bad/10 px-4 py-2.5 text-[0.85rem] text-bad">{error}</p>
      ) : null}

      {items.length === 0 ? (
        <EmptyState
          icon={<Clapperboard className="size-9" strokeWidth={1.3} />}
          title={config.emptyTitle}
          hint={config.emptyHint}
        />
      ) : null}

      {open.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {open.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              me={me}
              people={people}
              onChanged={(next) =>
                setItems((list) => list.map((i) => (i.id === next.id ? next : i)))
              }
              onToggled={(id, value) =>
                setItems((list) => list.map((i) => (i.id === id ? { ...i, done: value } : i)))
              }
              onDeleted={(id) => setItems((list) => list.filter((i) => i.id !== id))}
              onError={setError}
            />
          ))}
        </div>
      ) : null}

      {done.length > 0 ? (
        <section className="mt-10">
          <h2 className="mb-3 text-[0.72rem] font-medium uppercase tracking-[0.18em] text-ink-faint">
            {config.doneLabel} ({done.length})
          </h2>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-7">
            {done.map((item) => (
              <button
                key={item.id}
                type="button"
                title="Geri al"
                onClick={() => {
                  setItems((list) =>
                    list.map((i) => (i.id === item.id ? { ...i, done: false } : i)),
                  );
                  void toggleListItem("izlenecek", item.id, false);
                }}
                className="group relative aspect-[2/3] overflow-hidden rounded-xl border border-line bg-[#f4f4f4]"
              >
                {item.poster ? (
                  // Kapaklar IMDb CDN'inden geliyor; next/image'a sokmak
                  // Railway'de her istekte yeniden dönüştürme demek.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.poster}
                    alt={item.title}
                    loading="lazy"
                    className="size-full object-cover opacity-45 saturate-0 transition-opacity group-hover:opacity-70"
                  />
                ) : (
                  <span className="grid size-full place-items-center text-ink-faint">
                    <Clapperboard className="size-5" strokeWidth={1.4} aria-hidden />
                  </span>
                )}
                <span className="absolute inset-x-0 bottom-0 truncate bg-white/85 px-2 py-1 text-left text-[0.65rem] text-ink-soft">
                  {item.title}
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function AddForm({
  onAdded,
  onError,
}: {
  onAdded: (item: ListItemView) => void;
  onError: (message: string | null) => void;
}) {
  const [link, setLink] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || (!link.trim() && !title.trim())) return;
    setBusy(true);
    const result = await addListItem({
      slug: "izlenecek",
      title: title.trim(),
      link: link.trim() || undefined,
    });
    setBusy(false);
    if (!result.ok) return onError(result.error);
    onAdded(result.item);
    setLink("");
    setTitle("");
  }

  return (
    <form
      onSubmit={submit}
      className="mb-6 rounded-card border border-line bg-surface p-4 shadow-soft"
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="IMDb bağlantısı — kapağı ve adı kendisi çeker"
          inputMode="url"
          className="h-12 min-w-0 flex-[3] rounded-btn border border-line bg-surface px-4 outline-none transition-colors placeholder:text-ink-faint focus:border-ink"
        />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ad (bağlantı varsa boş kalabilir)"
          maxLength={160}
          className="h-12 min-w-0 flex-[2] rounded-btn border border-line bg-surface px-4 outline-none transition-colors placeholder:text-ink-faint focus:border-ink"
        />
        <Button type="submit" size="lg" disabled={busy || (!link.trim() && !title.trim())}>
          {busy ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Plus className="size-5" strokeWidth={2} aria-hidden />
          )}
          Ekle
        </Button>
      </div>
    </form>
  );
}

function MediaCard({
  item,
  me,
  people,
  onChanged,
  onToggled,
  onDeleted,
  onError,
}: {
  item: ListItemView;
  me: PersonKey;
  people: People;
  onChanged: (item: ListItemView) => void;
  onToggled: (id: string, done: boolean) => void;
  onDeleted: (id: string) => void;
  onError: (message: string | null) => void;
}) {
  const [, startTransition] = useTransition();

  const scores = PERSON_KEYS.map((key) => item.ratings[key]).filter(
    (value): value is number => typeof value === "number",
  );
  const average = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  const myScore = item.ratings[me];

  function rate(score: number) {
    // İyimser güncelle; hata olursa sunucu cevabı zaten eski hâli döndürür.
    onChanged({ ...item, ratings: { ...item.ratings, [me]: score } });
    startTransition(async () => {
      const result = await rateListItem("izlenecek", item.id, score);
      if (result.ok) onChanged(result.item);
      else onError(result.error);
    });
  }

  return (
    <article className="group overflow-hidden rounded-card border border-line bg-surface shadow-soft transition-shadow hover:shadow-lift">
      <div className="relative aspect-[2/3] bg-[#f0f0f0]">
        {item.poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.poster}
            alt={item.title}
            loading="lazy"
            className="size-full object-cover"
          />
        ) : (
          <span className="grid size-full place-items-center text-ink-faint">
            <Clapperboard className="size-8" strokeWidth={1.2} aria-hidden />
          </span>
        )}

        {average !== null ? (
          <span
            className="absolute right-2 top-2 rounded-lg bg-black/80 px-2 py-1 font-display text-[0.9rem] font-bold tabular-nums text-white"
            title={PERSON_KEYS.map(
              (key) => `${people[key].name}: ${item.ratings[key] ?? "—"}`,
            ).join(" · ")}
          >
            {formatScore(average)}
          </span>
        ) : null}

        {item.kind ? (
          <span className="absolute left-2 top-2 rounded-lg bg-white/90 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-ink">
            {item.kind}
          </span>
        ) : null}

        <button
          type="button"
          onClick={() => {
            onDeleted(item.id);
            void deleteListItem("izlenecek", item.id);
          }}
          aria-label="Sil"
          className="absolute bottom-2 right-2 grid size-8 place-items-center rounded-lg bg-white/90 text-ink-faint opacity-100 transition-[opacity,color] hover:text-bad sm:opacity-0 sm:group-hover:opacity-100"
        >
          <Trash2 className="size-4" strokeWidth={1.7} aria-hidden />
        </button>
      </div>

      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 truncate text-[0.9rem] font-semibold leading-snug">
            {item.title}
          </h3>
          {item.imdb ? (
            <a
              href={item.imdb}
              target="_blank"
              rel="noreferrer"
              aria-label="IMDb'de aç"
              className="mt-0.5 shrink-0 text-ink-faint transition-colors hover:text-brand-600"
            >
              <ExternalLink className="size-3.5" strokeWidth={1.8} aria-hidden />
            </a>
          ) : null}
        </div>
        {item.year ? <p className="text-[0.72rem] text-ink-faint">{item.year}</p> : null}

        {/* Kişisel istek puanı: 1–10 */}
        <div className="mt-2.5">
          <p className="mb-1 text-[0.65rem] uppercase tracking-[0.12em] text-ink-faint">
            Ne kadar istiyorum{myScore ? ` · ${myScore}` : ""}
          </p>
          <div className="flex gap-[3px]">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((score) => (
              <button
                key={score}
                type="button"
                onClick={() => rate(score)}
                aria-label={`${score} puan`}
                className={cn(
                  "h-4 flex-1 rounded-[3px] transition-colors",
                  myScore !== undefined && score <= myScore
                    ? "bg-brand-500"
                    : "bg-[#e8e8e8] hover:bg-brand-200",
                )}
              />
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            onToggled(item.id, true);
            void toggleListItem("izlenecek", item.id, true);
          }}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-btn border border-line py-1.5 text-[0.78rem] font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink"
        >
          <Check className="size-3.5" strokeWidth={2.2} aria-hidden />
          İzledik
        </button>
      </div>
    </article>
  );
}

/** 8,5 gibi — tam sayıysa virgülsüz. */
function formatScore(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace(".", ",");
}
