"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export type MenuEntry =
  | {
      label: string;
      onSelect: () => void;
      shortcut?: string;
      disabled?: boolean;
      external?: boolean;
    }
  | "separator";

/**
 * A disclosure button + ARIA menu (WAI-ARIA menu button pattern):
 * Enter/Space/↓ opens and focuses the first item, ↑/↓/Home/End move,
 * Esc closes and returns focus to the button, clicking outside closes.
 */
export function MenuButton({
  label,
  children,
  items,
  className = "",
}: {
  label: string;
  children: ReactNode;
  items: MenuEntry[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const menuItems = () =>
    Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>(
        '[role="menuitem"]:not([aria-disabled="true"])',
      ) ?? [],
    );

  useEffect(() => {
    if (!open) return;
    menuItems()[0]?.focus();
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !buttonRef.current?.contains(t)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) buttonRef.current?.focus();
  };

  const onButtonKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
    }
  };

  const onMenuKey = (e: KeyboardEvent) => {
    const list = menuItems();
    const i = list.indexOf(document.activeElement as HTMLElement);
    const go = (n: number) => list[(n + list.length) % list.length]?.focus();
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        go(i + 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        go(i - 1);
        break;
      case "Home":
        e.preventDefault();
        go(0);
        break;
      case "End":
        e.preventDefault();
        go(list.length - 1);
        break;
      case "Escape":
        e.preventDefault();
        close();
        break;
      case "Tab":
        close(false);
        break;
    }
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={label}
        className={`flex h-6 items-center rounded-[5px] px-2 hover:bg-hover aria-expanded:bg-hover ${className}`}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onButtonKey}
      >
        {children}
      </button>
      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label}
          className="glass absolute top-full left-0 z-[10001] mt-1 min-w-56 rounded-lg border border-line-strong bg-surface p-1 shadow-2xl"
          onKeyDown={onMenuKey}
        >
          {items.map((item, i) =>
            item === "separator" ? (
              <div key={i} role="separator" className="mx-2 my-1 h-px bg-line-strong" />
            ) : (
              <div
                key={item.label}
                role="menuitem"
                tabIndex={-1}
                aria-disabled={item.disabled || undefined}
                className="flex cursor-default items-center justify-between gap-6 rounded-[5px] px-2.5 py-1 text-[13px] outline-none focus:bg-accent focus:text-accent-contrast aria-disabled:opacity-40"
                onClick={() => {
                  if (item.disabled) return;
                  close(false);
                  item.onSelect();
                }}
                onKeyDown={(e) => {
                  if ((e.key === "Enter" || e.key === " ") && !item.disabled) {
                    e.preventDefault();
                    close(false);
                    item.onSelect();
                  }
                }}
              >
                <span>
                  {item.label}
                  {item.external && <span aria-hidden="true"> ↗</span>}
                </span>
                {item.shortcut && <span className="text-xs opacity-60">{item.shortcut}</span>}
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}
