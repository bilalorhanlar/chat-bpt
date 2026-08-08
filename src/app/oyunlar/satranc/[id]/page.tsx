import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SatrancGame } from "@/components/games/satranc/satranc-game";
import { WaitingRoom } from "@/components/games/waiting-room";
import { PageShell } from "@/components/layout/page-shell";
import type { SatrancState } from "@/games/satranc/types";
import { loadMatch } from "@/lib/match";
import { getPeople, partnerOf } from "@/lib/people";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Satranç" };
export const dynamic = "force-dynamic";

export default async function SatrancMatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [session, people, match] = await Promise.all([
    requireSession(),
    getPeople(),
    loadMatch(id),
  ]);

  if (!match || match.game !== "SATRANC") notFound();
  if (match.seats[session.user] === undefined) notFound();

  // Rakip katılmadan tahta açılmaz — yoksa herkes kendi odasında tek başına
  // oynar ve iki ayrı maç oluşurdu.
  if (match.status === "WAITING") {
    return (
      <PageShell title="Satranç" eyebrow="online" back="/oyunlar/satranc">
        <WaitingRoom
          matchId={match.id}
          gameTitle="Satranç"
          partnerName={people[partnerOf(session.user)].name}
          backHref="/oyunlar/satranc"
        />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Satranç"
      eyebrow={match.mode === "LOCAL" ? "aynı cihazda" : "online"}
      back="/oyunlar/satranc"
    >
      <SatrancGame
        matchId={match.id}
        initialState={match.state as SatrancState}
        mode={match.mode}
        seats={match.bySeat}
        me={session.user}
        people={people}
      />
    </PageShell>
  );
}
