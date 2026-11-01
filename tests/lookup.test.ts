import { beforeAll, describe, expect, it } from 'vitest';
import { normalizeId } from '../src/lib/normalize';
import { lookupWithData } from '../src/lib/lookup';
import { lookupKey, type DataFile } from '../src/lib/crypto-core';
import { buildDataset, parseCsv, rowsFromCsv, validateRows } from '../scripts/dataset';
import { DEPARTMENT_IDS } from '../src/config/departments';

const ROWS = [
  { id: '26301001', name: 'Tahmid Rahman', dept: 'comms' },
  { id: '26301002', name: 'Nusrat Jahan Mim', dept: 'creative' },
  { id: '26301007', name: 'Mahir Chowdhury', dept: 'rnd' },
];

describe('normalizeId', () => {
  it('trims, strips spaces/dashes/underscores and lowercases', () => {
    expect(normalizeId('  26-301 001 ')).toBe('26301001');
    expect(normalizeId('26_301–001')).toBe('26301001');
    expect(normalizeId('ABC-12')).toBe('abc12');
  });
  it('maps Bengali, Arabic-Indic and full-width digits to ASCII', () => {
    expect(normalizeId('২৬৩০১০০১')).toBe('26301001');
    expect(normalizeId('٢٦٣٠١٠٠١')).toBe('26301001');
    expect(normalizeId('２６３０１００１')).toBe('26301001');
  });
  it('is idempotent', () => {
    const once = normalizeId(' 26-301001 ');
    expect(normalizeId(once)).toBe(once);
  });
});

describe('lookup round trip', () => {
  let data: DataFile;
  beforeAll(async () => {
    data = await buildDataset(ROWS, 'test-salt');
  });

  it('decrypts a known ID to the right person', async () => {
    const r = await lookupWithData(data, '26301001');
    expect(r).toEqual({ status: 'found', person: { name: 'Tahmid Rahman', dept: 'comms' } });
  });

  it('accepts messy input for a known ID', async () => {
    const r = await lookupWithData(data, ' 26-301 007 ');
    expect(r.status).toBe('found');
    if (r.status === 'found') expect(r.person.dept).toBe('rnd');
  });

  it('accepts Bengali digits', async () => {
    const r = await lookupWithData(data, '২৬৩০১০০২');
    expect(r.status).toBe('found');
  });

  it('returns not-found for an unknown ID', async () => {
    expect((await lookupWithData(data, '99999999')).status).toBe('not-found');
  });

  it('returns not-found for empty and prototype-ish input', async () => {
    expect((await lookupWithData(data, '   ')).status).toBe('not-found');
    expect((await lookupWithData(data, 'constructor')).status).toBe('not-found');
    expect((await lookupWithData(data, '__proto__')).status).toBe('not-found');
  });

  it('fails closed when ciphertext is tampered with', async () => {
    const target = ROWS[0]!;
    const key = await lookupKey(data.salt, normalizeId(target.id));
    const original = data.entries[key]!;
    const bad: DataFile = {
      salt: data.salt,
      entries: { ...data.entries, [key]: { ...original, ct: 'AAAA' + original.ct.slice(4) } },
    };
    expect((await lookupWithData(bad, target.id)).status).toBe('not-found');
    // Sanity: the untouched data still resolves, so the failure above is due to tampering.
    expect((await lookupWithData(data, target.id)).status).toBe('found');
  });

  it('ships no plaintext names, IDs or departments', async () => {
    const json = JSON.stringify(data);
    for (const row of ROWS) {
      expect(json).not.toContain(row.id);
      expect(json).not.toContain(row.name);
      expect(json).not.toContain(`"${row.dept}"`);
    }
    expect(Object.keys(data)).toEqual(['salt', 'entries']);
  });

  it('uses a fresh IV per row', async () => {
    const ivs = Object.values(data.entries).map((e) => e.iv);
    expect(new Set(ivs).size).toBe(ivs.length);
  });
});

describe('CSV validation', () => {
  it('parses quoted fields, CRLF and BOM', () => {
    const t = parseCsv('﻿id,name,dept\r\n1,"Doe, Jane",rnd\r\n');
    expect(t).toEqual([
      ['id', 'name', 'dept'],
      ['1', 'Doe, Jane', 'rnd'],
    ]);
  });

  it('flags duplicate IDs (even when formatted differently), unknown depts and empty cells', () => {
    const csv = 'id,name,dept\n26301001,A,comms\n26-301-001,B,comms\n26301003,C,nope\n26301004,,rnd\n\n';
    const { rows, errors: parseErrors } = rowsFromCsv(csv);
    expect(parseErrors.some((e) => e.includes('empty name'))).toBe(true);
    const { errors } = validateRows(rows, DEPARTMENT_IDS);
    expect(errors.some((e) => e.includes('Duplicate ID'))).toBe(true);
    expect(errors.some((e) => e.includes('Unknown dept "nope"'))).toBe(true);
  });

  it('rejects a CSV with the wrong header', () => {
    expect(rowsFromCsv('a,b,c\n1,2,3').errors.length).toBe(1);
  });

  it('counts per department and warns on empty ones', () => {
    const { counts, warnings } = validateRows(ROWS, DEPARTMENT_IDS);
    expect(counts.get('comms')).toBe(1);
    expect(counts.get('finance')).toBe(0);
    expect(warnings.length).toBeGreaterThan(0);
  });
});
