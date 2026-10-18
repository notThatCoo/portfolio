"use client";

import { useSyncExternalStore } from "react";

/**
 * Subscribe to a media query. On the server (and the first client render) it
 * returns `serverValue`, so markup matches and CSS handles the visual switch;
 * behavior catches up right after hydration.
 */
export function useMediaQuery(query: string, serverValue = false): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

/** Must match the `max-width` breakpoint in globals.css. */
export const COMPACT_QUERY = "(max-width: 700px)";

export const useIsCompact = () => useMediaQuery(COMPACT_QUERY);
export const usePrefersReducedMotion = () => useMediaQuery("(prefers-reduced-motion: reduce)");

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
