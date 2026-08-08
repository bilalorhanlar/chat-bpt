import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ListBoard } from "@/components/lists/list-board";
import { PageShell } from "@/components/layout/page-shell";
import { db } from "@/lib/db";
import { LISTS, isListSlug } from "@/lib/lists";
import type { ListItemView } from "./actions";

type Props = { params: Promise<{ tur: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tur } = await params;
  return { title: isListSlug(tur) ? LISTS[tur].title : "Liste" };
}

export default async function ListPage({ params }: Props) {
  const { tur } = await params;
  if (!isListSlug(tur)) notFound();

  const config = LISTS[tur];
  const rows = await db.listItem.findMany({
    where: { list: config.type },
    // Yapılacaklar elle sıralanmış hâliyle üstte, tamamlananlar en son
    // tamamlanan başta olacak şekilde altta.
    orderBy: [{ done: "asc" }, { order: "asc" }, { createdAt: "desc" }],
  });

  const items: ListItemView[] = rows.map((row) => {
    const meta = row.meta as { kind?: string } | null;
    return {
      id: row.id,
      title: row.title,
      note: row.note,
      kind: meta?.kind ?? null,
      done: row.done,
      order: row.order,
      createdById: row.createdById,
    };
  });

  return (
    <PageShell title={config.title} eyebrow={config.eyebrow}>
      <ListBoard slug={tur} config={config} initialItems={items} />
    </PageShell>
  );
}
