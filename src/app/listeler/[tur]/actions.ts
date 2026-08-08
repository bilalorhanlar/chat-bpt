"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { LISTS, LIST_SLUGS, type ListSlug } from "@/lib/lists";
import { requireSession } from "@/lib/session";

/**
 * Liste eylemleri.
 *
 * Hepsi oturumu kendi başına doğruluyor: sunucu eylemleri istemciden
 * çağrılabilen uç noktalar, proxy'nin sayfayı korumuş olması yetmez.
 */

const Slug = z.enum(LIST_SLUGS);

const AddInput = z.object({
  slug: Slug,
  title: z.string().trim().min(1, "Boş olamaz").max(160, "Çok uzun"),
  note: z.string().trim().max(500).optional(),
  kind: z.string().trim().max(20).optional(),
});

export type ListItemView = {
  id: string;
  title: string;
  note: string | null;
  kind: string | null;
  done: boolean;
  order: number;
  createdById: string;
};

export async function addListItem(input: z.infer<typeof AddInput>): Promise<
  { ok: true; item: ListItemView } | { ok: false; error: string }
> {
  const session = await requireSession();
  const parsed = AddInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz girdi" };
  }

  const { slug, title, note, kind } = parsed.data;
  const config = LISTS[slug];

  // Yeni öğe en üste gelsin: mevcut en küçük order'ın bir altına.
  const top = await db.listItem.findFirst({
    where: { list: config.type },
    orderBy: { order: "asc" },
    select: { order: true },
  });

  const created = await db.listItem.create({
    data: {
      list: config.type,
      title,
      note: note || null,
      meta: config.kinds && kind ? { kind } : undefined,
      order: (top?.order ?? 0) - 1,
      createdById: session.user,
    },
  });

  revalidatePath(`/listeler/${slug}`);
  return { ok: true, item: toView(created) };
}

export async function toggleListItem(slug: ListSlug, id: string, done: boolean) {
  await requireSession();
  await db.listItem.update({
    where: { id },
    data: { done, doneAt: done ? new Date() : null },
  });
  revalidatePath(`/listeler/${slug}`);
}

export async function deleteListItem(slug: ListSlug, id: string) {
  await requireSession();
  await db.listItem.delete({ where: { id } });
  revalidatePath(`/listeler/${slug}`);
}

export async function updateListItem(
  slug: ListSlug,
  id: string,
  patch: { title?: string; note?: string | null },
) {
  await requireSession();
  const title = patch.title?.trim();
  if (title !== undefined && title.length === 0) return;
  await db.listItem.update({
    where: { id },
    data: { title, note: patch.note?.trim() || null },
  });
  revalidatePath(`/listeler/${slug}`);
}

/**
 * Öğeyi bir sıra yukarı/aşağı taşır.
 *
 * Sürükle-bırak yerine ok tuşları: dokunmatikte sürükleme sayfa kaydırmasıyla
 * çakışıyor ve iki kişilik bir listede sıralama zaten nadiren değişiyor.
 */
export async function moveListItem(slug: ListSlug, id: string, direction: "up" | "down") {
  await requireSession();
  const config = LISTS[slug];

  const current = await db.listItem.findUnique({ where: { id } });
  if (!current || current.done) return;

  const neighbour = await db.listItem.findFirst({
    where: {
      list: config.type,
      done: false,
      order: direction === "up" ? { lt: current.order } : { gt: current.order },
    },
    orderBy: { order: direction === "up" ? "desc" : "asc" },
  });
  if (!neighbour) return;

  await db.$transaction([
    db.listItem.update({ where: { id: current.id }, data: { order: neighbour.order } }),
    db.listItem.update({ where: { id: neighbour.id }, data: { order: current.order } }),
  ]);
  revalidatePath(`/listeler/${slug}`);
}

function toView(row: {
  id: string;
  title: string;
  note: string | null;
  meta: unknown;
  done: boolean;
  order: number;
  createdById: string;
}): ListItemView {
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
}
