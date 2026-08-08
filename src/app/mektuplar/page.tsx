import type { Metadata } from "next";

import { PageShell } from "@/components/layout/page-shell";
import { LetterBoard, type LetterView } from "@/components/letters/letter-board";
import { db } from "@/lib/db";
import { getPeople, partnerOf } from "@/lib/people";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Mektuplar" };
export const dynamic = "force-dynamic";

export default async function LettersPage() {
  const [session, people] = await Promise.all([requireSession(), getPeople()]);
  const partner = people[partnerOf(session.user)];

  const [received, sent] = await Promise.all([
    db.letter.findMany({ where: { toId: session.user }, orderBy: { openAt: "asc" } }),
    db.letter.findMany({ where: { fromId: session.user }, orderBy: { openAt: "asc" } }),
  ]);

  const now = Date.now();

  /**
   * Kilitli mektubun gövdesi istemciye **hiç** gitmiyor.
   * Gizlemeyi arayüze bırakmak, içeriği ağ sekmesinden okunabilir yapardı —
   * zaman kapsülü fikrinin tamamı buna dayanıyor.
   */
  const toView = (
    row: (typeof received)[number],
    opts: { mine: boolean },
  ): LetterView => {
    const unlocked = opts.mine || row.openAt.getTime() <= now;
    return {
      id: row.id,
      title: row.title,
      body: unlocked ? row.body : null,
      openAt: row.openAt.toISOString(),
      openedAt: row.openedAt?.toISOString() ?? null,
      unlocked,
      mine: opts.mine,
    };
  };

  return (
    <PageShell title="Mektuplar" eyebrow="bizden">
      <LetterBoard
        received={received.map((row) => toView(row, { mine: false }))}
        sent={sent.map((row) => toView(row, { mine: true }))}
        partnerName={partner.name}
      />
    </PageShell>
  );
}
