/**
 * Token encryption helpers — used to encrypt OAuth access tokens and
 * refresh tokens before persisting them in the PlatformConnection table.
 *
 * Uses AES-256-GCM with a key derived from PLATFORM_CRYPTO_KEY (or
 * NEXTAUTH_SECRET as a fallback for demo deployments). Each token gets
 * a fresh random IV — the encrypted output is
 * `base64(iv):base64(ciphertext):base64(authTag)`.
 *
 * GCM provides both confidentiality (no one can read the token without
 * the key) AND authenticity (no one can tamper with the stored value
 * without detection).
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const KEY_LEN = 32; // 256 bits for AES-256

function getKey(): Buffer {
  const raw = process.env.PLATFORM_CRYPTO_KEY || process.env.NEXTAUTH_SECRET;
  if (!raw) {
    throw new Error(
      "[platforms/crypto] FATAL: PLATFORM_CRYPTO_KEY (or NEXTAUTH_SECRET as fallback) is not set."
    );
  }
  return scryptSync(raw, "replyai-platform-key-salt-v1", KEY_LEN);
}

export function encryptToken(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [iv, ciphertext, authTag]
    .map((b) => b.toString("base64"))
    .join(":");
}

export function decryptToken(encrypted: string): string {
  const key = getKey();
  const [ivB64, ciphertextB64, authTagB64] = encrypted.split(":");
  if (!ivB64 || !ciphertextB64 || !authTagB64) {
    throw new Error("[platforms/crypto] malformed encrypted token");
  }
  const iv = Buffer.from(ivB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
