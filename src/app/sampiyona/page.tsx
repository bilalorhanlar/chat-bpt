import type { Metadata } from "next";
import type { Game } from "@prisma/client";

import { PageShell } from "@/components/layout/page-shell";
import { EmptyState } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { PERSON_KEYS, type PersonKey } from "@/config/site";
import { db } from "@/lib/db";
import { getPeople } from "@/lib/people";
import { trDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Şampiyona" };
export const dynamic = "force-dynamic";

/** Karşılıklı oynanan oyunlar — hafıza tek kişilik, galibiyete sayılmıyor. */
const VERSUS: Game[] = ["TAVLA", "SATRANC", "ISIM_SEHIR"];

const GAME_LABEL: Record<Game, string> = {
  TAVLA: "Tavla",
  SATRANC: "Satranç",
  ISIM_SEHIR: "İsim Şehir",
  HAFIZA: "Hafıza",
};

const GAME_ICON: Record<Game, string> = {
  TAVLA: "dice",
  SATRANC: "crown",
  ISIM_SEHIR: "type",
  HAFIZA: "grid",
};

const RESULT_LABEL: Record<string, string> = {
  MARS: "mars",
  HAMARS: "hamars",
  MAT: "mat",
  PAT: "pat",
  SURE: "süre",
  TERK: "terk",
  BERABERE: "berabere",
  NORMAL: "",
};

export default async function SampiyonaPage() {
  const [people, matches, hafiza] = await Promise.all([
    getPeople(),
    db.gameMatch.findMany({
      where: { status: "FINISHED", game: { in: VERSUS } },
      orderBy: { finishedAt: "desc" },
      select: {
        id: true,
        game: true,
        winnerId: true,
        result: true,
        scoreDelta: true,
        finishedAt: true,
      },
    }),
    db.gameMatch.findMany({
      where: { game: "HAFIZA", durationMs: { not: null } },
      orderBy: { durationMs: "asc" },
      select: { winnerId: true, durationMs: true, finishedAt: true },
    }),
  ]);

  /* --- toplamlar --------------------------------------------------- */

  const points: Record<PersonKey, number> = { bilal: 0, partner: 0 };
  const wins: Record<PersonKey, number> = { bilal: 0, partner: 0 };
  const perGame: Record<Game, Record<PersonKey, number>> = {
    TAVLA: { bilal: 0, partner: 0 },
    SATRANC: { bilal: 0, partner: 0 },
    ISIM_SEHIR: { bilal: 0, partner: 0 },
    HAFIZA: { bilal: 0, partner: 0 },
  };

  for (const match of matches) {
    if (!match.winnerId) continue;
    const key = match.winnerId as PersonKey;
    points[key] += match.scoreDelta;
    wins[key] += 1;
    perGame[match.game][key] += 1;
  }

  /**
   * Güncel galibiyet serisi: en son maçtan geriye doğru, kazanan değişene
   * kadar. Berabere biten maçlar seriyi bozmadan atlanıyor.
   */
  let streakOwner: PersonKey | null = null;
  let streak = 0;
  for (const match of matches) {
    if (!match.winnerId) continue;
    const key = match.winnerId as PersonKey;
    if (streakOwner === null) {
      streakOwner = key;
      streak = 1;
    } else if (streakOwner === key) {
      streak++;
    } else break;
  }

  /* --- ayın şampiyonu ---------------------------------------------- */

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const monthPoints: Record<PersonKey, number> = { bilal: 0, partner: 0 };
  for (const match of matches) {
    if (!match.winnerId || !match.finishedAt || match.finishedAt < monthStart) continue;
    monthPoints[match.winnerId as PersonKey] += match.scoreDelta;
  }
  const monthLeader =
    monthPoints.bilal === monthPoints.partner
      ? null
      : monthPoints.bilal > monthPoints.partner
        ? "bilal"
        : "partner";

  const totalPlayed = matches.length;

  return (
    <PageShell title="Şampiyona" eyebrow="oyunlar">
      {totalPlayed === 0 && hafiza.length === 0 ? (
        <EmptyState
          icon={<Icon name="trophy" className="size-9" strokeWidth={1.3} />}
          title="Henüz oynanmış maç yok"
          hint="Bir tavla ya da satranç maçı bitirin, tablo burada dolmaya başlasın."
        />
      ) : null}

      {totalPlayed > 0 ? (
        <>
          {/* Genel skor */}
          <section className="mb-6 overflow-hidden rounded-card border border-line bg-surface/85 shadow-soft backdrop-blur-sm">
            <div className="grid grid-cols-2">
              {PERSON_KEYS.map((key, i) => {
                const leading = points[key] > points[key === "bilal" ? "partner" : "bilal"];
                return (
                  <div
                    key={key}
                    className={`p-6 text-center ${i === 0 ? "border-r border-line" : ""}`}
                  >
                    <span
                      className="mx-auto mb-3 block size-10 rounded-full"
                      style={{
                        background: `radial-gradient(circle at 32% 28%, ${people[key].accent}, ${people[key].accent}99)`,
                      }}
                    />
                    <p className="text-[0.85rem] text-ink-soft">{people[key].name}</p>
                    <p
                      className={`font-display text-[2.6rem] leading-none tabular-nums ${
                        leading ? "text-brand-700" : "text-ink"
                      }`}
                    >
                      {points[key]}
                    </p>
                    <p className="mt-1 text-[0.75rem] text-ink-faint">
                      {wins[key]} galibiyet · {totalPlayed} maç
                    </p>
                  </div>
                );
              })}
            </div>

            {streakOwner && streak > 1 ? (
              <p className="border-t border-line bg-brand-50/60 px-5 py-3 text-center text-[0.85rem] text-brand-700">
                <span className="font-medium">{people[streakOwner].name}</span> üst üste{" "}
                <span className="font-medium">{streak}</span> maç kazandı
              </p>
            ) : null}
          </section>

          {/* Ayın şampiyonu */}
          <section className="mb-6 flex items-center gap-3 rounded-card border border-line bg-surface/70 px-5 py-4 shadow-soft backdrop-blur-sm">
            <Icon name="trophy" className="size-6 shrink-0 text-accent-400" strokeWidth={1.5} />
            <p className="text-[0.9rem] text-ink-soft">
              {monthLeader === null ? (
                <>Bu ay berabere gidiyorsunuz ({monthPoints.bilal} – {monthPoints.partner}).</>
              ) : (
                <>
                  Bu ayın şampiyonu{" "}
                  <span className="font-medium text-ink">{people[monthLeader].name}</span> ·{" "}
                  {monthPoints[monthLeader as PersonKey]} puan
                </>
              )}
            </p>
          </section>

          {/* Oyun bazında */}
          <section className="mb-6">
            <h2 className="mb-3 text-[0.72rem] font-medium uppercase tracking-[0.18em] text-brand-500">
              Oyunlara göre
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {VERSUS.map((game) => {
                const a = perGame[game].bilal;
                const b = perGame[game].partner;
                const total = a + b;
                return (
                  <div
                    key={game}
                    className="rounded-card border border-line bg-surface/80 p-4 shadow-soft backdrop-blur-sm"
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <Icon name={GAME_ICON[game]} className="size-4 text-brand-500" />
                      <span className="text-[0.85rem] font-medium text-ink">
                        {GAME_LABEL[game]}
                      </span>
                      <span className="ml-auto text-[0.72rem] text-ink-faint">{total}</span>
                    </div>

                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-[1.5rem] tabular-nums text-brand-700">
                        {a}
                      </span>
                      <span className="text-ink-faint">–</span>
                      <span className="font-display text-[1.5rem] tabular-nums text-accent-500">
                        {b}
                      </span>
                    </div>

                    {total > 0 ? (
                      <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-brand-100">
                        <div
                          className="bg-brand-500"
                          style={{ width: `${(a / total) * 100}%` }}
                        />
                        <div
                          className="bg-accent-400"
                          style={{ width: `${(b / total) * 100}%` }}
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        </>
      ) : null}

      {/* Hafıza rekorları */}
      {hafiza.length > 0 ? (
        <section className="mb-6">
          <h2 className="mb-3 text-[0.72rem] font-medium uppercase tracking-[0.18em] text-brand-500">
            Hafıza rekorları
          </h2>
          <ul className="overflow-hidden rounded-card border border-line bg-surface/80 shadow-soft">
            {PERSON_KEYS.map((key) => {
              const best = hafiza.find((h) => h.winnerId === key);
              return (
                <li
                  key={key}
                  className="flex items-center gap-3 border-b border-line px-5 py-3 last:border-b-0"
                >
                  <span
                    className="size-2.5 rounded-full"
                    style={{ background: people[key].accent }}
                  />
                  <span className="flex-1 text-[0.9rem] text-ink">{people[key].name}</span>
                  <span className="font-display text-[1.1rem] tabular-nums text-ink">
                    {best?.durationMs ? formatMs(best.durationMs) : "—"}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {/* Son maçlar */}
      {matches.length > 0 ? (
        <section>
          <h2 className="mb-3 text-[0.72rem] font-medium uppercase tracking-[0.18em] text-brand-500">
            Son maçlar
          </h2>
          <ul className="overflow-hidden rounded-card border border-line bg-surface/80 shadow-soft">
            {matches.slice(0, 12).map((match) => (
              <li
                key={match.id}
                className="flex items-center gap-3 border-b border-line px-5 py-3 last:border-b-0"
              >
                <Icon name={GAME_ICON[match.game]} className="size-4 shrink-0 text-brand-400" />
                <span className="w-20 shrink-0 text-[0.82rem] text-ink-soft">
                  {GAME_LABEL[match.game]}
                </span>
                <span className="min-w-0 flex-1 truncate text-[0.88rem] text-ink">
                  {match.winnerId ? (
                    <>
                      <span className="font-medium">
                        {people[match.winnerId as PersonKey].name}
                      </span>{" "}
                      kazandı
                      {RESULT_LABEL[match.result ?? ""] ? (
                        <span className="text-ink-faint">
                          {" "}
                          · {RESULT_LABEL[match.result ?? ""]}
                        </span>
                      ) : null}
                    </>
                  ) : (
                    "Berabere"
                  )}
                </span>
                <span className="shrink-0 text-[0.72rem] tabular-nums text-ink-faint">
                  {match.finishedAt ? trDate(match.finishedAt, { withYear: false }) : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </PageShell>
  );
}

function formatMs(ms: number): string {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
