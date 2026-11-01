import { DEPARTMENTS, EVENT } from './config/departments';

// Step 1 placeholder: proves tokens, fonts and the department config render.
// Replaced by the real screen flow in Step 3.
export function App() {
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col gap-6 px-5 py-10">
      <h1 className="font-display text-3xl text-gold-bright">{EVENT.title}</h1>
      <p className="text-text-dim">{EVENT.label}</p>
      <ul className="grid gap-4">
        {DEPARTMENTS.map((d) => (
          <li
            key={d.id}
            className="flex items-center gap-4"
            style={{ ['--glow' as string]: d.accent }}
          >
            <span
              className="block h-14 w-14 shrink-0 text-glow"
              dangerouslySetInnerHTML={{ __html: d.svg }}
            />
            <span>
              <span className="block font-heading text-lg text-glow">{d.name}</span>
              <span className="block text-sm text-text-dim">{d.horcrux}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="film-layer" />
    </main>
  );
}
