"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { PERSON_KEYS } from "@/config/site";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";

/**
 * Çeyiz listesi.
 *
 * Kategoriler serbest metin ve `Setting("ceyizKategoriler")` içinde sıralı
 * bir dizi olarak duruyor — böylece içi boş kategori de var olabiliyor.
 * Öğeler `CeyizItem` tablosunda; alıcı `bilal`/`partner` ya da "henüz belli
 * değil" için null.
 */

const DEFAULT_CATEGORIES = ["Mutfak", "Banyo", "Salon", "Yatak Odası"];

export type CeyizItemView = {
  id: string;
  category: string;
  title: string;
  price: number | null;
  buyerId: string | null;
  done: boolean;
  createdById: string;
};

export async function getCeyizCategories(): Promise<string[]> {
  const row = await db.setting.findUnique({ where: { key: "ceyizKategoriler" } });
  const list = (row?.value as { list?: string[] } | null)?.list;
  return Array.isArray(list) && list.length > 0 ? list : DEFAULT_CATEGORIES;
}

async function saveCategories(list: string[]) {
  await db.setting.upsert({
    where: { key: "ceyizKategoriler" },
    create: { key: "ceyizKategoriler", value: { list } },
    update: { value: { list } },
  });
}

export async function addCeyizCategory(
  name: string,
): Promise<{ ok: true; categories: string[] } | { ok: false; error: string }> {
  await requireSession();
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 40) return { ok: false, error: "Kategori adı geçersiz." };

  const categories = await getCeyizCategories();
  if (categories.some((c) => c.toLocaleLowerCase("tr-TR") === trimmed.toLocaleLowerCase("tr-TR"))) {
    return { ok: false, error: "Bu kategori zaten var." };
  }

  const next = [...categories, trimmed];
  await saveCategories(next);
  revalidatePath("/ceyiz");
  return { ok: true, categories: next };
}

/** Yalnızca içi boş kategoriler silinebilir — yanlışlıkla dolu liste uçmasın. */
export async function removeCeyizCategory(
  name: string,
): Promise<{ ok: true; categories: string[] } | { ok: false; error: string }> {
  await requireSession();
  const count = await db.ceyizItem.count({ where: { category: name } });
  if (count > 0) return { ok: false, error: "Önce içindeki öğeleri sil ya da taşı." };

  const next = (await getCeyizCategories()).filter((c) => c !== name);
  await saveCategories(next);
  revalidatePath("/ceyiz");
  return { ok: true, categories: next };
}

const AddInput = z.object({
  category: z.string().trim().min(1).max(40),
  title: z.string().trim().min(1, "Ad boş olamaz").max(120, "Ad çok uzun"),
  /** Yaklaşık fiyat, TL. */
  price: z.number().int().min(0).max(100_000_000).nullable(),
  buyerId: z.enum(PERSON_KEYS).nullable(),
});

export async function addCeyizItem(
  input: z.infer<typeof AddInput>,
): Promise<{ ok: true; item: CeyizItemView } | { ok: false; error: string }> {
  const session = await requireSession();
  const parsed = AddInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz girdi" };
  }

  const created = await db.ceyizItem.create({
    data: { ...parsed.data, createdById: session.user },
  });

  revalidatePath("/ceyiz");
  return { ok: true, item: created };
}

const PatchInput = z.object({
  id: z.string().min(1),
  price: z.number().int().min(0).max(100_000_000).nullable().optional(),
  buyerId: z.enum(PERSON_KEYS).nullable().optional(),
  done: z.boolean().optional(),
  title: z.string().trim().min(1).max(120).optional(),
});

export async function updateCeyizItem(
  input: z.infer<typeof PatchInput>,
): Promise<{ ok: true; item: CeyizItemView } | { ok: false; error: string }> {
  await requireSession();
  const parsed = PatchInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Geçersiz girdi." };

  const { id, ...patch } = parsed.data;
  const updated = await db.ceyizItem.update({ where: { id }, data: patch });
  revalidatePath("/ceyiz");
  return { ok: true, item: updated };
}

export async function deleteCeyizItem(id: string): Promise<{ ok: boolean }> {
  await requireSession();
  await db.ceyizItem.delete({ where: { id } });
  revalidatePath("/ceyiz");
  return { ok: true };
}
