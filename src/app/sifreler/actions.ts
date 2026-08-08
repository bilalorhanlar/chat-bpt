"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { openSecret, sealSecret } from "@/lib/secret-box";
import { requireSession } from "@/lib/session";

/**
 * Parola kasası eylemleri.
 *
 * Parolalar veritabanında AES-256-GCM ile şifreli duruyor (lib/secret-box.ts).
 * Liste ekranına parola gönderilmiyor; tek bir kaydın parolası ancak
 * `revealCredential` ile, oturum doğrulanarak çözülüyor.
 */

const SaveInput = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1, "Başlık boş olamaz").max(80, "Başlık çok uzun"),
  username: z.string().trim().max(120),
  password: z.string().min(1, "Parola boş olamaz").max(500, "Parola çok uzun"),
  note: z.string().trim().max(500).optional(),
});

export type CredentialView = {
  id: string;
  title: string;
  username: string;
  note: string | null;
  createdById: string;
  updatedAt: string;
};

export async function saveCredential(
  input: z.infer<typeof SaveInput>,
): Promise<{ ok: true; item: CredentialView } | { ok: false; error: string }> {
  const session = await requireSession();
  const parsed = SaveInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz girdi" };
  }

  const data = {
    title: parsed.data.title,
    username: parsed.data.username,
    secret: sealSecret(parsed.data.password),
    note: parsed.data.note || null,
  };

  const row = parsed.data.id
    ? await db.credential.update({ where: { id: parsed.data.id }, data })
    : await db.credential.create({ data: { ...data, createdById: session.user } });

  revalidatePath("/sifreler");
  return {
    ok: true,
    item: {
      id: row.id,
      title: row.title,
      username: row.username,
      note: row.note,
      createdById: row.createdById,
      updatedAt: row.updatedAt.toISOString(),
    },
  };
}

/** Tek kaydın parolasını çözer — yalnızca istendiğinde. */
export async function revealCredential(
  id: string,
): Promise<{ ok: true; password: string } | { ok: false; error: string }> {
  await requireSession();
  const row = await db.credential.findUnique({ where: { id } });
  if (!row) return { ok: false, error: "Kayıt bulunamadı." };

  try {
    return { ok: true, password: openSecret(row.secret) };
  } catch {
    return {
      ok: false,
      error: "Parola çözülemedi — AUTH_SECRET değişmiş olabilir. Kaydı yeniden girin.",
    };
  }
}

export async function deleteCredential(id: string): Promise<{ ok: boolean }> {
  await requireSession();
  await db.credential.delete({ where: { id } });
  revalidatePath("/sifreler");
  return { ok: true };
}
