"use client";

import { useEffect, useRef } from "react";
import { SHORTCUTS, useModifierLabels } from "./shortcuts";

export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const { mod, alt } = useModifierLabels();

  useEffect(() => {
    const d = ref.current;
    if (open && d && !d.open) d.showModal();
    if (!open && d?.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="sheet glass w-[min(520px,calc(100vw-24px))]"
      aria-labelledby="shortcuts-title"
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="shortcuts-title" className="text-base font-semibold">
            Keyboard shortcuts
          </h2>
          <button type="button" className="button button-quiet" onClick={onClose}>
            Done
          </button>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          {SHORTCUTS.map((s) => (
            <div key={s.label} className="contents">
              <dt>
                <kbd className="kbd whitespace-nowrap">{s.keys(mod, alt)}</kbd>
              </dt>
              <dd className="text-muted">{s.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </dialog>
  );
}
