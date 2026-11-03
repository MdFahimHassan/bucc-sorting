/**
 * Web Crypto primitives shared by the build script (Node 20+) and the browser.
 *
 *   root      = PBKDF2(normalizedId, salt, 100k iterations, SHA-256) -> 32 bytes   (the only slow step)
 *   lookupKey = hex(HKDF(root, info "bucc-lookup"))   <- the key in data.json
 *   aesKey    = AES-GCM 256 from HKDF(root, info "bucc-aes")
 *   entry     = { iv: base64(12 random bytes), ct: base64(AES-GCM(JSON{name, dept})) }
 *
 * Both the lookup key and the AES key come out of the same slow PBKDF2 run, so anyone
 * guessing IDs offline pays 100k hash iterations per guess just to learn whether an ID is
 * a member (a bare SHA-256 lookup key would let them test guesses almost for free).
 * The student's phone still does exactly one PBKDF2 per lookup.
 */
export const PBKDF2_ITERATIONS = 100_000;

/** Bump when the key derivation or file layout changes so a stale data.json is rejected loudly. */
export const DATA_VERSION = 2;

export interface EncryptedEntry {
  iv: string;
  ct: string;
}

export interface Payload {
  name: string;
  dept: string;
}

export interface DataFile {
  v: number;
  salt: string;
  entries: Record<string, EncryptedEntry>;
}

export interface DerivedKeys {
  lookupKey: string;
  aesKey: CryptoKey;
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

/** One PBKDF2 run -> the public lookup key and the private AES key for a normalised ID. */
export async function deriveKeys(normalizedId: string, salt: string): Promise<DerivedKeys> {
  const s = subtle();
  const pw = await s.importKey('raw', enc.encode(normalizedId), 'PBKDF2', false, ['deriveBits']);
  const root = await s.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    pw,
    256,
  );
  const hkdfKey = await s.importKey('raw', root, 'HKDF', false, ['deriveBits', 'deriveKey']);
  const hkdf = (info: string): HkdfParams => ({
    name: 'HKDF',
    hash: 'SHA-256',
    salt: new Uint8Array(0),
    info: enc.encode(info),
  });
  const lookupBits = await s.deriveBits(hkdf('bucc-lookup'), hkdfKey, 256);
  const aesKey = await s.deriveKey(
    hkdf('bucc-aes'),
    hkdfKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
  return { lookupKey: toHex(lookupBits), aesKey };
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