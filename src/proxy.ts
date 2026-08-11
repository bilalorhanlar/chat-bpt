import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, guestCanAccess, isGuest, readSessionToken } from "@/lib/auth";

/**
 * Site tamamen kapalı: geçerli oturum çerezi olmayan her istek `/kilit`'e gider.
 *
 * Misafir oturumu yalnızca oyun sayfalarını görebiliyor; başka bir yola
 * gitmeye çalışırsa `/oyunlar`'a yönleniyor. Kısıt burada uygulanıyor çünkü
 * tek geçiş noktası burası — sayfa sayfa kontrol eklemek er geç bir yeri
 * atlamak demek.
 *
 * Burada veritabanına dokunulmuyor — yalnızca JWT imzası doğrulanıyor, o da
 * Edge çalışma zamanında çalışıyor.
 */
export async function proxy(request: NextRequest) {
  const session = await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  const { pathname, search } = request.nextUrl;
  const onLockScreen = pathname === "/kilit";

  if (session) {
    if (isGuest(session)) {
      // Misafir kilit ekranına dönerse oyunlara gitsin.
      if (onLockScreen) return NextResponse.redirect(new URL("/oyunlar", request.url));
      if (!guestCanAccess(pathname)) {
        return NextResponse.redirect(new URL("/oyunlar", request.url));
      }
      return NextResponse.next();
    }

    // Girmiş biri kilit ekranını görmesin.
    if (onLockScreen) return NextResponse.redirect(new URL("/", request.url));
    return NextResponse.next();
  }

  if (onLockScreen) return NextResponse.next();

  const url = new URL("/kilit", request.url);
  if (pathname !== "/") url.searchParams.set("devam", pathname + search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    /**
     * Statik dosyalar ve giriş/sağlık uçları hariç her şey.
     */
    "/((?!api/giris|api/cikis|api/saglik|_next/static|_next/image|favicon.ico|anilar|ses|3d|image).*)",
  ],
};
