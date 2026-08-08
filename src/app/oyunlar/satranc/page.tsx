import type { Metadata } from "next";

import { GameLobby } from "@/components/games/game-lobby";
import { PageShell } from "@/components/layout/page-shell";
import { findOpenMatch } from "@/lib/match";
import { getPeople, partnerOf } from "@/lib/people";
import { requireSession } from "@/lib/session";
import { createSatrancMatch } from "./actions";

export const metadata: Metadata = { title: "Satranç" };
export const dynamic = "force-dynamic";

export default async function SatrancLobbyPage() {
  const [session, people] = await Promise.all([requireSession(), getPeople()]);
  const open = await findOpenMatch("SATRANC", session.user);

  return (
    <PageShell title="Satranç" eyebrow="oyun" back="/">
      <GameLobby
        icon="crown"
        title="Satranç"
        blurb="Beşer dakika, ekleme yok. Süresi biten kaybeder."
        basePath="/oyunlar/satranc"
        openMatch={open ? { id: open.id, mode: open.mode } : null}
        createMatch={createSatrancMatch}
        partnerName={people[partnerOf(session.user)].name}
        rules={[
          "Süre 5+0: her oyuncuya 5 dakika, hamle başına ekleme yok.",
          "Süresi biten kaybeder — kararı sunucu verir, sekmen kapalı olsa da işler.",
          "Rok, geçerken alma ve terfi dahil bütün kurallar geçerli.",
          "Her hamlede bir ses var; at oynatıldığında sesi değişiyor.",
        ]}
      />
    </PageShell>
  );
}
