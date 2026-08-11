import { randomUUID } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { PERSON_KEYS } from "@/config/site";
import {
  GUEST_PIN,
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const Body = z.object({
  pin: z.string().regex(/^\d{4}$/, "PIN 4 rakam olmalı"),
  /** Yoksa yalnızca PIN doğrulanır, oturum açılmaz (iki adımlı giriş). */
  user: z.enum(PERSON_KEYS).optional(),
});

/* --- kaba kuvvet freni ------------------------------------------------- */
/*
 * Yalnızca **başarısız** denemeler sayılıyor.
 *
 * Önceden her istek sayacı artırıyordu ve başarılı her giriş — misafir girişi
 * dahil — sayacı sıfırlıyordu. Misafir PIN'i herkese açık olduğu için
 * saldırgan 9 denemede bir "0000" gönderip sayacı sıfırlayabiliyordu; 4 haneli
 * PIN'in tek koruması böylece tamamen etkisizdi.
 *
 * Bellek içi sayaç iki kişilik bir site için yeterli: Redis eklemek korumanın
 * kendisinden çok hareketli parça getirirdi. Süreç yeniden başlarsa sayaç
 * sıfırlanır; kabul edilebilir.
 */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const attempts = new Map<string, { count: number; resetAt: number }>();

/** Sayacı artırmadan yalnızca bakar. */
function isBlocked(ip: string): boolean {
  const entry = attempts.get(ip);
  if (!entry || Date.now() > entry.resetAt) return false;
  return entry.count >= MAX_ATTEMPTS;
}

/** Yanlış PIN denemesini kaydeder. */
function registerFailure(ip: string) {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  entry.count++;
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

  if (isBlocked(ip)) {
    return NextResponse.json(
      { error: "Çok fazla deneme yaptın. 15 dakika sonra tekrar dene." },
      { status: 429 },
    );
  }

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "PIN 4 rakam olmalı." }, { status: 400 });
  }

  /*
   * Misafir PIN'i ortak PIN'den önce kontrol ediliyor ve "kimsin?" adımı yok.
   *
   * Sayaca dokunulmuyor: misafir PIN'i zaten herkese açık, tahmin edilecek bir
   * sırrı yok. Sıfırlasaydık yanlış PIN denemelerinin sayacını temizlerdi;
   * artırsaydık arkadaşlar girdikçe ev sahiplerini kilitlerdi.
   */
  if (parsed.data.pin === GUEST_PIN) {
    const token = await createSessionToken({ kind: "misafir", id: randomUUID() });
    const response = NextResponse.json({ ok: true, misafir: true });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(true));
    return response;
  }

  const hash = await pinHash();
  if (!hash) {
    return NextResponse.json(
      { error: "PIN henüz kurulmamış. `npm run db:seed` çalıştırın." },
      { status: 503 },
    );
  }

  if (!(await bcrypt.compare(parsed.data.pin, hash))) {
    registerFailure(ip);
    return NextResponse.json({ error: "PIN yanlış." }, { status: 401 });
  }

  // Adım 1: PIN doğru ama henüz kim olduğu seçilmedi.
  if (!parsed.data.user) {
    clearAttempts(ip);
    return NextResponse.json({ ok: true, next: "kim" });
  }

  // Adım 2: oturumu aç.
  clearAttempts(ip);
  const token = await createSessionToken({ kind: "kisi", user: parsed.data.user });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return response;
}
