import type { Metadata } from "next";

import { PageShell } from "@/components/layout/page-shell";
import { CountdownBoard } from "@/components/countdowns/countdown-board";
import { db } from "@/lib/db";
import { toDateString } from "@/lib/date-only";
import type { CountdownView } from "./actions";

export const metadata: Metadata = { title: "Sayaçlar" };
export const dynamic = "force-dynamic";

export default async function CountdownsPage() {
  const rows = await db.countdown.findMany({ orderBy: { createdAt: "asc" } });

  const items: CountdownView[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    date: toDateString(row.date),
    emoji: row.emoji,
    repeatYearly: row.repeatYearly,
    createdById: row.createdById,
  }));

  return (
    <PageShell title="Sayaçlar" eyebrow="bizden">
      <CountdownBoard initialItems={items} />
    </PageShell>
  );
}
