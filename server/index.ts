/**
 * Next.js + Socket.IO tek süreçte.
 *
 * Railway kalıcı bir container çalıştırdığı için gerçek WebSocket'i doğrudan
 * burada barındırabiliyoruz; ayrı bir Pusher/Ably servisine gerek yok.
 *
 * Yükseltme (upgrade) isteklerinin paylaşımı:
 *   /socket.io/*  → Socket.IO
 *   diğer her şey → Next'in kendi yükseltme işleyicisi (geliştirmede HMR
 *                    bağlantısı buradan geçiyor)
 * `destroyUpgrade: false` olmadan engine.io, yoluna uymayan yükseltmeleri
 * kapatıyor ve geliştirmede sıcak yükleme sessizce ölüyor.
 */
import { createServer } from "node:http";

import next from "next";
import { Server as SocketServer } from "socket.io";

import { registerRealtime } from "./realtime";

// Tüm sunucu tarafı tarih hesapları (doğum günü, geri sayım, "bugünün sorusu")
// Türkiye saatine göre olsun. Railway varsayılan olarak UTC çalışıyor ve
// gece yarısı ile 03:00 arasında bir gün şaşırtıyor.
process.env.TZ ||= "Europe/Istanbul";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT ?? 3000);
const hostname = process.env.HOSTNAME ?? "0.0.0.0";

async function main() {
  const app = next({ dev, hostname, port });
  await app.prepare();

  // Bu iki işleyici yalnızca prepare() sonrasında alınabiliyor.
  const handle = app.getRequestHandler();
  const upgrade = app.getUpgradeHandler();

  const httpServer = createServer((req, res) => {
    handle(req, res).catch((error) => {
      console.error("istek işlenemedi:", error);
      res.statusCode = 500;
      res.end("Sunucu hatası");
    });
  });

  const io = new SocketServer(httpServer, {
    path: "/socket.io",
    // Next'in HMR yükseltmeleri engine.io tarafından kapatılmasın.
    destroyUpgrade: false,
    serveClient: false,
  });

  httpServer.on("upgrade", (req, socket, head) => {
    if (req.url?.startsWith("/socket.io")) return;
    upgrade(req, socket, head).catch(() => socket.destroy());
  });

  registerRealtime(io);

  httpServer.listen(port, hostname, () => {
    console.log(`→ http://localhost:${port}  (${dev ? "geliştirme" : "üretim"})`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
