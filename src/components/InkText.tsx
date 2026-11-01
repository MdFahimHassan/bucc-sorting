/** Words that ink in one after another. Opacity + tiny transform only. */
export function InkText({
  text,
  className,
  startDelayMs = 250,
  stepMs = 105,
}: {
  text: string;
  className?: string;
  startDelayMs?: number;
  stepMs?: number;
}) {
  const words = text.split(' ');
  return (
    <p className={className}>
      {words.map((w, i) => (
        <span key={`${w}-${i}`}>
          <span className="ink-word" style={{ animationDelay: `${startDelayMs + i * stepMs}ms` }}>
            {w}
          </span>
          {i < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </p>
  );
}
