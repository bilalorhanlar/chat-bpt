"use client";

import { useState } from "react";
import { Check, Copy, Eye, EyeOff, KeyRound, Pencil, Plus, Trash2, X } from "lucide-react";

import {
  deleteCredential,
  revealCredential,
  saveCredential,
  type CredentialView,
} from "@/app/sifreler/actions";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Parola kasası.
 *
 * Sayfa yüklenirken parolalar istemciye hiç inmiyor; "göster"e basılınca tek
 * kayıt sunucudan çözülüp geliyor ve yalnızca bileşen durumunda tutuluyor.
 * Kopyala düğmesi panoya yazar; pano geçmişi olan cihazlarda dikkat.
 */
export function VaultBoard({ initialItems }: { initialItems: CredentialView[] }) {
  const [items, setItems] = useState(initialItems);
  const [editing, setEditing] = useState<CredentialView | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between gap-3">
        <p className="text-[0.85rem] leading-relaxed text-ink-soft">
          Parolalar veritabanında şifreli duruyor; yalnızca &quot;göster&quot; deyince çözülüyor.
        </p>
        <Button onClick={() => setEditing("new")}>
          <Plus className="size-4" strokeWidth={2} aria-hidden />
          Yeni kayıt
        </Button>
      </div>

      {error ? (
        <p className="mb-4 rounded-btn bg-bad/10 px-4 py-2.5 text-[0.85rem] text-bad">{error}</p>
      ) : null}

      {items.length === 0 ? (
        <EmptyState
          icon={<KeyRound className="size-9" strokeWidth={1.3} />}
          title="Kasa boş"
          hint="Netflix, Wi-Fi, e-Devlet… ortak hesapları buraya yazın, bir daha aramayın."
        />
      ) : (
        <ul className="overflow-hidden rounded-card border border-line bg-surface shadow-soft">
          {items.map((item) => (
            <VaultRow
              key={item.id}
              item={item}
              onEdit={() => setEditing(item)}
              onDeleted={() => setItems((list) => list.filter((i) => i.id !== item.id))}
              onError={setError}
            />
          ))}
        </ul>
      )}

      {editing !== null ? (
        <EditDialog
          item={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(item) => {
            setItems((list) => {
              const exists = list.some((i) => i.id === item.id);
              const next = exists
                ? list.map((i) => (i.id === item.id ? item : i))
                : [...list, item];
              return next.sort((a, b) => a.title.localeCompare(b.title, "tr"));
            });
            setEditing(null);
            setError(null);
          }}
        />
      ) : null}
    </div>
  );
}

function VaultRow({
  item,
  onEdit,
  onDeleted,
  onError,
}: {
  item: CredentialView;
  onEdit: () => void;
  onDeleted: () => void;
  onError: (message: string | null) => void;
}) {
  const [password, setPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  async function reveal() {
    if (password !== null) return setPassword(null);
    setBusy(true);
    const result = await revealCredential(item.id);
    setBusy(false);
    if (!result.ok) return onError(result.error);
    setPassword(result.password);
  }

  async function copy() {
    let value = password;
    if (value === null) {
      const result = await revealCredential(item.id);
      if (!result.ok) return onError(result.error);
      value = result.password;
    }
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <li className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3 last:border-b-0 sm:flex-nowrap">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#f4f4f4] text-brand-600">
        <KeyRound className="size-4" strokeWidth={1.6} aria-hidden />
      </span>

      <div className="min-w-0 flex-1 basis-40">
        <p className="truncate text-[0.95rem] font-semibold">{item.title}</p>
        {item.username ? (
          <p className="truncate text-[0.8rem] text-ink-soft">{item.username}</p>
        ) : null}
        {item.note ? <p className="truncate text-[0.72rem] text-ink-faint">{item.note}</p> : null}
      </div>

      <code
        className={cn(
          "min-w-[7rem] rounded-lg bg-[#f4f4f4] px-2.5 py-1.5 text-[0.82rem]",
          password === null && "tracking-[0.2em] text-ink-faint",
        )}
      >
        {password ?? "••••••"}
      </code>

      <div className="flex shrink-0 items-center gap-0.5">
        <RowButton label={password === null ? "Göster" : "Gizle"} onClick={reveal} disabled={busy}>
          {password === null ? (
            <Eye className="size-4" strokeWidth={1.7} aria-hidden />
          ) : (
            <EyeOff className="size-4" strokeWidth={1.7} aria-hidden />
          )}
        </RowButton>
        <RowButton label="Kopyala" onClick={copy}>
          {copied ? (
            <Check className="size-4 text-good" strokeWidth={2.2} aria-hidden />
          ) : (
            <Copy className="size-4" strokeWidth={1.7} aria-hidden />
          )}
        </RowButton>
        <RowButton label="Düzenle" onClick={onEdit}>
          <Pencil className="size-4" strokeWidth={1.7} aria-hidden />
        </RowButton>
        <RowButton
          label="Sil"
          danger
          onClick={() => {
            if (!confirm(`"${item.title}" silinsin mi?`)) return;
            onDeleted();
            void deleteCredential(item.id);
          }}
        >
          <Trash2 className="size-4" strokeWidth={1.7} aria-hidden />
        </RowButton>
      </div>
    </li>
  );
}

function RowButton({
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
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "grid size-8 place-items-center rounded-lg text-ink-faint transition-colors disabled:opacity-40",
        danger ? "hover:bg-bad/10 hover:text-bad" : "hover:bg-[#efefef] hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function EditDialog({
  item,
  onClose,
  onSaved,
}: {
  item: CredentialView | null;
  onClose: () => void;
  onSaved: (item: CredentialView) => void;
}) {
  const [title, setTitle] = useState(item?.title ?? "");
  const [username, setUsername] = useState(item?.username ?? "");
  const [password, setPassword] = useState("");
  const [note, setNote] = useState(item?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const result = await saveCredential({
      id: item?.id,
      title,
      username,
      password,
      note: note || undefined,
    });
    setBusy(false);
    if (!result.ok) return setError(result.error);
    onSaved(result.item);
  }

  const INPUT =
    "h-11 w-full rounded-btn border border-line bg-surface px-3.5 outline-none transition-colors placeholder:text-ink-faint focus:border-ink";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md animate-[rise-in_.25s_var(--ease-out-soft)] rounded-t-card border border-line bg-surface p-6 shadow-lift sm:rounded-card"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[1.3rem] font-bold">{item ? "Kaydı düzenle" : "Yeni kayıt"}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="grid size-9 place-items-center rounded-full text-ink-faint hover:bg-[#f0f0f0] hover:text-ink"
          >
            <X className="size-5" strokeWidth={1.8} aria-hidden />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ne için? — Netflix, ev Wi-Fi…"
            maxLength={80}
            required
            className={INPUT}
          />
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Kullanıcı adı / e-posta (opsiyonel)"
            maxLength={120}
            autoComplete="off"
            className={INPUT}
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={item ? "Yeni parola (değiştirmek için)" : "Parola"}
            maxLength={500}
            required
            autoComplete="off"
            className={INPUT}
          />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Not (opsiyonel)"
            maxLength={500}
            className={INPUT}
          />

          {error ? <p className="text-[0.85rem] text-bad">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose}>
              Vazgeç
            </Button>
            <Button type="submit" disabled={busy || !title.trim() || !password}>
              Kaydet
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
