import { cookies } from "next/headers";

import { PEOPLE } from "@/config/site";
import { SESSION_COOKIE, readSessionToken, type Session } from "@/lib/auth";

/** Sunucu bileşenlerinde ve route handler'larda oturumu okur. */
export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  return readSessionToken(jar.get(SESSION_COOKIE)?.value);
}

/**
 * Oturum zorunlu olan yerlerde kullanılır.
 *
 * Middleware zaten korumasız istekleri `/kilit`'e yönlendiriyor; buraya
 * oturumsuz gelinmesi bir yapılandırma hatası demektir, sessizce geçmek yerine
 * patlaması daha iyi.
 */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new Error("Oturum yok — middleware matcher'ı kontrol edin.");
  return session;
}

/** Oturumdaki kişinin profil bilgisi (isim, doğum günü, renk). */
export async function currentPerson() {
  const session = await requireSession();
  return PEOPLE[session.user];
}

/** Karşı taraf — "rakip" ve "sana yazdı" gibi yerler için. */
export function otherPerson(user: Session["user"]) {
  return PEOPLE[user === "bilal" ? "partner" : "bilal"];
}
