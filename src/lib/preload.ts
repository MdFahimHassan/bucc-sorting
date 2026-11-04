import { crestUrl } from '../config/crestImages';
import { DEPARTMENT_IDS } from '../config/departments';

/**
 * Downloads and decodes every department crest during the intro, so the ceremony never has to fetch
 * them mid-animation (the cause of crests popping in late on slow venue wifi).
 */
const held: HTMLImageElement[] = []; // keeps the decoded images alive
let all: Promise<void> | null = null;
let loaded = false;

function loadOne(url: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    held.push(img);
    const done = () => resolve();
    img.onload = () => {
      if (typeof img.decode === 'function') img.decode().then(done, done);
      else done();
    };
    img.onerror = done;
    img.src = url;
  });
}

export function preloadCrests(): Promise<void> {
  if (!all) {
    const urls = DEPARTMENT_IDS.map((id) => crestUrl(id)).filter(Boolean);
    all = Promise.all(urls.map(loadOne)).then(() => {
      loaded = true;
    });
  }
  return all;
}

/** True once every crest is downloaded and decoded. */
export const crestsLoaded = () => loaded;

/** Resolves when the crests are ready, or after `maxMs`, whichever comes first (never blocks forever). */
export function crestsReady(maxMs = 2500): Promise<void> {
  return Promise.race([preloadCrests(), new Promise<void>((r) => setTimeout(r, maxMs))]);
}