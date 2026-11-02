# The Sorting Ceremony | BUCC Fall 26

An interactive department-placement experience for the BRAC University Computer Club (BUCC)
Fall 2026 new-member orientation. Freshers scan a QR code, enter their student ID, watch the
Sorting Hat deliberate, and are revealed to one of seven departments, each represented by a Patronus.

## Highlights

- **Cinematic reveal:** a wand-light intro, a Marauder's Map style ID screen, a tension-building
  sorting sequence, and a department reveal with particle effects, all built with GSAP and a custom
  canvas particle engine (no Three.js).
- **Shareable card:** generates a 1080x1920 PNG for Instagram stories, with the native share sheet
  and a download fallback for in-app browsers.
- **No backend:** a static site on Cloudflare Pages. No database, no analytics, no tracking.
- **Private participant data:** the list ships as encrypted data only. Lookup keys are
  SHA-256 hashes, and each record is AES-GCM encrypted with a PBKDF2-derived key from the student ID.
  No names, IDs or departments exist in plaintext in the deployed bundle.
- **Works offline:** a service worker precaches the app and data after the first load.
- **Mobile-first and light:** about 109 KB gzip of JavaScript, a particle cap with FPS-based
  auto-reduction, `prefers-reduced-motion` support, and lazy-loaded share-card and audio modules.
- **Accessible:** live-region result announcements, visible focus states, 44px touch targets,
  and an error boundary that still shows a plain-text result if animation fails.

## Tech stack

Vite, React, TypeScript (strict), Tailwind CSS, GSAP, vite-plugin-pwa, Vitest.
Self-hosted Cinzel, Cinzel Decorative and IM Fell English (SIL OFL).

## Credits

Intro title font: "Harry P" by Phoenix Phonts & GeM (Freeware, via fontspace.com), subset to Basic Latin
with `scripts/make-title-font.py`.

## Quality

Lighthouse (mobile, production build): Performance 98, Accessibility 100, Best Practices 100.

## Quick start

    npm install
    npm run dev
    npm test

Full setup, data pipeline, deployment and an event-day checklist are in the sections below.

## Disclaimer

An unofficial fan-themed student club project. It is not affiliated with or endorsed by
Warner Bros. Discovery or the Wizarding World. All artwork is original.