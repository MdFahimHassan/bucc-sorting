/**
 * Web Crypto primitives shared by the build script (Node 20+) and the browser.
 *
 *   lookupKey = hex(SHA-256(salt + normalizedId))
 *   aesKey    = PBKDF2(normalizedId, salt, 100k iterations, SHA-256) -> AES-GCM 256
 *   entry     = { iv: base64(12 random bytes), ct: base64(AES-GCM(JSON{name, dept})) }
 */
export const PBKDF2_ITERATIONS = 100_000;

export interface EncryptedEntry {
  iv: string;
  ct: string;
}

export interface Payload {
  name: string;
  dept: string;
}

export interface DataFile {
  salt: string;
  entries: Record<string, EncryptedEntry>;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

function subtle(): SubtleCrypto {
  const s = globalThis.crypto?.subtle;
  if (!s) throw new Error('Web Crypto is not available');
  return s;
}

export function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

export function toBase64(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function lookupKey(salt: string, normalizedId: string): Promise<string> {
  return toHex(await subtle().digest('SHA-256', enc.encode(salt + normalizedId)));
}

export async function deriveAesKey(normalizedId: string, salt: string): Promise<CryptoKey> {
  const s = subtle();
  const material = await s.importKey('raw', enc.encode(normalizedId), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return s.deriveKey(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptPayload(key: CryptoKey, payload: Payload): Promise<EncryptedEntry> {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const ct = await subtle().encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(JSON.stringify(payload)),
  );
  return { iv: toBase64(iv), ct: toBase64(new Uint8Array(ct)) };
}

export async function decryptPayload(key: CryptoKey, entry: EncryptedEntry): Promise<Payload> {
  const pt = await subtle().decrypt(
    { name: 'AES-GCM', iv: fromBase64(entry.iv) },
    key,
    fromBase64(entry.ct),
  );
  const parsed: unknown = JSON.parse(dec.decode(pt));
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as Payload).name !== 'string' ||
    typeof (parsed as Payload).dept !== 'string'
  ) {
    throw new Error('Malformed payload');
  }
  return { name: (parsed as Payload).name, dept: (parsed as Payload).dept };
}
