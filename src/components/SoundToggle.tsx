import { useEffect, useState } from 'react';
import { isSoundOn, preloadAudio, toggleSound } from '../lib/sound';

export function SoundToggle() {
  const [on, setOn] = useState(isSoundOn);
  // Fetch the audio code (a few KB, no sound files) now, so the tap itself never waits for it.
  // iOS only lets audio start inside the tap, so that matters.
  useEffect(() => {
    preloadAudio();
  }, []);
  return (
    <button
      type="button"
      className="sound-toggle press"
      aria-pressed={on}
      aria-label={on ? 'Sound on. Tap to mute.' : 'Sound off. Tap to turn on.'}
      onClick={() => {
        void toggleSound().then(setOn);
      }}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="currentColor" fillOpacity=".15" />
        {on ? (
          <>
            <path d="M15.5 9a4 4 0 0 1 0 6" />
            <path d="M18 6.5a7.5 7.5 0 0 1 0 11" />
          </>
        ) : (
          <path d="M16 9.5l5 5m0-5l-5 5" />
        )}
      </svg>
    </button>
  );
}