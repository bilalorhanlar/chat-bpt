import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { IsimSehirGame } from "@/components/games/isim-sehir/isim-sehir-game";
import { PageShell } from "@/components/layout/page-shell";
import type { IsimSehirState } from "@/games/isim-sehir/types";
import { loadMatch } from "@/lib/match";
import { getPeople } from "@/lib/people";
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
  if (match.seats[session.user] === undefined) notFound();

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
        me={session.user}
        people={people}
      />
    </PageShell>
  );
}
