import type { SVGProps } from "react";

/** Small monochrome UI glyphs. They inherit `currentColor`. */
type P = SVGProps<SVGSVGElement>;

const base = {
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  focusable: false,
} as const;

/** The menu-bar mark: a "T" with a cursor tick, drawn on a 16px grid. */
export function LogoMark(props: P) {
  return (
    <svg {...base} {...props}>
      <path d="M3 3.5h10M8 3.5v9" strokeWidth="2" />
      <path d="M11 12.5h2.5" strokeWidth="2" />
    </svg>
  );
}

export const SearchGlyph = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="7" cy="7" r="4.25" />
    <path d="M10.2 10.2L13.5 13.5" />
  </svg>
);

export const SunGlyph = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="8" cy="8" r="2.8" />
    <path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1" />
  </svg>
);

export const MoonGlyph = (p: P) => (
  <svg {...base} {...p}>
    <path d="M13.2 9.6A5.5 5.5 0 0 1 6.4 2.8a5.5 5.5 0 1 0 6.8 6.8z" />
  </svg>
);

export const CloseGlyph = (p: P) => (
  <svg {...base} viewBox="0 0 10 10" strokeWidth={1.4} {...p}>
    <path d="M3 3l4 4M7 3L3 7" />
  </svg>
);

export const MinimizeGlyph = (p: P) => (
  <svg {...base} viewBox="0 0 10 10" strokeWidth={1.4} {...p}>
    <path d="M2.5 5h5" />
  </svg>
);

export const MaximizeGlyph = (p: P) => (
  <svg {...base} viewBox="0 0 10 10" strokeWidth={1.4} {...p}>
    <path d="M3 7V3h4M7 3L3 7" />
  </svg>
);

export const ChevronLeft = (p: P) => (
  <svg {...base} {...p}>
    <path d="M10 3L5 8l5 5" />
  </svg>
);

export const ChevronRight = (p: P) => (
  <svg {...base} {...p}>
    <path d="M6 3l5 5-5 5" />
  </svg>
);

export const ExternalGlyph = (p: P) => (
  <svg {...base} {...p}>
    <path d="M9 3h4v4M13 3L7.5 8.5M11 9.5V13H3V5h3.5" />
  </svg>
);

export const NoteGlyph = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3" y="2" width="10" height="12" rx="2" />
    <path d="M5.5 6h5M5.5 9h5M5.5 12h3" />
  </svg>
);

export const FolderGlyph = (p: P) => (
  <svg {...base} {...p}>
    <path d="M2 4.5A1.5 1.5 0 0 1 3.5 3h3l1.5 1.5h4.5A1.5 1.5 0 0 1 14 6v5.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 11.5z" />
  </svg>
);

export const BoltGlyph = (p: P) => (
  <svg {...base} {...p}>
    <path d="M9 1.5L3.5 9H8l-1 5.5L12.5 7H8z" />
  </svg>
);

export const HomeGlyph = (p: P) => (
  <svg {...base} {...p}>
    <path d="M2.5 7.5L8 3l5.5 4.5M4 6.5V13h8V6.5" />
  </svg>
);

/** Finder-style project folder: two-tone, tinted by the `--folder` CSS variables. */
export function ProjectFolder(props: P) {
  return (
    <svg viewBox="0 0 64 52" aria-hidden="true" focusable="false" {...props}>
      <path d="M3 8a5 5 0 0 1 5-5h15l5 5h28a5 5 0 0 1 5 5v4H3z" fill="var(--folder-back)" />
      <path
        d="M3 15a4 4 0 0 1 4-4h50a4 4 0 0 1 4 4v29a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5z"
        fill="var(--folder-front)"
      />
      <path d="M3 18h58" stroke="#fff" strokeOpacity="0.35" />
    </svg>
  );
}
