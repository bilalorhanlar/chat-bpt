import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { IsimSehirGame } from "@/components/games/isim-sehir/isim-sehir-game";
import { WaitingRoom } from "@/components/games/waiting-room";
import { PageShell } from "@/components/layout/page-shell";
import type { IsimSehirState } from "@/games/isim-sehir/types";
import { loadMatch, matchAccess } from "@/lib/match";
import { sessionUser } from "@/lib/auth";
import { getPeople, partnerOf } from "@/lib/people";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "İsim Şehir" };
export const dynamic = "force-dynamic";

export default async function IsimSehirMatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [session, people, match] = await Promise.all([
    requireSession(),
    getPeople(),
    loadMatch(id),
  ]);

  if (!match || match.game !== "ISIM_SEHIR") notFound();

  const access = matchAccess(match, session);
  if (!access.allowed) notFound();
  const user = sessionUser(session);

  // Rakip katılmadan tahta açılmaz — yoksa herkes kendi odasında tek başına
  // oynar ve iki ayrı maç oluşurdu.
  if (match.status === "WAITING") {
    return (
      <PageShell title="İsim Şehir" eyebrow="online" back="/oyunlar/isim-sehir">
        <WaitingRoom
          matchId={match.id}
          gameTitle="İsim Şehir"
          partnerName={user ? people[partnerOf(user)].name : "Rakip"}
          backHref="/oyunlar/isim-sehir"
        />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="İsim Şehir"
      eyebrow={match.mode === "LOCAL" ? "aynı cihazda" : "online"}
      back="/oyunlar/isim-sehir"
    >
      <IsimSehirGame
        matchId={match.id}
        initialState={match.state as IsimSehirState}
        mode={match.mode}
        seats={match.bySeat}
        me={user}
        guestMode={match.guest}
        people={people}
      />
    </PageShell>
  );
}
