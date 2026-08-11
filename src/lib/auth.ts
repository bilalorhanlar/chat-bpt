import { SignJWT, jwtVerify } from "jose";

import { PERSON_KEYS, type PersonKey } from "@/config/site";

/**
 * Giriş: ortak PIN + "kimsin?" seçimi, ya da misafir PIN'i.
 *
 * Oturum imzalı bir JWT olarak `httpOnly` çerezde duruyor; veritabanında oturum
 * tablosu yok. İki kişilik bir site için sunucu tarafı oturum deposu tutmanın
 * getirisi yok, ama JWT'nin Edge çalışma zamanında doğrulanabilmesi
 * `proxy`'nin veritabanına hiç dokunmadan çalışmasını sağlıyor.
 *
 * **Misafir modu**: arkadaşlar geldiğinde sabit bir PIN'le girip yalnızca oyun
 * oynayabiliyorlar. Misafir oturumunun kimliği yok; oynadıkları maçlar
 * `guest` işaretiyle kaydediliyor ve şampiyona tablosuna hiç girmiyor.
 */

export const SESSION_COOKIE = "oturum";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 90; // 90 gün
/** Misafir oturumu kısa: arkadaşlar gittikten sonra açık kalmasın. */
const GUEST_MAX_AGE_SECONDS = 60 * 60 * 12;

/** Misafir girişinin sabit PIN'i. Ortak PIN'den ayrı ve değiştirilemez. */
export const GUEST_PIN = "0000";

export type Session =
  | { kind: "kisi"; user: PersonKey }
  /**
   * Misafir oturumu. `id` girişte üretilen rastgele bir kimlik: misafir
   * maçları buna bağlanıyor, böylece maç bağlantısını ele geçiren başka bir
   * misafir oyuna karışamıyor.
   */
  | { kind: "misafir"; id: string };

export function isGuest(session: Session | null): boolean {
  return session?.kind === "misafir";
}

/** Kişi oturumundaki kullanıcı; misafirse null. */
export function sessionUser(session: Session | null): PersonKey | null {
  return session?.kind === "kisi" ? session.user : null;
}

/** Misafir oturumunun kimliği; kişi oturumunda null. */
export function guestId(session: Session | null): string | null {
  return session?.kind === "misafir" ? session.id : null;
}

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

export async function createSessionToken(session: Session): Promise<string> {
  const payload =
    session.kind === "kisi"
      ? { user: session.user }
      : { misafir: true as const, gid: session.id };

  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(
      `${session.kind === "kisi" ? MAX_AGE_SECONDS : GUEST_MAX_AGE_SECONDS}s`,
    )
    .sign(secret());
}

export async function readSessionToken(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.misafir === true) {
      // Kimliksiz eski jetonlar geçersiz: misafir maçı sahipliği buna dayanıyor.
      return typeof payload.gid === "string" ? { kind: "misafir", id: payload.gid } : null;
    }
    return isPersonKey(payload.user) ? { kind: "kisi", user: payload.user } : null;
  } catch {
    return null;
  }
}

export function sessionCookieOptions(guest = false) {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: guest ? GUEST_MAX_AGE_SECONDS : MAX_AGE_SECONDS,
  } as const;
}

/**
 * Misafirin girebileceği yollar.
 *
 * Yalnızca oyunlar — listeler, mektuplar, şifreler ve ayarlar kapalı.
 * Şampiyona da kapalı: misafir maçları oraya yazılmıyor, tabloyu göstermenin
 * de anlamı yok.
 */
export function guestCanAccess(pathname: string): boolean {
  if (pathname === "/kilit") return true;
  if (pathname === "/oyunlar" || pathname.startsWith("/oyunlar/")) return true;
  if (pathname.startsWith("/api/")) return true;
  return false;
}
