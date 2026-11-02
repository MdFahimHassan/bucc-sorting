# The Sorting Ceremony (BUCC Fall 26)

A Harry Potter themed "which department are you in?" reveal for the BUCC new-member orientation (5 Nov 2026).
Students scan a QR code, enter their student ID, watch the Sorting Hat think, and get their department.

Static site: Vite + React + TypeScript (strict) + Tailwind + GSAP, a small canvas particle engine, and a PWA
that works offline after the first load. No backend, no database, no analytics.

All art is original (SVG/CSS/canvas). No Warner Bros or Wizarding World logos, images or fonts.

## Setup

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # lookup + crypto + CSV validation tests
npm run build        # runs build:data first, then type-checks and builds to dist/
npm run preview      # serve the production build on :4173
```

On a fresh clone there is no `data/participants.csv`, so `build:data` falls back to
`data/participants.sample.csv` and prints a loud warning. Sample IDs: `26301001` to `26301010`.

**Student ID format:** assumed to be 8 digits (example `26301234`). Change `STUDENT_ID_PATTERN` and
`STUDENT_ID_EXAMPLE` in `src/config/departments.ts` if yours differ. Input is normalised the same way at build
time and in the browser (trim, strip spaces/dashes/underscores, lowercase, Bengali and Arabic-Indic digits mapped to ASCII).

## Edit the department mapping

Everything lives in **`src/config/departments.ts`**: id, name, horcrux, accent colour, Sorting Hat flavour line,
two-line description, group chat URL and the SVG (drawn in `src/assets/svg/horcruxes.ts`).

- The `dept` column of the CSV must match a department `id` (`comms`, `creative`, `events`, `finance`, `hr`, `press`, `rnd`).
- Replace each `groupChatUrl: '[PLACEHOLDER]'` with the real invite link. While it still says PLACEHOLDER the button is hidden.

## Use the real participant list

1. Create `data/participants.csv` (gitignored, never deployed) with the header `id,name,dept`:
   ```csv
   id,name,dept
   26301234,Full Name,creative
   ```
2. Run `npm run build:data` (or just `npm run build`).
3. The script validates duplicate IDs (even if formatted differently), unknown departments and empty cells, and
   prints a per-department count. Any problem stops the build with a non-zero exit code.
4. Check that the output says `Source: .../data/participants.csv` and **not** `(SAMPLE)`.
   To make that a hard failure, build with `CI=1 npm run build` (refuses to fall back to the sample).

To use a CSV from another location: `PARTICIPANTS_CSV=/path/to/file.csv npm run build:data`.

### How the data is protected

`public/data.json` contains only a random salt and, per person, an AES-GCM ciphertext stored under a hashed key.

- lookup key = `SHA-256(salt + normalizedId)`
- encryption key = `PBKDF2(normalizedId, salt, 100000, SHA-256)` into AES-GCM 256, with a random IV per row
- payload = `{name, dept}`

No names, IDs or departments appear in plaintext, and the CSV is never copied into `dist/`.
Be honest about the limit: with 8-digit IDs, someone determined could brute-force the ID space offline
(about 100 million guesses at 100k PBKDF2 iterations each is slow but not impossible). It is built to stop casual
viewing and scraping of the file, not a determined attacker. If you need more, add a second secret to the ID (for example the last 4 digits of a phone number) and mix it into the key.

## Deploy to Cloudflare Pages

1. Make sure `data/participants.csv` exists **on the machine that builds**. It is gitignored, so Pages' git integration cannot see it.
2. Recommended: build locally (`CI=1 npm run build`) and upload `dist/` with Wrangler:
   ```bash
   npx wrangler pages deploy dist --project-name bucc-sorting
   ```
   (Or drag `dist/` into the Pages dashboard.)
3. `public/_headers` sets cache rules: `data.json`, `sw.js` and `index.html` are revalidated, hashed assets are immutable.
4. Point a short link or QR code at the Pages URL. Use https: Web Crypto does not work on plain http.

## Event-day checklist

**A week before**
- [ ] Real `groupChatUrl` for all 7 departments in `src/config/departments.ts`
- [ ] Final `data/participants.csv`; `CI=1 npm run build` succeeds and the per-dept counts look right
- [ ] Deployed to Pages; open the URL on one iPhone and one Android phone, on mobile data and on Wi-Fi
- [ ] Test 3 real IDs and one wrong ID. Test "Save my card" on both phones
- [ ] QR code printed large, tested from 1 m away, links to the **https** URL

**The day before**
- [ ] Late registrations? Add them to the CSV, rebuild, redeploy, and reload the live URL twice (the service worker updates on the second load)
- [ ] Tell volunteers (Prefects) the not-found message sends people to them, and how to look someone up in the CSV

**On the day**
- [ ] Ask people to open the link once on venue Wi-Fi before the ceremony (it then works offline)
- [ ] Try it in Instagram's and Messenger's in-app browsers (QR scanners often open these)
- [ ] Keep a Prefect with the CSV for people who are not found
- [ ] Sound is off by default; the speaker icon turns on a soft ambience and a chime on reveal

## Project structure

```
src/components   shared UI (particle layer, wand glow, error boundary, share sheet)
src/screens      Intro, ID entry, Ceremony (sorting + reveal + card), Not found
src/lib          crypto-core, normalize, lookup, particles, share card (lazy), audio (lazy)
src/config       departments.ts (the one config file)
src/styles       theme tokens (CSS variables) + styles
scripts          build-data.ts, dataset.ts
data             participants.sample.csv (real CSV is gitignored)
public           icons, og.png, favicon, _headers, generated data.json
tests            lookup, crypto and CSV tests
```

## Performance notes

Lighthouse (mobile emulation, simulated throttling, production build): Performance 98, Accessibility 98, Best Practices 100.
LCP 2.2 s, TBT 70 ms, total transfer 152 KiB. Initial JS is about 109 KB gzip. The share-card generator (2 KB gzip) and the audio
module (0.6 KB gzip) load only on demand. Audio is synthesized with Web Audio, so there is no audio file to download.

Particles are capped (60 on phones, 150 on desktop), shrink if FPS falls below about 45, pause when the tab is hidden, and stop
drawing when nothing is alive. Animations use transform and opacity only. `prefers-reduced-motion` gets a short fade reveal.

## Behaviour notes

- Three wrong IDs in a row pause the button for 4 seconds (polish only, not security).
- "Replay" runs the full ceremony again on the same result. Entering the same ID again also plays the full ceremony.
- If animation code ever throws, the card still renders with the answer; if React itself crashes, a plain-text result is shown.
- If this browser has no Web Crypto (very old browsers, or plain http), the ID screen explains how to fix it.
