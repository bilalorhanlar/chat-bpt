import { SignJWT, jwtVerify } from "jose";

import { PERSON_KEYS, type PersonKey } from "@/config/site";

/**
 * Ortak PIN + "kimsin?" seçimi.
 *
 * Oturum imzalı bir JWT olarak `httpOnly` çerezde duruyor; veritabanında oturum
 * tablosu yok. İki kullanıcılı bir site için sunucu tarafı oturum deposu
 * tutmanın getirisi yok, ama JWT'nin Edge çalışma zamanında doğrulanabilmesi
 * `middleware`'in veritabanına hiç dokunmadan çalışmasını sağlıyor.
 */

export const SESSION_COOKIE = "oturum";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 90; // 90 gün

export type Session = { user: PersonKey };

function secret(): Uint8Array {
  const raw = process.env.AUTH_SECRET;
  if (!raw || raw.length < 24) {
    throw new Error(
      "AUTH_SECRET eksik veya çok kısa (en az 24 karakter). .env dosyasına ekleyin.",
    );
  }
  return new TextEncoder().encode(raw);
}

function isPersonKey(value: unknown): value is PersonKey {
  return typeof value === "string" && (PERSON_KEYS as readonly string[]).includes(value);
}

export async function createSessionToken(user: PersonKey): Promise<string> {
  return new SignJWT({ user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secret());
}

export async function readSessionToken(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return isPersonKey(payload.user) ? { user: payload.user } : null;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE_SECONDS,
} as const;
