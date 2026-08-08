import type { Metadata } from "next";

import { GameLobby } from "@/components/games/game-lobby";
import { PageShell } from "@/components/layout/page-shell";
import { TOTAL_ROUNDS } from "@/games/isim-sehir/types";
import { findOpenMatch } from "@/lib/match";
import { getPeople, partnerOf } from "@/lib/people";
import { requireSession } from "@/lib/session";
import { createIsimSehirMatch } from "./actions";

export const metadata: Metadata = { title: "İsim Şehir" };
export const dynamic = "force-dynamic";

export default async function IsimSehirLobbyPage() {
  const [session, people] = await Promise.all([requireSession(), getPeople()]);
  const open = await findOpenMatch("ISIM_SEHIR", session.user);

  return (
    <PageShell title="İsim Şehir" eyebrow="oyun" back="/">
      <GameLobby
        icon="type"
        title="İsim Şehir Hayvan Bitki Eşya"
        blurb={`${TOTAL_ROUNDS} tur. Harf çekilir, süre başlar, puanı birbirinize verirsiniz.`}
        basePath="/oyunlar/isim-sehir"
        openMatch={open ? { id: open.id, mode: open.mode, status: open.status } : null}
        createMatch={createIsimSehirMatch}
        partnerName={people[partnerOf(session.user)].name}
        rules={[
          "Online seçince rakip katılana kadar süre başlamaz; ikiniz de bastığınızda aynı odada buluşursunuz.",
          "Kelimeleri sözlük değil, karşı taraf onaylar — geçersiz saydığına çarpı koyar.",
          "Yalnız bulan 10, ikiniz de aynı kelimeyi yazdıysanız 5, boş 0 puan.",
          "Harfle başlamayan cevaplar oy beklemeden geçersiz sayılır.",
          "Online turda 90 saniye var; süre bitince yazdıkların otomatik gönderilir.",
        ]}
      />
    </PageShell>
  );
}
