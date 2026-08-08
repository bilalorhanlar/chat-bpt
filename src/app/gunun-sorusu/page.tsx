import type { Metadata } from "next";

import { PageShell } from "@/components/layout/page-shell";
import { QuestionOfTheDay, type ArchiveEntry } from "@/components/questions/question-of-the-day";
import { PERSON_KEYS, type PersonKey } from "@/config/site";
import { db } from "@/lib/db";
import { getPeople, partnerOf } from "@/lib/people";
import { requireSession } from "@/lib/session";
import { questionForDate } from "@/lib/daily-question";
import { toDateString, todayDateOnly } from "@/lib/date-only";

export const metadata: Metadata = { title: "Günün Sorusu" };
export const dynamic = "force-dynamic";

export default async function QuestionPage() {
  const [session, people] = await Promise.all([requireSession(), getPeople()]);
  const today = todayDateOnly();

  const row = await db.dailyQuestion.findUnique({
    where: { date: today },
    include: { answers: true },
  });

  const answers = new Map(row?.answers.map((a) => [a.userId, a.text]) ?? []);
  const bothAnswered = PERSON_KEYS.every((key) => answers.has(key));

  // Karşı tarafın cevabı ikisi de yazana kadar istemciye **hiç** gönderilmiyor.
  // Gizlemeyi arayüze bırakmak, ağ sekmesinden okunabilir olurdu.
  const partnerKey: PersonKey = partnerOf(session.user);

  const archiveRows = await db.dailyQuestion.findMany({
    where: { date: { lt: today } },
    include: { answers: true },
    orderBy: { date: "desc" },
    take: 60,
  });

  const archive: ArchiveEntry[] = archiveRows
    .filter((entry) => PERSON_KEYS.every((key) => entry.answers.some((a) => a.userId === key)))
    .map((entry) => ({
      date: toDateString(entry.date),
      text: entry.text,
      answers: Object.fromEntries(entry.answers.map((a) => [a.userId, a.text])) as Record<
        string,
        string
      >,
    }));

  return (
    <PageShell title="Günün Sorusu" eyebrow="bizden">
      <QuestionOfTheDay
        date={toDateString(today)}
        question={row?.text ?? questionForDate(today)}
        me={people[session.user]}
        partner={people[partnerKey]}
        myAnswer={answers.get(session.user) ?? null}
        partnerAnswer={bothAnswered ? (answers.get(partnerKey) ?? null) : null}
        partnerAnswered={answers.has(partnerKey)}
        archive={archive}
        people={people}
      />
    </PageShell>
  );
}
