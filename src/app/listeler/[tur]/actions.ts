"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { PERSON_KEYS, type PersonKey } from "@/config/site";
import { db } from "@/lib/db";
import { fetchImdbMeta } from "@/lib/imdb";
import { LISTS, LIST_SLUGS, type ListSlug } from "@/lib/lists";
import { requirePerson } from "@/lib/session";

/**
 * Liste eylemleri.
 *
 * Hepsi oturumu kendi başına doğruluyor: sunucu eylemleri istemciden
 * çağrılabilen uç noktalar, proxy'nin sayfayı korumuş olması yetmez.
 *
 * Satırın esnek alanları `meta` JSON'unda:
 *   { kind?, link?, imdb?, poster?, year?, ratings?: { bilal?, partner? } }
 */

const Slug = z.enum(LIST_SLUGS);

const AddInput = z.object({
  slug: Slug,
  title: z.string().trim().max(160, "Çok uzun"),
  note: z.string().trim().max(500).optional(),
  kind: z.string().trim().max(20).optional(),
  /** Konum / Maps / IMDb bağlantısı — listeye göre anlamı değişir. */
  link: z.string().trim().url("Bağlantı geçersiz").max(500).optional().or(z.literal("")),
});

type Meta = {
  kind?: string;
  link?: string;
  imdb?: string;
  poster?: string;
  year?: string;
  ratings?: Partial<Record<PersonKey, number>>;
};

export type ListItemView = {
  id: string;
  title: string;
  note: string | null;
  kind: string | null;
  link: string | null;
  imdb: string | null;
  poster: string | null;
  year: string | null;
  ratings: Partial<Record<PersonKey, number>>;
  done: boolean;
  order: number;
  createdById: string;
};

export async function addListItem(input: z.infer<typeof AddInput>): Promise<
  { ok: true; item: ListItemView } | { ok: false; error: string }
> {
  const user = await requirePerson();
  const parsed = AddInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz girdi" };
  }

  const { slug, note, kind } = parsed.data;
  const link = parsed.data.link || undefined;
  let title = parsed.data.title;
  const config = LISTS[slug];

  const meta: Meta = {};
  if (config.kinds && kind) meta.kind = kind;

  if (config.media && link) {
    // IMDb bağlantısı: kapak, ad, tür ve yılı IMDb'nin öneri API'sinden çek.
    const imdbMeta = await fetchImdbMeta(link);
    if (!imdbMeta) {
      return { ok: false, error: "Bu bir IMDb başlık bağlantısı değil." };
    }
    meta.imdb = imdbMeta.url;
    if (imdbMeta.poster) meta.poster = imdbMeta.poster;
    if (imdbMeta.year) meta.year = imdbMeta.year;
    if (imdbMeta.kind) meta.kind = imdbMeta.kind;
    // Ad boş bırakıldıysa IMDb'deki adı kullan.
    if (!title && imdbMeta.title) title = imdbMeta.title;
  } else if (link) {
    meta.link = link;
  }

  if (!title) {
    return {
      ok: false,
      error: config.media ? "Ad yaz ya da IMDb bağlantısı yapıştır." : "Boş olamaz.",
    };
  }

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
      meta: Object.keys(meta).length > 0 ? (meta as never) : undefined,
      order: (top?.order ?? 0) - 1,
      createdById: user,
    },
  });

  revalidatePath(`/listeler/${slug}`);
  return { ok: true, item: toView(created) };
}

/** 10 üzerinden "ne kadar istiyorum" puanı — herkes kendi puanını verir. */
export async function rateListItem(
  slug: ListSlug,
  id: string,
  score: number,
): Promise<{ ok: true; item: ListItemView } | { ok: false; error: string }> {
  const user = await requirePerson();
  if (!Number.isInteger(score) || score < 1 || score > 10) {
    return { ok: false, error: "Puan 1 ile 10 arasında olmalı." };
  }

  const row = await db.listItem.findUnique({ where: { id } });
  if (!row) return { ok: false, error: "Bulunamadı." };

  const meta = ((row.meta as Meta | null) ?? {}) as Meta;
  meta.ratings = { ...meta.ratings, [user]: score };

  const updated = await db.listItem.update({ where: { id }, data: { meta: meta as never } });
  revalidatePath(`/listeler/${slug}`);
  return { ok: true, item: toView(updated) };
}

export async function toggleListItem(slug: ListSlug, id: string, done: boolean) {
  await requirePerson();
  await db.listItem.update({
    where: { id },
    data: { done, doneAt: done ? new Date() : null },
  });
  revalidatePath(`/listeler/${slug}`);
}

export async function deleteListItem(slug: ListSlug, id: string) {
  await requirePerson();
  await db.listItem.delete({ where: { id } });
  revalidatePath(`/listeler/${slug}`);
}

export async function updateListItem(
  slug: ListSlug,
  id: string,
  patch: { title?: string; note?: string | null },
) {
  await requirePerson();
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
 * çakışıyor ve iki kişilik bir listede sıralama nadiren değişiyor.
 */
export async function moveListItem(slug: ListSlug, id: string, direction: "up" | "down") {
  await requirePerson();
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
}
