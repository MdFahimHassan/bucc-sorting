import {
  DATA_VERSION,
  decryptPayload,
  deriveKeys,
  type DataFile,
  type Payload,
} from './crypto-core';
import { normalizeId } from './normalize';

export type LookupResult =
  | { status: 'found'; person: Payload }
  | { status: 'not-found' }
  | { status: 'unsupported' }
  | { status: 'error'; message: string };

/** True when this browser can run the lookup (Web Crypto needs a secure context). */
export function cryptoSupported(): boolean {
  return (
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.subtle !== 'undefined' &&
    typeof globalThis.crypto.getRandomValues === 'function'
  );
}

function isDataFile(v: unknown): v is DataFile {
  if (typeof v !== 'object' || v === null) return false;
  const d = v as DataFile;
  // A data.json built by an older version of the app uses a different key scheme: reject it loudly
  // instead of letting every student silently get "not found".
  if (d.v !== DATA_VERSION) return false;
  return typeof d.salt === 'string' && typeof d.entries === 'object' && d.entries !== null;
}

let cached: Promise<DataFile> | null = null;

/** Fetch data.json once. Retries on the next call if the first attempt failed. */
export function loadData(url = '/data.json'): Promise<DataFile> {
  cached ??= fetch(url, { cache: 'no-cache' })
    .then((r) => {
      if (!r.ok) throw new Error(`data.json: HTTP ${r.status}`);
      return r.json() as Promise<unknown>;
    })
    .then((j) => {
      if (!isDataFile(j)) throw new Error('data.json: unexpected shape or out-of-date format (rebuild it with npm run build:data)');
      return j;
    })
    .catch((e: unknown) => {
      cached = null;
      throw e;
    });
  return cached;
}

/** Pure lookup against an already-loaded data file. Wrong ID or any decrypt failure -> not-found. */
export async function lookupWithData(data: DataFile, rawId: string): Promise<LookupResult> {
  if (!cryptoSupported()) return { status: 'unsupported' };
  const id = normalizeId(rawId);
  if (!id) return { status: 'not-found' };
  try {
    // One PBKDF2 run gives both the public lookup key and the private AES key.
    const { lookupKey, aesKey } = await deriveKeys(id, data.salt);
    // Own-property check so inputs like "constructor" can never hit Object.prototype.
    if (!Object.prototype.hasOwnProperty.call(data.entries, lookupKey)) return { status: 'not-found' };
    const entry = data.entries[lookupKey];
    if (!entry) return { status: 'not-found' };
    return { status: 'found', person: await decryptPayload(aesKey, entry) };
  } catch {
    return { status: 'not-found' };
  }
}

export async function lookupParticipant(rawId: string): Promise<LookupResult> {
  if (!cryptoSupported()) return { status: 'unsupported' };
  try {
    return await lookupWithData(await loadData(), rawId);
  } catch (e) {
    return { status: 'error', message: e instanceof Error ? e.message : 'Could not load the list' };
  }
}