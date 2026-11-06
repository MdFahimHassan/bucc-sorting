import { forwardRef } from 'react';

/** The tip sits at the element's origin so GSAP can position it directly. */
export const WritingWand = forwardRef<HTMLDivElement>(function WritingWand(_, ref) {
  return (
    <div ref={ref} className="writing-wand" aria-hidden="true">
      <div className="writing-wand-halo" />
      <svg className="writing-wand-body" width="190" height="190" viewBox="-6 -6 190 190">
        <defs>
          <linearGradient id="ww-wood" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#6b4a2b" />
            <stop offset="1" stopColor="#2a1a0e" />
          </linearGradient>
        </defs>
        <g transform="rotate(48)">
          <path d="M0 0 L112 -3.2 Q124 -3.6 132 -4.6 L172 -5 Q178 0 172 5 L132 4.6 Q124 3.6 112 3.2 Z" fill="url(#ww-wood)" />
          <path d="M6 -0.6 L110 -2.4" stroke="#c9a06a" strokeWidth="0.9" opacity=".55" strokeLinecap="round" />
          <rect x="124" y="-5" width="3.2" height="10" rx="1" fill="#d9b45b" />
          <rect x="132" y="-5.2" width="2.2" height="10.4" rx="1" fill="#8f7435" />
          <circle cx="174" cy="0" r="5.4" fill="#d9b45b" />
        </g>
      </svg>
    </div>
  );
});