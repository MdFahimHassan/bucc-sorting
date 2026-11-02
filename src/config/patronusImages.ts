// Browser-only: maps department id -> patronus image URL.
// Kept out of departments.ts on purpose, because scripts/build-data.ts and the tests import
// departments.ts in plain Node, which cannot load .webp files.
import doeImg from '../assets/patronus/doe.webp';
import hareImg from '../assets/patronus/hare.webp';
import horseImg from '../assets/patronus/horse.webp';
import otterImg from '../assets/patronus/otter.webp';
import phoenixImg from '../assets/patronus/phoenix.webp';
import stagImg from '../assets/patronus/stag.webp';
import terrierImg from '../assets/patronus/terrier.webp';

/** White patronus image (alpha only); tinted with the department accent at runtime. */
const IMAGES: Record<string, string> = {
  comms: phoenixImg,
  creative: terrierImg,
  events: hareImg,
  finance: horseImg,
  hr: otterImg,
  press: stagImg,
  rnd: doeImg,
};

export function patronusUrl(deptId: string): string {
  return IMAGES[deptId] ?? '';
}