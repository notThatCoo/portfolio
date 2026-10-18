"use client";

import { useId } from "react";
import { site } from "@/config/site";
import { ExternalGlyph } from "@/icons/Glyphs";

/** Generated cover art: concentric rings and a waveform, no image files. */
function Cover() {
  const id = useId();
  const bars = Array.from(
    { length: 28 },
    (_, i) => 10 + Math.abs(Math.sin(i * 1.7) * 26 + Math.sin(i * 0.6) * 14),
  );
  return (
    <svg
      viewBox="0 0 200 200"
      className="aspect-square w-full rounded-2xl shadow-2xl"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff8a3d" />
          <stop offset="0.55" stopColor="#e2367a" />
          <stop offset="1" stopColor="#5b1f8f" />
        </linearGradient>
      </defs>
      <rect width="200" height="200" fill={`url(#${id}g)`} />
      {[30, 52, 74, 96].map((r) => (
        <circle
          key={r}
          cx="150"
          cy="48"
          r={r}
          fill="none"
          stroke="#fff"
          strokeOpacity="0.12"
          strokeWidth="10"
        />
      ))}
      <g transform="translate(22 150)">
        {bars.map((h, i) => (
          <rect
            key={i}
            x={i * 5.6}
            y={-h / 2}
            width="3"
            height={h}
            rx="1.5"
            fill="#fff"
            fillOpacity="0.85"
          />
        ))}
      </g>
      <text x="22" y="40" fill="#fff" fontSize="15" fontWeight="700" fontFamily="var(--font-sans)">
        AFROBEATS
      </text>
      <text
        x="22"
        y="58"
        fill="#fff"
        fillOpacity="0.75"
        fontSize="11"
        fontFamily="var(--font-sans)"
      >
        rotation
      </text>
    </svg>
  );
}

export default function MusicApp() {
  const { playlist } = site;
  const links = [
    ["Spotify", playlist.spotify],
    ["Apple Music", playlist.appleMusic],
    ["YouTube Music", playlist.youtube],
  ].filter((l): l is [string, string] => !!l[1]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 overflow-y-auto p-6 text-center">
      <div className="w-44">
        <Cover />
      </div>
      <div>
        <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">Playlist</p>
        <h3 className="text-xl font-bold">{playlist.title}</h3>
        <p className="mt-1 text-sm text-muted">What I code to.</p>
      </div>
      {links.length ? (
        <ul className="flex flex-wrap justify-center gap-2">
          {links.map(([label, href]) => (
            <li key={label}>
              <a href={href} target="_blank" rel="noopener noreferrer" className="button">
                {label} <ExternalGlyph className="size-3.5" />
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-line-strong px-3 py-2 text-xs text-muted">
          Playlist link coming soon.
        </p>
      )}
    </div>
  );
}
