# The Sorting Ceremony

An interactive department-placement experience for the BRAC University Computer Club (BUCC) Fall 2026
new-member orientation. Attendees scan a QR code, enter their student ID, watch the Sorting Hat deliberate,
and are revealed to one of seven departments.

It is a fully static, client-side site: no backend, no database and no analytics.

## Table of contents

- [Experience](#experience)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Participant data](#participant-data)
- [Deployment](#deployment)
- [Configuration](#configuration)
- [Testing](#testing)
- [Event-day checklist](#event-day-checklist)
- [Credits](#credits)
- [Disclaimer](#disclaimer)

## Experience

1. **Title scene.** A castle at dusk with a wand-light trail that follows the pointer. Tap to enter.
2. **Owl and scroll.** The camera follows an owl that drops a rolled scroll. The red string comes off, the scroll
   unrolls into parchment, and the attendee types their student ID.
3. **Wax seal.** Press and hold the seal to submit. Keyboard users focus the seal and press Enter or Space, which
   activates it immediately. Pressing Enter inside the ID field does not submit. The scroll rolls shut and the
   screen goes dark.
4. **The Sorting.** The Sorting Hat drops in over a ring of the seven department crests and speaks line by line
   while the lookup runs underneath.
5. **The reveal.** The ring spins down, the light steps from crest to crest and lands on the chosen one, the other
   six crack and fall away, and the crest moves to the centre followed by the attendee's name.
6. **The card.** Department, Patronus, a short description, and actions to save a shareable image, join the
   department group chat, replay the ceremony, or try another ID.

If an ID is not on the list, the Hat says so and a volunteer can help.

## Features

- **Departments.** Seven departments, each with its own crest, accent colour, Patronus, Hat line and description:
  Communication and Marketing (Phoenix), Creative (Tabby Cat), Event Management (Hare), Finance (Horse),
  Human Resources (Otter), Press Release and Publications (Stag), and Research and Development (Doe).
  All of it is defined in `src/config/departments.ts`.
- **Animation.** GSAP, the Web Animations API and a custom canvas particle engine, with no 3D library.
  Screen changes are real transitions: a camera pan, a dusk fade, and a dip to black on replay.
- **Shareable card.** Generates a 1080x1920 PNG for stories. It tries the native share sheet first and falls
  back to a download with a press-and-hold preview that also works in in-app browsers. The generator is
  lazy-loaded.
- **Forgiving ID entry.** Accepts 8 or 10 digit IDs. Spaces, dashes and underscores are ignored, and Bangla,
  Arabic-Indic and full-width digits are converted. Validation messages appear before any lookup.
- **Guess protection.** Three wrong IDs in a row pause the form for a few seconds.
- **Replay.** Runs the full ceremony again on the same result without a second lookup.
- **Private participant data.** The deployed list is encrypted. Each record is AES-GCM encrypted, and both its
  lookup key and encryption key are derived from the student ID through PBKDF2 (100,000 iterations, SHA-256)
  followed by HKDF. Offline guessing therefore costs one full PBKDF2 run per attempt. No names, IDs or departments
  exist in plaintext in the deployed bundle, and the source CSV is gitignored.
- **Installable PWA.** A service worker precaches scripts, styles, fonts and images. `index.html` and `data.json`
  are fetched network-first with a 3 second timeout, so visitors never see a stale page or participant list.
  A new version takes over and reloads the page once.
- **Sound (off by default).** Background music plus a sound for each beat of the ceremony. Nothing is downloaded
  until the speaker button is tapped. The effects (about 230 KB) are cached for offline use and the music
  (about 1.3 MB) streams. Mix levels are defined in `src/lib/audio.ts`.
- **Performance.** Lazy-loaded share-card and audio modules, a particle cap that shrinks when frame rate drops,
  a lighter particle budget on phones, and a "lite" mode that disables decorative infinite animations on
  low-end devices (force it with `?lite=1` or disable it with `?lite=0`).
- **Accessibility.** `prefers-reduced-motion` turns every transition into a short crossfade. The app provides
  live-region result announcements, visible focus states, 44px touch targets, and an error boundary that shows
  the result as plain text if animation fails.

## Tech stack

| Area | Tools |
|---|---|
| App | React 19, TypeScript (strict), Vite |
| Styling | Tailwind CSS 4 and hand-written CSS |
| Animation | GSAP, Web Animations API, canvas |
| PWA | vite-plugin-pwa |
| Testing | Vitest |
| Tooling | `tsx` for data scripts, Python for asset generation |
| Fonts | Cinzel, Cinzel Decorative, IM Fell English (SIL OFL), self-hosted |

## Getting started

Requires Node.js 20 or later.

    npm install
    npm run dev

| Command | Purpose |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Build the encrypted data, type-check, and produce `dist/` |
| `npm run build:data` | Build `public/data.json` from the participant CSV |
| `npm run preview` | Serve the production build locally |
| `npm test` | Run the test suite |
| `npm run typecheck` | Type-check without emitting |

If `data/participants.csv` is missing, the data build falls back to `data/participants.sample.csv` and prints a
warning. That sample file is not included in this repository, so create one or provide the real CSV before
building. Never deploy a sample build to attendees.

## Participant data

The real list lives in `data/participants.csv`, which is gitignored:

    id,name,dept
    23301206,Nishat Anjuman Dola,creative

- `id`: the student ID as plain digits (no `.0` suffix from Excel).
- `name`: shown on the card exactly as written.
- `dept`: one of `comms`, `creative`, `events`, `finance`, `hr`, `press`, `rnd`.

To convert the club's member spreadsheet instead of typing the list by hand:

    pip install openpyxl
    python3 scripts/xlsx-to-csv.py "members.xlsx"

The script expects the columns "Student Id", "Name" and "Department", fixes Excel's `22301342.0` IDs, maps
department names to ids, and refuses to write anything if a row is incomplete, a department is unknown, or an
ID appears twice.

Then build the encrypted list:

    npm run build:data

This validates the CSV (duplicate IDs even when formatted differently, unknown departments, empty cells), writes
`public/data.json`, and prints the participant count per department. `npm run build` runs it automatically.
Use `--strict` (or `CI=1`) to refuse the sample fallback.

**Late additions or fixes:** edit the CSV, run `npm run build:data`, and redeploy with the new `public/data.json`.

## Deployment

The output is a static site in `dist/`. Caching headers are defined in `public/_headers` (Cloudflare Pages) and
`vercel.json` (Vercel). `data.json`, `index.html`, `sw.js` and the manifest are served with `no-cache`; hashed
assets are immutable for a year.

- **Cloudflare Pages:** run `npm run build` locally or in CI with the CSV available, then deploy `dist/`.
- **Vercel:** the CSV is deliberately not in the repository. Build `data.json` locally, commit
  `public/data.json`, and push. The Vercel build uses the committed file after verifying it is a valid,
  current-format encrypted list. Keep the repository private.

If `data.json` is in an outdated format, the app rejects it with a clear error instead of reporting "not
found" to everyone. Rebuild it with `npm run build:data`.

## Configuration

| What | Where |
|---|---|
| Departments, Patronus names, Hat lines, descriptions, colours | `src/config/departments.ts` |
| Student ID format | `STUDENT_ID_PATTERN` in `src/config/departments.ts` (8 or 10 digits) |
| Group chat links | `groupChatUrl` per department; while a value contains `PLACEHOLDER` the button is hidden |
| Event name and title | `EVENT` in `src/config/departments.ts`, `index.html`, and the manifest in `vite.config.ts` |
| Timings and transitions | `src/lib/motion.ts`, `src/styles/transitions.css` |
| Sound mix | `src/lib/audio.ts` |
| Wrong-ID pause | `WRONG_TRIES_BEFORE_PAUSE` and `PAUSE_MS` in `src/App.tsx` |

Art and audio can be regenerated with the scripts in `scripts/` (`make-crests.py`, `make-patronuses.py`,
`make-scroll.py`, `make-title-font.py`, `make-audio.py`). Their outputs are committed, so the site build does not
require Python.

## Testing

`npm test` runs Vitest. The suite covers ID normalisation, the encrypt and decrypt round trip, messy and Bangla
input, tampered ciphertext failing closed, a fresh IV per record, batched dataset builds, the guarantee that no
plaintext names, IDs or departments ship in `data.json`, and the CSV validation rules.

## Event-day checklist

1. Set the real `groupChatUrl` for every department.
2. Build from the real CSV (no sample warning) and confirm the per-department counts.
3. Deploy, then open the live site on a phone and look up several real IDs, including a 10-digit one.
4. Confirm an unknown ID shows the "cannot find you" screen.
5. Test card saving and sharing on iOS and Android, including Instagram and Messenger in-app browsers.
6. Print the QR code and brief volunteers on how to handle IDs missing from the list.
7. For a missing attendee, add them to the CSV, run `npm run build:data`, and redeploy.

## Credits

**Title font:** "Harry P" by Phoenix Phonts & GeM (Freeware), subset to Basic Latin with
`scripts/make-title-font.py`.

**Sound:** all sounds are from [Pixabay](https://pixabay.com) under the
[Pixabay Content License](https://pixabay.com/service/license-summary/). They were trimmed, level-matched and
re-encoded with `scripts/make-audio.py`; the originals are not in the repository.

| Use | Sound | By |
|---|---|---|
| Background music | "Hogwarts Express" | Luis Humanoide |
| Reveal chime | "A Magical Discovery Chime" | Youssef Mizani |
| Hat's heartbeat | "Heartbeat 02" | BRVHRTZ |
| Crests cracking | "Glass Bottle Smash" | Universfield |
| Button tick | "Mouse Click" | Universfield |
| Whooshes | "Thin Swoosh" | Universfield |
| Wax seal, scroll landing | "Traditional Stamp" | freesound_community |
| Oath inking in | "Quill Pen Writing on Hard Paper" | freesound_community |
| Owl flying | "Dragon Wings Flapping" | DRAGON-STUDIO |
| Scroll unrolling | "Foley Paper Handling & Page Turning" | LensPulse |
| String coming off | "Rope & Leather Tension" | Alex (OxidVideos) |
| Hat landing | "Magic Glitter Wand 5" | Robert Gacek (FxProSound) |

## Disclaimer

An unofficial, fan-themed student club project. It is not affiliated with or endorsed by Warner Bros. Discovery
or the Wizarding World. All artwork is original.