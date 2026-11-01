// Original line-art horcrux marks. 100x100 viewBox.
// Strokes use currentColor (set to the department glow); gold details use var(--gold, #d9b45b).
// Every mark is hand-drawn for this project and does not reproduce any studio artwork.

const open = (inner: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${inner}</svg>`;

/** Nagini: a serpent coiled in an S, tongue forked. */
export const naginiSvg = open(`
  <path d="M70 18c-22-6-42 2-40 18 2 15 38 12 40 30 2 14-22 22-42 12" stroke-width="7"/>
  <path d="M70 18c-22-6-42 2-40 18 2 15 38 12 40 30 2 14-22 22-42 12" stroke="var(--gold, #d9b45b)" stroke-width="1.4" stroke-dasharray="1 5"/>
  <path d="M70 18c5-5 13-4 15 1 1 4-3 8-9 8" fill="currentColor" fill-opacity=".25"/>
  <circle cx="79" cy="19.5" r="1.8" fill="var(--gold, #d9b45b)" stroke="none"/>
  <path d="M26 79l-9 3m9-3l-7-7" stroke-width="2"/>
`);

/** Scar: a lightning bolt inside a round frame. */
export const scarSvg = open(`
  <circle cx="50" cy="50" r="38" stroke-width="2" stroke-dasharray="2 5"/>
  <path d="M58 12L33 54h17l-9 34 28-46H52z" fill="currentColor" fill-opacity=".3" stroke-width="3.5"/>
  <path d="M58 12L33 54h17l-9 34 28-46H52z" stroke="var(--gold, #d9b45b)" stroke-width=".9"/>
`);

/** Cup: a two-handled goblet. */
export const cupSvg = open(`
  <path d="M28 22h44c0 22-8 36-22 36S28 44 28 22z" fill="currentColor" fill-opacity=".22"/>
  <path d="M28 28c-14 0-14 18 3 20M72 28c14 0 14 18-3 20"/>
  <path d="M50 58v16M36 80h28M40 74h20"/>
  <path d="M36 32c1 9 5 15 11 18" stroke="var(--gold, #d9b45b)" stroke-width="1.6"/>
  <path d="M28 22h44" stroke="var(--gold, #d9b45b)" stroke-width="3.5"/>
`);

/** Ring: a band set with a cracked stone. */
export const ringSvg = open(`
  <ellipse cx="50" cy="62" rx="26" ry="24" stroke-width="5"/>
  <ellipse cx="50" cy="62" rx="26" ry="24" stroke="var(--gold, #d9b45b)" stroke-width="1" stroke-dasharray="1 4"/>
  <path d="M36 36l8-14h12l8 14-14 12z" fill="currentColor" fill-opacity=".3"/>
  <path d="M50 24l-3 11 7 4-5 9" stroke="var(--gold, #d9b45b)" stroke-width="1.6"/>
`);

/** Locket: an oval pendant on a chain with a serpentine flourish. */
export const locketSvg = open(`
  <path d="M30 8c4 14 10 18 20 18S66 22 70 8" stroke-width="1.8" stroke-dasharray="1 3.5"/>
  <ellipse cx="50" cy="60" rx="24" ry="29" fill="currentColor" fill-opacity=".2"/>
  <ellipse cx="50" cy="60" rx="18" ry="23" stroke="var(--gold, #d9b45b)" stroke-width="1.4"/>
  <path d="M42 50c8-9 16-1 8 7s-1 15 8 7" stroke-width="3"/>
  <circle cx="50" cy="29" r="3" fill="var(--gold, #d9b45b)" stroke="none"/>
`);

/** Diary: a closed book with an ink blot and a tear. */
export const diarySvg = open(`
  <rect x="24" y="12" width="52" height="76" rx="4" fill="currentColor" fill-opacity=".2"/>
  <path d="M33 12v76" stroke="var(--gold, #d9b45b)" stroke-width="1.6"/>
  <path d="M44 34h22M44 42h22M44 50h14" stroke-width="1.8"/>
  <path d="M60 68c-5 0-7 6-3 9 3 2 9 0 9-5 0-3-3-4-6-4z" fill="var(--gold, #d9b45b)" stroke="none"/>
  <path d="M76 24l-6 5 5 4-6 6" stroke-width="1.6"/>
`);

/** Diadem: a circlet with a central jewel and swept wings. */
export const diademSvg = open(`
  <path d="M10 62c10-6 22-12 40-12s30 6 40 12" stroke-width="4"/>
  <path d="M10 62c10 10 26 16 40 16s30-6 40-16" stroke-width="2" stroke="var(--gold, #d9b45b)"/>
  <path d="M50 50L40 28l10-12 10 12z" fill="currentColor" fill-opacity=".3"/>
  <path d="M30 56l-6-18 10 8M70 56l6-18-10 8" stroke-width="2.4"/>
  <circle cx="50" cy="27" r="2.6" fill="var(--gold, #d9b45b)" stroke="none"/>
  <circle cx="22" cy="59" r="2" fill="currentColor" stroke="none"/><circle cx="78" cy="59" r="2" fill="currentColor" stroke="none"/>
`);
