import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TavlaGame } from "@/components/games/tavla/tavla-game";
import { WaitingRoom } from "@/components/games/waiting-room";
import { PageShell } from "@/components/layout/page-shell";
import type { PersonKey } from "@/config/site";
import type { TavlaState } from "@/games/tavla/types";
import { loadMatch, matchAccess } from "@/lib/match";
import { sessionUser } from "@/lib/auth";
import { getPeople, partnerOf } from "@/lib/people";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Tavla" };
export const dynamic = "force-dynamic";

export default async function TavlaMatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [session, people, match] = await Promise.all([
    requireSession(),
    getPeople(),
    loadMatch(id),
  ]);

  if (!match || match.game !== "TAVLA") notFound();

  const access = matchAccess(match, session);
  if (!access.allowed) notFound();
  const user = sessionUser(session);

  // Rakip katılmadan tahta açılmaz — yoksa herkes kendi odasında tek başına
  // oynar ve iki ayrı maç oluşurdu.
  if (match.status === "WAITING") {
    return (
      <PageShell title="Tavla" eyebrow="online" back="/oyunlar/tavla">
        <WaitingRoom
          matchId={match.id}
          gameTitle="Tavla"
          partnerName={user ? people[partnerOf(user)].name : "Rakip"}
          backHref="/oyunlar/tavla"
        />
      </PageShell>
    );
  }

  const seats: Record<number, PersonKey> = match.bySeat;

  return (
    <PageShell
      title="Tavla"
      eyebrow={match.mode === "LOCAL" ? "aynı cihazda" : "online"}
      back="/oyunlar/tavla"
      wide
    >
      <TavlaGame
        matchId={match.id}
        initialState={match.state as TavlaState}
        mode={match.mode}
        seats={seats}
        me={user}
        guestMode={match.guest}
        people={people}
      />
    </PageShell>
  );
}
