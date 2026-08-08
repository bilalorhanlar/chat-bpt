"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { Check, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";

import {
  addListItem,
  deleteListItem,
  moveListItem,
  toggleListItem,
  updateListItem,
  type ListItemView,
} from "@/app/listeler/[tur]/actions";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { PEOPLE, type PersonKey } from "@/config/site";
import type { ListConfig, ListSlug } from "@/lib/lists";
import { cn } from "@/lib/utils";

/**
 * Dört listenin de gövdesi.
 *
 * Durum istemcide tutuluyor ve sunucu eylemi çağrılmadan **önce** güncelleniyor;
 * ağ turunu beklemek bir onay kutusunda fark ediliyor. Eylem hata verirse
 * değişiklik geri alınıyor ve satırın altında sebep gösteriliyor.
 */
export function ListBoard({
  slug,
  config,
  initialItems,
}: {
  slug: ListSlug;
  config: ListConfig;
  initialItems: ListItemView[];
}) {
  const [items, setItems] = useState(initialItems);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const { open, done } = useMemo(
    () => ({
      open: items.filter((i) => !i.done),
      done: items.filter((i) => i.done),
    }),
    [items],
  );

  function run(action: () => Promise<unknown>, rollback: () => void) {
    startTransition(async () => {
      try {
        await action();
        setError(null);
      } catch {
        rollback();
        setError("Kaydedilemedi. Bağlantını kontrol et.");
      }
    });
  }

  function handleToggle(item: ListItemView) {
    const next = !item.done;
    const snapshot = items;
    setItems((list) => list.map((i) => (i.id === item.id ? { ...i, done: next } : i)));
    run(
      () => toggleListItem(slug, item.id, next),
      () => setItems(snapshot),
    );
  }

  function handleDelete(item: ListItemView) {
    const snapshot = items;
    setItems((list) => list.filter((i) => i.id !== item.id));
    run(
      () => deleteListItem(slug, item.id),
      () => setItems(snapshot),
    );
  }

  function handleMove(item: ListItemView, direction: "up" | "down") {
    const snapshot = items;
    const ordered = [...open];
    const index = ordered.findIndex((i) => i.id === item.id);
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= ordered.length) return;
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    setItems([...ordered, ...done]);
    run(
      () => moveListItem(slug, item.id, direction),
      () => setItems(snapshot),
    );
  }

  function handleRename(item: ListItemView, title: string) {
    const trimmed = title.trim();
    if (!trimmed || trimmed === item.title) return;
    const snapshot = items;
    setItems((list) => list.map((i) => (i.id === item.id ? { ...i, title: trimmed } : i)));
    run(
      () => updateListItem(slug, item.id, { title: trimmed }),
      () => setItems(snapshot),
    );
  }

  return (
    <div>
      <AddForm
        config={config}
        slug={slug}
        onAdded={(item) => setItems((list) => [item, ...list])}
        onError={setError}
      />

      {items.length > 0 ? (
        <Progress done={done.length} total={items.length} label={config.doneLabel} />
      ) : null}

      {error ? (
        <p className="mb-4 rounded-btn bg-bad/10 px-4 py-2.5 text-[0.85rem] text-bad">{error}</p>
      ) : null}

      {items.length === 0 ? (
        <EmptyState
          icon={<Icon name={config.icon} className="size-9" strokeWidth={1.3} />}
          title={config.emptyTitle}
          hint={config.emptyHint}
        />
      ) : null}

      {open.length > 0 ? (
        <ul className="overflow-hidden rounded-card border border-line bg-surface/80 shadow-soft backdrop-blur-sm">
          {open.map((item, i) => (
            <Row
              key={item.id}
              item={item}
              first={i === 0}
              last={i === open.length - 1}
              onToggle={() => handleToggle(item)}
              onDelete={() => handleDelete(item)}
              onMove={(d) => handleMove(item, d)}
              onRename={(t) => handleRename(item, t)}
            />
          ))}
        </ul>
      ) : null}

      {done.length > 0 ? (
        <DoneSection
          label={config.doneLabel}
          items={done}
          onToggle={handleToggle}
          onDelete={handleDelete}
        />
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function AddForm({
  config,
  slug,
  onAdded,
  onError,
}: {
  config: ListConfig;
  slug: ListSlug;
  onAdded: (item: ListItemView) => void;
  onError: (message: string | null) => void;
}) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState(config.kinds?.[0]?.value ?? "");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = title.trim();
    if (!value || busy) return;

    setBusy(true);
    const result = await addListItem({ slug, title: value, kind: kind || undefined });
    setBusy(false);

    if (!result.ok) {
      onError(result.error);
      return;
    }
    onError(null);
    onAdded(result.item);
    setTitle("");
    inputRef.current?.focus();
  }

  return (
    <form onSubmit={submit} className="mb-6">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={config.placeholder}
          maxLength={160}
          className="h-12 min-w-0 flex-1 rounded-btn border border-line bg-surface px-4 text-ink shadow-soft outline-none transition-colors placeholder:text-ink-faint focus:border-brand-300"
        />
        <Button type="submit" size="lg" disabled={busy || !title.trim()} aria-label="Ekle">
          <Plus className="size-5" strokeWidth={2} aria-hidden />
          <span className="hidden sm:inline">Ekle</span>
        </Button>
      </div>

      {config.kinds ? (
        <div className="mt-2.5 flex gap-2">
          {config.kinds.map((k) => (
            <button
              key={k.value}
              type="button"
              onClick={() => setKind(k.value)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-[0.8rem] font-medium transition-colors",
                kind === k.value
                  ? "bg-brand-600 text-white"
                  : "bg-brand-50 text-brand-700 hover:bg-brand-100",
              )}
            >
              {k.label}
            </button>
          ))}
        </div>
      ) : null}
    </form>
  );
}

function Progress({ done, total, label }: { done: number; total: number; label: string }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="mb-5">
      <div className="mb-1.5 flex items-baseline justify-between text-[0.8rem]">
        <span className="text-ink-soft">
          {done} / {total} {label.toLocaleLowerCase("tr-TR")}
        </span>
        <span className="tabular-nums text-brand-600">%{pct}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-brand-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-[width] duration-500 ease-[var(--ease-out-soft)]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Row({
  item,
  first,
  last,
  onToggle,
  onDelete,
  onMove,
  onRename,
}: {
  item: ListItemView;
  first: boolean;
  last: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onMove: (direction: "up" | "down") => void;
  onRename: (title: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const person = PEOPLE[item.createdById as PersonKey];

  return (
    <li className="group flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0 transition-colors hover:bg-brand-50/40">
      <Checkbox done={item.done} onClick={onToggle} />

      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            autoFocus
            defaultValue={item.title}
            onBlur={(e) => {
              onRename(e.target.value);
              setEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") setEditing(false);
            }}
            className="w-full rounded-md border border-brand-300 bg-surface px-2 py-1 text-[0.95rem] outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="block w-full truncate text-left text-[0.95rem] text-ink decoration-brand-200 underline-offset-4 hover:underline"
          >
            {item.title}
          </button>
        )}
        {item.kind ? (
          <span className="mt-0.5 inline-block rounded-full bg-brand-50 px-2 py-0.5 text-[0.68rem] font-medium uppercase tracking-wide text-brand-600">
            {item.kind}
          </span>
        ) : null}
      </div>

      {person ? (
        <span
          title={`${person.name} ekledi`}
          className="size-2 shrink-0 rounded-full"
          style={{ background: person.accent }}
        />
      ) : null}

      {/* Dokunmatikte hover yok; eylemler mobilde her zaman görünür. */}
      <div className="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
        <IconButton label="Yukarı taşı" disabled={first} onClick={() => onMove("up")}>
          <ChevronUp className="size-4" strokeWidth={1.8} aria-hidden />
        </IconButton>
        <IconButton label="Aşağı taşı" disabled={last} onClick={() => onMove("down")}>
          <ChevronDown className="size-4" strokeWidth={1.8} aria-hidden />
        </IconButton>
        <IconButton label="Sil" danger onClick={onDelete}>
          <Trash2 className="size-4" strokeWidth={1.7} aria-hidden />
        </IconButton>
      </div>
    </li>
  );
}

function DoneSection({
  label,
  items,
  onToggle,
  onDelete,
}: {
  label: string;
  items: ListItemView[];
  onToggle: (item: ListItemView) => void;
  onDelete: (item: ListItemView) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 py-2 text-[0.8rem] font-medium uppercase tracking-[0.14em] text-ink-faint transition-colors hover:text-brand-600"
      >
        <ChevronDown
          className={cn("size-4 transition-transform duration-300", open && "rotate-180")}
          strokeWidth={1.8}
          aria-hidden
        />
        {label} ({items.length})
      </button>

      {open ? (
        <ul className="mt-2 overflow-hidden rounded-card border border-line bg-surface/60">
          {items.map((item) => (
            <li
              key={item.id}
              className="group flex items-center gap-3 border-b border-line px-4 py-2.5 last:border-b-0"
            >
              <Checkbox done onClick={() => onToggle(item)} />
              <span className="min-w-0 flex-1 truncate text-[0.9rem] text-ink-faint line-through">
                {item.title}
              </span>
              <IconButton label="Sil" danger onClick={() => onDelete(item)}>
                <Trash2 className="size-4" strokeWidth={1.7} aria-hidden />
              </IconButton>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Checkbox({ done, onClick }: { done: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="checkbox"
      aria-checked={done}
      aria-label={done ? "Geri al" : "Tamamlandı işaretle"}
      className={cn(
        "grid size-6 shrink-0 place-items-center rounded-full border transition-[background-color,border-color,transform] duration-200 active:scale-90",
        done
          ? "border-brand-600 bg-brand-600 text-white"
          : "border-line-strong text-transparent hover:border-brand-400",
      )}
    >
      <Check className="size-3.5" strokeWidth={3} aria-hidden />
    </button>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "grid size-8 place-items-center rounded-lg transition-colors disabled:opacity-25",
        danger
          ? "text-ink-faint hover:bg-bad/10 hover:text-bad"
          : "text-ink-faint hover:bg-brand-100 hover:text-brand-700",
      )}
    >
      {children}
    </button>
  );
}
