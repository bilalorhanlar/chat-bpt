import type { Metadata } from "next";

import { CeyizBoard } from "@/components/ceyiz/ceyiz-board";
import { PageShell } from "@/components/layout/page-shell";
import { db } from "@/lib/db";
import { getPeople } from "@/lib/people";
import { requirePerson } from "@/lib/session";
import { getCeyizCategories } from "./actions";

export const metadata: Metadata = { title: "Çeyiz" };
export const dynamic = "force-dynamic";

export default async function CeyizPage() {
  const [user, people, categories, items] = await Promise.all([
    requirePerson(),
    getPeople(),
    getCeyizCategories(),
    db.ceyizItem.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  return (
    <PageShell title="Çeyiz" eyebrow="liste">
      <CeyizBoard
        initialCategories={categories}
        initialItems={items}
        me={user}
        people={people}
      />
    </PageShell>
  );
}
