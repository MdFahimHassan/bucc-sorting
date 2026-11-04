# The Sorting Ceremony | BUCC Fall 26

An interactive department-placement experience for the BRAC University Computer Club (BUCC)
Fall 2026 new-member orientation. Freshers scan a QR code, enter their student ID, watch the
Sorting Hat deliberate, and are revealed to one of seven departments, each represented by a Patronus.

## The experience

1. **Title scene.** A castle at dusk with a wand-light trail that follows your finger or cursor. Tap to enter.
2. **Owl and scroll.** The camera pans after an owl that drops a rolled scroll, the red string comes off and
   it unrolls into parchment. The oath inks in and you type your student ID.
3. **Wax seal.** Press and hold the seal (or press Enter). The scroll rolls shut, there is a flash of light,
   and the screen goes dark.
4. **The Sorting.** Out of the dark the Sorting Hat drops in over a ring of the seven department crests and
   speaks line by line. A heartbeat quickens with the tension while the lookup runs underneath.
5. **The reveal.** The ring spins down, the light steps from crest to crest and lands on yours. The other six
   crack and fall away, and your crest travels to the centre. Then comes a burst in the department colour
   and your name written out letter by letter.
6. **Your card.** Department, Patronus, a short description, and buttons to save a shareable card, join the
   department group chat, replay the ceremony, or try another ID.

If the ID is not on the list the Hat says so, and a Prefect (volunteer) can help.

## Highlights

- **Cinematic reveal:** all built with GSAP, the Web Animations API and a custom canvas particle engine
  (no Three.js). Screen changes are real transitions: a camera pan, a dusk fade and a dip to black on replay.
- **Seven departments, seven Patronuses:** Communication and Marketing (Phoenix), Creative (Tabby Cat), Event Management
  (Hare), Finance (Horse), Human Resources (Otter), Press Release and Publications (Stag), and Research and
  Development (Doe). Each has its own crest, accent colour, Hat line and description. All of it lives in
  `src/config/departments.ts`.
- **Shareable card:** generates a 1080x1920 PNG for Instagram stories. It tries the native share sheet first
  (with the image attached) and falls back to a download plus a preview you can press and hold to save,
  which also works in in-app browsers. The card generator is lazy-loaded.
- **Forgiving ID entry:** accepts 8 or 10 digit student IDs. Spaces, dashes and underscores are ignored, and
  Bangla, Arabic-Indic and full-width digits are converted, so typing on a Bangla keyboard works.
  Friendly validation messages are shown before any lookup happens.
- **Guess protection:** three wrong IDs in a row pause the form for a few seconds.
- **Replay:** run the full ceremony again on the same result without a second lookup.
- **No backend:** a static site (Cloudflare Pages or Vercel). No database, no analytics, no tracking.
- **Private participant data:** the list ships as encrypted data only. Lookup keys are
  SHA-256 hashes, and each record is AES-GCM encrypted with a PBKDF2-derived key from the student ID.
  No names, IDs or departments exist in plaintext in the deployed bundle. The real CSV is gitignored and
  never deployed.
- **Installable and offline-friendly (PWA):** a service worker precaches the app (scripts, styles, fonts, crests).
  `index.html` and `data.json` are fetched network-first with a 3 second timeout, so visitors never get a stale
  page or a stale participant list, and the cached copy is only an offline fallback. A new version takes over
  and reloads the page once.
- **Sound (off by default):** looping background music plus a sound for each beat of the ceremony
  (owl wings, rope, parchment, quill, wax stamp, heartbeat, cracking crests, reveal chime). Nothing is
  downloaded until someone taps the speaker button. The effects total ~230 KB and are cached for offline use;
  the music (~1.3 MB) streams. Mix levels are in one table at the top of `src/lib/audio.ts`.
- **Mobile-first and light:** lazy-loaded share-card and audio modules, a particle cap with FPS-based
  auto-reduction, and a lighter particle budget on phones and small tablets.
- **Accessible:** `prefers-reduced-motion` turns every transition into a short plain crossfade. There are
  live-region result announcements, visible focus states, 44px touch targets, and an error boundary that
  still shows the person's name, department and Patronus as plain text if animation fails.

## Tech stack

Vite, React 19, TypeScript (strict), Tailwind CSS 4, GSAP, vite-plugin-pwa, Vitest. Data tooling runs on `tsx`;
the asset scripts in `scripts/` use Python.
Self-hosted Cinzel, Cinzel Decorative and IM Fell English (SIL OFL).

## Credits

Intro title font: "Harry P" by Phoenix Phonts & GeM (Freeware, via fontspace.com), subset to Basic Latin
with `scripts/make-title-font.py`.

## Sound credits

All sounds are from [Pixabay](https://pixabay.com) under the
[Pixabay Content License](https://pixabay.com/service/license-summary/) (free to use, no attribution
required; credited here anyway). They were trimmed, level-matched and re-encoded with
`scripts/make-audio.py`; the originals are not in the repo.

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

## Quality

Lighthouse (mobile, production build): Performance 98, Accessibility 100, Best Practices 100.

## Quick start

    npm install
    npm run dev
    npm test

Without `data/participants.csv` the build falls back to `data/participants.sample.csv` and prints a loud
warning. Never deploy a sample build to students.

## Participant data

The real list lives in `data/participants.csv` (gitignored). Header and columns:

    id,name,dept
    23301206,Nishat Anjuman Dola,creative

- `id` is the student ID as plain digits (no `.0` from Excel).
- `name` is shown on the card exactly as written.
- `dept` is one of `comms`, `creative`, `events`, `finance`, `hr`, `press`, `rnd`, in lowercase.

Convert the club's member spreadsheet instead of typing it by hand:

    pip install openpyxl
    python3 scripts/xlsx-to-csv.py "members.xlsx"

It expects the columns "Student Id", "Name" and "Department", fixes Excel's `22301342.0` IDs, maps full
department names to ids, and refuses to write anything if a row is incomplete, a department is unknown, or an
ID appears twice.

Then build the encrypted list:

    npm run build:data

This validates the CSV (duplicate IDs, even when formatted differently, unknown departments, empty cells),
writes `public/data.json` and prints the participant count per department. `npm run build` runs it
automatically first. Use `--strict` (or `CI=1`) to refuse the sample fallback.

**Adding or fixing someone late:** edit the CSV, run `npm run build:data`, then redeploy with the new
`public/data.json`. See below for how each host picks it up.

## Deployment

The output is a static site (`dist/`). Caching headers are in `public/_headers` (Cloudflare Pages) and
`vercel.json` (Vercel). `data.json`, `index.html`, `sw.js` and the manifest are `no-cache`; hashed assets
are immutable for a year.

- **Cloudflare Pages:** build locally or in CI with the CSV available (`npm run build`), then deploy `dist/`.
- **Vercel:** the CSV is deliberately not in the repo. Build `data.json` locally, **commit `public/data.json`**,
  and push. On Vercel the build uses that committed file after checking it is a valid, current-format
  encrypted list.

If `data.json` is in an old format, the app refuses it with a clear error instead of telling everyone
"not found". Rebuild it with `npm run build:data`.

## Customising

- **Departments, Patronus names, Hat lines, descriptions, colours, ID format:** `src/config/departments.ts`.
  The ID format check is `STUDENT_ID_PATTERN` (8 or 10 digits today).
- **Group chat buttons:** set each `groupChatUrl` in `departments.ts`. While it still contains `PLACEHOLDER`
  the button is hidden.
- **Event name and title:** the `EVENT` object in `departments.ts`, plus `index.html` and the manifest in
  `vite.config.ts`.
- **Timings and transitions:** `src/lib/motion.ts` and `src/styles/transitions.css`.
- **Sound mix:** `src/lib/audio.ts`.
- **Wrong-ID pause:** `WRONG_TRIES_BEFORE_PAUSE` and `PAUSE_MS` in `src/App.tsx`.
- **Regenerating art and audio:** `scripts/make-crests.py`, `make-patronuses.py`, `make-scroll.py`,
  `make-title-font.py` and `make-audio.py`. Their outputs are committed, so the site build never needs Python.

## Tests

`npm test` runs Vitest. It covers ID normalisation, the encrypt and decrypt round trip, messy and Bangla
input, tampered ciphertext failing closed, the guarantee that no plaintext names, IDs or departments ship in
`data.json`, and the CSV validation rules.

## Event-day checklist

1. Fill in the real `groupChatUrl` for every department.
2. Build from the real CSV (no sample warning) and check the per-department counts look right.
3. Deploy, then open the live site on a phone and look up a few real IDs, including a 10-digit one.
4. Check an unknown ID shows the "cannot find you" screen.
5. Test the card save or share on both iOS and Android, and inside Instagram or Messenger's in-app browser.
6. Print the QR code and leave the Prefects (volunteers) a plan for IDs that are missing from the list.
7. If someone is missing, add them to the CSV, run `npm run build:data` and redeploy.

## Disclaimer

An unofficial fan-themed student club project. It is not affiliated with or endorsed by
Warner Bros. Discovery or the Wizarding World. All artwork is original.