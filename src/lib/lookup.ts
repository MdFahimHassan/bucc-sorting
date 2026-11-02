import {
  decryptPayload,
  deriveAesKey,
  lookupKey,
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
      if (!isDataFile(j)) throw new Error('data.json: unexpected shape');
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
    const key = await lookupKey(data.salt, id);
    // Own-property check so inputs like "constructor" can never hit Object.prototype.
    if (!Object.prototype.hasOwnProperty.call(data.entries, key)) return { status: 'not-found' };
    const entry = data.entries[key];
    if (!entry) return { status: 'not-found' };
    const aes = await deriveAesKey(id, data.salt);
    return { status: 'found', person: await decryptPayload(aes, entry) };
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
