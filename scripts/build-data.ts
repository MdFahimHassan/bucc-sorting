/**
 * npm run build:data
 *
 * Reads data/participants.csv (gitignored, never deployed) and writes public/data.json,
 * where every row is hashed + AES-GCM encrypted. Falls back to the sample CSV with a loud
 * warning so `npm run dev` works on a fresh clone. Pass --strict (or set CI=1) to refuse the fallback.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEPARTMENT_IDS } from '../src/config/departments';
import { buildDataset, rowsFromCsv, validateRows } from './dataset';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const realCsv = resolve(root, process.env.PARTICIPANTS_CSV ?? 'data/participants.csv');
const sampleCsv = resolve(root, 'data/participants.sample.csv');
const outFile = resolve(root, 'public/data.json');
const strict = process.argv.includes('--strict') || process.env.CI === '1';

const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;

async function main() {
  let source = realCsv;
  let usingSample = false;
  if (!existsSync(realCsv)) {
    if (strict) {
      console.error(red(`\nMissing ${realCsv}. Refusing to fall back to sample data in strict mode.`));
      process.exit(1);
    }
    source = sampleCsv;
    usingSample = true;
    console.warn(
      yellow(
        '\n!! data/participants.csv not found. Building from the SAMPLE list.\n' +
          '!! Do NOT deploy this build to students. Add the real CSV and rebuild.\n',
      ),
    );
  }

  const { rows, errors: parseErrors } = rowsFromCsv(readFileSync(source, 'utf8'));
  const { errors: rowErrors, warnings, counts } = validateRows(rows, DEPARTMENT_IDS);
  const errors = [...parseErrors, ...rowErrors];

  if (rows.length === 0 && errors.length === 0) errors.push('No participant rows found');

  if (errors.length) {
    console.error(red(`\n${errors.length} problem(s) in ${source}:`));
    for (const e of errors) console.error(red(`  - ${e}`));
    process.exit(1);
  }

  const data = await buildDataset(rows);
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, JSON.stringify(data));

  console.log(green(`\nWrote ${outFile}`));
  console.log(`Source: ${source}${usingSample ? '  (SAMPLE)' : ''}`);
  console.log(`Participants: ${rows.length}\n`);
  console.log('Per department:');
  for (const [id, n] of counts) console.log(`  ${id.padEnd(10)} ${String(n).padStart(3)}`);
  for (const w of warnings) console.warn(yellow(`  warning: ${w}`));
  console.log('');
}

main().catch((e) => {
  console.error(red(String(e)));
  process.exit(1);
});
