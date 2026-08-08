"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, MailOpen, PenLine, Trash2, X } from "lucide-react";

import { deleteLetter, markLetterOpened, writeLetter } from "@/app/mektuplar/actions";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";
import { cn, trDate } from "@/lib/utils";

export type LetterView = {
  id: string;
  title: string;
  /** Kilitliyken sunucu `null` gönderir. */
  body: string | null;
  openAt: string;
  openedAt: string | null;
  unlocked: boolean;
  /** Kendi yazdığım mektup mu — kendi mektubumu her zaman okuyabilirim. */
  mine: boolean;
};

type Tab = "gelen" | "giden";

export function LetterBoard({
  received,
  sent,
  partnerName,
}: {
  received: LetterView[];
  sent: LetterView[];
  partnerName: string;
}) {
  const [tab, setTab] = useState<Tab>("gelen");
  const [writing, setWriting] = useState(false);
  const [reading, setReading] = useState<LetterView | null>(null);

  const list = tab === "gelen" ? received : sent;
  const unreadCount = received.filter((l) => l.unlocked && !l.openedAt).length;

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <div className="flex rounded-full bg-brand-50 p-1">
          <TabButton active={tab === "gelen"} onClick={() => setTab("gelen")}>
            Gelenler
            {unreadCount > 0 ? (
              <span className="ml-1.5 grid size-5 place-items-center rounded-full bg-accent-400 text-[0.65rem] font-semibold text-white">
                {unreadCount}
              </span>
            ) : null}
          </TabButton>
          <TabButton active={tab === "giden"} onClick={() => setTab("giden")}>
            Yazdıklarım
          </TabButton>
        </div>

        <Button className="ml-auto" onClick={() => setWriting(true)}>
          <PenLine className="size-4" strokeWidth={1.9} aria-hidden />
          <span className="hidden sm:inline">Mektup yaz</span>
        </Button>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={<Mail className="size-9" strokeWidth={1.3} />}
          title={tab === "gelen" ? "Sana henüz mektup yok" : "Henüz mektup yazmadın"}
          hint={
            tab === "gelen"
              ? `${partnerName} bir mektup bıraktığında burada görünecek.`
              : "Bir tarih seç, o gün gelene kadar kilitli kalsın."
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {list.map((letter) => (
            <LetterCard key={letter.id} letter={letter} onOpen={() => setReading(letter)} />
          ))}
        </ul>
      )}

      {writing ? <WriteDialog partnerName={partnerName} onClose={() => setWriting(false)} /> : null}
      {reading ? <ReadDialog letter={reading} onClose={() => setReading(null)} /> : null}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center rounded-full px-4 py-1.5 text-[0.85rem] font-medium transition-colors",
        active ? "bg-surface text-brand-700 shadow-soft" : "text-ink-soft hover:text-brand-700",
      )}
    >
      {children}
    </button>
  );
}

function LetterCard({ letter, onOpen }: { letter: LetterView; onOpen: () => void }) {
  const router = useRouter();
  const locked = !letter.unlocked;

  async function remove(e: React.MouseEvent) {
    e.stopPropagation();
    await deleteLetter(letter.id);
    router.refresh();
  }

  return (
    <li>
      <button
        type="button"
        onClick={locked ? undefined : onOpen}
        disabled={locked}
        className={cn(
          "group relative w-full overflow-hidden rounded-card border p-5 text-left shadow-soft backdrop-blur-sm transition-[transform,box-shadow,border-color] duration-300",
          locked
            ? "cursor-default border-dashed border-line-strong bg-surface/50"
            : "border-line bg-surface/85 hover:-translate-y-1 hover:border-brand-200 hover:shadow-lift",
        )}
      >
        <div className="mb-2.5 flex items-center gap-2.5">
          <span
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-xl",
              locked
                ? "bg-brand-50 text-brand-300"
                : letter.openedAt || letter.mine
                  ? "bg-brand-50 text-brand-500"
                  : "bg-accent-200/60 text-accent-500",
            )}
          >
            {locked ? (
              <Lock className="size-4" strokeWidth={1.7} aria-hidden />
            ) : letter.openedAt || letter.mine ? (
              <MailOpen className="size-4" strokeWidth={1.7} aria-hidden />
            ) : (
              <Mail className="size-4" strokeWidth={1.7} aria-hidden />
            )}
          </span>

          <span className="min-w-0 flex-1">
            <span className="block truncate font-display text-[1.1rem] leading-snug">
              {letter.title}
            </span>
          </span>

          {letter.mine && !letter.openedAt ? (
            <span
              role="button"
              tabIndex={0}
              onClick={remove}
              onKeyDown={(e) => e.key === "Enter" && remove(e as unknown as React.MouseEvent)}
              aria-label="Mektubu sil"
              className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-faint transition-colors hover:bg-bad/10 hover:text-bad"
            >
              <Trash2 className="size-4" strokeWidth={1.7} aria-hidden />
            </span>
          ) : null}
        </div>

        <p className="text-[0.8rem] text-ink-faint">
          {locked
            ? `${trDate(letter.openAt.slice(0, 10))} tarihinde açılacak`
            : letter.mine
              ? `${trDate(letter.openAt.slice(0, 10))} tarihinde açıldı`
              : letter.openedAt
                ? "Okundu"
                : "Yeni · okumak için dokun"}
        </p>
      </button>
    </li>
  );
}

function ReadDialog({ letter, onClose }: { letter: LetterView; onClose: () => void }) {
  const router = useRouter();

  useEffect(() => {
    if (letter.mine || letter.openedAt) return;
    void markLetterOpened(letter.id).then(() => router.refresh());
  }, [letter, router]);

  return (
    <Dialog onClose={onClose}>
      <p className="mb-1.5 text-[0.7rem] font-medium uppercase tracking-[0.18em] text-brand-500">
        {trDate(letter.openAt.slice(0, 10))}
      </p>
      <h2 className="mb-5 text-[1.5rem] leading-tight">{letter.title}</h2>
      <p className="whitespace-pre-wrap text-[0.98rem] leading-[1.75] text-ink">{letter.body}</p>
    </Dialog>
  );
}

function WriteDialog({ partnerName, onClose }: { partnerName: string; onClose: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [openAt, setOpenAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Varsayılan olarak yarından itibaren seçilebilsin.
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const result = await writeLetter({ title, body, openAt });
    setBusy(false);
    if (!result.ok) return setError(result.error);
    onClose();
    router.refresh();
  }

  return (
    <Dialog onClose={onClose}>
      <h2 className="mb-1 text-[1.4rem] leading-tight">{partnerName}&apos;a mektup</h2>
      <p className="mb-5 text-[0.85rem] text-ink-soft">
        Seçtiğin tarih gelene kadar kilitli kalacak — sen bile açamayacaksın.
      </p>

      <form onSubmit={submit}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Başlık"
          maxLength={120}
          required
          className="mb-3 h-11 w-full rounded-btn border border-line bg-surface px-3.5 outline-none transition-colors placeholder:text-ink-faint focus:border-brand-300"
        />

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={9}
          maxLength={8000}
          required
          placeholder="Mektubunu yaz…"
          className="mb-3 w-full resize-none rounded-btn border border-line bg-surface p-4 leading-relaxed outline-none transition-colors placeholder:text-ink-faint focus:border-brand-300"
        />

        <label className="mb-4 block">
          <span className="mb-1.5 block text-[0.8rem] text-ink-soft">Açılma tarihi</span>
          <input
            type="date"
            value={openAt}
            min={tomorrow}
            onChange={(e) => setOpenAt(e.target.value)}
            required
            className="h-11 w-full rounded-btn border border-line bg-surface px-3.5 outline-none transition-colors focus:border-brand-300 sm:w-56"
          />
        </label>

        {error ? <p className="mb-3 text-[0.85rem] text-bad">{error}</p> : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Vazgeç
          </Button>
          <Button type="submit" disabled={busy || !title.trim() || !body.trim() || !openAt}>
            Kilitle ve gönder
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function Dialog({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    // Arka plan kaymasın.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-brand-900/25 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90svh] w-full max-w-xl animate-[rise-in_.28s_var(--ease-out-soft)] overflow-y-auto rounded-t-card border border-line bg-surface p-6 shadow-lift sm:rounded-card sm:p-8"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Kapat"
          className="float-right -mr-1 -mt-1 grid size-9 place-items-center rounded-full text-ink-faint transition-colors hover:bg-brand-50 hover:text-brand-700"
        >
          <X className="size-5" strokeWidth={1.8} aria-hidden />
        </button>
        {children}
      </div>
    </div>
  );
}
