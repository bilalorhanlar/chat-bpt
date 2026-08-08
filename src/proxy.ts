import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, readSessionToken } from "@/lib/auth";

/**
 * Site tamamen kapalı: geçerli oturum çerezi olmayan her istek `/kilit`'e gider.
 *
 * Burada veritabanına dokunulmuyor — yalnızca JWT imzası doğrulanıyor, o da
 * Edge çalışma zamanında çalışıyor. Böylece her sayfa isteğine bir sorgu
 * eklenmiyor.
 */
export async function proxy(request: NextRequest) {
  const session = await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  const { pathname, search } = request.nextUrl;
  const onLockScreen = pathname === "/kilit";

  if (session) {
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
     * Statik dosyalar ve giriş uç noktası hariç her şey.
     * `anilar`, `ses` ve `3d` public altındaki varlıklar — kilit ekranındaki
     * arka plan da onlardan besleniyor.
     */
    "/((?!api/giris|api/cikis|api/saglik|_next/static|_next/image|favicon.ico|anilar|ses|3d|image).*)",
  ],
};
