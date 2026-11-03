import type { RefObject } from 'react';
import rollBody from '../assets/scroll/roll-body.webp';
import rollCapL from '../assets/scroll/roll-cap-l.webp';
import rollCapR from '../assets/scroll/roll-cap-r.webp';

/**
 * A snowy owl in side view, carrying the rolled scroll in its talons.
 * Original artwork, pure SVG (~2 KB). Wings flap with a CSS transform loop (see .owl-wing).
 * `carriedRef` points at the scroll in the talons so the intro can hide it the moment the
 * real, animated scroll is dropped.
 * The scroll uses the same textures as the dropped scroll and the open scroll's rolls
 * (src/assets/scroll/), so it is visibly the same object all the way through.
 */
export function Owl({ carriedRef }: { carriedRef: RefObject<SVGGElement | null> }) {
  const wing =
    'M100 72 C92 50 78 28 52 10 L56 24 L40 18 L50 32 L36 30 L50 42 L38 44 L56 54 C70 64 88 74 112 80 Z';
  return (
    <svg className="owl-svg" viewBox="0 0 200 140" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="owl-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#ffeabc" stopOpacity="0.32" />
          <stop offset="1" stopColor="#ffeabc" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="owl-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fdf8ec" />
          <stop offset="1" stopColor="#d6cab0" />
        </linearGradient>
      </defs>

      <ellipse cx="100" cy="76" rx="98" ry="60" fill="url(#owl-glow)" />

      {/* far wing */}
      <g className="owl-wing owl-wing-far">
        <path d={wing} fill="#bdb199" stroke="#a69a82" strokeWidth="0.8" strokeLinejoin="round" />
      </g>

      {/* tail */}
      <path
        d="M54 78 L8 74 Q3 78 9 81 L2 89 Q8 93 14 90 L10 100 Q18 102 24 96 L58 92 Z"
        fill="#e4d9c1"
        stroke="#b9ad94"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />

      {/* body */}
      <ellipse cx="94" cy="84" rx="46" ry="23" transform="rotate(-6 94 84)" fill="url(#owl-body)" />
      <g fill="#9b8d76" opacity="0.5">
        <ellipse cx="86" cy="90" rx="3" ry="1.4" />
        <ellipse cx="98" cy="94" rx="3.2" ry="1.4" />
        <ellipse cx="110" cy="90" rx="3" ry="1.4" />
        <ellipse cx="76" cy="82" rx="2.6" ry="1.2" />
        <ellipse cx="92" cy="80" rx="2.6" ry="1.2" />
        <ellipse cx="106" cy="82" rx="2.6" ry="1.2" />
      </g>

      {/* head */}
      <circle cx="136" cy="66" r="21" fill="#fdf8ec" />
      <path d="M121 50 L125 37 L133 48 Z" fill="#efe6d1" />
      <path d="M139 47 L148 36 L151 50 Z" fill="#efe6d1" />
      <ellipse cx="142" cy="68" rx="14" ry="15" fill="#fffaf0" />
      <path d="M138 59 Q146 55 153 60" fill="none" stroke="#a89c84" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="146" cy="64" r="6.2" fill="#e8b83a" />
      <circle cx="147.2" cy="64" r="3" fill="#2a1a0e" />
      <circle cx="148.2" cy="62.6" r="1" fill="#fff" />
      <path d="M154 69 L164 74 L154 78 Q152 73 154 69 Z" fill="#d9a53a" />

      {/* near wing */}
      <g className="owl-wing owl-wing-near">
        <path d={wing} fill="#f4eedf" stroke="#b3a78f" strokeWidth="0.9" strokeLinejoin="round" />
        <path d="M96 70 C90 56 80 42 64 30" fill="none" stroke="#cfc3ab" strokeWidth="1.2" strokeLinecap="round" />
      </g>

      {/* talons + the scroll they hold */}
      <g ref={carriedRef}>
        <path d="M86 104 L84 111 M98 104 L100 111" stroke="#c9a35a" strokeWidth="3" strokeLinecap="round" />
        {/* Same proportions as .roll in index.css, scaled to the 12-unit-high scroll: body, then the
            slightly taller spiral ends sticking out either side. */}
        <image href={rollBody} x="58" y="108" width="64" height="12" preserveAspectRatio="none" />
        <image href={rollCapL} x="55.8" y="107.4" width="7.6" height="13.1" preserveAspectRatio="none" />
        <image href={rollCapR} x="116.6" y="107.4" width="7.6" height="13.1" preserveAspectRatio="none" />
        <rect x="86" y="107" width="8" height="14" rx="1.5" fill="#b3261e" />
        <circle cx="90" cy="107" r="3.4" fill="#d23a30" />
      </g>
    </svg>
  );
}