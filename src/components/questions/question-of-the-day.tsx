"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Lock, Pencil } from "lucide-react";

import { answerQuestion } from "@/app/gunun-sorusu/actions";
import { Button } from "@/components/ui/button";
import type { PersonKey } from "@/config/site";
import type { People } from "@/lib/people";
import { cn, trDate } from "@/lib/utils";

type Person = { key: PersonKey; name: string; accent: string };

export type ArchiveEntry = {
  date: string;
  text: string;
  answers: Record<string, string>;
};

export function QuestionOfTheDay({
  date,
  question,
  me,
  partner,
  myAnswer,
  partnerAnswer,
  partnerAnswered,
  archive,
  people,
}: {
  date: string;
  question: string;
  me: Person;
  partner: Person;
  myAnswer: string | null;
  /** İkisi de cevaplamadıysa sunucu bunu `null` gönderir. */
  partnerAnswer: string | null;
  partnerAnswered: boolean;
  archive: ArchiveEntry[];
  people: People;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(myAnswer ?? "");
  const [editing, setEditing] = useState(myAnswer === null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const revealed = partnerAnswer !== null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !draft.trim()) return;
    setBusy(true);
    const result = await answerQuestion({ date, text: draft });
    setBusy(false);
    if (!result.ok) return setError(result.error);
    setError(null);
    setEditing(false);
    router.refresh();
  }

  return (
    <div>
      <div className="rounded-card border border-line bg-surface/85 p-6 shadow-soft backdrop-blur-sm sm:p-8">
        <p className="mb-2 text-[0.7rem] font-medium uppercase tracking-[0.18em] text-brand-500">
          {trDate(date)}
        </p>
        <h2 className="text-balance-tr text-[1.4rem] leading-snug sm:text-[1.7rem]">{question}</h2>

        {editing ? (
          <form onSubmit={submit} className="mt-6">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={4}
              maxLength={1000}
              autoFocus
              placeholder="Cevabını yaz…"
              className="w-full resize-none rounded-btn border border-line bg-surface p-4 leading-relaxed outline-none transition-colors placeholder:text-ink-faint focus:border-brand-300"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-[0.75rem] text-ink-faint">{draft.length}/1000</span>
              <div className="flex gap-2">
                {myAnswer !== null ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setDraft(myAnswer);
                      setEditing(false);
                    }}
                  >
                    Vazgeç
                  </Button>
                ) : null}
                <Button type="submit" disabled={busy || !draft.trim()}>
                  {myAnswer === null ? "Cevabımı gönder" : "Güncelle"}
                </Button>
              </div>
            </div>
          </form>
        ) : null}

        {error ? <p className="mt-3 text-[0.85rem] text-bad">{error}</p> : null}
      </div>

      {myAnswer !== null && !editing ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <AnswerCard person={me} text={myAnswer} onEdit={() => setEditing(true)} />

          {revealed ? (
            <AnswerCard person={partner} text={partnerAnswer} />
          ) : (
            <div className="flex flex-col items-center justify-center gap-2.5 rounded-card border border-dashed border-line-strong px-6 py-10 text-center">
              <Lock className="size-5 text-brand-300" strokeWidth={1.6} aria-hidden />
              <p className="text-[0.9rem] text-ink-soft">
                {partnerAnswered
                  ? `${partner.name} cevapladı — sayfayı yenile`
                  : `${partner.name} cevaplayınca açılacak`}
              </p>
            </div>
          )}
        </div>
      ) : null}

      {archive.length > 0 ? <Archive entries={archive} people={people} /> : null}
    </div>
  );
}

function AnswerCard({
  person,
  text,
  onEdit,
}: {
  person: Person;
  text: string;
  onEdit?: () => void;
}) {
  return (
    <div className="group relative rounded-card border border-line bg-surface/80 p-5 shadow-soft backdrop-blur-sm">
      <div className="mb-2.5 flex items-center gap-2">
        <span className="size-2.5 rounded-full" style={{ background: person.accent }} />
        <span className="text-[0.82rem] font-medium text-ink-soft">{person.name}</span>
        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            aria-label="Cevabımı düzenle"
            className="ml-auto grid size-7 place-items-center rounded-lg text-ink-faint opacity-100 transition-colors hover:bg-brand-100 hover:text-brand-700 sm:opacity-0 sm:group-hover:opacity-100"
          >
            <Pencil className="size-3.5" strokeWidth={1.7} aria-hidden />
          </button>
        ) : null}
      </div>
      <p className="whitespace-pre-wrap text-[0.95rem] leading-relaxed text-ink">{text}</p>
    </div>
  );
}

function Archive({ entries, people }: { entries: ArchiveEntry[]; people: People }) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <section className="mt-10">
      <h2 className="mb-3 text-[0.72rem] font-medium uppercase tracking-[0.18em] text-brand-500">
        Geçmiş sorular
      </h2>

      <ul className="overflow-hidden rounded-card border border-line bg-surface/70 shadow-soft">
        {entries.map((entry) => {
          const isOpen = open === entry.date;
          return (
            <li key={entry.date} className="border-b border-line last:border-b-0">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : entry.date)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-brand-50/50"
              >
                <span className="w-[5.5rem] shrink-0 text-[0.75rem] tabular-nums text-ink-faint">
                  {trDate(entry.date, { withYear: false })}
                </span>
                <span className="min-w-0 flex-1 truncate text-[0.9rem] text-ink">{entry.text}</span>
                <ChevronDown
                  className={cn(
                    "size-4 shrink-0 text-ink-faint transition-transform duration-300",
                    isOpen && "rotate-180",
                  )}
                  strokeWidth={1.8}
                  aria-hidden
                />
              </button>

              {isOpen ? (
                <div className="grid gap-3 px-4 pb-4 sm:grid-cols-2">
                  {Object.entries(entry.answers).map(([key, text]) => {
                    const person = people[key as PersonKey];
                    if (!person) return null;
                    return (
                      <div key={key} className="rounded-2xl bg-brand-50/60 p-3.5">
                        <div className="mb-1.5 flex items-center gap-2">
                          <span
                            className="size-2 rounded-full"
                            style={{ background: person.accent }}
                          />
                          <span className="text-[0.78rem] font-medium text-ink-soft">
                            {person.name}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap text-[0.88rem] leading-relaxed text-ink">
                          {text}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
