import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';
import { config } from '../config.js';

const PREFIX = 'enc:v1:';

function deriveKey(): Buffer {
  return createHash('sha256')
    .update(`finatura-settings:${config.jwt.secret}`)
    .digest();
}

/** AES-256-GCM — gizli ayar değerleri (API anahtarı vb.). */
export function encryptSecret(plain: string): {
  ciphertext: string;
  keyId: string;
} {
  const key = deriveKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const packed = Buffer.concat([iv, tag, enc]).toString('base64url');
  return { ciphertext: `${PREFIX}${packed}`, keyId: 'jwt-derived-v1' };
}

export function decryptSecret(ciphertext: string): string {
  const trimmed = ciphertext.trim();
  if (!trimmed.startsWith(PREFIX)) {
    // Geriye dönük: düz metin / plain:
    if (trimmed.startsWith('plain:')) return trimmed.slice('plain:'.length);
    return trimmed;
  }
  const raw = Buffer.from(trimmed.slice(PREFIX.length), 'base64url');
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const data = raw.subarray(28);
  const key = deriveKey();
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    'utf8',
  );
}

export function maskSecret(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.length <= 8) return '••••••••';
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}
