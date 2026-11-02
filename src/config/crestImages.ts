// Browser-only: maps department id -> crest image URL (the department-coloured house crests).
// Same reason as patronusImages.ts for living apart from departments.ts: Node scripts and tests
// import departments.ts and cannot load .webp files.
// The patronus cut-outs in src/assets/patronus/ and config/patronusImages.ts are kept, just unused here.
import commsImg from '../assets/crests/comms.webp';
import creativeImg from '../assets/crests/creative.webp';
import eventsImg from '../assets/crests/events.webp';
import financeImg from '../assets/crests/finance.webp';
import hrImg from '../assets/crests/hr.webp';
import pressImg from '../assets/crests/press.webp';
import rndImg from '../assets/crests/rnd.webp';

/** 400px WebP with real alpha, already in each department's colour (see scripts/make-crests.py). */
const IMAGES: Record<string, string> = {
  comms: commsImg,
  creative: creativeImg,
  events: eventsImg,
  finance: financeImg,
  hr: hrImg,
  press: pressImg,
  rnd: rndImg,
};

export function crestUrl(deptId: string): string {
  return IMAGES[deptId] ?? '';
}