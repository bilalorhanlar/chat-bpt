import type { Metadata } from "next";

import { GameLobby } from "@/components/games/game-lobby";
import { PageShell } from "@/components/layout/page-shell";
import { findOpenMatch } from "@/lib/match";
import { getPeople, partnerOf } from "@/lib/people";
import { requireSession } from "@/lib/session";
import { sessionUser } from "@/lib/auth";
import { createTavlaMatch } from "./actions";

export const metadata: Metadata = { title: "Tavla" };
export const dynamic = "force-dynamic";

export default async function TavlaLobbyPage() {
  const [session, people] = await Promise.all([requireSession(), getPeople()]);
  const user = sessionUser(session);
  // Misafirin "devam et" kartı yok: maçları geçici.
  const open = user ? await findOpenMatch("TAVLA", user) : null;

  return (
    <PageShell title="Tavla" eyebrow="oyun" back="/">
      <GameLobby
        icon="dice"
        title="Tavla"
        blurb="Zarı at, pulları topla, mars yapmaya çalış."
        basePath="/oyunlar/tavla"
        openMatch={open ? { id: open.id, mode: open.mode, status: open.status } : null}
        createMatch={createTavlaMatch}
        partnerName={user ? people[partnerOf(user)].name : "Rakip"}
        rules={[
          "Online seçince rakip katılana kadar oyun başlamaz; ikiniz de bastığınızda aynı odada buluşursunuz.",
          "Zar her turda otomatik atılıyor — sunucu atar, kimse zarını seçemez.",
          "Oynanabilecek en çok zarı oynamak zorunludur; tek zar oynanabiliyorsa büyük olan.",
          "Rakip hiç pul toplayamadan biterse mars (2 puan), bar'da ya da evinde pulu kaldıysa hamars (3 puan).",
          "Her turun bir süre göstergesi var ama süre dolunca hiçbir şey olmuyor — sadece acele ettirir.",
        ]}
      />
    </PageShell>
  );
}
