import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  url: string;
  fileName: string;
  canNativeShare: boolean;
  onShare: () => void;
  onDownload: () => void;
  onClose: () => void;
}

export function ShareSheet({ url, fileName, canNativeShare, onShare, onDownload, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Portal to <body>: the sheet must sit above the particle canvas, which a screen's stacking context would prevent.
  return createPortal(
    <div className="sheet" role="dialog" aria-modal="true" aria-label="Your card">
      <div className="sheet-inner">
        <img className="sheet-img" src={url} alt={`Your BUCC Fall 26 card (${fileName})`} />
        <p className="sheet-hint">Press and hold the card to save it, or use a button below.</p>
        <div className="sheet-actions">
          {canNativeShare && (
            <button type="button" className="btn-glow press" onClick={onShare}>
              Share card
            </button>
          )}
          <button type="button" className={canNativeShare ? 'btn-line press' : 'btn-glow press'} onClick={onDownload}>
            Download card
          </button>
        </div>
        <button ref={closeRef} type="button" className="btn-quiet press" onClick={onClose}>
          Close
        </button>
      </div>
    </div>,
    document.body,
  );
}