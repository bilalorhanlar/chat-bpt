import { NextResponse } from "next/server";

/**
 * Sağlık kontrolü.
 *
 * Bilerek hiçbir şeye bağımlı değil: veritabanına, oturuma ya da ortam
 * değişkenlerine dokunmuyor. Amaç "süreç ayakta ve istek alıyor mu" sorusunu
 * cevaplamak — veritabanı geçici olarak düşse bile dağıtımın geri alınmasına
 * gerek yok.
 *
 * `proxy.ts` bu yolu koruma dışında bırakıyor; aksi hâlde kontrol `/kilit`'e
 * yönlendirilirdi.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ ok: true });
}
