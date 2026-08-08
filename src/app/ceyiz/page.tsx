import type { Metadata } from "next";

import { CeyizBoard } from "@/components/ceyiz/ceyiz-board";
import { PageShell } from "@/components/layout/page-shell";
import { db } from "@/lib/db";
import { getPeople } from "@/lib/people";
import { requireSession } from "@/lib/session";
import { getCeyizCategories } from "./actions";

export const metadata: Metadata = { title: "Çeyiz" };
export const dynamic = "force-dynamic";

export default async function CeyizPage() {
  const [session, people, categories, items] = await Promise.all([
    requireSession(),
    getPeople(),
    getCeyizCategories(),
    db.ceyizItem.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  return (
    <PageShell title="Çeyiz" eyebrow="liste">
      <CeyizBoard
        initialCategories={categories}
        initialItems={items}
        me={session.user}
        people={people}
      />
    </PageShell>
  );
}
