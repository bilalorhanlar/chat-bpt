import type { Metadata } from "next";

import { HafizaGame } from "@/components/games/hafiza/hafiza-game";
import { PageShell } from "@/components/layout/page-shell";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { sessionUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Hafıza" };
export const dynamic = "force-dynamic";

export default async function HafizaPage() {
  const session = await requireSession();
  const user = sessionUser(session);

  // Misafirin rekoru tutulmuyor, göstermenin de anlamı yok.
  const best = user
    ? await db.gameMatch.findFirst({
        where: { game: "HAFIZA", winnerId: user, durationMs: { not: null } },
        orderBy: { durationMs: "asc" },
        select: { durationMs: true },
      })
    : null;

  return (
    <PageShell title="Hafıza" eyebrow="oyun" back="/">
      <HafizaGame bestMs={best?.durationMs ?? null} />
    </PageShell>
  );
}
