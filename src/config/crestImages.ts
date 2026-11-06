// Kept out of departments.ts: Node scripts and tests import it and cannot load .webp files.
import commsImg from '../assets/crests/comms.webp';
import creativeImg from '../assets/crests/creative.webp';
import eventsImg from '../assets/crests/events.webp';
import financeImg from '../assets/crests/finance.webp';
import hrImg from '../assets/crests/hr.webp';
import pressImg from '../assets/crests/press.webp';
import rndImg from '../assets/crests/rnd.webp';

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