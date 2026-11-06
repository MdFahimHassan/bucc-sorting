export function HatIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 120"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <ellipse cx="60" cy="98" rx="52" ry="12" fill="#0d1124" />
      <path
        d="M30 96C38 74 44 52 54 36c6-10 16-12 22-22 4-6 14-2 12 8-2 8-10 12-10 20 0 14 8 36 14 54z"
        fill="#151a30"
      />
      <path d="M33 84c21 8 45 8 57 0" />
      <path d="M50 66c12 6 26 6 36 0" strokeWidth="1.6" opacity=".7" />
    </svg>
  );
}