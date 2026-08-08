import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { PERSON_KEYS } from "@/config/site";
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const Body = z.object({
  pin: z.string().regex(/^\d{4}$/, "PIN 4 rakam olmalı"),
  /** Yoksa yalnızca PIN doğrulanır, oturum açılmaz (iki adımlı giriş). */
  user: z.enum(PERSON_KEYS).optional(),
});

/* --- kaba kuvvet freni ------------------------------------------------- */
// İki kişilik bir sitede bellek içi sayaç yeterli: Redis eklemek, korumanın
// kendisinden daha çok hareketli parça getirirdi. Süreç yeniden başlarsa
// sayaç sıfırlanır; kabul edilebilir.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const attempts = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > MAX_ATTEMPTS;
}

function clearAttempts(ip: string) {
  attempts.delete(ip);
}

async function pinHash(): Promise<string | null> {
  const row = await db.setting.findUnique({ where: { key: "pin" } });
  const value = row?.value as { hash?: string } | null;
  return value?.hash ?? null;
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "yerel";

  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "Çok fazla deneme yaptın. 15 dakika sonra tekrar dene." },
      { status: 429 },
    );
  }

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "PIN 4 rakam olmalı." }, { status: 400 });
  }

  const hash = await pinHash();
  if (!hash) {
    return NextResponse.json(
      { error: "PIN henüz kurulmamış. `npm run db:seed` çalıştırın." },
      { status: 503 },
    );
  }

  if (!(await bcrypt.compare(parsed.data.pin, hash))) {
    return NextResponse.json({ error: "PIN yanlış." }, { status: 401 });
  }

  // Adım 1: PIN doğru ama henüz kim olduğu seçilmedi.
  if (!parsed.data.user) {
    clearAttempts(ip);
    return NextResponse.json({ ok: true, next: "kim" });
  }

  // Adım 2: oturumu aç.
  clearAttempts(ip);
  const token = await createSessionToken(parsed.data.user);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return response;
}
