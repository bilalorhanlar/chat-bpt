"use client";

import { useMemo, useState } from "react";
import { Check, Plus, Trash2, X } from "lucide-react";

import {
  addCeyizCategory,
  addCeyizItem,
  deleteCeyizItem,
  removeCeyizCategory,
  updateCeyizItem,
  type CeyizItemView,
} from "@/app/ceyiz/actions";
import { Button } from "@/components/ui/button";
import { PERSON_KEYS, type PersonKey } from "@/config/site";
import type { People } from "@/lib/people";
import { cn, trNumber } from "@/lib/utils";

/**
 * Çeyiz panosu.
 *
 * Üstte toplamlar (genel + kişi başı), altında kategori bölümleri. Her öğede
 * alıcı seçimi (Bilal / Sümeyye / belirsiz), yaklaşık fiyat ve "alındı" durumu
 * var; toplamlar alınmamışlar üzerinden hesaplanıyor — kalan bütçeyi gösterir.
 */
export function CeyizBoard({
  initialCategories,
  initialItems,
  me,
  people,
}: {
  initialCategories: string[];
  initialItems: CeyizItemView[];
  me: PersonKey;
  people: People;
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [items, setItems] = useState(initialItems);
  const [error, setError] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState("");

  const totals = useMemo(() => {
    const open = items.filter((i) => !i.done && i.price !== null);
    const sum = (filter: (i: CeyizItemView) => boolean) =>
      open.filter(filter).reduce((acc, i) => acc + (i.price ?? 0), 0);
    return {
      all: sum(() => true),
      byPerson: Object.fromEntries(
        PERSON_KEYS.map((key) => [key, sum((i) => i.buyerId === key)]),
      ) as Record<PersonKey, number>,
      unassigned: sum((i) => i.buyerId === null),
      doneCount: items.filter((i) => i.done).length,
    };
  }, [items]);

  async function createCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategory.trim()) return;
    const result = await addCeyizCategory(newCategory);
    if (!result.ok) return setError(result.error);
    setCategories(result.categories);
    setNewCategory("");
    setError(null);
  }

  return (
    <div>
      {/* Toplamlar */}
      <section className="mb-6 overflow-hidden rounded-card border border-line bg-surface shadow-soft">
        <div className="grid grid-cols-2 divide-x divide-line sm:grid-cols-4">
          <Stat label="Kalan toplam" value={`${trNumber(totals.all)} ₺`} big />
          {PERSON_KEYS.map((key) => (
            <Stat
              key={key}
              label={people[key].name}
              value={`${trNumber(totals.byPerson[key])} ₺`}
              accent={people[key].accent}
            />
          ))}
          <Stat label="Alıcı belirsiz" value={`${trNumber(totals.unassigned)} ₺`} />
        </div>
        {totals.doneCount > 0 ? (
          <p className="border-t border-line px-5 py-2.5 text-[0.78rem] text-ink-faint">
            {totals.doneCount} öğe alındı — toplamlar kalanlar üzerinden.
          </p>
        ) : null}
      </section>

      {error ? (
        <p className="mb-4 rounded-btn bg-bad/10 px-4 py-2.5 text-[0.85rem] text-bad">{error}</p>
      ) : null}

      {categories.map((category) => (
        <CategorySection
          key={category}
          category={category}
          items={items.filter((i) => i.category === category)}
          me={me}
          people={people}
          onAdded={(item) => setItems((list) => [...list, item])}
          onChanged={(item) => setItems((list) => list.map((i) => (i.id === item.id ? item : i)))}
          onDeleted={(id) => setItems((list) => list.filter((i) => i.id !== id))}
          onCategoryRemoved={() => setCategories((list) => list.filter((c) => c !== category))}
          onError={setError}
        />
      ))}

      {/* Yeni kategori */}
      <form onSubmit={createCategory} className="mt-8 flex max-w-sm gap-2">
        <input
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="Yeni kategori — Elektronik, Beyaz Eşya…"
          maxLength={40}
          className="h-11 min-w-0 flex-1 rounded-btn border border-line bg-surface px-4 outline-none transition-colors placeholder:text-ink-faint focus:border-ink"
        />
        <Button type="submit" variant="outline" disabled={!newCategory.trim()}>
          <Plus className="size-4" strokeWidth={2} aria-hidden />
          Kategori
        </Button>
      </form>
    </div>
  );
}

function Stat({
  label,
  value,
  big,
  accent,
}: {
  label: string;
  value: string;
  big?: boolean;
  accent?: string;
}) {
  return (
    <div className="px-5 py-4">
      <p className="flex items-center gap-1.5 text-[0.68rem] uppercase tracking-[0.14em] text-ink-faint">
        {accent ? (
          <span className="size-2 rounded-full" style={{ background: accent }} />
        ) : null}
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-display font-bold tabular-nums leading-none",
          big ? "text-[1.6rem]" : "text-[1.15rem]",
        )}
      >
        {value}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function CategorySection({
  category,
  items,
  me,
  people,
  onAdded,
  onChanged,
  onDeleted,
  onCategoryRemoved,
  onError,
}: {
  category: string;
  items: CeyizItemView[];
  me: PersonKey;
  people: People;
  onAdded: (item: CeyizItemView) => void;
  onChanged: (item: CeyizItemView) => void;
  onDeleted: (id: string) => void;
  onCategoryRemoved: () => void;
  onError: (message: string | null) => void;
}) {
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [buyer, setBuyer] = useState<PersonKey | null>(null);
  const [busy, setBusy] = useState(false);

  const subtotal = items
    .filter((i) => !i.done && i.price !== null)
    .reduce((acc, i) => acc + (i.price ?? 0), 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !title.trim()) return;
    setBusy(true);
    const result = await addCeyizItem({
      category,
      title: title.trim(),
      price: price ? Number(price) : null,
      buyerId: buyer,
    });
    setBusy(false);
    if (!result.ok) return onError(result.error);
    onAdded(result.item);
    onError(null);
    setTitle("");
    setPrice("");
  }

  async function removeCategory() {
    const result = await removeCeyizCategory(category);
    if (!result.ok) return onError(result.error);
    onCategoryRemoved();
  }

  return (
    <section className="mb-6">
      <div className="mb-2.5 flex items-baseline gap-3">
        <h2 className="text-[1.3rem] font-bold uppercase tracking-tight">{category}</h2>
        {subtotal > 0 ? (
          <span className="text-[0.82rem] tabular-nums text-ink-soft">
            {trNumber(subtotal)} ₺
          </span>
        ) : null}
        {items.length === 0 ? (
          <button
            type="button"
            onClick={removeCategory}
            className="ml-auto text-[0.75rem] text-ink-faint underline-offset-2 hover:text-bad hover:underline"
          >
            kategoriyi sil
          </button>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-card border border-line bg-surface shadow-soft">
        {items.map((item) => (
          <Row
            key={item.id}
            item={item}
            people={people}
            onChanged={onChanged}
            onDeleted={onDeleted}
            onError={onError}
          />
        ))}

        {/* Ekleme satırı */}
        <form
          onSubmit={submit}
          className="flex flex-wrap items-center gap-2 bg-[#fafafa] px-3 py-2.5 sm:flex-nowrap"
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`${category} için ekle…`}
            maxLength={120}
            className="h-10 min-w-0 flex-1 basis-40 rounded-btn border border-line bg-surface px-3 text-[0.9rem] outline-none transition-colors placeholder:text-ink-faint focus:border-ink"
          />
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/\D/g, "").slice(0, 8))}
            placeholder="₺ fiyat"
            inputMode="numeric"
            className="h-10 w-24 rounded-btn border border-line bg-surface px-3 text-[0.9rem] tabular-nums outline-none transition-colors placeholder:text-ink-faint focus:border-ink"
          />
          <BuyerPicker value={buyer} onChange={setBuyer} people={people} />
          <Button type="submit" size="sm" disabled={busy || !title.trim()} aria-label="Ekle">
            <Plus className="size-4" strokeWidth={2} aria-hidden />
          </Button>
        </form>
      </div>
    </section>
  );
}

function Row({
  item,
  people,
  onChanged,
  onDeleted,
  onError,
}: {
  item: CeyizItemView;
  people: People;
  onChanged: (item: CeyizItemView) => void;
  onDeleted: (id: string) => void;
  onError: (message: string | null) => void;
}) {
  async function patch(patchInput: { price?: number | null; buyerId?: PersonKey | null; done?: boolean }) {
    // İyimser uygula, hata olursa geri al.
    const previous = item;
    onChanged({ ...item, ...patchInput } as CeyizItemView);
    const result = await updateCeyizItem({ id: item.id, ...patchInput });
    if (!result.ok) {
      onChanged(previous);
      onError(result.error);
    }
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 border-b border-line px-3 py-2.5 sm:flex-nowrap",
        item.done && "opacity-55",
      )}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={item.done}
        aria-label={item.done ? "Geri al" : "Alındı işaretle"}
        onClick={() => patch({ done: !item.done })}
        className={cn(
          "grid size-6 shrink-0 place-items-center rounded-full border transition-colors",
          item.done
            ? "border-ink bg-ink text-white"
            : "border-line-strong text-transparent hover:border-ink",
        )}
      >
        <Check className="size-3.5" strokeWidth={3} aria-hidden />
      </button>

      <span
        className={cn(
          "min-w-0 flex-1 basis-40 truncate text-[0.92rem]",
          item.done && "line-through",
        )}
      >
        {item.title}
      </span>

      <PriceEditor
        value={item.price}
        onSave={(value) => patch({ price: value })}
      />

      <BuyerPicker
        value={(item.buyerId as PersonKey | null) ?? null}
        onChange={(value) => patch({ buyerId: value })}
        people={people}
      />

      <button
        type="button"
        aria-label="Sil"
        onClick={() => {
          onDeleted(item.id);
          void deleteCeyizItem(item.id);
        }}
        className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-faint transition-colors hover:bg-bad/10 hover:text-bad"
      >
        <Trash2 className="size-4" strokeWidth={1.7} aria-hidden />
      </button>
    </div>
  );
}

function PriceEditor({
  value,
  onSave,
}: {
  value: number | null;
  onSave: (value: number | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value?.toString() ?? "");

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(value?.toString() ?? "");
          setEditing(true);
        }}
        className="w-24 shrink-0 rounded-btn px-2 py-1 text-right text-[0.88rem] tabular-nums text-ink-soft transition-colors hover:bg-[#f0f0f0]"
        title="Fiyatı düzenle"
      >
        {value !== null ? `${trNumber(value)} ₺` : "— ₺"}
      </button>
    );
  }

  return (
    <input
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value.replace(/\D/g, "").slice(0, 8))}
      onBlur={() => {
        setEditing(false);
        onSave(draft ? Number(draft) : null);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") setEditing(false);
      }}
      inputMode="numeric"
      className="h-9 w-24 shrink-0 rounded-btn border border-ink bg-surface px-2 text-right text-[0.88rem] tabular-nums outline-none"
    />
  );
}

/** Bilal / Sümeyye / belirsiz üçlü seçici — baş harfli mini rozetler. */
function BuyerPicker({
  value,
  onChange,
  people,
}: {
  value: PersonKey | null;
  onChange: (value: PersonKey | null) => void;
  people: People;
}) {
  return (
    <div className="flex shrink-0 gap-1" role="radiogroup" aria-label="Kim alacak">
      {PERSON_KEYS.map((key) => {
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={active}
            title={`${people[key].name} alacak`}
            onClick={() => onChange(active ? null : key)}
            className={cn(
              "grid size-8 place-items-center rounded-full border text-[0.75rem] font-semibold transition-[background-color,border-color,color]",
              active
                ? "border-transparent text-white"
                : "border-line-strong text-ink-faint hover:border-ink hover:text-ink",
            )}
            style={active ? { background: people[key].accent } : undefined}
          >
            {people[key].name.slice(0, 1).toLocaleUpperCase("tr-TR")}
          </button>
        );
      })}
      {value !== null ? (
        <button
          type="button"
          aria-label="Alıcıyı kaldır"
          onClick={() => onChange(null)}
          className="grid size-8 place-items-center rounded-full text-ink-faint transition-colors hover:text-ink"
        >
          <X className="size-3.5" strokeWidth={2} aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
