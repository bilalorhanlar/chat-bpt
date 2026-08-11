import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ListBoard } from "@/components/lists/list-board";
import { MediaBoard } from "@/components/lists/media-board";
import { PageShell } from "@/components/layout/page-shell";
import { PERSON_KEYS, type PersonKey } from "@/config/site";
import { db } from "@/lib/db";
import { LISTS, isListSlug } from "@/lib/lists";
import { getPeople } from "@/lib/people";
import { requirePerson } from "@/lib/session";
import type { ListItemView } from "./actions";

type Props = { params: Promise<{ tur: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tur } = await params;
  return { title: isListSlug(tur) ? LISTS[tur].title : "Liste" };
}

type Meta = {
  kind?: string;
  link?: string;
  imdb?: string;
  poster?: string;
  year?: string;
  ratings?: Partial<Record<PersonKey, number>>;
};

export default async function ListPage({ params }: Props) {
  const { tur } = await params;
  if (!isListSlug(tur)) notFound();

  const config = LISTS[tur];
  const [user, people, rows] = await Promise.all([
    requirePerson(),
    getPeople(),
    db.listItem.findMany({
      where: { list: LISTS[tur].type },
      orderBy: [{ done: "asc" }, { order: "asc" }, { createdAt: "desc" }],
    }),
  ]);

  const items: ListItemView[] = rows.map((row) => {
    const meta = ((row.meta as Meta | null) ?? {}) as Meta;
    const ratings: Partial<Record<PersonKey, number>> = {};
    for (const key of PERSON_KEYS) {
      const value = meta.ratings?.[key];
      if (typeof value === "number") ratings[key] = value;
    }
    return {
      id: row.id,
      title: row.title,
      note: row.note,
      kind: meta.kind ?? null,
      link: meta.link ?? null,
      imdb: meta.imdb ?? null,
      poster: meta.poster ?? null,
      year: meta.year ?? null,
      ratings,
      done: row.done,
      order: row.order,
      createdById: row.createdById,
    };
  });

  return (
    <PageShell title={config.title} eyebrow={config.eyebrow}>
      {config.media ? (
        <MediaBoard
          config={config}
          initialItems={items}
          me={user}
          people={people}
        />
      ) : (
        <ListBoard slug={tur} config={config} initialItems={items} />
      )}
    </PageShell>
  );
}
