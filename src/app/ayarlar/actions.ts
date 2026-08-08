"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { PERSON_KEYS } from "@/config/site";
import { fromDateString } from "@/lib/date-only";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";

type Result = { ok: true } | { ok: false; error: string };

const ProfileInput = z.object({
  names: z.record(z.enum(PERSON_KEYS), z.string().trim().min(1).max(40)),
  birthdays: z.record(z.enum(PERSON_KEYS), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  togetherSince: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tarih geçersiz"),
});

export async function saveProfile(input: z.infer<typeof ProfileInput>): Promise<Result> {
  await requireSession();
  const parsed = ProfileInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz girdi" };
  }

  const { names, birthdays, togetherSince } = parsed.data;

  await db.$transaction([
    ...PERSON_KEYS.filter((key) => names[key] && birthdays[key]).map((key) =>
      db.user.update({
        where: { id: key },
        data: { name: names[key]!, birthday: fromDateString(birthdays[key]!) },
      }),
    ),
    db.setting.upsert({
      where: { key: "togetherSince" },
      create: { key: "togetherSince", value: { date: togetherSince } },
      update: { value: { date: togetherSince } },
    }),
  ]);

  // İsimler her sayfada görünüyor — tüm ağacı tazele.
  revalidatePath("/", "layout");
  return { ok: true };
}

const PinInput = z.object({
  current: z.string().regex(/^\d{4}$/, "Mevcut PIN 4 rakam olmalı"),
  next: z.string().regex(/^\d{4}$/, "Yeni PIN 4 rakam olmalı"),
});

export async function changePin(input: z.infer<typeof PinInput>): Promise<Result> {
  await requireSession();
  const parsed = PinInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz girdi" };
  }

  const row = await db.setting.findUnique({ where: { key: "pin" } });
  const hash = (row?.value as { hash?: string } | null)?.hash;
  if (!hash) return { ok: false, error: "PIN kurulu değil." };

  if (!(await bcrypt.compare(parsed.data.current, hash))) {
    return { ok: false, error: "Mevcut PIN yanlış." };
  }
  if (parsed.data.current === parsed.data.next) {
    return { ok: false, error: "Yeni PIN eskisiyle aynı." };
  }

  await db.setting.update({
    where: { key: "pin" },
    data: { value: { hash: await bcrypt.hash(parsed.data.next, 11) } },
  });

  return { ok: true };
}
