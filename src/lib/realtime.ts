import type { Server } from "socket.io";

/**
 * Sunucu eylemlerinden Socket.IO'ya köprü.
 *
 * Next ve Socket.IO **aynı Node sürecinde** çalışıyor (server/index.ts), ama
 * Next'in modül grafiği ile sunucunun modül grafiği ayrı. `globalThis` üzerinden
 * paylaşmak ikisini birbirine bağlamanın en ince yolu.
 *
 * Bu tasarımın önemli sonucu: oyun kuralları **yalnızca** sunucu eylemlerinde
 * çalışıyor. Soket katmanı hiç kural bilmiyor, sadece yeni durumu odaya
 * yayınlıyor. Aynı mantığı iki yerde tutmak zorunda kalsaydık ikisi kaçınılmaz
 * olarak ayrışırdı.
 */

const KEY = "__bizim_io__";

type GlobalWithIo = typeof globalThis & { [KEY]?: Server };

export function setIoServer(io: Server) {
  (globalThis as GlobalWithIo)[KEY] = io;
}

function io(): Server | undefined {
  return (globalThis as GlobalWithIo)[KEY];
}

export function matchRoom(matchId: string) {
  return `match:${matchId}`;
}

/**
 * Maçtaki herkese yeni durumu gönderir.
 *
 * Sessizce başarısız olması bilinçli: `next dev` gibi soketsiz bir çalıştırmada
 * oyun yine de çalışmalı (yalnızca karşı taraf kendiliğinden tazelenmez).
 */
export function emitMatchState(matchId: string, payload: unknown) {
  io()?.to(matchRoom(matchId)).emit("match:state", payload);
}

export function emitToUser(userId: string, event: string, payload: unknown) {
  io()?.to(`user:${userId}`).emit(event, payload);
}
