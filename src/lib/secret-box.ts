import "server-only";

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

/**
 * Parola kasası için simetrik şifreleme (AES-256-GCM).
 *
 * Anahtar `AUTH_SECRET`'tan scrypt ile türetiliyor. Amaç: veritabanı yedeği
 * ya da bağlantı adresi tek başına sızarsa parolalar okunamasın — anahtar
 * yalnızca uygulama sunucusunun ortamında var.
 *
 * Kayıt biçimi: `iv.tag.veri` (base64url). GCM'in doğrulama etiketi sayesinde
 * kurcalanmış kayıt çözülürken hata verir, sessizce bozuk veri dönmez.
 *
 * Dikkat: AUTH_SECRET değişirse eski kayıtlar çözülemez. Ayarlar ekranındaki
 * PIN değişikliği bunu ETKİLEMEZ (PIN ayrı); yalnızca .env'deki AUTH_SECRET'a
 * dokunursanız kayıtlı parolaları yeniden girmeniz gerekir.
 */

const SALT = "bizim-yerimiz-kasa-v1";

let cachedKey: Buffer | null = null;

function key(): Buffer {
  if (cachedKey) return cachedKey;
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 24) {
    throw new Error("AUTH_SECRET eksik — parola kasası kullanılamaz.");
  }
  cachedKey = scryptSync(secret, SALT, 32);
  return cachedKey;
}

export function sealSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, data].map((part) => part.toString("base64url")).join(".");
}

export function openSecret(sealed: string): string {
  const [iv, tag, data] = sealed.split(".").map((part) => Buffer.from(part, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
