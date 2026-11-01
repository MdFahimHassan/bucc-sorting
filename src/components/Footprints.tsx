/**
 * Footprints that walk across the bottom of the map: pairs fade in and out in sequence.
 * Opacity-only animation; static and faint under prefers-reduced-motion (see CSS).
 */
const COUNT = 10;

export function Footprints() {
  const prints = Array.from({ length: COUNT }, (_, i) => {
    const x = 22 + i * 34;
    const wave = Math.sin(i * 0.55) * 14;
    const side = i % 2 === 0 ? -9 : 9;
    const y = 56 + wave + side;
    const slope = Math.cos(i * 0.55) * 14 * 0.55;
    const angle = 90 + (Math.atan2(slope, 34) * 180) / Math.PI;
    return { x, y, angle, i };
  });

  return (
    <svg
      className="footprints"
      viewBox="0 0 360 110"
      preserveAspectRatio="xMidYMax meet"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <g id="fp">
          <ellipse cx="0" cy="3" rx="4.6" ry="8.2" />
          <ellipse cx="0" cy="12.5" rx="3.3" ry="3.8" />
          <circle cx="-4.4" cy="-8.2" r="1.7" />
          <circle cx="-1.8" cy="-10.4" r="1.6" />
          <circle cx="1.2" cy="-10.6" r="1.5" />
          <circle cx="3.8" cy="-8.8" r="1.4" />
        </g>
      </defs>
      {prints.map((p) => (
        <use
          key={p.i}
          href="#fp"
          className="fp"
          style={{ ['--i' as string]: p.i }}
          transform={`translate(${p.x} ${p.y}) rotate(${p.angle.toFixed(1)})`}
        />
      ))}
    </svg>
  );
}
