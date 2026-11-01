import {
  deriveAesKey,
  encryptPayload,
  lookupKey,
  toHex,
  type DataFile,
} from '../src/lib/crypto-core';
import { normalizeId } from '../src/lib/normalize';

export interface Row {
  id: string;
  name: string;
  dept: string;
}

export interface ValidationResult {
  errors: string[];
  warnings: string[];
  counts: Map<string, number>;
}

/** Minimal RFC 4180 CSV parser (quotes, escaped quotes, CRLF, BOM). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const c = src[i]!;
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else inQuotes = false;
      } else cell += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cell);
      cell = '';
      rows.push(row);
      row = [];
    } else cell += c;
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

export function rowsFromCsv(text: string): { rows: Row[]; errors: string[] } {
  const errors: string[] = [];
  const table = parseCsv(text);
  const header = (table[0] ?? []).map((h) => h.trim().toLowerCase());
  const idx = { id: header.indexOf('id'), name: header.indexOf('name'), dept: header.indexOf('dept') };
  if (idx.id < 0 || idx.name < 0 || idx.dept < 0) {
    return { rows: [], errors: ['Header must contain the columns: id,name,dept'] };
  }
  const rows: Row[] = [];
  table.slice(1).forEach((cells, i) => {
    const line = i + 2;
    if (cells.every((c) => c.trim() === '')) {
      return; // blank line, ignore silently
    }
    const row = {
      id: (cells[idx.id] ?? '').trim(),
      name: (cells[idx.name] ?? '').trim(),
      dept: (cells[idx.dept] ?? '').trim().toLowerCase(),
    };
    const missing = (['id', 'name', 'dept'] as const).filter((k) => row[k] === '');
    if (missing.length) {
      errors.push(`Line ${line}: empty ${missing.join(', ')}`);
      return;
    }
    rows.push(row);
  });
  return { rows, errors };
}

export function validateRows(rows: Row[], knownDepts: readonly string[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const counts = new Map<string, number>(knownDepts.map((d) => [d, 0]));
  const seen = new Map<string, string>();
  for (const r of rows) {
    const nid = normalizeId(r.id);
    if (!nid) {
      errors.push(`ID "${r.id}" is empty after normalisation`);
      continue;
    }
    const prev = seen.get(nid);
    if (prev !== undefined) errors.push(`Duplicate ID ${nid} (${prev} and ${r.name})`);
    else seen.set(nid, r.name);
    if (!knownDepts.includes(r.dept)) {
      errors.push(`Unknown dept "${r.dept}" for ${r.name} (known: ${knownDepts.join(', ')})`);
    } else counts.set(r.dept, (counts.get(r.dept) ?? 0) + 1);
  }
  for (const [d, n] of counts) if (n === 0) warnings.push(`No participants in dept "${d}"`);
  return { errors, warnings, counts };
}

/** Build the public data file. Nothing in the output is plaintext except the salt. */
export async function buildDataset(rows: Row[], salt?: string): Promise<DataFile> {
  const s = salt ?? toHex(globalThis.crypto.getRandomValues(new Uint8Array(16)).buffer);
  const entries: DataFile['entries'] = {};
  for (const r of rows) {
    const nid = normalizeId(r.id);
    const key = await lookupKey(s, nid);
    const aes = await deriveAesKey(nid, s);
    entries[key] = await encryptPayload(aes, { name: r.name, dept: r.dept });
  }
  return { salt: s, entries };
}
